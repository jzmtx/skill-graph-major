import re
import hashlib
from typing import Iterable

# Stop words to remove during technical question fingerprinting
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
    "by", "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", 
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", 
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", 
    "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", 
    "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", 
    "same", "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs", 
    "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to", 
    "too", "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", 
    "which", "while", "who", "whom", "why", "will", "with", "would", "you", "your", "yours",
    "following", "output", "given", "code", "snippet", "statement", "true", "false", "correct",
    "incorrect", "program", "result", "value", "variable", "function", "write", "which"
}

def clean_text_for_tokens(text: str) -> str:
    """Removes code blocks and normalizes text for keyword extraction."""
    # Strip markdown code blocks
    cleaned = re.sub(r'```[\s\S]*?```', '', text)
    cleaned = re.sub(r'`[^`]*`', '', cleaned)
    # Lowercase and replace non-alphanumeric with spaces
    cleaned = re.sub(r'[^a-zA-Z0-9_]', ' ', cleaned.lower())
    return cleaned

def extract_concept_tokens(text: str) -> set[str]:
    """Extracts significant content tokens, filtering out universal English stop words."""
    cleaned = clean_text_for_tokens(text)
    tokens = set()
    for word in cleaned.split():
        w = word.strip().lower()
        if len(w) >= 3 and w not in STOP_WORDS:
            tokens.add(w)
    return tokens

def generate_canonical_fingerprint(text: str) -> str:
    """
    Generates a deterministic 16-character canonical hash from the sorted concept tokens.
    Two questions with the same core technical keywords produce identical or matching fingerprints.
    """
    tokens = sorted(extract_concept_tokens(text))
    if not tokens:
        raw_clean = re.sub(r'\s+', ' ', text.lower().strip())
        return hashlib.sha256(raw_clean.encode('utf-8')).hexdigest()[:16]
    
    canonical_str = "-".join(tokens[:16])
    return hashlib.sha256(canonical_str.encode('utf-8')).hexdigest()[:16]

def calculate_jaccard_similarity(text1: str, text2: str) -> float:
    """Calculates Jaccard token overlap between two question texts."""
    tokens1 = extract_concept_tokens(text1)
    tokens2 = extract_concept_tokens(text2)
    
    if not tokens1 or not tokens2:
        return 0.0
    
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    
    if not union:
        return 0.0
    
    jaccard = len(intersection) / len(union)
    
    # Also check subset containment (e.g., if one question's technical tokens are 80%+ contained in another)
    min_len = min(len(tokens1), len(tokens2))
    containment = len(intersection) / min_len if min_len > 0 else 0.0
    
    # If containment is very high and at least 3 key terms match, treat as high similarity
    if len(intersection) >= 3 and containment >= 0.70:
        return max(jaccard, containment)
    
    return jaccard

def is_duplicate_context(
    candidate_text: str, 
    seen_texts: Iterable[str], 
    threshold: float = 0.45
) -> bool:
    """
    Checks if candidate_text is identical or semantically paraphrased relative to any question in seen_texts.
    Returns True if similarity exceeds threshold.
    """
    cand_clean = candidate_text.strip().lower()
    cand_tokens = extract_concept_tokens(candidate_text)
    
    if not cand_tokens:
        return False

    for seen in seen_texts:
        if not seen:
            continue
        
        seen_clean = seen.strip().lower()
        # Direct exact match
        if cand_clean == seen_clean:
            return True
        
        seen_tokens = extract_concept_tokens(seen)
        if not seen_tokens:
            continue
        
        intersection = cand_tokens.intersection(seen_tokens)
        union = cand_tokens.union(seen_tokens)
        
        if not union:
            continue
            
        jaccard = len(intersection) / len(union)
        min_len = min(len(cand_tokens), len(seen_tokens))
        containment = len(intersection) / min_len if min_len > 0 else 0.0
        
        # Paraphrased duplicate detection
        if jaccard >= threshold or (len(intersection) >= 3 and containment >= 0.70):
            return True
            
    return False
