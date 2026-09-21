"""
groq_models.py - Single source of truth for available Groq model names.

All services should import from here. When models change, update ONLY this file.

Based on: GET https://api.groq.com/openai/v1/models (queried 2026-08-29)
"""

# Primary model — best quality, use for complex reasoning (roadmap generation, MCQ, etc.)
GROQ_PRIMARY = "qwen/qwen3.8-27b"

# Fast model — lower latency, use for simple extraction/normalization tasks
GROQ_FAST = "openai/gpt-oss-20b"

# Fallback chain — tried in order if primary fails
GROQ_FALLBACK_CHAIN = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "groq/compound",
    "openai/gpt-oss-20b",
]
