import os, re
from datetime import datetime, timedelta
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Conversation, Message, MoodEntry, AdminActivity
from services.ai_service import generate_reply

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
MOODS = {"great", "good", "okay", "low", "stressed"}

def create_app(db_url=None):
    app = Flask(__name__)
    app.config.update(SQLALCHEMY_DATABASE_URI=db_url or os.getenv("DATABASE_URL", "sqlite:///mindcare.db"),
        SECRET_KEY=os.getenv("SECRET_KEY", "dev"), JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me-32-bytes!!"),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(days=7))
    CORS(app, origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","))
    db.init_app(app); jwt = JWTManager(app)

    @jwt.unauthorized_loader
    @jwt.invalid_token_loader
    def _unauth(e): return jsonify(error="Please log in to continue."), 401
    @jwt.expired_token_loader
    def _exp(h, d): return jsonify(error="Your session expired. Please log in again."), 401
    @app.errorhandler(404)
    def _404(e): return jsonify(error="Not found."), 404
    @app.errorhandler(Exception)
    def _500(e):
        app.logger.exception(e); return jsonify(error="Something went wrong. Please try again."), 500

    def me(): return db.session.get(User, int(get_jwt_identity()))
    def admin_only():
        u = me(); return u if u and u.role == "admin" else None
    def udict(u): return dict(id=u.id, name=u.name, email=u.email, role=u.role, created_at=u.created_at.isoformat())

    @app.post("/api/auth/register")
    def register():
        d = request.get_json(silent=True) or {}
        name, email, pw = (d.get("name") or "").strip(), (d.get("email") or "").strip().lower(), d.get("password") or ""
        if not name or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email): return jsonify(error="Enter a valid name and email."), 400
        if len(pw) < 8 or not re.search(r"\d", pw) or not re.search(r"[A-Za-z]", pw):
            return jsonify(error="Password needs 8+ characters with letters and numbers."), 400
        if User.query.filter_by(email=email).first(): return jsonify(error="Email already registered."), 409
        u = User(name=name, email=email, password_hash=generate_password_hash(pw)); db.session.add(u); db.session.commit()
        return jsonify(token=create_access_token(identity=str(u.id)), user=udict(u)), 201

    @app.post("/api/auth/login")
    def login():
        d = request.get_json(silent=True) or {}
        u = User.query.filter_by(email=(d.get("email") or "").strip().lower()).first()
        if not u or not check_password_hash(u.password_hash, d.get("password") or ""):
            return jsonify(error="Invalid email or password."), 401
        return jsonify(token=create_access_token(identity=str(u.id)), user=udict(u))

    @app.post("/api/auth/logout")
    @jwt_required()
    def logout(): return jsonify(message="Logged out.")  # stateless JWT: client discards token

    @app.get("/api/auth/me")
    @jwt_required()
    def whoami(): return jsonify(user=udict(me()))

    @app.route("/api/profile", methods=["GET", "PUT"])
    @jwt_required()
    def profile():
        u = me()
        if request.method == "PUT":
            d = request.get_json(silent=True) or {}
            if d.get("name", "").strip(): u.name = d["name"].strip()
            if d.get("password"):
                if len(d["password"]) < 8: return jsonify(error="Password must be at least 8 characters."), 400
                u.password_hash = generate_password_hash(d["password"])
            db.session.commit()
        return jsonify(user=udict(u))

    @app.post("/api/chat")
    @jwt_required()
    def chat():
        u, d = me(), request.get_json(silent=True) or {}
        text = (d.get("message") or "").strip()
        if not text: return jsonify(error="Message cannot be empty."), 400
        if len(text) > 2000: return jsonify(error="Message too long (max 2000 characters)."), 400
        conv = None
        if d.get("conversation_id"):
            conv = Conversation.query.filter_by(id=d["conversation_id"], user_id=u.id).first()
            if not conv: return jsonify(error="Conversation not found."), 404
        if not conv:
            conv = Conversation(user_id=u.id, title=text[:40]); db.session.add(conv); db.session.flush()
        history = [{"sender": m.sender, "content": m.content} for m in conv.messages[-10:]]
        ai = generate_reply(text, history)
        um = Message(conversation_id=conv.id, sender="user", content=text, emotion=ai["emotion"], confidence=ai["confidence"], risk_level=ai["risk_level"])
        am = Message(conversation_id=conv.id, sender="ai", content=ai["response"], emotion=ai["emotion"], confidence=ai["confidence"], risk_level=ai["risk_level"])
        conv.updated_at = datetime.utcnow(); db.session.add_all([um, am]); db.session.commit()
        return jsonify(conversation_id=conv.id, title=conv.title, user_message=um.to_dict(), ai_message=am.to_dict(),
                       analysis={k: ai[k] for k in ("emotion", "confidence", "risk_level", "suggested_action")},
                       demo_mode=ai["demo"], show_help_card=ai["risk_level"] == "high",
                       emergency_info=os.getenv("EMERGENCY_INFO", "Contact your local emergency number."))

    @app.get("/api/conversations")
    @jwt_required()
    def convs():
        q = (request.args.get("q") or "").lower()
        rows = Conversation.query.filter_by(user_id=me().id).order_by(Conversation.updated_at.desc()).all()
        return jsonify(conversations=[dict(id=c.id, title=c.title, updated_at=c.updated_at.isoformat()) for c in rows if q in c.title.lower()])

    @app.route("/api/conversations/<int:cid>", methods=["GET", "DELETE"])
    @jwt_required()
    def conv(cid):
        c = Conversation.query.filter_by(id=cid, user_id=me().id).first()
        if not c: return jsonify(error="Conversation not found."), 404
        if request.method == "DELETE":
            db.session.delete(c); db.session.commit(); return jsonify(message="Deleted.")
        return jsonify(id=c.id, title=c.title, messages=[m.to_dict() for m in c.messages])

    @app.route("/api/moods", methods=["GET", "POST"])
    @jwt_required()
    def moods():
        u = me()
        if request.method == "POST":
            m = (request.get_json(silent=True) or {}).get("mood")
            if m not in MOODS: return jsonify(error="Invalid mood."), 400
            db.session.add(MoodEntry(user_id=u.id, mood=m)); db.session.commit()
            return jsonify(message="Saved."), 201
        rows = MoodEntry.query.filter_by(user_id=u.id).order_by(MoodEntry.created_at.desc()).limit(14).all()
        return jsonify(moods=[dict(mood=r.mood, created_at=r.created_at.isoformat()) for r in rows])

    @app.get("/api/dashboard")
    @jwt_required()
    def dash():
        u = me(); week = datetime.utcnow() - timedelta(days=7)
        n = Message.query.join(Conversation).filter(Conversation.user_id == u.id, Message.sender == "user", Message.timestamp > week).count()
        last = Message.query.join(Conversation).filter(Conversation.user_id == u.id, Message.sender == "user").order_by(Message.id.desc()).limit(7).all()
        return jsonify(conversations=Conversation.query.filter_by(user_id=u.id).count(), messages_week=n,
                       recent_emotions=[m.emotion for m in reversed(last)])

    @app.get("/api/admin/stats")
    @jwt_required()
    def stats():
        if not admin_only(): return jsonify(error="Forbidden."), 403
        today = datetime.utcnow().replace(hour=0, minute=0, second=0)
        convs_n, msgs = Conversation.query.count(), Message.query.count()
        emo = dict(db.session.query(Message.emotion, func.count()).filter(Message.sender == "user").group_by(Message.emotion).all())
        risk = dict(db.session.query(Message.risk_level, func.count()).filter(Message.sender == "user").group_by(Message.risk_level).all())
        return jsonify(total_users=User.query.count(), total_conversations=convs_n,
            messages_today=Message.query.filter(Message.timestamp >= today).count(),
            active_users=db.session.query(Conversation.user_id).filter(Conversation.updated_at > datetime.utcnow() - timedelta(days=7)).distinct().count(),
            avg_messages_per_conversation=round(msgs / convs_n, 1) if convs_n else 0, emotion_distribution=emo, risk_distribution=risk)

    @app.get("/api/admin/users")
    @jwt_required()
    def users():
        if not admin_only(): return jsonify(error="Forbidden."), 403
        q = (request.args.get("q") or "").lower()
        return jsonify(users=[udict(u) for u in User.query.order_by(User.id).all() if q in u.email.lower() or q in u.name.lower()])

    @app.delete("/api/admin/users/<int:uid>")
    @jwt_required()
    def del_user(uid):
        a = admin_only()
        if not a: return jsonify(error="Forbidden."), 403
        u = db.session.get(User, uid)
        if not u: return jsonify(error="User not found."), 404
        if u.id == a.id: return jsonify(error="You can't delete your own account."), 400
        db.session.add(AdminActivity(admin_id=a.id, action=f"Deleted user {u.id}")); db.session.delete(u); db.session.commit()
        return jsonify(message="User deleted.")

    @app.post("/api/public/ai-preview")
    def public_ai_preview():
        d = request.get_json(silent=True) or {}
        msg = (d.get("message") or "").strip()
        if not msg:
            return jsonify(error="Message cannot be empty."), 400
        history = d.get("history") or []
        res = generate_reply(msg, history)
        return jsonify(res)

    @app.get("/api/public/psychologists")
    def get_psychologists():
        docs = [
            {
                "id": 1,
                "name": "Dr. Elena Rostova, Ph.D.",
                "title": "Clinical Psychologist & Neurobiology Specialist",
                "specialty": "Severe Depression & Trauma Recovery",
                "experience": "12+ years experience",
                "rating": 4.98,
                "reviews_count": 340,
                "avatar": "https://images.unsplash.com/photo-1594824813633-87f5817a2db1?w=400&auto=format&fit=crop&q=80",
                "badge": "Top Specialist",
                "focus": ["Depression", "CBT", "Burnout", "Neuroplasticity"],
                "price": "$0 First Session / Covered"
            },
            {
                "id": 2,
                "name": "Dr. Marcus Vance, Psy.D.",
                "title": "Senior Behavioral Therapist & Anxiety Lead",
                "specialty": "Panic Disorders & Chronic Stress",
                "experience": "10+ years experience",
                "rating": 4.95,
                "reviews_count": 285,
                "avatar": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
                "badge": "Anxiety Expert",
                "focus": ["Panic Attacks", "Somatic Healing", "Couples", "Insomnia"],
                "price": "$0 First Session / Covered"
            },
            {
                "id": 3,
                "name": "Dr. Sophia Chen, M.D.",
                "title": "Integrative Psychiatrist & Mindfulness Coach",
                "specialty": "Emotional Burnout & Work Fatigue",
                "experience": "9+ years experience",
                "rating": 4.97,
                "reviews_count": 412,
                "avatar": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
                "badge": "Mindfulness Lead",
                "focus": ["Life Transitions", "Psychoeducation", "ADHD Coaching", "Meditation"],
                "price": "$0 First Session / Covered"
            },
            {
                "id": 4,
                "name": "Dr. David Miller, LMFT",
                "title": "Relationship & Family Systems Counselor",
                "specialty": "Couples Counseling & Attachment Healing",
                "experience": "14+ years experience",
                "rating": 4.92,
                "reviews_count": 198,
                "avatar": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
                "badge": "Couples Specialist",
                "focus": ["Couples", "Communication", "Grief", "Loneliness"],
                "price": "$0 First Session / Covered"
            }
        ]
        return jsonify(psychologists=docs)

    @app.post("/api/public/book-session")
    def book_session():
        d = request.get_json(silent=True) or {}
        name = (d.get("name") or "").strip()
        email = (d.get("email") or "").strip()
        doctor_id = d.get("doctor_id")
        date = d.get("date") or "Tomorrow at 10:00 AM"
        notes = d.get("notes") or "General Consultation"
        if not name or not email:
            return jsonify(error="Name and valid email are required."), 400
        booking_code = f"MC-{abs(hash(name + email + str(datetime.utcnow().timestamp()))) % 1000000:06d}"
        return jsonify({
            "message": "Session booked successfully!",
            "booking_code": booking_code,
            "status": "Confirmed",
            "name": name,
            "email": email,
            "doctor_id": doctor_id,
            "date": date,
            "notes": notes
        }), 201

    @app.get("/api/health")
    def health(): return jsonify(status="ok")

    with app.app_context():
        db.create_all()
        em, pw = os.getenv("ADMIN_EMAIL"), os.getenv("ADMIN_PASSWORD")
        if em and pw and not User.query.filter_by(email=em).first():
            db.session.add(User(name="Admin", email=em, role="admin", password_hash=generate_password_hash(pw))); db.session.commit()
    return app

if __name__ == "__main__":
    create_app().run(port=5000, debug=os.getenv("FLASK_DEBUG") == "1")
