from faster_whisper import WhisperModel

model = WhisperModel("large-v3", device="cuda", compute_type="float16")

segments, info = model.transcribe("test_audio.wav", language="en")
print("Detected language:", info.language)
for s in segments:
    print(f"[{s.start:.2f} -{s.end:.2f}] {s.text}")