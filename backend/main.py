import random

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select

from .database import Base, engine, get_session
from typing import List, Optional

from datetime import datetime, timezone
from .models import EaterProfile, MakerOrder, MakerProfile, MakerReview, Meal, User
from .schemas import (
    AuthResponse,
    LoginRequest,
    MakerOrderCreate,
    MakerOrderResponse,
    MakerOrderUpdate,
    MakerReviewCreate,
    MakerReviewResponse,
    MakerReviewUpdate,
    MakerProfileRequest,
    MakerProfileResponse,
    MakerSummaryResponse,
    MealCreate,
    MealResponse,
    RegisterRequest,
    EaterProfileRequest,
    EaterProfileResponse,
    EaterOrderResponse,
    ReviewSnippet,
)
from .security import hash_password, verify_password


def get_db():
    with get_session() as session:
        yield session


Base.metadata.create_all(bind=engine)

app = FastAPI(title="AussieEat API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post(
    "/api/auth/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()
    db.refresh(user)

    return AuthResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        message="Registration successful",
    )


@app.post("/api/auth/login", response_model=AuthResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return AuthResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        message="Login successful",
    )


@app.get("/api/meals", response_model=List[MealResponse])
def list_meals(maker_id: Optional[int] = None, db: Session = Depends(get_db)):
    stmt = select(Meal)
    if maker_id:
        stmt = stmt.where(Meal.maker_id == maker_id)
    meals = db.scalars(stmt.order_by(Meal.created_at.desc())).all()
    return meals


@app.get("/api/makers", response_model=List[MakerSummaryResponse])
def list_makers(db: Session = Depends(get_db)):
    profiles = db.scalars(select(MakerProfile)).all()
    meals = db.scalars(select(Meal)).all()

    meal_map: dict[int, list[Meal]] = {}
    for meal in meals:
        meal_map.setdefault(meal.maker_id, []).append(meal)

    summaries: List[MakerSummaryResponse] = []
    for profile in profiles:
        maker_meals = meal_map.get(profile.maker_id, [])
        featured_meal = random.choice(maker_meals) if maker_meals else None
        summaries.append(
            MakerSummaryResponse(
                maker_id=profile.maker_id,
                name=profile.name,
                location=profile.location,
                meal_count=len(maker_meals),
                featured_meal_name=featured_meal.title if featured_meal else None,
                featured_meal_image=featured_meal.image_data if featured_meal else None,
            )
        )
    return summaries


@app.post(
    "/api/meals",
    response_model=MealResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_meal(payload: MealCreate, db: Session = Depends(get_db)):
    maker = db.scalar(select(User).where(User.id == payload.maker_id, User.role == "maker"))
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found",
        )

    meal = Meal(
        maker_id=payload.maker_id,
        title=payload.title,
        description=payload.description,
        price=payload.price,
        image_data=payload.image_data,
    )
    db.add(meal)
    db.flush()
    db.refresh(meal)
    return meal


@app.get("/api/maker/profile", response_model=MakerProfileResponse)
def get_maker_profile(maker_id: int, db: Session = Depends(get_db)):
    maker = db.scalar(select(User).where(User.id == maker_id, User.role == "maker"))
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found",
        )

    profile = db.scalar(select(MakerProfile).where(MakerProfile.maker_id == maker_id))
    if not profile:
        profile = MakerProfile(
            maker_id=maker_id,
            name="Chef's Corner",
            email=maker.email,
            phone="+61 3 8652 1453",
            country="Australia",
            location="Shop LGSS09, 99 Spencer St, Docklands VIC 3008",
        )
        db.add(profile)
        db.flush()
        db.refresh(profile)

    return profile


@app.put("/api/maker/profile", response_model=MakerProfileResponse)
def update_maker_profile(payload: MakerProfileRequest, db: Session = Depends(get_db)):
    maker = db.scalar(select(User).where(User.id == payload.maker_id, User.role == "maker"))
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found",
        )

    profile = db.scalar(select(MakerProfile).where(MakerProfile.maker_id == payload.maker_id))
    if not profile:
        profile = MakerProfile(
            maker_id=payload.maker_id,
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            country=payload.country,
            location=payload.location,
        )
        db.add(profile)
        db.flush()
        db.refresh(profile)
        return profile

    profile.name = payload.name
    profile.email = payload.email
    profile.phone = payload.phone
    profile.country = payload.country
    profile.location = payload.location
    db.flush()
    db.refresh(profile)
    return profile


@app.get("/api/orders", response_model=List[MakerOrderResponse])
def list_orders(
    maker_id: int,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    maker = db.scalar(select(User).where(User.id == maker_id, User.role == "maker"))
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found",
        )

    stmt = select(MakerOrder).where(MakerOrder.maker_id == maker_id)
    if status_filter:
        stmt = stmt.where(MakerOrder.status == status_filter.lower())
    orders = db.scalars(stmt.order_by(MakerOrder.created_at.desc())).all()
    return orders


