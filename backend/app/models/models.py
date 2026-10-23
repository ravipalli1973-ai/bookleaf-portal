import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)  # e.g. AUTH001 or ADMIN001
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="AUTHOR")  # AUTHOR or ADMIN
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    joined_date = Column(String, nullable=True)

    # Relationships
    books = relationship("Book", back_populates="author", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="author", foreign_keys="Ticket.author_id")

class Book(Base):
    __tablename__ = "books"

    book_id = Column(String, primary_key=True, index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    isbn = Column(String, nullable=True)
    genre = Column(String, nullable=True)
    publication_date = Column(String, nullable=True)
    status = Column(String, nullable=False)  # "Published & Live", "In Production - Cover Design", etc.
    mrp = Column(Float, nullable=True)
    author_royalty_per_copy = Column(Float, nullable=True)
    total_copies_sold = Column(Integer, default=0)
    total_royalty_earned = Column(Float, default=0.0)
    royalty_paid = Column(Float, default=0.0)
    royalty_pending = Column(Float, default=0.0)
    last_royalty_payout_date = Column(String, nullable=True)
    print_partner = Column(String, nullable=True)
    available_on = Column(JSON, default=list)

    # Relationships
    author = relationship("User", back_populates="books")
    tickets = relationship("Ticket", back_populates="book")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String, primary_key=True, index=True)  # e.g. TKT-1001
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    book_id = Column(String, ForeignKey("books.book_id"), nullable=True)  # Nullable for General account queries
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    attachment_name = Column(String, nullable=True)
    
    # Classification & Status
    category = Column(String, default="General Inquiry")
    priority = Column(String, default="Medium")  # Critical, High, Medium, Low
    status = Column(String, default="Open")      # Open, In Progress, Resolved, Closed
    assigned_to = Column(String, nullable=True)  # Admin name or email
    ai_draft_response = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    author = relationship("User", back_populates="tickets", foreign_keys=[author_id])
    book = relationship("Book", back_populates="tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")
    internal_notes = relationship("InternalNote", back_populates="ticket", cascade="all, delete-orphan")

class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String, ForeignKey("tickets.id"), nullable=False)
    sender_id = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    sender_role = Column(String, nullable=False)  # AUTHOR or ADMIN
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    ticket = relationship("Ticket", back_populates="messages")

class InternalNote(Base):
    __tablename__ = "internal_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String, ForeignKey("tickets.id"), nullable=False)
    admin_id = Column(String, nullable=False)
    admin_name = Column(String, nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    ticket = relationship("Ticket", back_populates="internal_notes")