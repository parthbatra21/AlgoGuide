import asyncio
import json
import logging
import os
import re
import urllib.parse
from datetime import datetime
from functools import lru_cache
from typing import Any

import aiohttp
from bs4 import BeautifulSoup
from firebase_admin import firestore
from google import genai

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


class QueryGenerator:
    def generate(self, profile: dict[str, Any]) -> list[str]:
        prompt = f"""
        Based on this user profile, generate 10-15 specific search queries to find the best learning resources:

        Name: {profile['name']}
        Status: {profile['status']}
        Education: {profile['education']}
        Primary Language: {profile['primary_language']}
        Tech Stack: {', '.join(profile['tech_stack'])}
        Familiar Topics: {', '.join(profile['familiar_topics'])}
        Weak Areas: {', '.join(profile['weak_areas'])}
        Target Companies: {', '.join(profile['target_companies'])}
        Preferred Role: {profile['preferred_role']}
        Timeline: {profile['target_timeline']}
        Preferred Resources: {', '.join(profile['preferred_resources'])}

        Generate search queries that will help find:
        1. Learning resources for weak areas
        2. Interview preparation materials for target companies
        3. Skill development content for preferred role
        4. Practice problems and exercises
        5. Technology-specific tutorials

        Return only the search queries, one per line, without numbering or extra text.
        Focus on actionable, specific queries that will yield good learning resources.
        """

        response_text = call_gemini(prompt)
        if response_text:
            queries = [q.strip() for q in response_text.split("\n") if q.strip()]
            return queries[:15]
        return self._fallback_queries(profile)

    def _fallback_queries(self, profile: dict[str, Any]) -> list[str]:
        fallback_queries: list[str] = []
        for weak_area in profile["weak_areas"]:
            fallback_queries.append(f"{weak_area} tutorial {profile['primary_language']}")
            fallback_queries.append(f"{weak_area} interview questions")
        for company in profile["target_companies"]:
            fallback_queries.append(f"{company} {profile['preferred_role']} interview preparation")
        for tech in profile["tech_stack"]:
            fallback_queries.append(f"{tech} best practices tutorial")
        return fallback_queries[:15]


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


class ResourceCategoriser:
    CATEGORIES = [
        "weak_areas_improvement",
        "interview_preparation",
        "skill_development",
        "practice_problems",
        "technology_tutorials",
        "general_learning",
    ]

    def categorise(
        self, resources: list[dict[str, Any]], profile: dict[str, Any]
    ) -> dict[str, list[dict[str, Any]]]:
        categories: dict[str, list[dict[str, Any]]] = {key: [] for key in self.CATEGORIES}

        prompt = f"""
        Categorize these resources based on the user profile:

        User Profile:
        - Weak Areas: {', '.join(profile['weak_areas'])}
        - Target Companies: {', '.join(profile['target_companies'])}
        - Preferred Role: {profile['preferred_role']}
        - Tech Stack: {', '.join(profile['tech_stack'])}

        Resources to categorize:
        {json.dumps([{'title': r['title'], 'description': r.get('description', ''), 'tags': r.get('tags', [])} for r in resources], indent=2)}

        Assign each resource to one of these categories:
        - weak_areas_improvement: Resources that help with user's weak areas
        - interview_preparation: Resources for interview prep, especially for target companies
        - skill_development: Resources for developing skills for preferred role
        - practice_problems: Coding problems, exercises, challenges
        - technology_tutorials: Tutorials for specific technologies in tech stack
        - general_learning: Other valuable learning resources

        Respond with ONLY a valid JSON object (no markdown, no code fences) mapping resource titles to categories:
        {{
            "Resource Title 1": "category_name",
            "Resource Title 2": "category_name"
        }}
        """

        response_text = call_gemini(prompt)
        if response_text:
            try:
                categorisation = json.loads(_strip_json_fences(response_text))
                for resource in resources:
                    category = categorisation.get(resource["title"], "general_learning")
                    if category in categories:
                        categories[category].append(resource)
                    else:
                        categories["general_learning"].append(resource)
                return categories
            except Exception:
                logger.warning("Failed to parse Gemini categorisation response")

        return self._keyword_fallback(resources, profile)

    def _keyword_fallback(
        self, resources: list[dict[str, Any]], profile: dict[str, Any]
    ) -> dict[str, list[dict[str, Any]]]:
        categories: dict[str, list[dict[str, Any]]] = {key: [] for key in self.CATEGORIES}
        for resource in resources:
            title = resource.get("title", "").lower()
            if any(weak.lower() in title for weak in profile["weak_areas"]):
                categories["weak_areas_improvement"].append(resource)
            elif any(company.lower() in title for company in profile["target_companies"]):
                categories["interview_preparation"].append(resource)
            elif "practice" in title or "problem" in title:
                categories["practice_problems"].append(resource)
            elif any(tech.lower() in title for tech in profile["tech_stack"]):
                categories["technology_tutorials"].append(resource)
            else:
                categories["general_learning"].append(resource)
        return categories


_parser = ProfileParser()
_query_gen = QueryGenerator()
_enricher = MetadataEnricher()
_categoriser = ResourceCategoriser()


class ResourcePipeline:
    async def run(self, user_answers: list[dict[str, Any]]) -> dict[str, Any]:
        profile = _parser.parse(user_answers)
        queries = await asyncio.to_thread(_query_gen.generate, profile)

        all_resources: list[dict[str, Any]] = []
        timeout = aiohttp.ClientTimeout(total=12)
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }

        async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
            scraper = GFGScraper(session)

            for query in queries:
                logger.info("Searching for: %s", query)
                urls = await scraper.search(query, max_results=3)
                resources: list[dict[str, Any]] = []

                for url in urls:
                    resource = await asyncio.to_thread(_enricher.enrich, url, query)
                    resources.append(resource or scraper.basic_resource(url, query))

                if not resources:
                    resources.append(scraper.search_fallback_resource(query))

                all_resources.extend(resources)
                await asyncio.sleep(0.1)

        categorised = await asyncio.to_thread(_categoriser.categorise, all_resources, profile)

        return {
            "user_profile": profile,
            "search_queries": queries,
            "total_resources": len(all_resources),
            "resources": categorised,
            "generated_at": datetime.utcnow().isoformat(),
        }


async def generate_personalized_resources(
    user_answers: list[dict[str, Any]], db: firestore.Client, user_id: str
) -> dict[str, Any]:
    resources_data = await ResourcePipeline().run(user_answers)
    home_doc_id = save_home_resources(db, user_id, resources_data)
    resources_data["home_doc_id"] = home_doc_id
    return resources_data
