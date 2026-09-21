"""
CareBridge Bangladesh – Database Seed Script
============================================
Pre-populates the SQLite database with realistic demo data
matching the existing frontend mock data in data.js.

Run: python seed.py
"""

import sys
import os
import io

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure we can import from the backend directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
from models import User, Case, NGO, Volunteer, Alert, Message, ActivityLog
from routers.auth import hash_password
from datetime import datetime, timedelta
import random

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def already_seeded():
    return db.query(User).count() > 0


def seed_users():
    print("  → Seeding users...")
    users = [
        User(
            name="Argho Saha",
            email="argho@carebridge.org",
            hashed_password=hash_password("demo123"),
            role="Super Admin / Emergency Coordinator",
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            phone="+880-1712-000001",
            organization="CareBridge HQ Dhaka",
            is_active=True,
        ),
        User(
            name="Dr. Farzana Rahman",
            email="farzana@carebridge.org",
            hashed_password=hash_password("demo123"),
            role="Medical Dispatch Lead",
            avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            phone="+880-1819-987654",
            organization="Emergency Triage",
            is_active=True,
        ),
        User(
            name="Rahim Khan",
            email="rahim@carebridge.org",
            hashed_password=hash_password("demo123"),
            role="Field Volunteer Unit Lead",
            avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            phone="+880-1712-345678",
            organization="Volunteer Unit 1",
            is_active=True,
        ),
        User(
            name="Nusrat Jahan",
            email="nusrat@carebridge.org",
            hashed_password=hash_password("demo123"),
            role="Child Welfare Coordinator",
            avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            phone="+880-1911-223344",
            organization="Dhanmondi Child Unit",
            is_active=True,
        ),
    ]
    for u in users:
        db.add(u)
    db.commit()
    print(f"    ✓ {len(users)} users created")


def seed_ngos():
    print("  → Seeding NGOs...")
    ngos = [
        NGO(
            name="Asha Foundation",
            bureau_id="NGOAB-7701",
            coverage_area="Mirpur, Dhanmondi, Dhaka North",
            capacity="80 bed capacity, 4 shelters",
            description="Operating 4 emergency shelters in Mirpur and Dhanmondi with 80 bed capacity.",
            verified_status="Verified",
            rating=4.8,
            active_cases=14,
            cases_handled=342,
            logo_color="#059669",
            initials="AF",
            is_trusted=True,
            contact_email="info@ashafoundation.org",
        ),
        NGO(
            name="BRAC Humanitarian",
            bureau_id="NGOAB-0021",
            coverage_area="Nationwide",
            capacity="Nationwide rapid response",
            description="Rapid response crisis teams, maternal health aid, and urban food distribution.",
            verified_status="Verified",
            rating=4.7,
            active_cases=38,
            cases_handled=298,
            logo_color="#ec4899",
            initials="BR",
            is_trusted=True,
            contact_email="emergency@brac.net",
        ),
        NGO(
            name="Proshika Aid",
            bureau_id="NGOAB-3345",
            coverage_area="Dhaka, Rajshahi, Khulna",
            capacity="Disability rehab & flood relief",
            description="Specialized in disability rehabilitation, mobility gear assistance, and flood relief.",
            verified_status="Verified",
            rating=4.6,
            active_cases=9,
            cases_handled=186,
            logo_color="#8b5cf6",
            initials="PR",
            is_trusted=True,
            contact_email="info@proshika.org",
        ),
        NGO(
            name="Friendship NGO",
            bureau_id="NGOAB-8812",
            coverage_area="Riverine & Coastal Bangladesh",
            capacity="45 rescue boats, mobile hospitals",
            description="Riverine and coastal rescue operations with mobile hospital boat network.",
            verified_status="Verified",
            rating=4.5,
            active_cases=12,
            cases_handled=164,
            logo_color="#3b82f6",
            initials="FR",
            is_trusted=True,
            contact_email="rescue@friendship.ngo",
        ),
        NGO(
            name="Dhaka Relief Squad",
            bureau_id="NGOAB-9921",
            coverage_area="Dhaka North",
            capacity="120 Volunteers",
            description="Urban emergency response and temporary shelter management.",
            verified_status="Pending",
            rating=0.0,
            active_cases=0,
            cases_handled=0,
            logo_color="#f59e0b",
            initials="DR",
            is_trusted=False,
        ),
        NGO(
            name="Chittagong Flood Rescue",
            bureau_id="NGOAB-8412",
            coverage_area="Chittagong Hill Tracts",
            capacity="45 Rescue Boats",
            description="Specialized riverine flood rescue and evacuation in Chittagong region.",
            verified_status="Pending",
            rating=0.0,
            active_cases=0,
            cases_handled=0,
            logo_color="#06b6d4",
            initials="CF",
            is_trusted=False,
        ),
    ]
    for n in ngos:
        db.add(n)
    db.commit()
    print(f"    ✓ {len(ngos)} NGOs created")


