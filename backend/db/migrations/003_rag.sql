-- Migration: 003_rag
-- Description: Tabela dokumentów bazy wiedzy z wektorami

-- Upewniamy się, że pgvector jest zainstalowany (choć robi to już 001_init)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768), -- Wymiar dla Vertex AI Text Embeddings (często 768)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indeks przyspieszający wyszukiwanie (opcjonalny dla małych MVP, ale dobry praktycznie)
-- Tworzy indeks HNSW dla wektorów (kosinusowa odległość)
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx ON knowledge_base USING hnsw (embedding vector_cosine_ops);
