from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, func

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="eater")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    maker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    image_data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MakerProfile(Base):
    __tablename__ = "maker_profiles"

    id = Column(Integer, primary_key=True, index=True)
    maker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(64), nullable=False)
    country = Column(String(64), nullable=False)
    location = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MakerOrder(Base):
    __tablename__ = "maker_orders"

    id = Column(Integer, primary_key=True, index=True)
    maker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_code = Column(String(32), nullable=False, unique=True)
    eater_name = Column(String(120), nullable=False)
    meal_name = Column(String(120), nullable=False)
    image_data = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    order_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    status = Column(String(32), nullable=False, default="pending")
    eater_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MakerReview(Base):
    __tablename__ = "maker_reviews"

    id = Column(Integer, primary_key=True, index=True)
    maker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("maker_orders.id", ondelete="CASCADE"), unique=True, nullable=False)
    order_code = Column(String(32), nullable=False)
    eater_name = Column(String(120), nullable=False)
    eater_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    meal_name = Column(String(120), nullable=False)
    image_data = Column(Text, nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=False)
    reply = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EaterProfile(Base):
    __tablename__ = "eater_profiles"

    id = Column(Integer, primary_key=True, index=True)
    eater_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name = Column(String(120), nullable=False)
    phone = Column(String(64), nullable=True)
    favorite_cuisine = Column(String(120), nullable=True)
    note = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
