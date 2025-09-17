# Copilot Instructions for AI Agents

## Project Overview
This is a full-stack portfolio project with a React frontend and a Python (Flask/SQLAlchemy) backend. The backend manages contact messages and serves static assets, while the frontend provides a modern UI using Tailwind CSS.

## Architecture
- **frontend/**: React app (see `src/` for components, `public/` for static assets/images)
- **backend/**: Python Flask app (`app.py`), SQLite database (`contact_messages.db`), static files
- **Data Flow**: Frontend communicates with backend via HTTP API endpoints (see `app.py`)
- **Database**: SQLite, ORM via SQLAlchemy

## Developer Workflows
- **Frontend**
  - Install dependencies: `npm install` in `frontend/`
  - Build: `npm run build`
  - Tailwind CSS: Configured via `tailwind.config.js` and `postcss.config.js`
  - Static images (e.g., graduation photo): Place in `frontend/public/images/` and reference as `/images/filename.jpg`
- **Backend**
  - Install dependencies: `pip install -r requirements.txt` in `backend/`
  - Run server: `python app.py`
  - Database file must exist and be accessible (see below for SQLite issues)

## Common Issues & Patterns
- **SQLite Error**: If you see `sqlite3.OperationalError: unable to open database file`, ensure:
  - The path to the database file is correct and writable
  - The parent directory exists (e.g., `instance/` for Flask)
  - Example fix: `os.makedirs('instance', exist_ok=True)` before initializing the DB
- **Static Assets**: Serve images and CSS from `frontend/public/` or `backend/static/` as appropriate
- **Component Structure**: React components are in `frontend/src/components/`
- **API Integration**: Frontend fetches data from backend endpoints (see `app.py` for routes)

## Conventions
- Use relative imports for Python modules
- Use functional React components
- Place images in `public/images/` and reference with `/images/...`
- Keep environment-specific config in `.env` (if present)

## Key Files
- `backend/app.py`: Flask app, API routes, DB setup
- `backend/requirements.txt`: Python dependencies
- `frontend/src/components/`: React UI components
- `frontend/public/images/`: Static images
- `frontend/package.json`: Frontend scripts/deps

## Example: Adding an Image
1. Save image to `frontend/public/images/`
2. Reference in React: `<img src="/images/yourimage.jpg" alt="Description" />`

---
For questions or unclear patterns, check `TODO.md` for project-specific notes or ask for clarification.
