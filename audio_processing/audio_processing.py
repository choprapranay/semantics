from audio_processing_helpers import (
    get_audio_path, download_audio_to_tmp, upload_transcript_txt)

from transcription import transcribe_audio 

def process_user_audio(user_name: str, filename: str | None = None):
    audio_storage_key = get_audio_path(user_name, filename)
    if not audio_storage_key:
        raise FileNotFoundError("No audio found for the given user/filename.")

    local_audio = download_audio_to_tmp(audio_storage_key)

    transcript = transcribe_audio(local_audio)

    trans_key = upload_transcript_txt(user_name, audio_storage_key, transcript)
    print(trans_key)

    return transcript

print(process_user_audio("sambhav"))