def seed_cases():
    print("  → Seeding humanitarian cases...")
    
    now = datetime.utcnow()
    cases_data = [
        Case(
            id="CB-12482",
            category="Child",
            icon="fa-child",
            location="Mirpur-10, Dhaka",
            priority="High",
            priority_class="urgency-high",
            status="In Progress",
            status_class="status-in-progress",
            confidence="92%",
            description="Unaccompanied minor found near Mirpur-10 roundabout looking for parents. Immediate protective shelter needed.",
            reporter="Tariqul Islam (Local Volunteer)",
            contact="+880 1712-345678",
            assigned_ngo="Asha Foundation",
            lat=23.8067,
            lng=90.3687,
            distance="1.8 km away",
            photo="https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80",
            created_at=now - timedelta(minutes=4),
            updated_at=now - timedelta(minutes=4),
        ),
        Case(
            id="CB-12481",
            category="Elderly",
            icon="fa-person-cane",
            location="Kathalbagan, Dhaka",
            priority="Medium",
            priority_class="urgency-med",
            status="Assigned",
            status_class="status-assigned",
            confidence="87%",
            description="Elderly man suffering from mild dehydration without shelter near Green Road intersection.",
            reporter="Dr. Farzana Rahman",
            contact="+880 1819-987654",
            assigned_ngo="BRAC Humanitarian",
            lat=23.7510,
            lng=90.3900,
            distance="3.2 km away",
            photo="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
            created_at=now - timedelta(minutes=8),
            updated_at=now - timedelta(minutes=8),
        ),
        Case(
            id="CB-12480",
            category="Disability",
            icon="fa-wheelchair",
            location="Mohammadpur, Dhaka",
            priority="Low",
            priority_class="urgency-low",
            status="In Progress",
            status_class="status-in-progress",
            confidence="76%",
            description="Wheelchair breakdown and mobility support needed on Ring Road. Requires assistance getting to safe clinic.",
            reporter="Kamal Hossain",
            contact="+880 1911-223344",
            assigned_ngo="Proshika Aid",
            lat=23.7658,
            lng=90.3584,
            distance="4.5 km away",
            photo="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            created_at=now - timedelta(minutes=15),
            updated_at=now - timedelta(minutes=15),
        ),
        Case(
            id="CB-12479",
            category="Homeless",
            icon="fa-house-chimney-crack",
            location="Motijheel, Dhaka",
            priority="Medium",
            priority_class="urgency-med",
            status="Pending",
            status_class="status-pending",
            confidence="81%",
            description="Family of 4 evicted and needs emergency shelter. Children involved.",
            reporter="Community Watch",
            contact="+880 1600-000000",
            assigned_ngo=None,
            lat=23.7330,
            lng=90.4172,
            distance="6.1 km away",
            created_at=now - timedelta(minutes=18),
            updated_at=now - timedelta(minutes=18),
        ),
        Case(
            id="CB-12478",
            category="Child",
            icon="fa-child",
            location="Uttara, Dhaka",
            priority="High",
            priority_class="urgency-high",
            status="Assigned",
            status_class="status-assigned",
            confidence="90%",
            description="Two children (ages 5 and 8) found wandering near Uttara Sector 7 park without guardians.",
            reporter="Uttara Volunteer Unit",
            contact="+880 1777-445566",
            assigned_ngo="Asha Foundation",
            lat=23.8759,
            lng=90.3795,
            distance="8.4 km away",
            created_at=now - timedelta(minutes=22),
            updated_at=now - timedelta(minutes=22),
        ),
        Case(
            id="CB-12477",
            category="Elderly",
            icon="fa-person-cane",
            location="Badda, Dhaka",
            priority="High",
            priority_class="urgency-high",
            status="In Progress",
            status_class="status-in-progress",
            confidence="94%",
            description="75-year-old woman with cardiac condition needs immediate transport to Dhaka Medical College.",
            reporter="Badda Health Post",
            contact="+880 1733-667788",
            assigned_ngo="BRAC Humanitarian",
            lat=23.7806,
            lng=90.4267,
            distance="5.2 km away",
            created_at=now - timedelta(minutes=35),
            updated_at=now - timedelta(minutes=35),
        ),
        Case(
            id="CB-12476",
            category="Medical",
            icon="fa-heart-pulse",
            location="Old Dhaka, Lalbagh",
            priority="High",
            priority_class="urgency-high",
            status="Resolved",
            status_class="status-resolved",
            confidence="96%",
            description="Mass heat exhaustion incident at Lalbagh Fort area. 8 persons treated on site.",
            reporter="Civil Defense Unit 4",
            contact="+880 1800-000000",
            assigned_ngo="BRAC Humanitarian",
            lat=23.7193,
            lng=90.3880,
            distance="11.2 km away",
            created_at=now - timedelta(minutes=42),
            updated_at=now - timedelta(minutes=10),
        ),
    ]
    
    for c in cases_data:
        db.add(c)
    db.commit()
    print(f"    ✓ {len(cases_data)} cases created")


