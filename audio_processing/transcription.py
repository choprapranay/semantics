import os
from typing import Optional, List, Dict, Any
from faster_whisper import WhisperModel

# ---- Load model once (singleton-ish) ----
_MODEL: Optional[WhisperModel] = None

def load_whisper() -> WhisperModel:
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    model_name = os.getenv("WHISPER_MODEL", "large-v3")  # adjust if you want smaller: "medium", "small", etc.
    cache_dir = os.getenv("WHISPER_CACHE", None)  # optional: set a cache dir to avoid re-downloads
    _MODEL = WhisperModel(model_name, device="cuda", compute_type="float16", download_root=cache_dir)
    return _MODEL

def transcribe_audio(
    audio_path: str,
    language: Optional[str] = "en",          # set None to auto-detect
    beam_size: int = 5,
    temperature: List[float] = [0.0, 0.2, 0.4],
    vad_filter: bool = True,
    vad_min_silence_ms: int = 500,
    condition_on_previous_text: bool = False,
    chunk_length: int = 30,                  # seconds; helps memory usage
    initial_prompt: Optional[str] = None,
) -> str:
    """
    Returns a dict with:
      - text: full transcript
      - segments: [{start, end, text}...]
      - language, language_probability, duration
    """
    model = load_whisper()

    segments_iter, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=beam_size,
        best_of=beam_size,
        temperature=temperature,
        vad_filter=vad_filter,
        vad_parameters={"min_silence_duration_ms": vad_min_silence_ms},
        condition_on_previous_text=condition_on_previous_text,
        initial_prompt=initial_prompt,
        chunk_length=chunk_length,
        task="transcribe",  # use "translate" if you want EN translation output
    )

    segments: List[Dict[str, Any]] = []
    pieces: List[str] = []

    for seg in segments_iter:
        item: Dict[str, Any] = {
            "start": seg.start,
            "end": seg.end,
            "text": (seg.text or "").strip(),
        }
        segments.append(item)
        if item["text"]:
            pieces.append(item["text"])

    full_text = " ".join(pieces).strip()
    return full_text
    # return {
    #     "text": full_text,
    #     "segments": segments,
    #     "language": getattr(info, "language", None),
    #     "language_probability": getattr(info, "language_probability", None),
    #     "duration": getattr(info, "duration", None),
    # }