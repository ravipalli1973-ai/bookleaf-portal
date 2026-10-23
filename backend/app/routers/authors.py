import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Book, Ticket, TicketMessage
from app.routers.auth import get_current_user
from app.services.ai_service import classify_and_score_ticket, generate_ai_draft_response

router = APIRouter(prefix="/api/author", tags=["Author Operations"])


# --- Schemas ---
class BookResponse(BaseModel):
    book_id: str
    title: str
    isbn: Optional[str] = None
    genre: Optional[str] = None
    publication_date: Optional[str] = None
    status: str
    mrp: Optional[float] = None
    author_royalty_per_copy: Optional[float] = None
    total_copies_sold: int = 0
    total_royalty_earned: float = 0.0
    royalty_paid: float = 0.0
    royalty_pending: float = 0.0
    last_royalty_payout_date: Optional[str] = None
    print_partner: Optional[str] = None
    available_on: List[str] = []

    class Config:
        from_attributes = True


class TicketCreateRequest(BaseModel):
    book_id: Optional[str] = None  # None for General / Account Level
    subject: str
    description: str
    attachment_name: Optional[str] = None


class TicketReplyRequest(BaseModel):
    message: str


class TicketMessageResponse(BaseModel):
    id: int
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    id: str
    book_id: Optional[str] = None
    book_title: Optional[str] = None
    subject: str
    description: str
    status: str
    category: str
    priority: str
    attachment_name: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    messages: List[TicketMessageResponse] = []

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.get("/books", response_model=List[BookResponse])
def get_my_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch all books belonging exclusively to the logged-in author."""
    return db.query(Book).filter(Book.author_id == current_user.id).all()


@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_data: TicketCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a new support ticket with automated AI classification & draft generation."""
    book_title = None
    book_details = None

    if ticket_data.book_id:
        book = (
            db.query(Book)
            .filter(Book.book_id == ticket_data.book_id, Book.author_id == current_user.id)
            .first()
        )
        if not book:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected book not found or does not belong to you.",
            )
        book_title = book.title
        book_details = {
            "title": book.title,
            "isbn": book.isbn,
            "status": book.status,
            "royalty_pending": book.royalty_pending,
            "total_copies_sold": book.total_copies_sold,
        }

    # AI Auto-classification and priority scoring
    ai_analysis = classify_and_score_ticket(
        subject=ticket_data.subject,
        description=ticket_data.description,
        book_info=f"{book_title} (ID: {ticket_data.book_id})" if book_title else None
    )

    # Pre-draft AI response for the admin team
    ai_draft = generate_ai_draft_response(
        subject=ticket_data.subject,
        description=ticket_data.description,
        author_name=current_user.name,
        book_details=book_details
    )

    ticket_id = f"TKT-{uuid.uuid4().hex[:6].upper()}"

    new_ticket = Ticket(
        id=ticket_id,
        author_id=current_user.id,
        book_id=ticket_data.book_id,
        subject=ticket_data.subject,
        description=ticket_data.description,
        attachment_name=ticket_data.attachment_name,
        category=ai_analysis["category"],
        priority=ai_analysis["priority"],
        status="Open",
        ai_draft_response=ai_draft
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    return {
        "id": new_ticket.id,
        "book_id": new_ticket.book_id,
        "book_title": book_title,
        "subject": new_ticket.subject,
        "description": new_ticket.description,
        "status": new_ticket.status,
        "category": new_ticket.category,
        "priority": new_ticket.priority,
        "attachment_name": new_ticket.attachment_name,
        "created_at": new_ticket.created_at,
        "updated_at": new_ticket.updated_at,
        "messages": [],
    }


@router.get("/tickets", response_model=List[TicketResponse])
def get_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all tickets raised by the current author with updates and responses."""
    tickets = (
        db.query(Ticket)
        .filter(Ticket.author_id == current_user.id)
        .order_by(Ticket.created_at.desc())
        .all()
    )

    response = []
    for t in tickets:
        response.append({
            "id": t.id,
            "book_id": t.book_id,
            "book_title": t.book.title if t.book else "General / Account Level",
            "subject": t.subject,
            "description": t.description,
            "status": t.status,
            "category": t.category,
            "priority": t.priority,
            "attachment_name": t.attachment_name,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "messages": t.messages,
        })
    return response


@router.post("/tickets/{ticket_id}/reply", response_model=TicketMessageResponse)
def reply_to_ticket(
    ticket_id: str,
    reply: TicketReplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Author sends a message on an existing ticket."""
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id, Ticket.author_id == current_user.id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        sender_name=current_user.name,
        sender_role="AUTHOR",
        message=reply.message,
    )
    db.add(msg)
    ticket.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(msg)
    return msg