from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import time
import uuid

app = FastAPI(title="VialFlow AI Inference API")

class GenerateRequest(BaseModel):
    prompt: str
    audioUrl: str
    targetBpm: int = 104
    style: str = "Hip-Hop"

@app.get("/health")
def health_check():
    return {"status": "ok", "gpu_ready": False, "version": "0.0.1"}

@app.post("/generate")
def generate_dance(req: GenerateRequest):
    print(f"[EDGE AI] Otrzymano zapytanie generacji dla promptu: '{req.prompt}', audio: '{req.audioUrl}'")
    
    # TODO: Docelowa implementacja EDGE AI:
    # 1. Pobranie audioUrl z bucketu / chmury
    # 2. Uruchomienie modelu PyTorch z wagami
    # 3. Konwersja formatu SMPL do formatu .glb zgodnego z Y-Bot
    # 4. Wgranie pliku .glb na publicznie dostępny Storage
    
    # Na ten moment symulujemy obciążenie i połączony mikroserwis:
    time.sleep(3)
    
    print("[EDGE AI] Generacja zakończona (mock). Zwracam statyczny URL do pliku glb.")
    
    return {
        "success": True,
        # Jako że używamy statycznego serwowania z backendu, wskazujemy istniejący adres proxy
        "glbUrl": "/assets/animations/edge_generated_test.glb", 
        "jobId": str(uuid.uuid4())
    }
