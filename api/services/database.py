from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func
import os

Base = declarative_base()


def get_engine():
    return create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)


def get_session():
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session()


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete")
    watch_history = relationship("WatchHistory", back_populates="user", cascade="all, delete")


class Watchlist(Base):
    __tablename__ = "watchlists"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="watchlists")
    items = relationship("WatchlistItem", back_populates="watchlist", cascade="all, delete")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    id = Column(String, primary_key=True)
    watchlist_id = Column(String, ForeignKey("watchlists.id"), nullable=False)
    film_id = Column(String, nullable=False)
    film_title = Column(String, nullable=False)
    film_metadata = Column(JSON)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    watchlist = relationship("Watchlist", back_populates="items")


class WatchHistory(Base):
    __tablename__ = "watch_history"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    film_id = Column(String, nullable=False)
    film_title = Column(String, nullable=False)
    rating = Column(Float)
    watched_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="watch_history")


def create_tables():
    engine = get_engine()
    Base.metadata.create_all(engine)
