import asyncio
import json
import logging
import os
import re
import urllib.parse
from datetime import datetime
from functools import lru_cache
from typing import Any, TypedDict

import aiohttp
import chromadb
from bs4 import BeautifulSoup
from firebase_admin import firestore
from google import genai
from langgraph.graph import END, START, StateGraph

from db import save_home_resources

logger = logging.getLogger(__name__)


def _gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

QUESTION_FIELD_MAP = {
    "q_name": "name",
    "q_current_status": "status",
    "q_education": "education",
    "q_graduation_year": "graduation_year",
    "q_primary_language": "primary_language",
    "q_tech_stack": "tech_stack",
    "q_familiar_topics": "familiar_topics",
    "q_weak_areas": "weak_areas",
    "q_target_companies": "target_companies",
    "q_preferred_role": "preferred_role",
    "q_target_timeline": "target_timeline",
    "q_preferred_resources": "preferred_resources",
}

LIST_FIELDS = {
    "tech_stack",
    "familiar_topics",
    "weak_areas",
    "target_companies",
    "preferred_resources",
}


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


@lru_cache(maxsize=1)
def _gemini_client() -> genai.Client | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def call_gemini(prompt: str) -> str | None:
    client = _gemini_client()
    if client is None:
        return None
    try:
        resp = client.models.generate_content(model=_gemini_model(), contents=prompt)
        return resp.text or None
    except Exception:
        logger.exception("Gemini call failed")
        return None


class ProfileParser:
    def parse(self, user_answers: list[dict[str, Any]]) -> dict[str, Any]:
        profile: dict[str, Any] = {
            "name": "",
            "status": "",
            "education": "",
            "graduation_year": "",
            "primary_language": "",
            "tech_stack": [],
            "familiar_topics": [],
            "weak_areas": [],
            "target_companies": [],
            "preferred_role": "",
            "target_timeline": "",
            "preferred_resources": [],
        }

        for answer in user_answers:
            qid = answer.get("question_id", "")
            answer_text = answer.get("answer", "")
            field = QUESTION_FIELD_MAP.get(qid)
            if field is None:
                logger.warning("Unmapped question_id '%s' – skipping.", qid)
                continue
            if field in LIST_FIELDS:
                profile[field] = [item.strip() for item in answer_text.split(",") if item.strip()]
            else:
                profile[field] = answer_text

        return profile


class GFGScraper:
    def __init__(self, session: aiohttp.ClientSession):
        self._session = session

    def _gfg_search_url(self, query: str) -> str:
        return f"https://www.geeksforgeeks.org/?s={urllib.parse.quote_plus(query)}"

    def _is_valid_gfg_article_url(self, url: str) -> bool:
        if not url or "geeksforgeeks.org" not in url:
            return False
        if "?s=" in url:
            return False
        blocked_prefixes = (
            "https://www.geeksforgeeks.org/tag/",
            "https://www.geeksforgeeks.org/category/",
            "https://www.geeksforgeeks.org/author/",
            "https://www.geeksforgeeks.org/page/",
        )
        return not url.startswith(blocked_prefixes)

    async def search(self, query: str, max_results: int = 5) -> list[str]:
        search_url = self._gfg_search_url(query)
        try:
            async with self._session.get(search_url, allow_redirects=True) as resp:
                html = await resp.text(errors="ignore")
        except Exception:
            logger.exception("GFG search failed for query '%s'", query)
            return []

        soup = BeautifulSoup(html, "html.parser")
        candidate_links = soup.select(
            "h2.entry-title a, h3.entry-title a, .entry-title a, article a"
        )

        urls: list[str] = []
        seen: set[str] = set()

        for anchor in candidate_links:
            href = anchor.get("href")
            if not href:
                continue
            href = href.strip()
            if href.startswith("//"):
                href = "https:" + href
            if href.startswith("/"):
                href = "https://www.geeksforgeeks.org" + href
            href = href.split("#", 1)[0]

            if not self._is_valid_gfg_article_url(href) or href in seen:
                continue
            seen.add(href)
            urls.append(href)
            if len(urls) >= max_results:
                break

        return urls

    def basic_resource(self, url: str, query: str) -> dict[str, Any]:
        return {
            "title": f"GeeksforGeeks: {query}",
            "url": url,
            "description": f"GeeksforGeeks article explaining {query}",
            "resource_type": "blog",
            "difficulty": "beginner",
            "estimated_time": 20,
            "tags": query.split(),
            "created_at": datetime.utcnow().isoformat(),
            "query": query,
            "source": "geeksforgeeks",
        }

    def search_fallback_resource(self, query: str) -> dict[str, Any]:
        return {
            "title": f"GeeksforGeeks search: {query}",
            "url": self._gfg_search_url(query),
            "description": f"GeeksforGeeks search results for {query}",
            "resource_type": "search",
            "difficulty": "beginner",
            "tags": query.split(),
            "created_at": datetime.utcnow().isoformat(),
            "query": query,
            "source": "geeksforgeeks_search_fallback",
        }


