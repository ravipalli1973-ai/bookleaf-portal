import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Ticket, TicketMessage, InternalNote
from app.routers.auth import require_admin
from app.services.ai_service import generate_ai_draft_response

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])


# --- Schemas ---
class InternalNoteCreate(BaseModel):
    note: str

class InternalNoteResponse(BaseModel):
    id: int
    admin_id: str
    admin_name: str
    note: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class TicketMessageResponse(BaseModel):
    id: int
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class AdminTicketDetailResponse(BaseModel):
    id: str
    author_id: str
    author_name: str
    author_email: str
    book_id: Optional[str] = None
    book_title: Optional[str] = None
    subject: str
    description: str
    status: str
    category: str
    priority: str
    assigned_to: Optional[str] = None
    ai_draft_response: Optional[str] = None
    attachment_name: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    messages: List[TicketMessageResponse] = []
    internal_notes: List[InternalNoteResponse] = []

    class Config:
        from_attributes = True

class TicketStatusUpdate(BaseModel):
    status: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None

class AdminReplyRequest(BaseModel):
    message: str
    new_status: Optional[str] = "In Progress"


# --- Endpoints ---

@router.get("/tickets", response_model=List[AdminTicketDetailResponse])
def get_all_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Retrieve ticket queue with filtering options for ops team."""
    query = db.query(Ticket)

    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if category_filter:
        query = query.filter(Ticket.category == category_filter)
    if priority_filter:
        query = query.filter(Ticket.priority == priority_filter)
    if search:
        search_fmt = f"%{search}%"
        query = query.join(User, Ticket.author_id == User.id).filter(
            (Ticket.subject.ilike(search_fmt)) |
            (Ticket.description.ilike(search_fmt)) |
            (User.name.ilike(search_fmt)) |
            (User.email.ilike(search_fmt))
        )

    # Order by Critical/High priorities first, then oldest unresolved
    tickets = query.order_by(
        Ticket.created_at.desc()
    ).all()

    results = []
    for t in tickets:
        results.append({
            "id": t.id,
            "author_id": t.author_id,
            "author_name": t.author.name if t.author else "Unknown",
            "author_email": t.author.email if t.author else "",
            "book_id": t.book_id,
            "book_title": t.book.title if t.book else "General / Account Level",
            "subject": t.subject,
            "description": t.description,
            "status": t.status,
            "category": t.category,
            "priority": t.priority,
            "assigned_to": t.assigned_to,
            "ai_draft_response": t.ai_draft_response,
            "attachment_name": t.attachment_name,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "messages": t.messages,
            "internal_notes": t.internal_notes,
        })
    return results


@router.get("/tickets/{ticket_id}", response_model=AdminTicketDetailResponse)
def get_ticket_detail(
    ticket_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Get complete ticket information including messages and internal notes."""
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    return {
        "id": t.id,
        "author_id": t.author_id,
        "author_name": t.author.name if t.author else "Unknown",
        "author_email": t.author.email if t.author else "",
        "book_id": t.book_id,
        "book_title": t.book.title if t.book else "General / Account Level",
        "subject": t.subject,
        "description": t.description,
        "status": t.status,
        "category": t.category,
        "priority": t.priority,
        "assigned_to": t.assigned_to,
        "ai_draft_response": t.ai_draft_response,
        "attachment_name": t.attachment_name,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "messages": t.messages,
        "internal_notes": t.internal_notes,
    }


@router.patch("/tickets/{ticket_id}", response_model=AdminTicketDetailResponse)
def update_ticket_metadata(
    ticket_id: str,
    update_data: TicketStatusUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Update ticket status, reassign, or manually override AI category/priority."""
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if update_data.status is not None:
        t.status = update_data.status
    if update_data.category is not None:
        t.category = update_data.category
    if update_data.priority is not None:
        t.priority = update_data.priority
    if update_data.assigned_to is not None:
        t.assigned_to = update_data.assigned_to

    t.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(t)

    return get_ticket_detail(ticket_id=ticket_id, db=db, admin_user=admin_user)


@router.post("/tickets/{ticket_id}/reply", response_model=TicketMessageResponse)
def admin_reply_ticket(
    ticket_id: str,
    payload: AdminReplyRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Admin sends a reply to the author and optionally advances status."""
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    msg = TicketMessage(
        ticket_id=t.id,
        sender_id=admin_user.id,
        sender_name=f"{admin_user.name} (Support)",
        sender_role="ADMIN",
        message=payload.message,
    )
    db.add(msg)

    if payload.new_status:
        t.status = payload.new_status
    t.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(msg)
    return msg


@router.post("/tickets/{ticket_id}/notes", response_model=InternalNoteResponse)
def add_internal_note(
    ticket_id: str,
    note_data: InternalNoteCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """Add a private note visible only to admins."""
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    note = InternalNote(
        ticket_id=t.id,
        admin_id=admin_user.id,
        admin_name=admin_user.name,
        note=note_data.note,
    )
    db.add(note)
    t.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(note)
    return note