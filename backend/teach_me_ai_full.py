"""
Teach Me AI — Universal Language Tutor (single-file)

Features:
- FastAPI app + SQLite (SQLAlchemy)
- Course/Card storage and spaced-repetition (SM-2)
- Auto-seed beginner decks for a large set of languages using MarianMT when available
- Fallback translations if MarianMT models are not available
- Pronunciation TTS (gTTS) and basic STT evaluation (speech_recognition) — optional
- Admin endpoints to seed a single language or all languages

Notes:
- Installing all MarianMT models is NOT required. The app will attempt to load a model per language pair
  and use fallback if not present.
- Seeding all languages can be CPU / time intensive.
"""

from __future__ import annotations
import os
import io
import json
import math
import tempfile
import datetime
from typing import Optional, Dict, Tuple, List

from fastapi import FastAPI, HTTPException, Body, Query, File, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse
from pydantic import BaseModel

# SQLAlchemy
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# Optional heavy deps (we try to import, otherwise fallback)
try:
    from transformers import MarianMTModel, MarianTokenizer
    _HAS_MARIAN = True
except Exception:
    _HAS_MARIAN = False

try:
    from gtts import gTTS
    _HAS_GTTS = True
except Exception:
    _HAS_GTTS = False

try:
    import speech_recognition as sr
    _HAS_SR = True
except Exception:
    _HAS_SR = False

# Rapid fuzzy matching for grading and similarity
try:
    from rapidfuzz import fuzz
except Exception:
    # minimal fallback
    def _ratio(a, b): return 100 if a == b else 0
    class _Faux:
        token_sort_ratio = staticmethod(_ratio)
    fuzz = _Faux()

# ------------------------
# Database (SQLite)
# ------------------------
DB_URL = os.environ.get("TEACH_ME_AI_DB", "sqlite:///teach_me_ai.db")
engine = sa.create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class Course(Base):
    __tablename__ = "courses"
    id = sa.Column(sa.Integer, primary_key=True)
    language = sa.Column(sa.String, index=True)   # human name, e.g. "Spanish"
    iso = sa.Column(sa.String, index=True)        # iso code e.g. "es"
    level = sa.Column(sa.String, default="A1")
    description = sa.Column(sa.Text, default="")
    cards = relationship("Card", back_populates="course")

class Card(Base):
    __tablename__ = "cards"
    id = sa.Column(sa.Integer, primary_key=True)
    course_id = sa.Column(sa.Integer, sa.ForeignKey("courses.id"), index=True)
    front = sa.Column(sa.Text)   # English prompt or learner prompt
    back = sa.Column(sa.Text)    # Target language text
    hint = sa.Column(sa.Text, default="")
    tag = sa.Column(sa.String, default="vocab")
    # SM-2 fields per card (global defaults but reviews per user would be better)
    interval = sa.Column(sa.Integer, default=1)
    repetition = sa.Column(sa.Integer, default=0)
    efactor = sa.Column(sa.Float, default=2.5)
    next_review = sa.Column(sa.Date, default=datetime.date.today)
    course = relationship("Course", back_populates="cards")

Base.metadata.create_all(engine)

# ------------------------
# App
# ------------------------
app = FastAPI(title="Teach Me AI — Universal Language Tutor", version="1.0")

