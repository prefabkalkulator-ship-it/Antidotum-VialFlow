-- Migration: 001_init
-- Description: Włączenie rozszerzenia pgvector dla instancji PostgreSQL (vialflow-sql)

-- Upewniamy się, że rozszerzenie vector jest zainstalowane
CREATE EXTENSION IF NOT EXISTS vector;

-- Przykładowa tabela wektorowa na przyszłość (dla RAG z plikami Google Drive)
-- Wektory text-embedding od Vertex AI mają zazwyczaj 768 wymiarów
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Przykładowy indeks (HNSW) do szybkiego wyszukiwania wektorów - zalecane dla dużych zbiorów
-- Wymaga pgvector 0.5.0+
-- CREATE INDEX ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);