class MetadataEnricher:
    def enrich(self, url: str, query: str) -> dict[str, Any] | None:
        prompt = f"""
        Analyze this URL and create metadata for a learning resource: {url}
        Original search query: {query}

        Based on the URL structure and domain, provide:
        1. A descriptive title (max 100 chars)
        2. A helpful description (max 300 chars)
        3. Resource type (video, blog, course, documentation, practice, repository)
        4. Difficulty level (beginner, intermediate, advanced)
        5. Estimated time to complete (in minutes)
        6. Key topics/tags (comma-separated)

        Respond with ONLY a valid JSON object (no markdown, no code fences):
        {{
            "title": "...",
            "description": "...",
            "resource_type": "...",
            "difficulty": "...",
            "estimated_time": 30,
            "tags": ["tag1", "tag2", "tag3"]
        }}
        """

        response_text = call_gemini(prompt)
        if not response_text:
            return None

        try:
            metadata = json.loads(_strip_json_fences(response_text))
        except Exception:
            domain = url.split("/")[2] if len(url.split("/")) > 2 else "unknown"
            metadata = {
                "title": f"{query} - {domain}",
                "description": f"Learning resource about {query} from {domain}",
                "resource_type": "blog",
                "difficulty": "intermediate",
                "estimated_time": 30,
                "tags": query.split(),
            }

        metadata.update(
            {
                "url": url,
                "query": query,
                "created_at": datetime.utcnow().isoformat(),
                "source": "gemini_web_agent",
            }
        )
        return metadata


class RoadmapPlanner:
    def plan(self, profile: dict[str, Any]) -> dict[str, Any]:
        prompt = f"""
        Based on the user's profile, generate a personalized week-by-week learning syllabus for coding interview preparation.
        Ensure it matches their primary programming language, target companies, role, tech stack, and timeline.

        User Profile:
        - Name: {profile.get('name')}
        - Status: {profile.get('status')}
        - Education: {profile.get('education')}
        - Primary Language: {profile.get('primary_language')}
        - Tech Stack: {', '.join(profile.get('tech_stack', []))}
        - Familiar Topics: {', '.join(profile.get('familiar_topics', []))}
        - Weak Areas: {', '.join(profile.get('weak_areas', []))}
        - Target Companies: {', '.join(profile.get('target_companies', []))}
        - Preferred Role: {profile.get('preferred_role')}
        - Target Timeline: {profile.get('target_timeline')}

        Output a strict weekly roadmap structure based on their timeline.
        Provide 2 to 4 key topics per week.
        For each topic, provide a title, description, tags, and difficulty.

        Respond with ONLY a valid JSON object matching the schema below (no markdown formatting, no code fences):
        {{
            "weeks": [
                {{
                    "week": 1,
                    "topics": [
                        {{
                            "title": "Topic Title",
                            "description": "Short explanation of what to learn",
                            "tags": ["Tag1", "Tag2"],
                            "difficulty": "Easy"
                        }}
                    ]
                }}
            ]
        }}
        """
        response_text = call_gemini(prompt)
        if response_text:
            try:
                cleaned = _strip_json_fences(response_text)
                return json.loads(cleaned)
            except Exception:
                logger.warning("Failed to parse Gemini planner response, using fallback.")
        return self._fallback_plan(profile)

    def _fallback_plan(self, profile: dict[str, Any]) -> dict[str, Any]:
        weeks = []
        topics_pool = list(profile.get("weak_areas", []))
        if not topics_pool:
            topics_pool = ["Data Structures", "Algorithms", "System Design"]
        
        for idx, topic in enumerate(topics_pool):
            weeks.append({
                "week": idx + 1,
                "topics": [
                    {
                        "title": f"Fundamentals of {topic}",
                        "description": f"Learn key concepts, complexity, and basic implementations of {topic}.",
                        "tags": [topic, profile.get("primary_language", "Coding")],
                        "difficulty": "Medium"
                    },
                    {
                        "title": f"Advanced {topic} Problems",
                        "description": f"Practice intermediate and advanced exercises for {topic}.",
                        "tags": [topic, "Practice"],
                        "difficulty": "Hard"
                    }
                ]
            })
        if not weeks:
            weeks = [{
                "week": 1,
                "topics": [
                    {
                        "title": "Coding Interview Prep",
                        "description": "General introduction and basic problem solving.",
                        "tags": ["General"],
                        "difficulty": "Easy"
                    }
                ]
            }]
        return {"weeks": weeks}


