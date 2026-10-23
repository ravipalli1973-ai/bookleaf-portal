import json
import os
import sys
import bcrypt

# Ensure backend root is on sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models.models import User, Book

def hash_password(password: str) -> str:
    # Use bcrypt directly to avoid passlib compatibility issues
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def seed():
    # 1. Create tables if they do not exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("[INFO] Database already contains records. Clearing existing tables for a clean seed...")
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)

        # 2. Create Default Admin User
        admin_user = User(
            id="ADMIN001",
            name="BookLeaf Ops Admin",
            email="admin@bookleafpub.com",
            password_hash=hash_password("admin123"),
            role="ADMIN",
            phone="+91-99999-00000",
            city="Delhi",
            joined_date="2022-01-01"
        )
        db.add(admin_user)

        # 3. Read sample dataset
        data_path = os.path.join(os.path.dirname(__file__), "data", "bookleaf_sample_data.json")
        if not os.path.exists(data_path):
            print(f"[ERROR] Sample file not found at: {data_path}")
            return

        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        authors_list = data.get("authors", [])
        total_books = 0

        for author_data in authors_list:
            author = User(
                id=author_data["author_id"],
                name=author_data["name"],
                email=author_data["email"],
                password_hash=hash_password("author123"),  # standard test password for authors
                role="AUTHOR",
                phone=author_data.get("phone"),
                city=author_data.get("city"),
                joined_date=author_data.get("joined_date")
            )
            db.add(author)

            for b in author_data.get("books", []):
                book = Book(
                    book_id=b["book_id"],
                    author_id=author_data["author_id"],
                    title=b["title"],
                    isbn=b.get("isbn"),
                    genre=b.get("genre"),
                    publication_date=b.get("publication_date"),
                    status=b.get("status", "Published & Live"),
                    mrp=b.get("mrp"),
                    author_royalty_per_copy=b.get("author_royalty_per_copy"),
                    total_copies_sold=b.get("total_copies_sold", 0),
                    total_royalty_earned=b.get("total_royalty_earned", 0.0),
                    royalty_paid=b.get("royalty_paid", 0.0),
                    royalty_pending=b.get("royalty_pending", 0.0),
                    last_royalty_payout_date=b.get("last_royalty_payout_date"),
                    print_partner=b.get("print_partner"),
                    available_on=b.get("available_on", [])
                )
                db.add(book)
                total_books += 1

        db.commit()
        print(f"[SUCCESS] Seeded {len(authors_list)} authors, {total_books} books, and 1 admin user.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()