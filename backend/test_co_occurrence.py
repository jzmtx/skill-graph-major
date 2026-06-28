import math

def calculate_relationships(jd_skills_lists, core_skills):
    # jd_skills_lists: list of lists, e.g., [['Python', 'FastAPI'], ['Python', 'Django', 'PostgreSQL']]
    # core_skills: list of dicts, e.g., [{'skill': 'Python', 'percentage': 95}, ...]
    
    total_jds = len(jd_skills_lists)
    if total_jds == 0:
        return []

    # Calculate frequencies
    freq = {}
    for skills in jd_skills_lists:
        for s in set(skills):
            freq[s] = freq.get(s, 0) + 1

    # Calculate co-occurrences
    co_matrix = {}
    for skills in jd_skills_lists:
        unique_skills = list(set(skills))
        for i in range(len(unique_skills)):
            for j in range(i + 1, len(unique_skills)):
                s1, s2 = unique_skills[i], unique_skills[j]
                if s1 not in co_matrix: co_matrix[s1] = {}
                if s2 not in co_matrix: co_matrix[s2] = {}
                co_matrix[s1][s2] = co_matrix[s1].get(s2, 0) + 1
                co_matrix[s2][s1] = co_matrix[s2].get(s1, 0) + 1

    relationships = []
    
    # We only care about relationships between core/recommended skills
    target_skills = [s['skill'] for s in core_skills]
    
    for i in range(len(target_skills)):
        for j in range(i + 1, len(target_skills)):
            s1 = target_skills[i]
            s2 = target_skills[j]
            
            count_s1 = freq.get(s1, 0)
            count_s2 = freq.get(s2, 0)
            intersection = co_matrix.get(s1, {}).get(s2, 0)
            
            if count_s1 == 0 or count_s2 == 0:
                continue
                
            # Probabilities
            p_s1 = count_s1 / total_jds
            p_s2 = count_s2 / total_jds
            p_intersection = intersection / total_jds
            
            p_s2_given_s1 = intersection / count_s1
            p_s1_given_s2 = intersection / count_s2
            
            # Alternative: Both have decent frequency, but rarely appear together
            # e.g., FastAPI (30%) and Django (40%), intersection (5%)
            if p_s1 > 0.1 and p_s2 > 0.1 and (intersection / max(count_s1, count_s2)) < 0.2:
                relationships.append({"from": s1, "to": s2, "relation": "ALTERNATIVE", "confidence": round((1 - (intersection / min(count_s1, count_s2))) * 100)})
                continue
                
            # Complements: High mutual occurrence
            if p_s2_given_s1 > 0.75 and p_s1_given_s2 > 0.75:
                relationships.append({"from": s1, "to": s2, "relation": "COMPLEMENTS", "confidence": round(min(p_s2_given_s1, p_s1_given_s2) * 100)})
                continue
                
            # Requires: One strongly implies the other
            if p_s1_given_s2 > 0.85 and p_s2_given_s1 < 0.6:
                relationships.append({"from": s2, "to": s1, "relation": "REQUIRES", "confidence": round(p_s1_given_s2 * 100)})
            elif p_s2_given_s1 > 0.85 and p_s1_given_s2 < 0.6:
                relationships.append({"from": s1, "to": s2, "relation": "REQUIRES", "confidence": round(p_s2_given_s1 * 100)})
                
    return relationships

# Test
jds = [
    ['Python', 'FastAPI', 'Docker', 'PostgreSQL'],
    ['Python', 'Django', 'Docker', 'Redis'],
    ['Python', 'Flask', 'SQLAlchemy'],
    ['Python', 'Django', 'PostgreSQL', 'Redis'],
    ['Python', 'FastAPI', 'PostgreSQL'],
    ['Java', 'Spring Boot', 'Docker'],
    ['Python', 'NumPy', 'Pandas'],
    ['Python', 'NumPy', 'Pandas', 'Scikit-learn']
]

core = [
    {'skill': 'Python', 'percentage': 90},
    {'skill': 'FastAPI', 'percentage': 25},
    {'skill': 'Django', 'percentage': 25},
    {'skill': 'Docker', 'percentage': 35},
    {'skill': 'PostgreSQL', 'percentage': 35},
    {'skill': 'NumPy', 'percentage': 25},
    {'skill': 'Pandas', 'percentage': 25},
]

print(calculate_relationships(jds, core))
