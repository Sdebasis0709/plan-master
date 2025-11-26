from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.database import get_db_connection
from app.auth.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


# -----------------------------
# SCHEMAS
# -----------------------------

class RegisterSchema(BaseModel):
    email: EmailStr
    password: str
    role: str = "operator"


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


# -----------------------------
# REGISTER USER
# -----------------------------

@router.post("/register")
def register(data: RegisterSchema):
    conn = get_db_connection()
    cur = conn.cursor()

    # Check existing user
    cur.execute("SELECT id FROM users WHERE email=%s", (data.email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="User already exists")

    # Hash password
    hashed = hash_password(data.password)

    # Insert new user
    cur.execute(
        """
        INSERT INTO users (email, password_hash, role)
        VALUES (%s, %s, %s)
        RETURNING id, email, role
        """,
        (data.email, hashed, data.role)
    )

    user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": "User created successfully",
        "user": user
    }


# -----------------------------
# LOGIN USER
# -----------------------------

@router.post("/login")
def login(data: LoginSchema):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, email, password_hash, role FROM users WHERE email=%s",
        (data.email,)
    )
    user = cur.fetchone()

    if not user:
        cur.close()
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    if not verify_password(data.password, user["password_hash"]):
        cur.close()
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Generate JWT token
    token = create_access_token({
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"]
    })

    cur.close()
    conn.close()

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"]
    }
