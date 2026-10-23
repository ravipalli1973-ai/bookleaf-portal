import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI
from app.config import settings

logger = logging.getLogger(__name__)

# Official BookLeaf Knowledge Base provided in the brief
BOOKLEAF_KNOWLEDGE_BASE = """
BookLeaf Publishing Knowledge Base & Operational Policies:
- Company: Self-publishing company operating in India & US. In-house print facility in Delhi; partners: Repro India, Epitome Books.
- Royalty Policy: 80/20 split (80% net profit to author, 20% to BookLeaf). Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping. Calculated quarterly, paid within 45 days of quarter ending. Minimum payout threshold: ₹1,000 (rolls over if below). Bank transfer only.
- ISBN Policy: Unique ISBN assigned under BookLeaf imprint. Author imprint requires independent acquisition. ISBN errors are treated as high priority with a 48-hour resolution timeline.
- Printing & Quality: Turnaround is 5-7 business days. Misprints/binding defects receive a free reprint after the author shares photos of defective copies.
- Distribution: Listed on Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store. Listings go live 7-10 business days after publication. "Currently Unavailable" indicates a stock sync issue; re-sync takes 24-48 hours.
- Production Stages: Manuscript Received -> Editing -> Cover Design -> Typesetting -> Proofreading -> ISBN Assignment -> Printing -> Distribution Setup -> Published & Live. Delays typically happen at Cover Design (author approval) and Proofreading (revisions).

Tone Guidelines:
- Empathetic and professional. Authors are partners, not customers to be managed.
- Acknowledge author concern before jumping to solutions.
- Include specific numbers, dates, and statuses.
- Own mistakes directly (no corporate deflection).
- Clear escalation timelines (e.g., 48 hours).
- End with a clear next step.
"""

def get_openai_client() -> Optional[OpenAI]:
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_openai_api_key_here":
        return None
    return OpenAI(api_key=settings.OPENAI_API_KEY)

def classify_and_score_ticket(subject: str, description: str, book_info: Optional[str] = None) -> Dict[str, str]:
    """
    Classifies a ticket into one of the 6 BookLeaf categories and determines priority score.
    Includes graceful degradation fallback if OpenAI API fails or key is missing.
    """
    fallback = {
        "category": "General Inquiry",
        "priority": "Medium"
    }

    client = get_openai_client()
    if not client:
        logger.warning("OpenAI API key missing. Using rule-based fallback classification.")
        text = f"{subject} {description}".lower()
        if any(w in text for w in ["royalty", "payment", "payout", "unpaid", "money", "bank"]):
            return {"category": "Royalty & Payments", "priority": "High"}
        if any(w in text for w in ["isbn", "barcode"]):
            return {"category": "ISBN & Metadata Issues", "priority": "High"}
        if any(w in text for w in ["print", "defect", "pages", "cover", "blurry", "binding"]):
            return {"category": "Printing & Quality", "priority": "High"}
        if any(w in text for w in ["unavailable", "amazon", "flipkart", "out of stock", "distribution"]):
            return {"category": "Distribution & Availability", "priority": "Medium"}
        if any(w in text for w in ["typesetting", "proofreading", "status", "production", "stage"]):
            return {"category": "Book Status & Production Updates", "priority": "Medium"}
        return fallback

    prompt = f"""
Analyze this author support query for BookLeaf Publishing:
Book Context: {book_info or 'General / Account Level'}
Subject: {subject}
Description: {description}

Categories allowed:
1. Royalty & Payments
2. ISBN & Metadata Issues
3. Printing & Quality
4. Distribution & Availability
5. Book Status & Production Updates
6. General Inquiry

Priorities allowed:
- Critical (e.g. major payment overdue > 6 months, severe wrong ISBN)
- High (e.g. defective prints, royalty mismatch, listing down)
- Medium (e.g. status delay inquiries, standard queries)
- Low (e.g. general questions, bio update)

Respond strictly in valid JSON format:
{{
  "category": "<Exact Category Name>",
  "priority": "<Critical | High | Medium | Low>"
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        return {
            "category": result.get("category", fallback["category"]),
            "priority": result.get("priority", fallback["priority"])
        }
    except Exception as e:
        logger.error(f"Error during AI classification: {e}")
        return fallback

def generate_ai_draft_response(
    subject: str, 
    description: str, 
    author_name: str, 
    book_details: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generates an empathetic, policy-accurate draft response based on BookLeaf Knowledge Base.
    """
    fallback_response = (
        f"Dear {author_name},\n\n"
        f"Thank you for contacting BookLeaf Publishing Support regarding '{subject}'.\n\n"
        f"We have received your query and our team is actively reviewing your account details. "
        f"We will investigate this and provide an update within 48 hours.\n\n"
        f"Best regards,\nBookLeaf Support Team"
    )

    client = get_openai_client()
    if not client:
        return fallback_response

    system_prompt = f"""
You are an expert, empathetic customer support lead at BookLeaf Publishing.
Draft a professional response to an author query following the BookLeaf Knowledge Base and Tone Guidelines below.

{BOOKLEAF_KNOWLEDGE_BASE}

Author Name: {author_name}
Book Info: {json.dumps(book_details) if book_details else 'No specific book / Account Level'}

Guidelines:
- Greet the author warmly by name.
- Empathize with their concern upfront.
- Reference their exact book title or numbers if relevant.
- State clear BookLeaf policies (80/20 split, 45-day quarterly payout, 5-7 days print, 24-48 hrs sync).
- End with an explicit next step and sign off as 'BookLeaf Support Team'.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Subject: {subject}\nQuery: {description}"}
            ],
            temperature=0.4,
            max_tokens=400
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error during AI response drafting: {e}")
        return fallback_response