from pydantic import BaseModel, EmailStr, Field, PositiveFloat, constr
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=128)
    role: constr(to_lower=True, strip_whitespace=True) = Field(
        default="eater", pattern="^(eater|maker)$"
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=128)


class AuthResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    message: str


class MealCreate(BaseModel):
    maker_id: int
    title: constr(min_length=1, max_length=120)
    description: constr(min_length=1, max_length=500)
    price: PositiveFloat
    image_data: constr(min_length=1)


class MealResponse(BaseModel):
    id: int
    maker_id: int
    title: str
    description: str
    price: float
    image_data: str

    class Config:
        from_attributes = True


class MakerProfileRequest(BaseModel):
    maker_id: int
    name: constr(min_length=1, max_length=120)
    email: EmailStr
    phone: constr(min_length=1, max_length=64)
    country: constr(min_length=1, max_length=64)
    location: constr(min_length=1, max_length=500)


class MakerProfileResponse(BaseModel):
    maker_id: int
    name: str
    email: EmailStr
    phone: str
    country: str
    location: str

    class Config:
        from_attributes = True


class MakerSummaryResponse(BaseModel):
    maker_id: int
    name: str
    location: str
    meal_count: int
    featured_meal_name: str | None = None
    featured_meal_image: str | None = None

    class Config:
        from_attributes = True


class MakerOrderCreate(BaseModel):
    maker_id: int
    order_code: constr(min_length=1, max_length=32)
    eater_name: constr(min_length=1, max_length=120)
    eater_id: int | None = None
    meal_name: constr(min_length=1, max_length=120)
    image_data: constr(min_length=1)
    price: PositiveFloat
    order_time: datetime | None = None


class MakerOrderUpdate(BaseModel):
    status: constr(to_lower=True, strip_whitespace=True) = Field(
        pattern="^(pending|preparing|ready|completed)$"
    )


class MakerOrderResponse(BaseModel):
    id: int
    maker_id: int
    eater_id: int | None
    order_code: str
    eater_name: str
    meal_name: str
    image_data: str
    price: float
    order_time: datetime
    status: str

    class Config:
        from_attributes = True


class MakerReviewCreate(BaseModel):
    order_id: int
    rating: int = Field(ge=1, le=5)
    comment: constr(min_length=1)


class MakerReviewUpdate(BaseModel):
    reply: constr(min_length=1, max_length=500)


class MakerReviewResponse(BaseModel):
    id: int
    maker_id: int
    eater_id: int
    order_id: int
    order_code: str
    eater_name: str
    meal_name: str
    image_data: str
    rating: int
    comment: str
    reply: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReviewSnippet(BaseModel):
    review_id: int
    rating: int
    comment: str
    reply: str | None


class EaterOrderResponse(BaseModel):
    id: int
    maker_id: int
    eater_id: int | None
    order_code: str
    eater_name: str
    meal_name: str
    image_data: str
    price: float
    order_time: datetime
    status: str
    review: ReviewSnippet | None

    class Config:
        from_attributes = True


class EaterProfileRequest(BaseModel):
    eater_id: int
    display_name: constr(min_length=1, max_length=120)
    phone: constr(min_length=0, max_length=64) | None = None
    favorite_cuisine: constr(min_length=0, max_length=120) | None = None
    note: constr(min_length=0, max_length=500) | None = None


class EaterProfileResponse(BaseModel):
    eater_id: int
    display_name: str
    phone: str | None
    favorite_cuisine: str | None
    note: str | None

    class Config:
        from_attributes = True
