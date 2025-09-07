import sys
sys.path.append("/workspace/higgs-audio")

import torch, torchaudio
from boson_multimodal.serve.serve_engine import HiggsAudioServeEngine, HiggsAudioResponse
from boson_multimodal.data_types import ChatMLSample, Message

# Point to Higgs model + tokenizer
MODEL_PATH = "bosonai/higgs-audio-v2-generation-3B-base"
TOKENIZER_PATH = "bosonai/higgs-audio-v2-tokenizer"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
engine = HiggsAudioServeEngine(MODEL_PATH, TOKENIZER_PATH, device=DEVICE)

def speak_text(text: str, out_file: str = "out.wav"):
    system_prompt = (
        "Generate natural, clear speech from the user's text.\n"
        "<|scene_desc_start|>\nAudio recorded in a noisy cafe.\n<|scene_desc_end|>"
    )
    messages = [
        Message(role="system", content=system_prompt),
        Message(role="user", content=text),
    ]
    resp: HiggsAudioResponse = engine.generate(
        chat_ml_sample=ChatMLSample(messages=messages),
        max_new_tokens=1024,
        temperature=0.3,
        top_p=0.95,
        top_k=50,
        stop_strings=["<|end_of_text|>", "<|eot_id|>"],
    )
    wav = torch.from_numpy(resp.audio)[None, :]
    torchaudio.save(out_file, wav, resp.sampling_rate)
    print(f"Saved: {out_file} at {resp.sampling_rate} Hz")

if __name__ == "__main__":
    speak_text("Hello, this is Sambhav and I like sucking dick", "demo.wav")
