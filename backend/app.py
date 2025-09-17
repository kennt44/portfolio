"""
Combined Portfolio Backend: Flask-like functionality + AI Tutor in FastAPI

Features:
- Contact API with email notifications
- Static file serving for React build
- AI Language Tutor with spaced repetition
- TTS and STT evaluation
"""

from __future__ import annotations
import os
import io
import json
import math
import tempfile
import datetime
import logging
import smtplib
from typing import Optional, Dict, Tuple, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import FastAPI, HTTPException, Body, Query, File, UploadFile, Request
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# SQLAlchemy for both databases
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Date, Float, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# Optional heavy deps for AI Tutor
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

# Rapid fuzzy matching
try:
    from rapidfuzz import fuzz
except Exception:
    def _ratio(a, b): return 100 if a == b else 0
    class _Faux:
        token_sort_ratio = staticmethod(_ratio)
    fuzz = _Faux()

# ------------------------
# Contact Database (Flask part)
# ------------------------
contact_engine = create_engine('sqlite:////home/kj/portfolio/portfolio/backend/contact_messages.db', connect_args={"check_same_thread": False} if 'sqlite' in 'sqlite:////home/kj/portfolio/portfolio/backend/contact_messages.db' else {})
ContactSessionLocal = sessionmaker(bind=contact_engine, autoflush=False, autocommit=False)
ContactBase = declarative_base()

class ContactMessage(ContactBase):
    __tablename__ = "contact_messages"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

ContactBase.metadata.create_all(contact_engine)

# ------------------------
# AI Tutor Database
# ------------------------
tutor_engine = create_engine('sqlite:////home/kj/portfolio/portfolio/backend/teach_me_ai.db', connect_args={"check_same_thread": False} if 'sqlite' in 'sqlite:////home/kj/portfolio/portfolio/backend/teach_me_ai.db' else {})
TutorSessionLocal = sessionmaker(bind=tutor_engine, autoflush=False, autocommit=False)
TutorBase = declarative_base()

class Course(TutorBase):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True)
    language = Column(String, index=True)
    iso = Column(String, index=True)
    level = Column(String, default="A1")
    description = Column(Text, default="")
    cards = relationship("Card", back_populates="course")

class Card(TutorBase):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"), index=True)
    front = Column(Text)
    back = Column(Text)
    hint = Column(Text, default="")
    tag = Column(String, default="vocab")
    interval = Column(Integer, default=1)
    repetition = Column(Integer, default=0)
    efactor = Column(Float, default=2.5)
    next_review = Column(Date, default=datetime.date.today)
    course = relationship("Course", back_populates="cards")

TutorBase.metadata.create_all(tutor_engine)

# ------------------------
# App
# ------------------------
app = FastAPI(title="Portfolio with AI Tutor", version="1.0")

# Add CORS middleware to allow React app to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Note: Static files are served by React development server

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ------------------------
# Language list for AI Tutor
# ------------------------
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
# MarianMT cache
# ------------------------
_MARIAN_CACHE: Dict[Tuple[str,str], Dict] = {}

def load_marian_model(src: str, tgt: str) -> Optional[Dict]:
    key = (src, tgt)
    if key in _MARIAN_CACHE:
        return _MARIAN_CACHE[key]
    if not _HAS_MARIAN:
        return None
    model_name = f"Helsinki-NLP/opus-mt-{src}-{tgt}"
    try:
        tok = MarianTokenizer.from_pretrained(model_name)
        mdl = MarianMTModel.from_pretrained(model_name)
        _MARIAN_CACHE[key] = {"tok": tok, "mdl": mdl}
        return _MARIAN_CACHE[key]
    except Exception:
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
# Utilities
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
    card.efactor = card.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if card.efactor < 1.3:
        card.efactor = 1.3
    card.next_review = datetime.date.today() + datetime.timedelta(days=card.interval)

STARTER_PHRASES = [
    "Hello", "Good morning", "Good evening", "Goodbye", "Please",
    "Thank you", "You're welcome", "How are you?", "I'm fine", "What's your name?",
    "My name is...", "I don't understand", "Can you help me?", "Where is the restroom?",
    "How much does this cost?", "I would like...", "Excuse me", "Sorry", "Yes", "No",
    "I love learning languages"
]

