"""
curriculum_discovery.py - Real-Data Curriculum Extraction Pipeline

Fetches learning nodes from real-world curriculum sources:
1. roadmap.sh GitHub JSON (primary)
2. GitHub Awesome Lists (secondary)

Validates with 3 layers:
  Layer 1: Cross-source confidence scoring (multi-source voting)
  Layer 2: Groq semantic validation ("Is this real for this role?")
  Layer 3: Fuzzy duplicate guard (deduplication against existing DB nodes)

Auto-seeds validated nodes to learning_nodes + learning_prerequisites tables.
"""

import requests
import difflib
import random
import os
import json
from typing import List, Dict, Any, Optional, Tuple
from database import supabase

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# GROQ CLIENT (re-uses existing key pool from .env)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
from dotenv import dotenv_values
env_vars = dotenv_values(os.path.join(os.path.dirname(__file__), "../../.env"))
keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
_groq_keys = [k.strip() for k in keys_str.split(",") if k.strip()]

def _get_groq_client():
    from groq import Groq
    key = random.choice(_groq_keys) if _groq_keys else None
    return Groq(api_key=key)

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# ROADMAP.SH SLUG MAP (community-maintained GitHub JSON roadmaps)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ROADMAP_SH_SLUG_MAP = {
    "frontend developer": "frontend",
    "frontend":           "frontend",
    "react developer":    "react",
    "backend developer":  "backend",
    "backend":            "backend",
    "full stack developer": "full-stack",
    "fullstack developer":  "full-stack",
    "devops engineer":    "devops",
    "devops":             "devops",
    "data scientist":     "data-science",
    "data science":       "data-science",
    "machine learning engineer": "mlops",
    "mlops engineer":     "mlops",
    "cybersecurity analyst": "cyber-security",
    "cybersecurity":      "cyber-security",
    "network security":   "cyber-security",
    "android developer":  "android",
    "ios developer":      "ios",
    "cloud architect":    "aws",
    "aws engineer":       "aws",
    "blockchain developer": "blockchain",
    "game developer":     "game-developer",
    "qa engineer":        "qa",
    "ux designer":        "ux-design",
    "postgresql dba":     "postgresql-dba",
}

# roadmap.sh changed its JSON structure. We try multiple known URL patterns.
ROADMAP_SH_URL_PATTERNS = [
    "https://raw.githubusercontent.com/kamranahmedse/developer-roadmap/master/public/roadmaps/{slug}.json",
    "https://roadmap.sh/api/v1/roadmaps/{slug}",
]

# Difficulty tags used in roadmap.sh JSONs
SH_DIFFICULTY_MAP = {
    "beginner":     "foundation",
    "intermediate": "core",
    "advanced":     "advanced",
    # fallback
    "required":     "core",
    "optional":     "advanced",
    "good_to_know": "advanced",
    "personal_opinion": "advanced"
}


def _resolve_slug(role_name: str) -> Optional[str]:
    """Map a free-text role name to a roadmap.sh slug, with fuzzy fallback."""
    role_lower = role_name.lower().strip()
    if role_lower in ROADMAP_SH_SLUG_MAP:
        return ROADMAP_SH_SLUG_MAP[role_lower]
    # Fuzzy match
    matches = difflib.get_close_matches(role_lower, ROADMAP_SH_SLUG_MAP.keys(), n=1, cutoff=0.5)
    if matches:
        return ROADMAP_SH_SLUG_MAP[matches[0]]
    return None


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# LAYER 1: SOURCE FETCHERS
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def fetch_roadmap_sh(role_name: str) -> List[Dict[str, Any]]:
    """
    Fetches structured topic nodes from roadmap.sh community JSON.
    Returns list of {"name": str, "difficulty": str} dicts.
    """
    slug = _resolve_slug(role_name)
    if not slug:
        print(f"[CurriculumDiscovery] No roadmap.sh slug found for role: {role_name}")
        return []

    # Try all known URL patterns until one works
    data = None
    for pattern in ROADMAP_SH_URL_PATTERNS:
        url = pattern.format(slug=slug)
        try:
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                print(f"[CurriculumDiscovery] roadmap.sh OK from: {url}")
                break
            else:
                print(f"[CurriculumDiscovery] roadmap.sh HTTP {res.status_code} for {url}")
        except Exception as e:
            print(f"[CurriculumDiscovery] roadmap.sh URL failed ({url}): {e}")

    if not data:
        print(f"[CurriculumDiscovery] roadmap.sh: no data available for slug '{slug}'")
        return []

    topics = []
    # Handle both old JSON (nodes array) and new API formats
    nodes = data.get("nodes", data.get("content", []))
    if isinstance(nodes, list):
        for node in nodes:
            node_type = node.get("type", "")
            if node_type not in ("topic", "subtopic", "skill"):
                continue

            label = node.get("data", {}).get("label", node.get("title", "")).strip()
            if not label or len(label) < 2:
                continue

            diff = "core"
            if "beginner" in str(node).lower() or "basic" in str(node).lower():
                diff = "foundation"
            elif "advanced" in str(node).lower():
                diff = "advanced"

            topics.append({"name": label, "difficulty": diff, "source": "roadmap.sh"})

    print(f"[CurriculumDiscovery] roadmap.sh returned {len(topics)} topics for '{role_name}'")
    return topics