_parser = ProfileParser()
_enricher = MetadataEnricher()
_planner = RoadmapPlanner()


class AlgoGuideState(TypedDict):
    user_answers: list[dict]
    profile: dict
    roadmap_plan: dict
    resources: list[dict]
    roadmap: dict
    error: str | None


async def parse_profile_node(state: AlgoGuideState) -> dict:
    if state.get("error"):
        return {}
    try:
        profile = _parser.parse(state["user_answers"])
        return {"profile": profile}
    except Exception as e:
        logger.exception("Error in parse_profile_node")
        return {"error": str(e)}


async def roadmap_planner_node(state: AlgoGuideState) -> dict:
    if state.get("error"):
        return {}
    try:
        plan = await asyncio.to_thread(_planner.plan, state["profile"])
        return {"roadmap_plan": plan}
    except Exception as e:
        logger.exception("Error in roadmap_planner_node")
        return {"error": str(e)}


class RAGRetriever:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="chroma_db")
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        try:
            self.collection = self.client.get_collection("algoguide_kb")
        except Exception:
            logger.warning("Collection 'algoguide_kb' not found. Seeding database...")
            import subprocess
            try:
                # Run the indexing script automatically if db is missing
                subprocess.run(["python", "index_resources.py"], check=True)
                self.collection = self.client.get_collection("algoguide_kb")
            except Exception as e:
                logger.exception("Failed to run seed script automatically.")
                raise e

    def retrieve(self, query: str, language: str, limit: int = 6) -> list[dict]:
        query_embedding = self.model.encode([query]).tolist()
        
        # Build where filter for metadata filtering
        if language and language.strip().lower() != "general":
            lang_mapping = {
                "java": "Java",
                "python": "Python",
                "cpp": "C++",
                "c++": "C++",
                "javascript": "JavaScript",
                "js": "JavaScript"
            }
            norm_lang = lang_mapping.get(language.strip().lower(), language)
            where = {"$or": [{"language": "General"}, {"language": norm_lang}]}
        else:
            where = {"language": "General"}
            
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=limit,
            where=where
        )
        
        retrieved = []
        if results and results["ids"] and results["ids"][0]:
            for idx in range(len(results["ids"][0])):
                doc_id = results["ids"][0][idx]
                metadata = results["metadatas"][0][idx]
                document = results["documents"][0][idx]
                distance = results["distances"][0][idx] if results.get("distances") else 1.0
                retrieved.append({
                    "id": doc_id,
                    "title": metadata["title"],
                    "url": metadata["url"],
                    "description": metadata["description"],
                    "tags": metadata["tags"].split(","),
                    "difficulty": metadata["difficulty"],
                    "source": metadata["source"],
                    "language": metadata["language"],
                    "distance": distance
                })
        return retrieved


class RAGReranker:
    def rerank(self, retrieved: list[dict], query: str, user_language: str, limit: int = 3) -> list[dict]:
        scored = []
        for doc in retrieved:
            dist = doc["distance"]
            if user_language and doc["language"].lower() == user_language.lower():
                dist -= 0.1  # Boost matching language
            scored.append((dist, doc))
            
        scored.sort(key=lambda x: x[0])
        
        # Select with source diversity
        selected = []
        seen_sources = set()
        
        for dist, doc in scored:
            src = doc["source"]
            if src not in seen_sources:
                selected.append(doc)
                seen_sources.add(src)
            if len(selected) >= limit:
                break
                
        if len(selected) < limit:
            for dist, doc in scored:
                if doc not in selected:
                    selected.append(doc)
                if len(selected) >= limit:
                    break
                    
        return selected[:limit]


