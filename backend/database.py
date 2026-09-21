"""
CareBridge Bangladesh – Database Engine & Session Factory
Supports MySQL (default database name: carebridge) with automatic fallback
to SQLite if MySQL server is not currently running.
"""

import os
import sys
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("carebridge.database")

# Load environment configuration from .env file
load_dotenv()

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Database configuration from environment variables or defaults
DB_TYPE = os.getenv("DB_TYPE", "mysql").lower()
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "carebridge")

SQLITE_PATH = os.path.join(BASE_DIR, "carebridge.db")
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"

# Construct MySQL URL
mysql_auth = f"{MYSQL_USER}:{MYSQL_PASSWORD}" if MYSQL_PASSWORD else MYSQL_USER
MYSQL_BASE_URL = f"mysql+pymysql://{mysql_auth}@{MYSQL_HOST}:{MYSQL_PORT}"
MYSQL_DATABASE_URL = f"{MYSQL_BASE_URL}/{MYSQL_DATABASE}?charset=utf8mb4"

ACTIVE_DB_TYPE = "sqlite"
engine = None


def init_database():
    """Initialize database connection. Tries MySQL first, falls back to SQLite."""
    global ACTIVE_DB_TYPE, engine

    if DB_TYPE in ("mysql", "mariadb", "auto"):
        try:
            import pymysql
            # 1. Connect to MySQL server and ensure database 'carebridge' exists
            logger.info(f"Connecting to MySQL at {MYSQL_HOST}:{MYSQL_PORT}...")
            conn = pymysql.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                charset="utf8mb4",
                connect_timeout=3
            )
            with conn.cursor() as cursor:
                cursor.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` "
                    f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                )
            conn.commit()
            conn.close()

            # 2. Create SQLAlchemy engine bound to carebridge database
            engine = create_engine(
                MYSQL_DATABASE_URL,
                pool_pre_ping=True,
                pool_recycle=3600,
            )
            # Test connection
            with engine.connect() as test_conn:
                test_conn.execute(text("SELECT 1"))

            ACTIVE_DB_TYPE = "mysql"
            print(f"[CareBridge DB] Connected to MySQL database '{MYSQL_DATABASE}' at {MYSQL_HOST}:{MYSQL_PORT}")
            return engine
        except Exception as e:
            print(f"[CareBridge DB] MySQL connection to '{MYSQL_DATABASE}' failed ({e}). Falling back to SQLite.")

    # SQLite fallback
    engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False},
    )
    ACTIVE_DB_TYPE = "sqlite"
    print(f"[CareBridge DB] Using SQLite database: {SQLITE_PATH}")
    return engine


engine = init_database()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_current_db_info():
    """Return info about the active database engine."""
    return {
        "active_type": ACTIVE_DB_TYPE,
        "mysql_database": MYSQL_DATABASE,
        "mysql_host": MYSQL_HOST,
        "mysql_port": MYSQL_PORT,
        "mysql_user": MYSQL_USER,
        "sqlite_path": SQLITE_PATH
    }


def get_db():
    """FastAPI dependency for database session injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