# ------------------------
# Language list (expanded)
# ------------------------
# A large set of ISO 639-1 / 2-letter codes and language names.
# This list can be extended further if desired.
LANGUAGES: Dict[str, str] = {
    "af": "Afrikaans","sq": "Albanian","am": "Amharic","ar": "Arabic","hy": "Armenian",
    "az": "Azerbaijani","eu": "Basque","be": "Belarusian","bn": "Bengali","bs": "Bosnian",
    "bg": "Bulgarian","ca": "Catalan","ceb":"Cebuano","zh": "Chinese","co":"Corsican",
    "hr": "Croatian","cs": "Czech","da": "Danish","nl": "Dutch","en": "English",
    "eo": "Esperanto","et": "Estonian","fi": "Finnish","fr": "French","fy":"Frisian",
    "gl":"Galician","ka":"Georgian","de": "German","el": "Greek","gu":"Gujarati",
    "ht":"Haitian Creole","ha":"Hausa","hak":"Hakka","he": "Hebrew","hi": "Hindi",
    "hmn":"Hmong","hu": "Hungarian","is": "Icelandic","ig":"Igbo","id": "Indonesian",
    "ga":"Irish","it": "Italian","ja": "Japanese","jv":"Javanese","kn":"Kannada",
    "kk":"Kazakh","km":"Khmer","rw":"Kinyarwanda","ko": "Korean","ku":"Kurdish",
    "ky":"Kyrgyz","lo":"Lao","la":"Latin","lv":"Latvian","lt":"Lithuanian",
    "lb":"Luxembourgish","mk":"Macedonian","mai":"Maithili","mg":"Malagasy","ms": "Malay",
    "ml":"Malayalam","mt":"Maltese","mi":"Maori","mr":"Marathi","mn":"Mongolian",
    "my":"Burmese","ne":"Nepali","no": "Norwegian","ny":"Chichewa","or":"Odia",
    "ps":"Pashto","fa": "Persian","pl": "Polish","pt": "Portuguese","pa":"Punjabi",
    "ro": "Romanian","ru": "Russian","sm":"Samoan","gd":"Scots Gaelic","sr": "Serbian",
    "st":"Sesotho","sn":"Shona","sd":"Sindhi","si":"Sinhala","sk": "Slovak",
    "sl": "Slovenian","so":"Somali","es": "Spanish","su":"Sundanese","sw":"Swahili",
    "sv": "Swedish","tl":"Tagalog","tg":"Tajik","ta":"Tamil","tt":"Tatar","te":"Telugu",
    "th": "Thai","tr": "Turkish","tk":"Turkmen","uk": "Ukrainian","ur":"Urdu",
    "ug":"Uyghur","uz":"Uzbek","vi": "Vietnamese","cy":"Welsh","xh":"Xhosa",
    "yi":"Yiddish","yo":"Yoruba","zu":"Zulu"
}

# ------------------------
# MarianMT cache helper
# ------------------------
_MARIAN_CACHE: Dict[Tuple[str,str], Dict] = {}

def load_marian_model(src: str, tgt: str) -> Optional[Dict]:
    """
    Try to load MarianMT model for src->tgt.
    Returns dict {'tok':tokenizer, 'mdl':model} or None on failure.
    """
    key = (src, tgt)
    if key in _MARIAN_CACHE:
        return _MARIAN_CACHE[key]
    if not _HAS_MARIAN:
        return None
    # model naming: Helsinki-NLP/opus-mt-<src>-<tgt>
    model_name = f"Helsinki-NLP/opus-mt-{src}-{tgt}"
    try:
        tok = MarianTokenizer.from_pretrained(model_name)
        mdl = MarianMTModel.from_pretrained(model_name)
        _MARIAN_CACHE[key] = {"tok": tok, "mdl": mdl}
        return _MARIAN_CACHE[key]
    except Exception:
        # try the reversed naming or ignore
        return None

def translate_with_marian(text: str, src: str, tgt: str) -> Optional[str]:
    pack = load_marian_model(src, tgt)
    if not pack:
        return None
    tok = pack["tok"]; mdl = pack["mdl"]
    inputs = tok([text], return_tensors="pt", truncation=True, padding=True)
    outs = mdl.generate(**inputs, max_length=128)
    return tok.decode(outs[0], skip_special_tokens=True)

# ------------------------
# Utilities: simple normalizers & grading
# ------------------------
def normalize(s: str) -> str:
    return s.strip().lower()

def grade_similarity(expected: str, answer: str) -> Dict:
    e = normalize(expected)
    a = normalize(answer)
    try:
        sim = fuzz.token_sort_ratio(e, a)
    except Exception:
        sim = 100 if e == a else 0
    # map to 0..5
    if sim >= 95:
        grade = 5
    elif sim >= 85:
        grade = 4
    elif sim >= 70:
        grade = 3
    elif sim >= 50:
        grade = 2
    elif sim >= 30:
        grade = 1
    else:
        grade = 0
    feedback = (
        "Perfect!" if grade >= 4 else
        "Good — minor issues." if grade == 3 else
        "Needs work — try again." if grade >= 1 else
        "Far off — study the pattern."
    )
    return {"similarity": int(sim), "grade": grade, "feedback": feedback}

# ------------------------
# SM-2 algorithm (card-wise)
# ------------------------
def sm2_update(card: Card, quality: int):
    if quality < 3:
        card.repetition = 0
        card.interval = 1
    else:
        card.repetition += 1
        if card.repetition == 1:
            card.interval = 1
        elif card.repetition == 2:
            card.interval = 6
        else:
            card.interval = int(round(card.interval * card.efactor))
    # update efactor
    card.efactor = card.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if card.efactor < 1.3:
        card.efactor = 1.3
    card.next_review = datetime.date.today() + datetime.timedelta(days=card.interval)