_parser = ProfileParser()
_enricher = MetadataEnricher()
_planner = RoadmapPlanner()


class AlgoGuideState(TypedDict):
    user_answers: list[dict]
    profile: dict
    roadmap_plan: dict
    resources: list[dict]
    roadmap: dict
    error: str | None


async def parse_profile_node(state: AlgoGuideState) -> dict:
    if state.get("error"):
        return {}
    try:
        profile = _parser.parse(state["user_answers"])
        return {"profile": profile}
    except Exception as e:
        logger.exception("Error in parse_profile_node")
        return {"error": str(e)}


async def roadmap_planner_node(state: AlgoGuideState) -> dict:
    if state.get("error"):
        return {}
    try:
        plan = await asyncio.to_thread(_planner.plan, state["profile"])
        return {"roadmap_plan": plan}
    except Exception as e:
        logger.exception("Error in roadmap_planner_node")
        return {"error": str(e)}


async def retrieve_resources_node(state: AlgoGuideState) -> dict:
    if state.get("error"):
        return {}
    try:
        resources = []
        retriever = RAGRetriever()
        reranker = RAGReranker()
        
        weeks = state["roadmap_plan"].get("weeks", [])
        user_lang = state["profile"].get("primary_language", "")
        timeout = aiohttp.ClientTimeout(total=12)
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
        
        for w_idx, week in enumerate(weeks):
            for t_idx, topic in enumerate(week.get("topics", [])):
                topic_title = topic.get("title", "")
                topic_desc = topic.get("description", "")
                # Composite query combining title and description
                query = f"{topic_title} {topic_desc}"
                
                logger.info("Retrieving resources via RAG for: %s", topic_title)
                
                # Fetch up to 6 matches from Chroma DB
                candidates = await asyncio.to_thread(
                    retriever.retrieve, query, user_lang, limit=6
                )
                
                # Filter by distance threshold (L2/cosine distance closer to 0 is better)
                THRESHOLD = 1.0
                good_candidates = [c for c in candidates if c.get("distance", 1.0) <= THRESHOLD]
                
                # Re-rank to select the best 3 with diversity
                best_resources = reranker.rerank(good_candidates, query, user_lang, limit=3)
                
                # Fallback to scraper if similarity is below threshold
                if not best_resources:
                    logger.info("RAG similarity below threshold. Falling back to GFG scraper for: %s", topic_title)
                    async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
                        scraper = GFGScraper(session)
                        urls = await scraper.search(f"{topic_title} tutorial {user_lang}", max_results=3)
                        
                        for url in urls:
                            resources.append({
                                "week_index": w_idx,
                                "topic_index": t_idx,
                                "query": query,
                                "url": url,
                                "title": f"{topic_title} - GeeksforGeeks",
                                "description": f"GeeksforGeeks tutorial covering {topic_title}.",
                                "tags": [topic_title, "GeeksforGeeks"],
                                "difficulty": topic.get("difficulty", "Medium"),
                                "source": "GeeksforGeeks",
                                "is_fallback": True
                            })
                else:
                    for doc in best_resources:
                        resources.append({
                            "week_index": w_idx,
                            "topic_index": t_idx,
                            "query": query,
                            "url": doc["url"],
                            "title": doc["title"],
                            "description": doc["description"],
                            "tags": doc["tags"],
                            "difficulty": doc["difficulty"],
                            "source": doc["source"],
                            "is_fallback": False
                        })
        return {"resources": resources}
    except Exception as e:
        logger.exception("Error in retrieve_resources_node")
        return {"error": str(e)}