def seed_volunteers():
    print("  → Seeding volunteers...")
    volunteers = [
        Volunteer(
            name="Mr. Rahim Khan",
            skills="First Aid, EMT, Bengali/English, Vehicle Operation",
            location="Mirpur-10",
            status="Active",
            completed_missions=47,
            avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
            phone="+880 1712-345678",
            lat=23.7950,
            lng=90.3550,
        ),
        Volunteer(
            name="Nusrat Jahan",
            skills="Child Counseling, Child Welfare, Bengali/English",
            location="Dhanmondi",
            status="Active",
            completed_missions=31,
            avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
            phone="+880 1911-223344",
            lat=23.7465,
            lng=90.3760,
        ),
        Volunteer(
            name="Tanvir Ahmed",
            skills="Search & Rescue, Vehicle Dispatch, Heavy Lifting",
            location="Uttara",
            status="In Transit",
            completed_missions=59,
            avatar="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
            phone="+880 1777-445566",
            lat=23.8759,
            lng=90.3795,
        ),
        Volunteer(
            name="Farhana Yasmin",
            skills="Nursing, Elderly Care, First Aid",
            location="Uttara Hub",
            status="Active",
            completed_missions=24,
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
            phone="+880 1600-112233",
            lat=23.8650,
            lng=90.3950,
        ),
    ]
    for v in volunteers:
        db.add(v)
    db.commit()
    print(f"    ✓ {len(volunteers)} volunteers created")


def seed_alerts():
    print("  → Seeding alerts...")
    now = datetime.utcnow()
    alerts = [
        Alert(
            title="🚨 Critical Flood Evacuation Alert - Dhanmondi",
            description="12 senior citizens stranded near lakeside ground floor residence due to sudden water level rise.",
            severity="Critical",
            source="Civil Defense & BRAC",
            alert_type="sos",
            is_read=False,
            related_case_id="CB-12481",
            created_at=now - timedelta(minutes=1),
        ),
        Alert(
            title="👶 Unaccompanied Minor - Mirpur-10 Roundabout",
            description="Volunteer Rahim Khan on scene. Safe escort and guardian identification in progress.",
            severity="High",
            source="Volunteer Unit 1",
            alert_type="general",
            is_read=False,
            related_case_id="CB-12482",
            created_at=now - timedelta(minutes=5),
        ),
        Alert(
            title="🏢 Partner NGO Onboarded - Dhaka Relief Squad",
            description="Registration verified by NGO Affairs Bureau. 120 volunteer capacity added to north sector.",
            severity="Low",
            source="NGO Verification Portal",
            alert_type="verified",
            is_read=False,
            created_at=now - timedelta(minutes=15),
        ),
        Alert(
            title="🏥 Volunteer Dispatch - CB-12482",
            description="Rahim Khan accepted case CB-12482 at Mirpur-10. En route.",
            severity="Medium",
            source="Command HQ",
            alert_type="general",
            is_read=True,
            related_case_id="CB-12482",
            created_at=now - timedelta(minutes=5),
        ),
        Alert(
            title="📊 Weekly AI Report Ready",
            description="AI generated week 35 crisis response summary. Download PDF available.",
            severity="Low",
            source="CareBridge AI Engine",
            alert_type="general",
            is_read=True,
            created_at=now - timedelta(hours=1),
        ),
    ]
    for a in alerts:
        db.add(a)
    db.commit()
    print(f"    ✓ {len(alerts)} alerts created")