def translate_fallback(text: str, tgt_iso: str) -> str:
    return f"[{tgt_iso}] {text}"

def translate(text: str, src_iso: str, tgt_iso: str) -> str:
    if _HAS_MARIAN:
        try:
            out = translate_with_marian(text, src_iso, tgt_iso)
            if out:
                return out
        except Exception:
            pass
    return translate_fallback(text, tgt_iso)

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

async def evaluate_pronunciation(expected: str, uploaded_file: UploadFile):
    if not _HAS_SR:
        raise HTTPException(status_code=500, detail="speech_recognition not installed on server")
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
# Portfolio Routes (Flask-like)
# ------------------------

@app.post("/api/contact")
async def contact(request: Request):
    data = await request.json()
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="Please provide name, email, and message.")

    logger.info(f"Contact form submission: Name={name}, Email={email}, Message={message}")

    # Save to DB
    session = ContactSessionLocal()
    try:
        contact_message = ContactMessage(name=name, email=email, message=message)
        session.add(contact_message)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

    # Send email
    try:
        send_email(name, email, message)
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message.")

    return {"message": "Message received successfully!"}

def send_email(name, email, message):
    smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    recipient_email = os.environ.get('RECIPIENT_EMAIL', smtp_username)

    if not smtp_username or not smtp_password:
        raise Exception("SMTP credentials not set.")

    msg = MIMEMultipart()
    msg['From'] = smtp_username
    msg['To'] = recipient_email
    msg['Subject'] = f"New Contact from {name}"

    body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
    msg.attach(MIMEText(body, 'plain'))

    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()
    server.login(smtp_username, smtp_password)
    server.send_message(msg)
    server.quit()

# ------------------------
# AI Tutor Routes
# ------------------------

@app.get("/courses")
def get_courses():
    session = TutorSessionLocal()
    try:
        courses = session.query(Course).all()
        return [{"iso": c.iso, "language": c.language, "level": c.level, "card_count": len(c.cards)} for c in courses]
    finally:
        session.close()

@app.get("/course/{iso}")
def get_course(iso: str):
    session = TutorSessionLocal()
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
    session = TutorSessionLocal()
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
    session = TutorSessionLocal()
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

# Admin endpoints
class SeedReq(BaseModel):
    iso: str
    level: Optional[str] = "A1"

@app.post("/admin/seed_language")
def admin_seed_language(req: SeedReq):
    iso = req.iso.lower().strip()
    if iso not in LANGUAGES:
        raise HTTPException(404, detail=f"Language '{iso}' not recognized.")
    session = TutorSessionLocal()
    try:
        name = LANGUAGES[iso]
        existing = session.query(Course).filter(Course.iso == iso).first()
        if existing:
            return {"message": f"Course for {name} already exists."}
        course = Course(language=name, iso=iso, level=req.level, description=f"Beginner {name} phrases")
        session.add(course)
        session.commit()
        for phrase in STARTER_PHRASES:
            translated = translate(phrase, "en", iso)
            card = Card(course_id=course.id, front=phrase, back=translated, tag="phrase")
            session.add(card)
        session.commit()
        return {"message": f"Seeded {len(STARTER_PHRASES)} cards for {name}."}
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

# Cool features
@app.get("/course/{iso}/stats")
def get_course_stats(iso: str):
    session = TutorSessionLocal()
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

class AddCardReq(BaseModel):
    front: str
    back: str
    hint: Optional[str] = ""
    tag: Optional[str] = "custom"

@app.post("/course/{iso}/add_card")
def add_custom_card(iso: str, req: AddCardReq):
    session = TutorSessionLocal()
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

@app.post("/course/{iso}/reset")
def reset_course_progress(iso: str):
    session = TutorSessionLocal()
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
    port = int(os.environ.get('PORT', 8000))  # Changed to 8000 to match frontend
    uvicorn.run(app, host="0.0.0.0", port=port)
