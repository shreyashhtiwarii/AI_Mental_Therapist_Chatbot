import os, random, requests
from .emotion_service import analyze_emotion
from .safety_service import assess_risk

HIGH_MSG = ("It sounds like you're going through something very serious right now. I can't provide emergency care, "
            "but you deserve immediate human support. Please contact your local emergency service or a trusted person "
            "who can stay with you, and consider reaching a qualified mental-health professional now.")
DEMO = {
 "anxious": ["That sounds like a lot of worry to carry. What thought keeps coming back the most? Sometimes slow breathing (in for 4, out for 6) can take the edge off while we talk it through."],
 "stressed": ["It sounds like a lot is piling up at once. What's weighing on you most right now? Breaking it into one small next step can make it feel more manageable."],
 "sad": ["That sounds heavy. Would you like to tell me more about what's been behind this feeling? I'm here to listen."],
 "lonely": ["Feeling disconnected can really hurt. Is there someone, even one person, you've felt a bit comfortable with lately? We can think about small ways to reach out."],
 "angry": ["Your frustration makes sense to me. What happened that set this off? Sometimes naming what felt unfair helps."],
 "happy": ["That's lovely to hear! What made today feel good? Noticing it can help you repeat it."],
 "calm": ["Glad you're in a settled place. Is there anything you'd like to reflect on while things feel steady?"],
 "neutral": ["Thanks for sharing. Tell me a bit more about how your day or week has been going.", "I'm listening. What's on your mind lately?"],
}
MEDIUM_NOTE = " If this feeling keeps getting heavier, talking with a counselor or someone you trust could really help."

def _llm(message, history):
    key = os.getenv("AI_API_KEY")
    system = ("You are MindCare AI, a supportive wellness chatbot. You are an AI, not a therapist; never diagnose or make medical claims. "
              "Be warm, concise, non-judgmental, vary phrasing, ask one gentle follow-up, and suggest professional help when appropriate.")
    msgs = [{"role": "user" if m["sender"] == "user" else "assistant", "content": m["content"]} for m in history]
    msgs.append({"role": "user", "content": message})
    r = requests.post("https://api.anthropic.com/v1/messages", timeout=20,
        headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        json={"model": os.getenv("AI_MODEL", "claude-sonnet-4-5"), "max_tokens": 400, "system": system, "messages": msgs})
    r.raise_for_status()
    return r.json()["content"][0]["text"]

def generate_reply(message, history):
    emo, risk = analyze_emotion(message), assess_risk(message)
    out = {"emotion": emo["emotion"], "confidence": emo["confidence"], "risk_level": risk,
           "suggested_action": None, "demo": not os.getenv("AI_API_KEY")}
    if risk == "high":
        out.update(response=HIGH_MSG, suggested_action="get_immediate_help"); return out
    try:
        text = _llm(message, history) if os.getenv("AI_API_KEY") else None
    except Exception:
        text = None
    if not text:
        text = random.choice(DEMO[emo["emotion"]])
    if risk == "medium":
        text += MEDIUM_NOTE; out["suggested_action"] = "consider_professional_support"
    out["response"] = text
    return out
