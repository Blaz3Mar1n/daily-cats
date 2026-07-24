import os
import torch
from fastapi import FastAPI
from pydantic import BaseModel
import catcop as catcop
import preprocessing as prepro

app = FastAPI()

# Load the model to CPU explicitly
device = torch.device("cpu")
model = catcop.GIFEmbeddingNetwork(embedding_dim=512)
# If you have pre-trained weights: 
# model.load_state_dict(torch.load("gif_embedder.pth", map_location=device))
model.eval()

class GIFRequest(BaseModel):
    url: str

@app.post("/get-embedding")
async def get_embedding(payload: GIFRequest):
    try:
        # 1. Process URL to Tensor
        tensor = prepro.gif_url_to_tensor(payload.url, target_size=(128, 128), max_frames=32)
        # 2. Extract Embedding
        with torch.no_grad():
            embedding = model(tensor)
        # 3. Flatten to standard list for JSON response compatibility
        return {"success": True, "embedding": embedding.squeeze(0).tolist()}
    except Exception as e:
        return {"success": False, "error": str(e)}