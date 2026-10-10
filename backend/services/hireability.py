from datetime import datetime, timezone
import math

# Predefined Stacks for Synergy Bonus
TECH_STACKS = {
    "frontend": {"react", "vue", "angular", "html", "css", "javascript", "typescript", "tailwind", "next.js", "svelte"},
    "backend": {"node", "nodejs", "node.js", "python", "django", "fastapi", "express", "java", "spring", "flask", "ruby", "rails"},
    "database": {"postgresql", "mysql", "mongodb", "redis", "sql"},
    "data_science": {"python", "pandas", "numpy", "tensorflow", "pytorch", "keras", "scikit-learn"},
    "devops": {"docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "linux", "git"}
}

FAST_TECH = {"react", "vue", "angular", "next.js", "node", "nodejs", "express", "fastapi", "tensorflow", "pytorch"}
STABLE_TECH = {"html", "css", "javascript", "python", "java", "sql", "postgresql", "mysql", "git", "linux"}

def _get_decay_lambda(skill_name: str) -> float:
    name_lower = skill_name.lower()
    if name_lower in FAST_TECH:
        return 0.005
    # Default for unknown tech leans towards stable to be fair
    return 0.002

def _calculate_days_since(updated_at_str: str) -> int:
    try:
        # Handle cases where timestamp might have Z or offset
        if updated_at_str.endswith('Z'):
            updated_at_str = updated_at_str[:-1] + '+00:00'
        
        # Parse ISO format
        updated_at = datetime.fromisoformat(updated_at_str)
        # Ensure it's UTC aware
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)
            
        now = datetime.now(timezone.utc)
        delta = now - updated_at
        return max(0, delta.days)
    except Exception:
        # If parsing fails, assume 0 days (no penalty)
        return 0

