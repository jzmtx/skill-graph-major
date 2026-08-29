from groq_models import GROQ_PRIMARY, GROQ_FAST
import os
from groq import Groq
from dotenv import dotenv_values

# Initialize Groq client
from dotenv import dotenv_values
import random
env_vars = dotenv_values(".env")
keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
groq_client = Groq(api_key=random.choice(key_list) if key_list else None)

def get_chat_response(roadmap_json: dict, messages: list):
    system_prompt = f"""You are an expert AI Career Assistant and Tech Architect.
Your job is to answer the user's questions about their learning roadmap.
You have access to the exact JSON roadmap generated for them, which includes market analysis, technical choices, and structure.

Here is the user's generated roadmap:
{roadmap_json}

Use this information to answer their questions accurately. Do not invent skills that are not in the roadmap unless they ask about outside technologies. Be helpful, concise, and professional."""
    
    # Prepend system prompt
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for m in messages:
        formatted_messages.append({"role": m["role"], "content": m["content"]})
        
    completion = groq_client.chat.completions.create(
        messages=formatted_messages,
        model=GROQ_PRIMARY,
        temperature=0.7
    )
    
    return completion.choices[0].message.content.strip()
