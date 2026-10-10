import re
HIGH = [r"kill myself", r"suicid", r"end my life", r"want to die", r"hurt myself", r"self[- ]harm",
        r"don'?t want to live", r"better off dead", r"kill (him|her|them)", r"hurt (him|her|someone)"]
MEDIUM = [r"hopeless", r"can'?t cope", r"can'?t go on", r"no way out", r"worthless", r"give up", r"can'?t take it"]

def assess_risk(text):
    t = text.lower()
    if any(re.search(p, t) for p in HIGH): return "high"
    if any(re.search(p, t) for p in MEDIUM): return "medium"
    return "low"