# ------------------------
# Starter phrases (English) to seed courses
# ------------------------
STARTER_PHRASES = [
    "Hello", "Good morning", "Good evening", "Goodbye", "Please",
    "Thank you", "You're welcome", "How are you?", "I'm fine", "What's your name?",
    "My name is...", "I don't understand", "Can you help me?", "Where is the restroom?",
    "How much does this cost?", "I would like...", "Excuse me", "Sorry", "Yes", "No",
    "I love learning languages"
]

# ------------------------
# Translation fallback
# ------------------------
def translate_fallback(text: str, tgt_iso: str) -> str:
    # fallback simple marker showing intended language — safe and predictable
    return f"[{tgt_iso}] {text}"

def translate(text: str, src_iso: str, tgt_iso: str) -> str:
    # first try MarianMT; if not available, fallback to gTTS-friendly or marker
    if _HAS_MARIAN:
        try:
            out = translate_with_marian(text, src_iso, tgt_iso)
            if out:
                return out
        except Exception:
            pass
    # final fallback
    return translate_fallback(text, tgt_iso)

# ------------------------
# TTS helper (gTTS)
# ------------------------
def tts_bytes(text: str, lang: str = "en") -> Optional[bytes]:
    if not _HAS_GTTS:
        return None
    buf = io.BytesIO()
    try:
        tts = gTTS(text=text, lang=lang)
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()
    except Exception:
        return None

# ------------------------
# Pronunciation evaluation (optional STT)
# ------------------------
async def evaluate_pronunciation(expected: str, uploaded_file: UploadFile):
    if not _HAS_SR:
        raise HTTPException(status_code=500, detail="speech_recognition not installed on server")
    # save temp file
    suffix = os.path.splitext(uploaded_file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        data = await uploaded_file.read()
        tmp.write(data)
        tmp_path = tmp.name
    recognizer = sr.Recognizer()
    transcript = ""
    try:
        with sr.AudioFile(tmp_path) as source:
            audio = recognizer.record(source)
            transcript = recognizer.recognize_google(audio)
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"STT failed: {e}")
    os.unlink(tmp_path)
    score = grade_similarity(expected, transcript)
    return {"expected": expected, "transcript": transcript, **score}

# ------------------------
# API endpoints
# ------------------------

@app.get("/")
def home():
    return HTMLResponse("""
    <h1>Teach Me AI — Universal Language Tutor</h1>
    <p>Use /docs for API exploration.</p>
    <p>Endpoints include: /admin/seed_language, /admin/seed_all_languages, /courses, /course/{iso}, /practice/tts, /practice/evaluate</p>
    """)

# Admin: Seed single language course (A1 starter deck)
class SeedReq(BaseModel):
    iso: str
    level: Optional[str] = "A1"

@app.post("/admin/seed_language")
def admin_seed_language(req: SeedReq):
    iso = req.iso.lower().strip()
    if iso not in LANGUAGES:
        raise HTTPException(404, detail=f"Language '{iso}' not recognized in LANGUAGES list.")
    session = SessionLocal()
    try:
        # create course
        name = LANGUAGES[iso]
        existing = session.query(Course).filter(Course.iso == iso).first()
        if existing:
            return {"message": f"Course for {name} ({iso}) already exists."}
        course = Course(language=name, iso=iso, level=req.level, description=f"Beginner {name} phrases")
        session.add(course)
        session.commit()
        # seed cards
        for phrase in STARTER_PHRASES:
            translated = translate(phrase, "en", iso)
            card = Card(course_id=course.id, front=phrase, back=translated, tag="phrase")
            session.add(card)
        session.commit()
        return {"message": f"Seeded {len(STARTER_PHRASES)} cards for {name} ({iso})."}
    except Exception as e:
        session.rollback()
        raise HTTPException(500, detail=str(e))
    finally:
        session.close()

@app.post("/admin/seed_all_languages")
def admin_seed_all_languages():
    results = []
    for iso in LANGUAGES:
        try:
            req = SeedReq(iso=iso)
            result = admin_seed_language(req)
            results.append(result)
        except Exception as e:
            results.append({"error": f"Failed to seed {iso}: {str(e)}"})
    return {"results": results}

