import os
import json
import logging
import chromadb
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def main():
    json_path = "resources.json"
    db_path = "chroma_db"
    
    if not os.path.exists(json_path):
        logger.error(f"Seed resource file '{json_path}' not found!")
        return
        
    logger.info(f"Reading seed resources from {json_path}...")
    with open(json_path, "r") as f:
        resources = json.load(f)
        
    logger.info("Initializing ChromaDB persistent client...")
    client = chromadb.PersistentClient(path=db_path)
    
    # Reset/clear previous collection if exists
    try:
        client.delete_collection("algoguide_kb")
        logger.info("Deleted existing collection 'algoguide_kb'.")
    except Exception:
        # Collection might not exist, which is fine
        pass
        
    collection = client.create_collection("algoguide_kb")
    
    logger.info("Loading sentence-transformers model 'all-MiniLM-L6-v2'...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    logger.info("Generating embeddings and indexing documents...")
    ids = []
    documents = []
    embeddings = []
    metadatas = []
    
    for item in resources:
        ids.append(item["id"])
        # Formulate rich text content to embed (combining title, description, and tags)
        text_content = f"{item['title']} - {item['description']} - Tags: {', '.join(item['tags'])}"
        documents.append(text_content)
        
        # Save actual item details in metadata
        metadatas.append({
            "title": item["title"],
            "url": item["url"],
            "description": item["description"],
            "tags": ",".join(item["tags"]),
            "difficulty": item["difficulty"],
            "source": item["source"],
            "language": item["language"]
        })
        
    # Generate embeddings in one batch
    encoded_embeddings = model.encode(documents).tolist()
    
    # Add to collection
    collection.add(
        ids=ids,
        embeddings=encoded_embeddings,
        documents=documents,
        metadatas=metadatas
    )
    
    logger.info(f"Successfully indexed {len(resources)} resources into local vector database at '{db_path}'.")

if __name__ == "__main__":
    main()