def calculate_hireability_index(skills: list[dict]) -> dict:
    """
    Calculates the Hireability Index based on the research-backed algorithm.
    Input skills format:
    [
        {
            "skill_name": "React",
            "verification_level": 1 or 2,
            "skill_score": 0-100,
            "updated_at": "ISO-8601 string"
        }
    ]
    """
    if not skills:
        return {
            "score": 300, 
            "breakdown": {
                "base_depth": 0,
                "decayed_depth": 0,
                "synergy_multiplier": 1.0,
                "project_bonus": 0,
                "velocity_bonus": 0,
                "consistency_multiplier": 1.0,
                "raw_total": 0
            },
            "points_history": []
        }

    total_base_depth = 0
    total_decayed_depth = 0
    project_bonus = 0
    velocity_bonus = 0
    
    unique_categories = set()
    points_history = []  # Audit trail
    
    # 1. Base Depth & Decay & Velocity & Projects
    for s in skills:
        name = s.get("skill_name", "")
        level = s.get("verification_level", 0)
        score = s.get("skill_score", 0)
        updated_at = s.get("updated_at", datetime.now(timezone.utc).isoformat())
        
        # Calculate Base Depth (L1 = 1x, L2 = 3x)
        # Assuming level 0 is not verified, so we skip or give 0.
        if level == 0:
            continue
            
        weight = 3.0 if level >= 2 else 1.0
        base_skill_pts = score * weight
        total_base_depth += base_skill_pts
        
        # Apply Decay
        days_old = _calculate_days_since(updated_at)
        lam = _get_decay_lambda(name)
        decay_weight = math.exp(-lam * days_old)
        decayed_skill_pts = base_skill_pts * decay_weight
        total_decayed_depth += decayed_skill_pts
        
        # Build audit entry for this skill
        level_label = "L1 Assessment" if level == 1 else "L2 Project Verified"
        events = [
            {
                "type": "skill_assessed",
                "icon": "target",
                "label": f"{name} — {level_label}",
                "detail": f"Score: {score} × {weight}x weight = {round(base_skill_pts)} base pts",
                "pts": round(decayed_skill_pts),
                "color": "indigo",
                "date": updated_at
            }
        ]

        # Velocity Bonus (If updated in last 30 days)
        if days_old <= 30:
            v_bonus = round(score * 0.15)
            velocity_bonus += (score * 0.15)
            events.append({
                "type": "velocity_bonus",
                "icon": "zap",
                "label": f"{name} — 30-Day Velocity Bonus",
                "detail": f"Verified within 30 days: +{v_bonus} pts",
                "pts": v_bonus,
                "color": "orange",
                "date": updated_at
            })
            
        # Project Bonus (L2 skills)
        if level >= 2:
            project_bonus += 50
            events.append({
                "type": "project_bonus",
                "icon": "award",
                "label": f"{name} — Project Submission Bonus",
                "detail": "Level 2 project verified: +50 pts",
                "pts": 50,
                "color": "emerald",
                "date": updated_at
            })
            
        points_history.extend(events)
            
        # Track Categories for Synergy
        name_lower = name.lower()
        for cat, kw_set in TECH_STACKS.items():
            if name_lower in kw_set:
                unique_categories.add(cat)
                
    # 2. Synergy Multiplier
    cat_count = len(unique_categories)
    if cat_count >= 3:
        synergy_multiplier = 1.30
        synergy_desc = f"Skills span {cat_count} tech domains: ×1.30 multiplier"
    elif cat_count == 2:
        synergy_multiplier = 1.15
        synergy_desc = f"Skills span {cat_count} tech domains: ×1.15 multiplier"
    else:
        synergy_multiplier = 1.0
        synergy_desc = "Expand to 2+ tech domains to unlock synergy bonuses"
        
    if cat_count >= 2:
        points_history.append({
            "type": "synergy_bonus",
            "icon": "🔗",
            "label": f"Stack Synergy Bonus — {', '.join(list(unique_categories)[:3])}",
            "detail": synergy_desc,
            "pts": f"×{synergy_multiplier}",
            "color": "blue",
            "date": None
        })
        
    # 3. Consistency Multiplier
    consistency_multiplier = 1.0
    if len(skills) > 1:
        dates = [_calculate_days_since(s.get("updated_at", datetime.now(timezone.utc).isoformat())) for s in skills if s.get("verification_level", 0) > 0]
        if dates:
            spread = max(dates) - min(dates)
            if spread > 30:
                consistency_multiplier = 1.20
                points_history.append({
                    "type": "consistency_bonus",
                    "icon": "📅",
                    "label": "Long-term Consistency Bonus",
                    "detail": f"Learning spread over {spread}+ days: ×1.20 multiplier applied",
                    "pts": "×1.20",
                    "color": "purple",
                    "date": None
                })
            elif spread > 7:
                consistency_multiplier = 1.10
                points_history.append({
                    "type": "consistency_bonus",
                    "icon": "📅",
                    "label": "Weekly Consistency Bonus",
                    "detail": f"Learning spread over {spread} days: ×1.10 multiplier applied",
                    "pts": "×1.10",
                    "color": "purple",
                    "date": None
                })
    
    # Calculate Final Raw Score
    raw_score = (total_decayed_depth * synergy_multiplier * consistency_multiplier) + project_bonus + velocity_bonus
    
    # Normalize to 300 - 850 range using an Asymptotic Curve
    INDEX_MIN = 300
    INDEX_MAX = 850
    SCALING_FACTOR = 1000.0
    
    asymptotic_multiplier = 1.0 - math.exp(-raw_score / SCALING_FACTOR)
    hireability_index = INDEX_MIN + (INDEX_MAX - INDEX_MIN) * asymptotic_multiplier
    hireability_index = min(INDEX_MAX - 1, int(hireability_index))
    
    # Sort history: skill entries by date desc (newest first), multipliers at end
    dated = [e for e in points_history if e.get("date")]
    multipliers = [e for e in points_history if not e.get("date")]
    dated.sort(key=lambda x: x["date"], reverse=True)
    points_history = dated + multipliers
    
    return {
        "score": int(hireability_index),
        "breakdown": {
            "base_depth": round(total_base_depth, 2),
            "decayed_depth": round(total_decayed_depth, 2),
            "synergy_multiplier": synergy_multiplier,
            "consistency_multiplier": consistency_multiplier,
            "project_bonus": project_bonus,
            "velocity_bonus": round(velocity_bonus, 2),
            "raw_total": round(raw_score, 2)
        },
        "points_history": points_history
    }

