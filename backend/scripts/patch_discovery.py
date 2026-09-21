"""
Replaces auto_discover_and_seed_nodes and adds _generate_curriculum_with_groq fallback.
Run once from d:/skillgraph/backend/
"""

NEW_CODE = '''def auto_discover_and_seed_nodes(role_name: str) -> int:
    """
    Full validated curriculum discovery pipeline.
    Called when roadmap generation finds zero learning nodes for a role.

    Priority order:
      1. roadmap.sh + GitHub Awesome (cross-source voting + Groq validation)
      2. Groq-direct generation (when external sources fail due to network)

    Returns: number of new nodes seeded.
    """
    print("\\n[CurriculumDiscovery] >> Starting auto-discovery for role: " + repr(role_name))

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
        \'You are an expert curriculum designer for tech careers in 2026.\\n\\n\'
        \'Generate a comprehensive, structured learning curriculum for the role: "\' + role_name + \'"\\n\\n\'
        \'Rules:\\n\'
        \'- Include EXACTLY 15-20 specific technical skills, tools, frameworks, and concepts\\n\'
        \'- Minimum 4 "foundation" (beginner basics), 6 "core" (essential job skills), 4 "advanced" (expert-level)\\n\'
        \'- Use specific real names: "Python", "Docker", "PostgreSQL" -- NOT vague terms like "Programming" or "Databases"\\n\'
        \'- Cover the COMPLETE path from zero to job-ready\\n\'
        \'- Do NOT include: "Resources", "Introduction", "Overview", "General", "Other", "Books", "Tutorials"\\n\'
        \'- Every topic must be a REAL specific technology a hiring manager would look for\\n\\n\'
        \'Return ONLY a valid JSON array, no explanation, no markdown fences:\\n\'
        \'[{"name": "Python Programming", "difficulty": "foundation"}, {"name": "SQL", "difficulty": "foundation"}, ...]\'
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
'''

with open('roadmap_engine/ingestion/curriculum_discovery.py', 'rb') as f:
    content = f.read().decode('utf-8', errors='replace')

marker = 'def auto_discover_and_seed_nodes(role_name: str) -> int:'
idx = content.find(marker)
if idx == -1:
    print('ERROR: marker not found')
else:
    # Keep everything before the function, replace from function onwards
    new_content = content[:idx] + NEW_CODE
    with open('roadmap_engine/ingestion/curriculum_discovery.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('SUCCESS: Written', len(new_content), 'chars')
