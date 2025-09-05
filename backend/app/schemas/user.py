from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, Literal

ROLES = {"admin", "bauleiter", "polier", "sub"}

class UserBase(BaseModel):
    email: EmailStr
    role: Literal["admin", "bauleiter", "polier", "sub"]
    # ✅ opcionalna polja
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str  # i dalje obavezna

class UserRead(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    # sve opcionalno (za PATCH)
    email: Optional[EmailStr] = None
    role: Optional[Literal["admin", "bauleiter", "polier", "sub"]] = None
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str = Field(min_length=6)
    new_password: str = Field(min_length=6)

class PasswordReset(BaseModel):
    new_password: str = Field(min_length=6)