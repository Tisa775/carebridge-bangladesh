"""
CareBridge Bangladesh – MySQL Direct Database Migration & Seeder
Connects to MySQL server, creates database 'carebridge', builds all tables,
and seeds initial records for users, NGOs, cases, volunteers, alerts, and messages.

Run:
  python seed_mysql.py
"""

import os
import sys
import io
import pymysql
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, Base
from models import User, Case, NGO, Volunteer, Alert, Message, ActivityLog
import seed


def run_mysql_seed():
    print("=" * 60)
    print("  CareBridge Bangladesh – MySQL Database Setup & Seeder")
    print(f"  Target Server: {MYSQL_HOST}:{MYSQL_PORT}")
    print(f"  Database:      {MYSQL_DATABASE}")
    print("=" * 60)

    # 1. Connect to MySQL server and ensure database exists
    try:
        print(f"\n[1/4] Connecting to MySQL server ({MYSQL_HOST}:{MYSQL_PORT})...")
        conn = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            charset="utf8mb4"
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            print(f"  ✓ Database `{MYSQL_DATABASE}` ensured/created successfully.")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"  ❌ Could not connect to MySQL server: {e}")
        print("  Please make sure MySQL/MariaDB (or XAMPP) is running on port 3306.")
        return False

    # 2. Connect engine to MySQL database
    print(f"\n[2/4] Connecting SQLAlchemy engine to `{MYSQL_DATABASE}`...")
    auth = f"{MYSQL_USER}:{MYSQL_PASSWORD}" if MYSQL_PASSWORD else MYSQL_USER
    mysql_url = f"mysql+pymysql://{auth}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
    engine = create_engine(mysql_url, pool_pre_ping=True)

    # 3. Create tables
    print("\n[3/4] Creating tables in MySQL...")
    Base.metadata.create_all(bind=engine)
    print("  ✓ Tables created: users, ngos, cases, volunteers, alerts, messages, activity_log")

    # 4. Populate Seed Data
    print("\n[4/4] Populating seed records...")
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        if db.query(User).count() > 0:
            print("  ℹ Records already exist in MySQL. Skipping seed.")
        else:
            # Seed users
            seed.db = db
            seed.seed_users()
            seed.seed_ngos()
            seed.seed_cases()
            seed.seed_volunteers()
            seed.seed_alerts()
            seed.seed_messages()
            seed.seed_activity_log()
            print("\n  ✅ All tables and records successfully seeded into MySQL!")
    except Exception as e:
        db.rollback()
        print(f"  ❌ Seeding error: {e}")
        return False
    finally:
        db.close()

    print("\n" + "=" * 60)
    print("🎉 MySQL Database 'carebridge' is ready and fully operational!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    run_mysql_seed()