@app.get("/courses")
def get_courses():
    session = SessionLocal()
    try:
        courses = session.query(Course).all()
        return [{"iso": c.iso, "language": c.language, "level": c.level, "card_count": len(c.cards)} for c in courses]
    finally:
        session.close()

@app.get("/course/{iso}")
def get_course(iso: str):
    session = SessionLocal()
    try:
        course = session.query(Course).filter(Course.iso == iso).first()
        if not course:
            raise HTTPException(404, detail="Course not found")
        return {
            "iso": course.iso,
            "language": course.language,
            "level": course.level,
            "description": course.description,
            "cards": [{"id": c.id, "front": c.front, "back": c.back, "hint": c.hint, "tag": c.tag} for c in course.cards]
        }
    finally:
        session.close()

@app.get("/practice/{iso}")
def get_practice_cards(iso: str, limit: int = Query(10, ge=1, le=50)):
    session = SessionLocal()
    try:
        course = session.query(Course).filter(Course.iso == iso).first()
        if not course:
            raise HTTPException(404, detail="Course not found")
        today = datetime.date.today()
        due_cards = session.query(Card).filter(
            Card.course_id == course.id,
            Card.next_review <= today
        ).order_by(Card.next_review).limit(limit).all()
        return [{"id": c.id, "front": c.front, "back": c.back, "hint": c.hint, "tag": c.tag} for c in due_cards]
    finally:
        session.close()

@app.post("/review/{card_id}")
def review_card(card_id: int, quality: int = Body(..., ge=0, le=5)):
    session = SessionLocal()
    try:
        card = session.query(Card).filter(Card.id == card_id).first()
        if not card:
            raise HTTPException(404, detail="Card not found")
        sm2_update(card, quality)
        session.commit()
        return {"message": "Card reviewed", "next_review": card.next_review.isoformat()}
    except Exception as e:
        session.rollback()
        raise HTTPException(500, detail=str(e))
    finally:
        session.close()

@app.get("/practice/tts")
def get_tts(text: str = Query(...), lang: str = Query("en")):
    audio = tts_bytes(text, lang)
    if not audio:
        raise HTTPException(500, detail="TTS not available")
    return StreamingResponse(io.BytesIO(audio), media_type="audio/mpeg")

@app.post("/practice/evaluate")
async def post_evaluate_pronunciation(expected: str = Query(...), file: UploadFile = File(...)):
    result = await evaluate_pronunciation(expected, file)
    return result

# ------------------------
# Cool features: Add more endpoints
# ------------------------

# Get stats for a course
@app.get("/course/{iso}/stats")
def get_course_stats(iso: str):
    session = SessionLocal()
    try:
        course = session.query(Course).filter(Course.iso == iso).first()
        if not course:
            raise HTTPException(404, detail="Course not found")
        total_cards = len(course.cards)
        due_today = len([c for c in course.cards if c.next_review <= datetime.date.today()])
        mastered = len([c for c in course.cards if c.repetition >= 5])
        return {
            "total_cards": total_cards,
            "due_today": due_today,
            "mastered": mastered,
            "progress": f"{mastered}/{total_cards}"
        }
    finally:
        session.close()

# Add custom card to a course
class AddCardReq(BaseModel):
    front: str
    back: str
    hint: Optional[str] = ""
    tag: Optional[str] = "custom"

@app.post("/course/{iso}/add_card")
def add_custom_card(iso: str, req: AddCardReq):
    session = SessionLocal()
    try:
        course = session.query(Course).filter(Course.iso == iso).first()
        if not course:
            raise HTTPException(404, detail="Course not found")
        card = Card(course_id=course.id, front=req.front, back=req.back, hint=req.hint, tag=req.tag)
        session.add(card)
        session.commit()
        return {"message": "Card added", "card_id": card.id}
    except Exception as e:
        session.rollback()
        raise HTTPException(500, detail=str(e))
    finally:
        session.close()

# Reset progress for a course
@app.post("/course/{iso}/reset")
def reset_course_progress(iso: str):
    session = SessionLocal()
    try:
        course = session.query(Course).filter(Course.iso == iso).first()
        if not course:
            raise HTTPException(404, detail="Course not found")
        for card in course.cards:
            card.interval = 1
            card.repetition = 0
            card.efactor = 2.5
            card.next_review = datetime.date.today()
        session.commit()
        return {"message": f"Progress reset for {course.language}"}
    finally:
        session.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
