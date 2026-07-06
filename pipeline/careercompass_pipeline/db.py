"""Database layer.

Local default is a SQLite file (zero setup). Point DATABASE_URL at a hosted
Postgres (Supabase/Neon) and nothing else changes:

    export DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/db
"""
import os
from datetime import datetime

from sqlalchemy import (
    Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DEFAULT_URL = "sqlite:///" + os.path.join(os.path.dirname(os.path.dirname(__file__)), "data.db")
DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_URL)

engine = create_engine(
    DATABASE_URL,
    future=True,
    connect_args={"timeout": 30} if DATABASE_URL.startswith("sqlite") else {},
)
if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def _sqlite_wal(dbapi_conn, _record):
        dbapi_conn.execute("PRAGMA journal_mode=WAL")

Session = sessionmaker(bind=engine, future=True)
Base = declarative_base()


class Institution(Base):
    __tablename__ = "institutions"
    id = Column(Integer, primary_key=True)
    slug = Column(String(64), unique=True, nullable=False)   # e.g. "polito"
    name = Column(String(200), nullable=False)
    kind = Column(String(16), default="university")          # university | its
    city = Column(String(80))
    region = Column(String(80))
    country = Column(String(2), default="IT")
    website = Column(String(300))
    no_tax_isee = Column(Integer)                            # € threshold for full exemption
    fee_min = Column(Float)                                  # €/year, low-ISEE
    fee_max = Column(Float)                                  # €/year, cap
    programs = relationship("Program", back_populates="institution")


class Program(Base):
    __tablename__ = "programs"
    __table_args__ = (UniqueConstraint("institution_id", "url", name="uq_program_url"),)
    id = Column(Integer, primary_key=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    name = Column(String(300), nullable=False)               # English name when available
    name_local = Column(String(300))                         # Italian name
    level = Column(String(16), default="bachelor")           # bachelor | its
    degree_class = Column(String(32))                        # e.g. "L-8"
    url = Column(String(500), nullable=False)                # exact program page
    curriculum_url = Column(String(500))                     # exact study-plan page
    language = Column(String(64))
    years = Column(Integer, default=3)
    campus = Column(String(200))
    source = Column(String(500))                             # where this row came from
    fetched_at = Column(DateTime, default=datetime.utcnow)
    institution = relationship("Institution", back_populates="programs")
    subjects = relationship("ProgramSubject", back_populates="program", cascade="all, delete-orphan")


class ProgramSubject(Base):
    __tablename__ = "program_subjects"
    id = Column(Integer, primary_key=True)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=False)
    track = Column(String(120), default="main")              # main | english | campus variant
    year = Column(Integer)                                   # 1..3
    semester = Column(String(8))
    code = Column(String(40))
    name = Column(String(300), nullable=False)
    ects = Column(Integer)
    program = relationship("Program", back_populates="subjects")


class FetchLog(Base):
    __tablename__ = "fetch_log"
    id = Column(Integer, primary_key=True)
    url = Column(Text, nullable=False)
    status = Column(Integer)
    note = Column(Text)
    fetched_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(engine)