async def enrich_resources_node(state: AlgoGuideState) -> dict:
    if state.get("error"):
        return {}
    try:
        enriched_resources = []
        for res in state["resources"]:
            w_idx = res["week_index"]
            t_idx = res["topic_index"]
            
            enriched = {
                "title": res.get("title", "Resource"),
                "url": res.get("url", ""),
                "description": res.get("description", ""),
                "resource_type": "documentation" if res.get("source", "").lower() in ("java docs", "python docs", "c++ docs", "js docs", "roadmap.sh") else "blog",
                "difficulty": res.get("difficulty", "Medium"),
                "estimated_time": 20,
                "tags": res.get("tags", []),
                "created_at": datetime.utcnow().isoformat(),
                "query": res.get("query", ""),
                "source": res.get("source", "Unknown"),
            }
            
            enriched.update({
                "week_index": w_idx,
                "topic_index": t_idx
            })
            enriched_resources.append(enriched)
            
        return {"resources": enriched_resources}
    except Exception as e:
        logger.exception("Error in enrich_resources_node")
        return {"error": str(e)}


async def attach_resources_node(state: AlgoGuideState) -> dict:
    if state.get("error"):
        return {}
    try:
        weeks = []
        planned_weeks = state["roadmap_plan"].get("weeks", [])
        
        resource_map = {}
        for res in state.get("resources", []):
            key = (res["week_index"], res["topic_index"])
            if key not in resource_map:
                resource_map[key] = []
            resource_map[key].append(res)
            
        for w_idx, week in enumerate(planned_weeks):
            week_no = week.get("week", w_idx + 1)
            topics = []
            for t_idx, topic in enumerate(week.get("topics", [])):
                key = (w_idx, t_idx)
                matching = resource_map.get(key, [])
                
                primary_url = ""
                resource_urls = []
                test_urls = []
                
                if matching:
                    first = matching[0]
                    primary_url = first.get("url", "")
                    resource_urls = [r.get("url") for r in matching if r.get("url")]
                    
                    for r in matching:
                        url = r.get("url", "")
                        if "leetcode" in url or "geeksforgeeks" in url:
                            test_urls.append(url)
                
                if not primary_url:
                    query = f"{topic.get('title')} tutorial {state['profile'].get('primary_language', 'Python')}"
                    primary_url = f"https://www.geeksforgeeks.org/?s={urllib.parse.quote_plus(query)}"
                    resource_urls = [primary_url]
                
                topics.append({
                    "id": f"{week_no}-{t_idx}",
                    "title": topic.get("title", f"Topic {t_idx + 1}"),
                    "description": topic.get("description", ""),
                    "resources": resource_urls,
                    "tests": test_urls if test_urls else resource_urls,
                    "tags": topic.get("tags", []),
                    "difficulty": topic.get("difficulty", "Medium"),
                    "url": primary_url
                })
            weeks.append({
                "week": week_no,
                "topics": topics
            })
            
        roadmap = {
            "user_profile": state["profile"],
            "weeks": weeks,
            "generated_at": datetime.utcnow().isoformat(),
        }
        return {"roadmap": roadmap}
    except Exception as e:
        logger.exception("Error in attach_resources_node")
        return {"error": str(e)}


workflow = StateGraph(AlgoGuideState)
workflow.add_node("parse_profile", parse_profile_node)
workflow.add_node("plan_roadmap", roadmap_planner_node)
workflow.add_node("retrieve_resources", retrieve_resources_node)
workflow.add_node("enrich_resources", enrich_resources_node)
workflow.add_node("attach_resources", attach_resources_node)

workflow.add_edge(START, "parse_profile")
workflow.add_edge("parse_profile", "plan_roadmap")
workflow.add_edge("plan_roadmap", "retrieve_resources")
workflow.add_edge("retrieve_resources", "enrich_resources")
workflow.add_edge("enrich_resources", "attach_resources")
workflow.add_edge("attach_resources", END)

compiled_graph = workflow.compile()


class ResourcePipeline:
    async def run(self, user_answers: list[dict[str, Any]]) -> dict[str, Any]:
        initial_state = {
            "user_answers": user_answers,
            "profile": {},
            "roadmap_plan": {},
            "resources": [],
            "roadmap": {},
            "error": None,
        }
        result = await compiled_graph.ainvoke(initial_state)
        if result.get("error"):
            raise Exception(result["error"])
        return result["roadmap"]


async def generate_personalized_resources(
    user_answers: list[dict[str, Any]], db: firestore.Client, user_id: str
) -> dict[str, Any]:
    resources_data = await ResourcePipeline().run(user_answers)
    home_doc_id = save_home_resources(db, user_id, resources_data)
    resources_data["home_doc_id"] = home_doc_id
    return resources_data