@app.post(
    "/api/orders",
    response_model=MakerOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(payload: MakerOrderCreate, db: Session = Depends(get_db)):
    maker = db.scalar(select(User).where(User.id == payload.maker_id, User.role == "maker"))
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found",
        )

    existing = db.scalar(select(MakerOrder).where(MakerOrder.order_code == payload.order_code))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order code already exists",
        )

    order = MakerOrder(
        maker_id=payload.maker_id,
        order_code=payload.order_code,
        eater_name=payload.eater_name,
        eater_id=payload.eater_id,
        meal_name=payload.meal_name,
        image_data=payload.image_data,
        price=payload.price,
        order_time=payload.order_time or datetime.now(timezone.utc),
    )
    db.add(order)
    db.flush()
    db.refresh(order)
    return order


@app.patch("/api/orders/{order_id}", response_model=MakerOrderResponse)
def update_order_status(
    order_id: int,
    payload: MakerOrderUpdate,
    db: Session = Depends(get_db),
):
    order = db.get(MakerOrder, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    order.status = payload.status
    db.flush()
    db.refresh(order)
    return order


@app.get("/api/eater/orders", response_model=List[EaterOrderResponse])
def list_eater_orders(
    eater_id: int,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    eater = db.scalar(select(User).where(User.id == eater_id, User.role == "eater"))
    if not eater:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eater not found",
        )

    stmt = select(MakerOrder).where(MakerOrder.eater_id == eater_id)
    if status_filter:
        stmt = stmt.where(MakerOrder.status == status_filter.lower())
    orders = db.scalars(stmt.order_by(MakerOrder.order_time.desc())).all()

    order_ids = [order.id for order in orders]
    review_map = {}
    if order_ids:
        reviews = db.scalars(
            select(MakerReview).where(MakerReview.order_id.in_(order_ids))
        ).all()
        review_map = {review.order_id: review for review in reviews}

    eater_orders: List[EaterOrderResponse] = []
    for order in orders:
        review = review_map.get(order.id)
        snippet = (
            ReviewSnippet(
                review_id=review.id,
                rating=review.rating,
                comment=review.comment,
                reply=review.reply,
            )
            if review
            else None
        )
        eater_orders.append(
            EaterOrderResponse(
                id=order.id,
                maker_id=order.maker_id,
                eater_id=order.eater_id,
                order_code=order.order_code,
                eater_name=order.eater_name,
                meal_name=order.meal_name,
                image_data=order.image_data,
                price=order.price,
                order_time=order.order_time,
                status=order.status,
                review=snippet,
            )
        )

    return eater_orders


@app.get("/api/reviews", response_model=List[MakerReviewResponse])
def list_reviews(maker_id: int, db: Session = Depends(get_db)):
    maker = db.scalar(select(User).where(User.id == maker_id, User.role == "maker"))
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found",
        )

    reviews = db.scalars(
        select(MakerReview)
        .where(MakerReview.maker_id == maker_id)
        .order_by(MakerReview.created_at.desc())
    ).all()
    return reviews


@app.post(
    "/api/reviews",
    response_model=MakerReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_review(payload: MakerReviewCreate, db: Session = Depends(get_db)):
    order = db.get(MakerOrder, payload.order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    if order.eater_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is not associated with an eater",
        )

    existing = db.scalar(select(MakerReview).where(MakerReview.order_id == order.id))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Review already submitted for this order",
        )

    review = MakerReview(
        maker_id=order.maker_id,
        eater_id=order.eater_id,
        order_id=order.id,
        order_code=order.order_code,
        eater_name=order.eater_name,
        meal_name=order.meal_name,
        image_data=order.image_data,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    db.flush()
    db.refresh(review)
    return review


@app.patch("/api/reviews/{review_id}", response_model=MakerReviewResponse)
def update_review_reply(
    review_id: int,
    payload: MakerReviewUpdate,
    db: Session = Depends(get_db),
):
    review = db.get(MakerReview, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    review.reply = payload.reply
    db.flush()
    db.refresh(review)
    return review


@app.get("/api/eater/profile", response_model=EaterProfileResponse)
def get_eater_profile(eater_id: int, db: Session = Depends(get_db)):
    eater = db.scalar(select(User).where(User.id == eater_id, User.role == "eater"))
    if not eater:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eater not found",
        )

    profile = db.scalar(select(EaterProfile).where(EaterProfile.eater_id == eater_id))
    if not profile:
        profile = EaterProfile(
            eater_id=eater_id,
            display_name=eater.email.split("@")[0],
            phone=None,
            favorite_cuisine=None,
            note=None,
        )
        db.add(profile)
        db.flush()
        db.refresh(profile)
    return profile


@app.put("/api/eater/profile", response_model=EaterProfileResponse)
def update_eater_profile(payload: EaterProfileRequest, db: Session = Depends(get_db)):
    eater = db.scalar(select(User).where(User.id == payload.eater_id, User.role == "eater"))
    if not eater:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eater not found",
        )

    profile = db.scalar(select(EaterProfile).where(EaterProfile.eater_id == payload.eater_id))
    if not profile:
        profile = EaterProfile(
            eater_id=payload.eater_id,
            display_name=payload.display_name,
            phone=payload.phone,
            favorite_cuisine=payload.favorite_cuisine,
            note=payload.note,
        )
        db.add(profile)
        db.flush()
        db.refresh(profile)
        return profile

    profile.display_name = payload.display_name
    profile.phone = payload.phone
    profile.favorite_cuisine = payload.favorite_cuisine
    profile.note = payload.note
    db.flush()
    db.refresh(profile)
    return profile
