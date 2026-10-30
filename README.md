# BookLeaf Publishing — AI Support & Author Management Portal

A full-stack author support and ticket resolution portal engineered for BookLeaf Publishing. The platform features role-based access control (RBAC), real-time ticket triage, automated AI category classification and priority scoring, policy-grounded response pre-drafting, and an administrative workspace for support operations.
Live Link:- https://bookleaf-portal-tau.vercel.app/

## Architecture & Tech Stack

- **Backend:** FastAPI (Python 3.10+), SQLAlchemy ORM, SQLite
- **Security & Authentication:** JWT (OAuth2 Bearer Tokens), Passlib (Bcrypt hashing), Role-Based Access Control (`AUTHOR` vs. `ADMIN`)
- **AI Intelligence:** OpenAI API (`gpt-4o-mini`) with grounded operational prompt engineering; includes automated heuristic fallback for offline/fail-safe operation
- **Frontend:** React 19 (Vite), Tailwind CSS, Lucide React icons, Axios client with automatic bearer token injection
- **API Documentation:** Interactive Swagger UI and OpenAPI specifications

## Core Capabilities

### 1. Author Self-Service Desk
- **Catalog Visibility:** Live tracking of author books, ISBN metadata, sales volume, royalties earned, and pending payouts.
- **Contextual Ticket Submission:** File support requests attached to specific registered book titles or at the account level.
- **Two-Way Communication:** Real-time conversation thread with support representatives.
- **Privacy Boundaries:** Authors only have access to their own books, submitted tickets, and customer-facing messages.

### 2. AI Classification & Response Engine
- **Automated Categorization:** Classifies requests across 6 BookLeaf domains:
  1. Royalty & Payments
  2. ISBN & Metadata Issues
  3. Printing & Quality
  4. Distribution & Availability
  5. Book Status & Production Updates
  6. General Inquiry
- **Dynamic Priority Assignment:** Labels urgency (`Critical`, `High`, `Medium`, `Low`) based on issue severity and financial/operational impact.
- **Knowledge Base Grounded Drafting:** Auto-generates empathetic, policy-accurate responses citing royalty terms (80/20 net profit split, quarterly cycles), print schedules (5–7 days), and listing sync windows (24–48 hours).
- **Graceful Fallback:** Automatically switches to heuristic classification if API keys are missing or third-party services fail.

### 3. Admin Operations Control Desk
- **Multi-Variable Ticket Queue:** Filter by resolution status (`Open`, `In Progress`, `Resolved`, `Closed`), priority levels, or full-text search across authors, emails, and ticket subjects.
- **AI Triage Override:** Manual admin override for AI-assigned categories and priorities.
- **Private Internal Notes:** Add internal ops annotations protected from author visibility.
- **Response Dispatch:** Review, refine, and send pre-drafted replies while updating ticket lifecycle status in a single action.

## Demo Credentials

The login screen provides one-click quick-fill buttons for instant review:

| Role | Name | Email | Password | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | BookLeaf Ops Admin | `admin@bookleafpub.com` | `admin123` | Full queue access, AI overrides, internal notes, response dispatch |
| **Author** | Priya Sharma | `priya.sharma@email.com` | `author123` | Author book management, ticket submission, status tracking |
| **Author** | Rajesh Kumar | `rajesh.kumar@email.com` | `author123` | Secondary test author account |

## Getting Started

### Step 1: Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
