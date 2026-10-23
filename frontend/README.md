# BookLeaf Publishing — AI Support & Author Management Portal

A full-stack, enterprise-grade author support and ticket resolution portal engineered for BookLeaf Publishing. The platform features strict role-based access control (RBAC), real-time ticket triage, automated AI category classification and priority scoring, policy-grounded response pre-drafting, and an administrative workspace for support operations.

---

## Architecture & Tech Stack

- **Backend:** FastAPI (Python 3.10+), SQLAlchemy ORM, SQLite
- **Security & Authentication:** JWT (OAuth2 Bearer Tokens), passlib (Bcrypt password hashing), Role-Based Access Control (`AUTHOR` vs. `ADMIN`)
- **AI Intelligence:** OpenAI API (`gpt-4o-mini`) with grounded prompt engineering against BookLeaf's operational guidelines; includes automated deterministic keyword-based fallback for zero-downtime tolerance
- **Frontend:** React 19 (Vite), Tailwind CSS v4, Lucide React icons, Axios client with automatic bearer token injection
- **API Documentation:** Interactive Swagger UI and OpenAPI specifications

---

## Core Capabilities

### 1. Author Self-Service Desk
- **Catalog Visibility:** Live tracking of author books, ISBN metadata, sales volume, royalties earned, and pending payouts.
- **Contextual Ticket Submission:** File support requests attached to specific registered book titles or at the account level.
- **Two-Way Communication:** Real-time conversation thread with support representatives.
- **Privacy Boundaries:** Authors only have access to their own books, submitted tickets, and customer-facing messages.

### 2. AI Classification & Response Engine
- **Automated Categorization:** Classifies requests across 6 BookLeaf domains:
  1. *Royalty & Payments*
  2. *ISBN & Metadata Issues*
  3. *Printing & Quality*
  4. *Distribution & Availability*
  5. *Book Status & Production Updates*
  6. *General Inquiry*
- **Dynamic Priority Assignment:** Labels urgency (`Critical`, `High`, `Medium`, `Low`) based on issue severity and financial/operational impact.
- **Knowledge Base Grounded Drafting:** Auto-generates empathetic, policy-accurate responses citing royalty terms (80/20 net profit split, quarterly cycles), print schedules (5–7 days), and listing sync windows (24–48 hours).
- **Graceful Fallback:** Automatically switches to heuristic classification if API keys are missing or third-party services fail.

### 3. Admin Operations Control Desk
- **Multi-Variable Ticket Queue:** Filter by resolution status (`Open`, `In Progress`, `Resolved`, `Closed`), priority levels, or full-text search across authors, emails, and ticket subjects.
- **AI Triage Override:** Manual admin override for AI-assigned categories and priorities.
- **Private Internal Notes:** Add internal ops annotations protected from author visibility.
- **Response Dispatch:** Review, refine, and send pre-drafted replies while updating ticket lifecycle status in a single action.

---

## Project Structure

```text
bookleaf-portal/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── models.py          # SQLAlchemy models (User, Book, Ticket, Message, Note)
│   │   ├── routers/
│   │   │   ├── auth.py            # JWT authentication & permission dependencies
│   │   │   ├── authors.py         # Author catalog, tickets, and communication
│   │   │   └── admin.py           # Admin ticket queue, notes, overrides, and dispatch
│   │   ├── services/
│   │   │   └── ai_service.py      # OpenAI integration, prompt policies, and fallback
│   │   ├── config.py              # Environment configuration & settings
│   │   ├── database.py            # SQLite engine & database session setup
│   │   └── main.py                # FastAPI application entrypoint & middleware
│   ├── seed.py                    # Database seeder (10 Authors, 18 Books, 1 Admin)
│   ├── requirements.txt           # Python dependencies
│   └── .env                       # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx          # Login screen with quick-switch demo profiles
│   │   │   ├── AuthorPortal.jsx   # Author dashboard, book catalog, ticket creation
│   │   │   └── AdminPortal.jsx    # Admin ops desk, AI overrides, notes, reply desk
│   │   ├── api.js                 # Axios instance with auth interceptor
│   │   ├── AuthContext.jsx        # Authentication provider & user session state
│   │   ├── App.jsx                # Root router & role-based view switcher
│   │   └── index.css              # Tailwind CSS setup
│   ├── vite.config.js             # Vite configuration with Tailwind plugin
│   └── package.json               # Frontend dependencies & scripts
└── README.md