def fetch_github_awesome(role_name: str) -> List[Dict[str, Any]]:
    """
    Fetches learning topics from an 'awesome-<role>' GitHub repo README.
    Extracts markdown list items as topic candidates.
    """
    # We reuse the existing knowledge_acquisition utility
    try:
        from services.knowledge_acquisition import search_github_awesome_list
        # Build a clean ecosystem keyword
        keyword = role_name.lower().replace(" developer", "").replace(" engineer", "").replace(" analyst", "").strip()
        readme = search_github_awesome_list(keyword)
        if not readme:
            return []

        topics = []
        for line in readme.split("\n"):
            line = line.strip()
            # Markdown list items: "- [Topic Name](url)" or "- Topic Name"
            if line.startswith("-") or line.startswith("*"):
                # Extract the link text or plain text
                import re
                match = re.search(r'\[([^\]]+)\]', line)
                if match:
                    label = match.group(1).strip()
                else:
                    label = line.lstrip("-* ").split(":")[0].strip()

                # Skip lines that are too long (they're descriptions, not tool names)
                if not label or len(label) > 60 or len(label) < 2:
                    continue
                # Skip generic words
                skip_words = {"resources", "books", "tutorials", "videos", "courses",
                              "tools", "learning", "getting started", "introduction", "contributing", "license"}
                if label.lower() in skip_words:
                    continue

                topics.append({"name": label, "difficulty": "core", "source": "github-awesome"})

        print(f"[CurriculumDiscovery] GitHub Awesome returned {len(topics)} candidates for '{role_name}'")
        return topics[:60]  # Cap to avoid noise
    except Exception as e:
        print(f"[CurriculumDiscovery] GitHub awesome fetch failed: {e}")
        return []


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# LAYER 1: CROSS-SOURCE CONFIDENCE VOTING
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _vote_and_merge(
    roadmap_sh_topics: List[Dict],
    awesome_topics: List[Dict]
) -> List[Dict[str, Any]]:
    """
    Merges topic lists and assigns confidence scores based on cross-source agreement.
    Returns candidates with score >= 2 (appeared in at least 2 sources / high-confidence single source).
    """
    vote_map: Dict[str, Dict] = {}

    def _normalize(name: str) -> str:
        return name.lower().strip().replace(".", "").replace("-", " ")

    def _add_vote(name: str, difficulty: str, source: str, weight: int = 1):
        key = _normalize(name)
        if key not in vote_map:
            vote_map[key] = {
                "name": name,
                "difficulty": difficulty,
                "sources": [],
                "score": 0
            }
        vote_map[key]["sources"].append(source)
        vote_map[key]["score"] += weight
        # Keep best difficulty (foundation > core > advanced)
        priority = {"foundation": 0, "core": 1, "advanced": 2}
        if priority.get(difficulty, 1) < priority.get(vote_map[key]["difficulty"], 1):
            vote_map[key]["difficulty"] = difficulty

    # roadmap.sh gets weight=2 (official, structured)
    for t in roadmap_sh_topics:
        _add_vote(t["name"], t["difficulty"], "roadmap.sh", weight=2)

    # GitHub awesome gets weight=1
    for t in awesome_topics:
        _add_vote(t["name"], t["difficulty"], "github-awesome", weight=1)

    # ADAPTIVE THRESHOLD:
    # - If roadmap.sh has data: require score >= 2 (must appear in roadmap.sh or both sources)
    # - If roadmap.sh returned nothing: GitHub alone is our only source, accept score >= 1
    min_score = 2 if roadmap_sh_topics else 1
    validated = [v for v in vote_map.values() if v["score"] >= min_score]
    print(f"[CurriculumDiscovery] Cross-source voting: {len(validated)}/{len(vote_map)} topics passed (score>={min_score})")
    return validated


