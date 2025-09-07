import os
import io
import json
import pathlib
from datetime import datetime
from typing import Optional, Dict
from supabase_client import supabase
import io, os, os.path as op


AUDIO_BUCKET = os.environ.get("AUDIO_BUCKET", "audio-recordings")
TEXT_BUCKET  = os.environ.get("TEXT_BUCKET",  "transcriptions")

def list_user_audio(user_name: str):
    folder = f"{user_name}/"
    resp = supabase.storage.from_(AUDIO_BUCKET).list(folder, {"limit": 1000})

    # Normalize shape
    if isinstance(resp, list):
        return resp
    if isinstance(resp, dict):
        return resp.get("data", []) or []
    return []

def pick_latest(files: list) -> Optional[Dict]:
    # Choose the newest by updated_at/created_at if available
    def ts(obj):
        for k in ("updated_at", "created_at"):
            v = obj.get(k)
            if v:
                try:
                    return datetime.fromisoformat(v.replace("Z", "+00:00"))
                except Exception:
                    pass
        return datetime.min
    if not files:
        return None
    return sorted(files, key=ts, reverse=True)[0]

def get_audio_path(user_name: str, filename: str | None = None) -> str | None:
    folder = f"{user_name}/"
    files = list_user_audio(user_name)
    if not files:
        return None

    if filename:
        match = next((f for f in files if f.get("name") == filename), None)
        return f"{folder}{match['name']}" if match else None

    # Pick newest by updated_at/created_at if present
    def ts(obj):
        for k in ("updated_at", "created_at"):
            v = obj.get(k)
            if v:
                try:
                    # handle "Z" suffix
                    from datetime import datetime
                    return datetime.fromisoformat(v.replace("Z", "+00:00"))
                except Exception:
                    pass
        # fallback when no timestamp available
        return 0

    latest = sorted(files, key=ts, reverse=True)[0]
    return f"{folder}{latest['name']}"

def download_audio_to_tmp(storage_key: str) -> str:
    blob = supabase.storage.from_(AUDIO_BUCKET).download(storage_key)
    local_path = f"/tmp/{storage_key.replace('/', '_')}"
    pathlib.Path(local_path).parent.mkdir(parents=True, exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(blob)
    return local_path

def upload_transcript_txt(user_name: str, audio_storage_key: str, transcript_text: str) -> str:
    uname = user_name
    basename = op.splitext(op.basename(audio_storage_key))[0]
    out_key = f"{uname}/{basename}.txt"
    content_bytes = transcript_text.encode("utf-8")

    try:
        supabase.storage.from_(TEXT_BUCKET).upload(
            out_key,
            content_bytes,
            {
                "contentType": "text/plain; charset=utf-8",
                # "upsert": "true",  # <-- If you really want upsert, make it a STRING not bool
                "cacheControl": "3600",  # strings are safe for headers
            },
        )
    except Exception as e:
        # 2) If the file exists (409 conflict), overwrite with update()
        msg = str(e).lower()
        if "409" in msg or "exists" in msg or "conflict" in msg:
            supabase.storage.from_(TEXT_BUCKET).update(
                out_key,
                content_bytes,
                {
                    "contentType": "text/plain; charset=utf-8",
                    "cacheControl": "3600",
                },
            )
        else:
            raise

    return out_key