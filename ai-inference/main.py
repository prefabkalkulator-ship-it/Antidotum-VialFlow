from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import time
import uuid

import uuid
from edge_model import load_model, generate_dance_for_audio, AI_AVAILABLE

app = FastAPI(title="VialFlow AI Inference API")

# Próba wczytania modelu przy starcie środowiska.
@app.on_event("startup")
def startup_event():
    success = load_model()
    if not success:
        print("[FASTAPI] Ostrzeżenie: Serwer startuje w trybie zmockowanym. Wymagane ręczne zainstalowanie wag.")

class GenerateRequest(BaseModel):
    prompt: str
    audioUrl: str
    targetBpm: int = 104
    style: str = "Hip-Hop"

@app.get("/health")
def health_check():
    return {"status": "ok", "gpu_ready": AI_AVAILABLE, "version": "0.0.1"}

@app.post("/generate")
def generate_dance(req: GenerateRequest):
    print(f"[EDGE AI] Otrzymano zapytanie generacji dla promptu: '{req.prompt}', audio: '{req.audioUrl}'")
    
    try:
        # Generowanie fizycznego (prawdziwego lub zmockowanego) pliku .glb poprzez bibliotekę
        generated_glb_path = generate_dance_for_audio(req.audioUrl, req.prompt, req.targetBpm)
    except Exception as e:
        print(f"[ERROR] Błąd podczas inferencji: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    return {
        "success": True,
        "glbUrl": generated_glb_path, 
        "jobId": str(uuid.uuid4())
    }