# ———————————————————————————————————————————————————————————————————————————————————————————————————
# LAYER 2: GROQ SEMANTIC VALIDATION
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _validate_with_groq(candidates: List[Dict], role_name: str) -> List[Dict]:
    """
    Passes candidate topics to Groq for semantic relevance check.
    Groq returns a JSON list of validated topic names.
    Topics not returned by Groq are discarded.
    """
    if not candidates or not _groq_keys:
        return candidates

    # Batch to avoid huge prompts â€” max 30 per call
    batch = candidates[:30]
    names = [c["name"] for c in batch]

    prompt = f"""You are a senior curriculum validator for tech education.

I have auto-extracted these candidate topics for a learning roadmap for the role: "{role_name}".

Your job:
1. Remove any topic that is NOT a legitimate technical skill, tool, concept, or technology for this role in 2026.
2. Remove vague entries like "Resources", "Books", "Introduction", generic headings.
3. Remove duplicates (e.g. if both "React" and "ReactJS" exist, keep only "React").
4. Assign the correct difficulty for each valid topic: "foundation", "core", or "advanced".

Candidate topics:
{json.dumps(names, indent=2)}

Return ONLY a JSON array of objects with this exact format:
[{{"name": "Topic Name", "difficulty": "foundation|core|advanced"}}, ...]

Return ONLY the JSON array, no explanation.
"""
    # Try models in priority order (handle model availability changes)
    from groq_models import GROQ_FALLBACK_CHAIN
    try:
        client = _get_groq_client()
        response = None
        for model_name in GROQ_FALLBACK_CHAIN:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=1024
                )
                break
            except Exception as me:
                print(f"[CurriculumDiscovery] Groq model '{model_name}' failed: {me}")
        if not response:
            return candidates
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        validated = json.loads(raw)
        if isinstance(validated, list):
            # SAFETY GUARD: If Groq rejects ALL topics, that's suspicious — fall back to originals
            if len(validated) == 0:
                print(f"[CurriculumDiscovery] Groq returned 0 approvals — suspicious, using originals as fallback")
                return candidates
            # Also reject if Groq approved less than 20% of input (over-filtering)
            approval_rate = len(validated) / max(len(batch), 1)
            if approval_rate < 0.20:
                print(f"[CurriculumDiscovery] Groq approval rate too low ({approval_rate:.0%}) — using originals")
                return candidates
            print(f"[CurriculumDiscovery] Groq validation: {len(validated)}/{len(batch)} topics approved")
            return validated
    except Exception as e:
        print(f"[CurriculumDiscovery] Groq validation failed, skipping: {e}")
    return candidates  # Fallback: return original if Groq fails


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# LAYER 3: FUZZY DUPLICATE GUARD
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _dedup_against_existing(candidates: List[Dict]) -> List[Dict]:
    """
    Checks candidates against existing learning_nodes in DB.
    Uses fuzzy matching to detect near-duplicates.
    Returns only truly new candidates.
    """
    try:
        existing_res = supabase.table("learning_nodes").select("concept_name").execute()
        existing_names = [n["concept_name"].lower().strip() for n in (existing_res.data or [])]
    except Exception:
        return candidates

    new_candidates = []
    for c in candidates:
        name_lower = c["name"].lower().strip()
        matches = difflib.get_close_matches(name_lower, existing_names, n=1, cutoff=0.85)
        if matches:
            print(f"[CurriculumDiscovery] Skipping duplicate: '{c['name']}' â‰ˆ '{matches[0]}'")
        else:
            new_candidates.append(c)

    print(f"[CurriculumDiscovery] Dedup: {len(new_candidates)}/{len(candidates)} topics are genuinely new")
    return new_candidates


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# SEEDING: INSERT VALIDATED NODES TO DB
# â”€â”€â”€â”€â�    print(f"\n[CurriculumDiscovery] >> Starting auto-discovery for role: '{role_name}'")

    # Step 1: Fetch from all sources
    sh_topics      = fetch_roadmap_sh(role_name)
    awesome_topics = fetch_github_awesome(role_name)

    if not sh_topics and not awesome_topics:
        print(f"[CurriculumDiscovery] WARNING: No data from external sources. Falling back to Groq-only generation...")
        sh_topics = _generate_curriculum_with_groq(role_name)
        if not sh_topics:
            print(f"[CurriculumDiscovery] ERROR: All sources failed for '{role_name}'")
            return 0

    # Step 2: Cross-source voting
    voted_candidates = _vote_and_merge(sh_topics, awesome_topics)
    if not voted_candidates:
        voted_candidates = sh_topics or awesome_topics[:20]

    # Step 3: Groq semantic validation (skip if topics already came from Groq)
    already_groq_sourced = all(t.get("source") == "groq-direct" for t in voted_candidates)
    if already_groq_sourced:
        validated = voted_candidates
        print(f"[CurriculumDiscovery] Skipping Groq re-validation (topics already from Groq)")
    else:
        validated = _validate_with_groq(voted_candidates, role_name)

    # Step 4: Fuzzy deduplication
    truly_new = _dedup_against_existing(validated)

    if not truly_new:
        print(f"[CurriculumDiscovery] INFO: All discovered topics already exist in DB.")
        return 0

    # Step 5: Seed to DB
    node_id_map = _seed_validated_nodes(truly_new)

    # Step 6: Link prerequisites
    if node_id_map:
        _link_prerequisites_by_difficulty(node_id_map, truly_new)

    print(f"[CurriculumDiscovery] DONE: {len(node_id_map)} new nodes seeded for '{role_name}'\n")
    return len(node_id_map)


