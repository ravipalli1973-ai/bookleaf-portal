from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, authors, admin

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BookLeaf Support Portal API",
    description="Backend API for Author and Admin Support Management",
    version="1.0.0",
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router)
app.include_router(authors.router)
app.include_router(admin.router)

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "BookLeaf Portal API"}