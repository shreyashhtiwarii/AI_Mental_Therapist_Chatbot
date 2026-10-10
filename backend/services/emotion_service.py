import re
LEX = {
 "happy": "happy great good excited proud joy glad wonderful grateful thrilled",
 "calm": "calm relaxed peaceful content fine settled",
 "sad": "sad cry crying down hopeless empty depressed grief miserable hurt",
 "anxious": "anxious anxiety worried nervous panic scared afraid fear overthinking uneasy",
 "stressed": "stress stressed pressure overwhelmed deadline exam exams burnout busy workload",
 "angry": "angry mad furious annoyed hate frustrated irritated rage",
 "lonely": "lonely alone isolated friendless ignored left-out",
}
WORDS = {e: set(w.split()) for e, w in LEX.items()}

def analyze_emotion(text):
    toks = re.findall(r"[a-z'-]+", text.lower())
    scores = {e: sum(t in w for t in toks) for e, w in WORDS.items()}
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return {"emotion": "neutral", "confidence": 0.5}
    total = sum(scores.values())
    return {"emotion": best, "confidence": round(min(0.95, 0.55 + 0.4 * scores[best] / total), 2)}