def _generate_curriculum_with_groq(role_name: str) -> List[Dict[str, Any]]:
    """
    Groq-only fallback: directly asks the LLM to generate a structured curriculum
    for the given role when all external sources (roadmap.sh, GitHub) are unavailable.
    Returns list of {"name": str, "difficulty": str, "source": "groq-direct"} dicts.
    """
    if not _groq_keys:
        print("[CurriculumDiscovery] No Groq API keys available for fallback generation.")
        return []

    prompt = f"""You are an expert curriculum designer for tech careers.

Generate a comprehensive, structured learning curriculum for the role: "{role_name}"

Requirements:
- Include 15-25 specific, real technical skills, tools, frameworks, and concepts
- Categorize each as "foundation" (basics), "core" (essential job skills), or "advanced" (expert skills)
- Use the actual tool/technology names (e.g., "Python", "Docker", "REST APIs", not vague terms)
- Cover the full learning path from beginner to job-ready level
- Do NOT include vague topics like "Resources", "Introduction", "Overview"

Return ONLY a JSON array with this exact format:
[{{"name": "Skill Name", "difficulty": "foundation|core|advanced"}}, ...]

No explanation, just the JSON array.
"""
    from groq_models import GROQ_FALLBACK_CHAIN
    try:
        client = _get_groq_client()
        response = None
        for model_name in GROQ_FALLBACK_CHAIN:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=1500
                )
                break
            except Exception as me:
                print(f"[CurriculumDiscovery] Groq fallback model '{model_name}' failed: {me}")

        if not response:
            return []

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        topics = json.loads(raw)
        if isinstance(topics, list) and len(topics) > 0:
            # Tag as groq-direct so we skip re-validation
            for t in topics:
                t["source"] = "groq-direct"
            print(f"[CurriculumDiscovery] Groq-direct generated {len(topics)} topics for '{role_name}'")
            return topics
    except Exception as e:
        print(f"[CurriculumDiscovery] Groq-direct generation failed: {e}")

    return []