def seed_messages():
    print("  → Seeding messages...")
    # Get user IDs
    admin = db.query(User).filter(User.email == "argho@carebridge.org").first()
    rahim = db.query(User).filter(User.email == "rahim@carebridge.org").first()
    farzana = db.query(User).filter(User.email == "farzana@carebridge.org").first()
    
    if not admin or not rahim or not farzana:
        print("    ⚠ Users not found, skipping messages")
        return
    
    now = datetime.utcnow()
    messages = [
        Message(sender_id=rahim.id, receiver_id=admin.id, content="Arrived at Mirpur-10 intersection. Found the child, contacting Asha Shelter team now.", is_read=True, timestamp=now - timedelta(hours=1, minutes=18)),
        Message(sender_id=admin.id, receiver_id=rahim.id, content="Great job Rahim. Asha Shelter van is 3 minutes away from your location. Stay with the minor.", is_read=True, timestamp=now - timedelta(hours=1, minutes=16)),
        Message(sender_id=rahim.id, receiver_id=admin.id, content="Child is safe and secure. Shelter van has arrived. Transferring now.", is_read=True, timestamp=now - timedelta(hours=1, minutes=10)),
        Message(sender_id=farzana.id, receiver_id=admin.id, content="Dehydration IV fluids prepped for elderly at Kathalbagan. Need transport confirmation.", is_read=False, timestamp=now - timedelta(minutes=14)),
        Message(sender_id=admin.id, receiver_id=farzana.id, content="Transport confirmed. BRAC van ETA 8 minutes to your location.", is_read=True, timestamp=now - timedelta(minutes=12)),
    ]
    for m in messages:
        db.add(m)
    db.commit()
    print(f"    ✓ {len(messages)} messages created")


def seed_activity_log():
    print("  → Seeding activity log...")
    now = datetime.utcnow()
    activities = [
        ActivityLog(type="report", icon="plus", color="red", title="New case reported", subtitle="Mirpur-10, Dhaka", timestamp=now - timedelta(minutes=2)),
        ActivityLog(type="ngo", icon="check", color="green", title="NGO accepted the case", subtitle="Asha Foundation", timestamp=now - timedelta(minutes=4)),
        ActivityLog(type="volunteer", icon="user", color="blue", title="Volunteer assigned", subtitle="Mr. Rahim Khan", timestamp=now - timedelta(minutes=6)),
        ActivityLog(type="rescue", icon="crosshair", color="orange", title="Rescue in progress", subtitle="Dhanmondi, Dhaka", timestamp=now - timedelta(minutes=12)),
        ActivityLog(type="resolved", icon="check", color="green", title="Case resolved", subtitle="Mohammadpur, Dhaka", timestamp=now - timedelta(minutes=25)),
        ActivityLog(type="ngo", icon="check", color="green", title="New NGO partner onboarded", subtitle="Dhaka Relief Squad verified", timestamp=now - timedelta(minutes=15)),
        ActivityLog(type="volunteer", icon="user", color="blue", title="Food ration delivered", subtitle="Mohammadpur Relief Post", timestamp=now - timedelta(minutes=30)),
    ]
    for a in activities:
        db.add(a)
    db.commit()
    print(f"    ✓ {len(activities)} activity entries created")


def main():
    print("\n🌿 CareBridge Bangladesh – Database Seeder")
    print("=" * 50)
    
    if already_seeded():
        print("⚠  Database already has data. Skipping seed.")
        print("   To reseed, delete 'carebridge.db' and run again.")
        db.close()
        return
    
    try:
        seed_users()
        seed_ngos()
        seed_cases()
        seed_volunteers()
        seed_alerts()
        seed_messages()
        seed_activity_log()
        
        print("\n✅ Seed complete! Database is ready.")
        print("   Demo login: argho@carebridge.org / demo123")
        print("   Start server: uvicorn main:app --reload --port 8000")
        
    except Exception as e:
        print(f"\n❌ Seed failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
