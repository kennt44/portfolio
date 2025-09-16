from flask import Flask, request, jsonify, send_from_directory
import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__, static_folder='static', static_url_path='')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///contact_messages.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define ContactMessage model
class ContactMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<ContactMessage {self.id} {self.email}>'

@app.before_first_request
def create_tables():
    db.create_all()

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/contact', methods=['POST'])
def contact():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not name or not email or not message:
        return jsonify({'error': 'Please provide name, email, and message.'}), 400

    logger.info(f"Contact form submission: Name={name}, Email={email}, Message={message}")

    # Save message to database
    contact_message = ContactMessage(name=name, email=email, message=message)
    db.session.add(contact_message)
    db.session.commit()

    # Send email notification
    try:
        send_email(name, email, message)
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return jsonify({'error': 'Failed to send message. Please try again later.'}), 500

    return jsonify({'message': 'Message received successfully!'})

def send_email(name, email, message):
    # Email configuration - replace with your SMTP server details and credentials
    smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_username = os.environ.get('SMTP_USERNAME')  # Your email address
    smtp_password = os.environ.get('SMTP_PASSWORD')  # Your email password or app password
    recipient_email = os.environ.get('RECIPIENT_EMAIL', smtp_username)  # Where to send contact form messages

    if not smtp_username or not smtp_password:
        raise Exception("SMTP credentials are not set in environment variables.")

    msg = MIMEMultipart()
    msg['From'] = smtp_username
    msg['To'] = recipient_email
    msg['Subject'] = f"New Contact Form Submission from {name}"

    body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
    msg.attach(MIMEText(body, 'plain'))

    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()
    server.login(smtp_username, smtp_password)
    server.send_message(msg)
    server.quit()

# Serve other static files (CSS, JS, images) automatically
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