def _seed_validated_nodes(topics: List[Dict]) -> Dict[str, str]:
    """
    Inserts validated topics into learning_nodes table.
    Returns mapping of concept_name -> node_id for prerequisite linking.
    """
    node_id_map: Dict[str, str] = {}

    for topic in topics:
        name = topic["name"]
        difficulty = topic.get("difficulty", "core")

        tech_id = _ensure_technology(name)
        if not tech_id:
            continue

        try:
            res = supabase.table("learning_nodes").insert({
                "technology_id": tech_id,
                "concept_name": name,
                "difficulty_level": difficulty
            }).execute()
            if res.data:
                node_id_map[name] = res.data[0]["id"]
                print(f"[CurriculumDiscovery] âœ… Seeded node: '{name}' ({difficulty})")
        except Exception as e:
            # May already exist â€” fetch it
            try:
                ex = supabase.table("learning_nodes").select("id").ilike("concept_name", name).execute()
                if ex.data:
                    node_id_map[name] = ex.data[0]["id"]
            except Exception:
                pass

    return node_id_map


def _link_prerequisites_by_difficulty(node_id_map: Dict[str, str], topics: List[Dict]):
    """
    Auto-links nodes by difficulty chain:
    foundation â†’ core â†’ advanced
    
    For each node, finds the highest-difficulty node from the previous tier
    to use as a prerequisite, forming a minimal learning path scaffold.
    """
    foundation_nodes = [t["name"] for t in topics if t.get("difficulty") == "foundation"]
    core_nodes       = [t["name"] for t in topics if t.get("difficulty") == "core"]
    advanced_nodes   = [t["name"] for t in topics if t.get("difficulty") == "advanced"]

    def link(parent_name: str, child_name: str):
        pid = node_id_map.get(parent_name)
        cid = node_id_map.get(child_name)
        if pid and cid:
            try:
                supabase.table("learning_prerequisites").insert({
                    "node_id": cid,
                    "prerequisite_node_id": pid
                }).execute()
            except Exception:
                pass  # Already linked

    # Link: last foundation â†’ first core
    if foundation_nodes and core_nodes:
        link(foundation_nodes[-1], core_nodes[0])

    # Link: last core â†’ first advanced
    if core_nodes and advanced_nodes:
        link(core_nodes[-1], advanced_nodes[0])

    # Chain within each difficulty tier (linear progression)
    def chain_tier(tier: List[str]):
        for i in range(len(tier) - 1):
            link(tier[i], tier[i + 1])

    chain_tier(foundation_nodes)
    chain_tier(core_nodes)
    chain_tier(advanced_nodes)

    print(f"[CurriculumDiscovery] Prerequisite chains built: {len(foundation_nodes)} foundation â†’ {len(core_nodes)} core â†’ {len(advanced_nodes)} advanced")


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# MAIN ENTRY POINT
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def auto_discover_and_seed_nodes(role_name: str) -> int:
    """
    Full validated curriculum discovery pipeline.
    Called when roadmap generation finds zero learning nodes for a role.

    Priority order:
      1. roadmap.sh + GitHub Awesome (cross-source voting + Groq validation)
      2. Groq-direct generation (when external sources fail due to network)

    Returns: number of new nodes seeded.
    """
    print("\n[CurriculumDiscovery] >> Starting auto-discovery for role: " + repr(role_name))

    # Step 1: Try external sources
    sh_topics      = fetch_roadmap_sh(role_name)
    awesome_topics = fetch_github_awesome(role_name)

    # Step 2: If both external sources failed -> use Groq directly
    if not sh_topics and not awesome_topics:
        print("[CurriculumDiscovery] WARNING: External sources unavailable. Using Groq-direct generation.")
        groq_topics = _generate_curriculum_with_groq(role_name)
        if not groq_topics:
            print("[CurriculumDiscovery] ERROR: All sources failed for " + repr(role_name))
            return 0
        truly_new = _dedup_against_existing(groq_topics)
        if not truly_new:
            print("[CurriculumDiscovery] INFO: All Groq-generated topics already exist in DB.")
            return 0
        node_id_map = _seed_validated_nodes(truly_new)
        if node_id_map:
            _link_prerequisites_by_difficulty(node_id_map, truly_new)
        print("[CurriculumDiscovery] DONE (Groq-direct): " + str(len(node_id_map)) + " nodes seeded for " + repr(role_name))
        return len(node_id_map)

    # Step 3: Cross-source voting
    voted_candidates = _vote_and_merge(sh_topics, awesome_topics)
    if not voted_candidates:
        voted_candidates = sh_topics or awesome_topics[:20]

    # Step 4: Groq semantic validation
    validated = _validate_with_groq(voted_candidates, role_name)

    # Step 5: Fuzzy deduplication
    truly_new = _dedup_against_existing(validated)

    if not truly_new:
        print("[CurriculumDiscovery] INFO: All discovered topics already exist in DB.")
        return 0

    # Step 6: Seed to DB
    node_id_map = _seed_validated_nodes(truly_new)

    # Step 7: Link prerequisites
    if node_id_map:
        _link_prerequisites_by_difficulty(node_id_map, truly_new)

    print("[CurriculumDiscovery] DONE: " + str(len(node_id_map)) + " new nodes seeded for " + repr(role_name))
    return len(node_id_map)


