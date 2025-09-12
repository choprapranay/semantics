import redis
import json

def init_redis():
    client = redis.Redis(
        host="localhost",
        port=6379,
        db=0,
        decode_responses=True
    )

    return client

def session_key(session_id: str) -> str:
    return f"session:{session_id}"

def save_session(client, session_id: str, session_obj: dict): 
    client.set(session_key(session_id), json.dumps(session_obj))

def load_session(client, session_id: str):
    data = client.get(session_key(session_id))
    if data: 
        return json.loads(data)
    return None

def delete_session(client, session_id: str): 
    client.delete(session_key(session_id))