def _generate_curriculum_with_groq(role_name: str) -> list:
    """
    Groq-only fallback: generates a full structured curriculum directly via LLM
    when all external sources are unavailable (network timeout, 404, etc.)
    Returns list of dicts with keys: name, difficulty, source.
    Minimum 15 nodes guaranteed by prompt.
    """
    if not _groq_keys:
        print("[CurriculumDiscovery] No Groq API keys available for fallback.")
        return []

    prompt = (
        'You are an expert curriculum designer for tech careers in 2026.\n\n'
        'Generate a comprehensive, structured learning curriculum for the role: "' + role_name + '"\n\n'
        'Rules:\n'
        '- Include EXACTLY 15-20 specific technical skills, tools, frameworks, and concepts\n'
        '- Minimum 4 "foundation" (beginner basics), 6 "core" (essential job skills), 4 "advanced" (expert-level)\n'
        '- Use specific real names: "Python", "Docker", "PostgreSQL" -- NOT vague terms like "Programming" or "Databases"\n'
        '- Cover the COMPLETE path from zero to job-ready\n'
        '- Do NOT include: "Resources", "Introduction", "Overview", "General", "Other", "Books", "Tutorials"\n'
        '- Every topic must be a REAL specific technology a hiring manager would look for\n\n'
        'Return ONLY a valid JSON array, no explanation, no markdown fences:\n'
        '[{"name": "Python Programming", "difficulty": "foundation"}, {"name": "SQL", "difficulty": "foundation"}, ...]'
    )

    from groq_models import GROQ_FALLBACK_CHAIN
    try:
        client = _get_groq_client()
        response = None
        for model_name in GROQ_FALLBACK_CHAIN:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                    max_tokens=1500
                )
                print("[CurriculumDiscovery] Groq-direct using model: " + model_name)
                break
            except Exception as me:
                print("[CurriculumDiscovery] Model " + repr(model_name) + " failed: " + str(me))

        if not response:
            return []

        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else parts[0]
            if raw.startswith("json"):
                raw = raw[4:]

        topics = json.loads(raw.strip())
        if isinstance(topics, list) and len(topics) >= 5:
            for t in topics:
                t["source"] = "groq-direct"
            print("[CurriculumDiscovery] Groq-direct generated " + str(len(topics)) + " topics for " + repr(role_name))
            return topics
        else:
            count = len(topics) if isinstance(topics, list) else 0
            print("[CurriculumDiscovery] Groq-direct returned too few topics: " + str(count))
    except Exception as e:
        print("[CurriculumDiscovery] Groq-direct generation failed: " + str(e))

    return []
