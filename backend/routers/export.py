"""
CareBridge Bangladesh – Export Router
Endpoints for generating and downloading real CSV and Executive Summary reports.
"""

import io
import csv
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
import models

router = APIRouter(prefix="/api/export", tags=["Export & Reporting"])


@router.get("/cases", summary="Export All Cases to CSV")
def export_cases_csv(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Generate and download a real CSV file containing all cases.
    Includes UTF-8 BOM for full Microsoft Excel compatibility.
    """
    q = db.query(models.Case)
    if status:
        q = q.filter(models.Case.status == status)
    if priority:
        q = q.filter(models.Case.priority == priority)
    if category:
        q = q.filter(models.Case.category.ilike(f"%{category}%"))

    cases = q.order_by(models.Case.created_at.desc()).all()

    # Create CSV in memory with UTF-8 BOM
    output = io.StringIO()
    # Write UTF-8 BOM for Excel
    output.write("\ufeff")

    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "Case ID",
        "Category",
        "Location",
        "Priority",
        "Status",
        "AI Confidence",
        "Reporter",
        "Contact",
        "Assigned NGO",
        "Created At (UTC)",
        "Updated At (UTC)",
        "Description"
    ])

    for c in cases:
        writer.writerow([
            c.id,
            c.category,
            c.location,
            c.priority,
            c.status,
            c.confidence or "N/A",
            c.reporter or "Anonymous",
            c.contact or "N/A",
            c.assigned_ngo or "Unassigned",
            c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else "",
            c.updated_at.strftime("%Y-%m-%d %H:%M:%S") if c.updated_at else "",
            (c.description or "").replace("\n", " ").strip()
        ])

    csv_data = output.getvalue()
    output.close()

    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    filename = f"carebridge_cases_audit_{date_str}.csv"

    return Response(
        content=csv_data.encode("utf-8-sig"),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/summary", summary="Export Executive Impact Summary Report")
def export_executive_summary_report(db: Session = Depends(get_db)):
    """
    Generate and download a comprehensive Executive Impact Summary Report.
    Returns a beautifully formatted HTML report with instant print-to-PDF support.
    """
    total_cases = db.query(models.Case).count()
    high_priority = db.query(models.Case).filter(models.Case.priority == "High").count()
    in_progress = db.query(models.Case).filter(models.Case.status == "In Progress").count()
    resolved = db.query(models.Case).filter(models.Case.status == "Resolved").count()
    ngos = db.query(models.NGO).all()
    volunteers_count = db.query(models.Volunteer).count()
    recent_cases = db.query(models.Case).order_by(models.Case.created_at.desc()).limit(15).all()

    now_str = datetime.utcnow().strftime("%B %d, %Y - %H:%M UTC")
    date_filename = datetime.utcnow().strftime("%Y-%m-%d")

    # Generate rows for recent cases
    case_rows = ""
    for c in recent_cases:
        p_color = "#ef4444" if c.priority == "High" else "#f59e0b" if c.priority == "Medium" else "#10b981"
        s_color = "#10b981" if c.status == "Resolved" else "#3b82f6" if c.status == "In Progress" else "#f59e0b"
        case_rows += f"""
        <tr>
            <td style="font-weight:700;">{c.id}</td>
            <td>{c.category}</td>
            <td>{c.location}</td>
            <td><span style="color:{p_color}; font-weight:700;">{c.priority}</span></td>
            <td><span style="background:{s_color}20; color:{s_color}; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700;">{c.status}</span></td>
            <td>{c.assigned_ngo or '—'}</td>
            <td style="font-size:11.5px; color:#6b7280;">{c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else ''}</td>
        </tr>
        """

    # Generate rows for NGOs
    ngo_rows = ""
    for n in ngos:
        status_badge = f'<span style="color:#059669; font-weight:700;">{n.verified_status}</span>' if n.verified_status == "Verified" else f'<span style="color:#f59e0b; font-weight:700;">{n.verified_status}</span>'
        ngo_rows += f"""
        <tr>
            <td style="font-weight:700;">{n.name}</td>
            <td>{n.bureau_id or '—'}</td>
            <td>{n.coverage_area or 'Nationwide'}</td>
            <td>{status_badge}</td>
            <td>★ {n.rating:.1f}</td>
            <td>{n.cases_handled}</td>
        </tr>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CareBridge Bangladesh - Executive Impact Summary Report</title>
    <style>
        @page {{ size: A4; margin: 15mm; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            background: #ffffff;
            margin: 0;
            padding: 30px;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #059669;
            padding-bottom: 20px;
            margin-bottom: 25px;
        }}
        .brand {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .brand-logo {{
            width: 44px;
            height: 44px;
            background: #059669;
            color: #ffffff;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 800;
        }}
        .brand-title {{
            font-size: 24px;
            font-weight: 800;
            color: #065f46;
            margin: 0;
        }}
        .brand-sub {{
            font-size: 12px;
            color: #6b7280;
            margin: 0;
        }}
        .report-meta {{
            text-align: right;
            font-size: 12px;
            color: #4b5563;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            background: #f9fafb;
        }}
        .stat-val {{
            font-size: 26px;
            font-weight: 800;
            color: #111827;
            margin-top: 4px;
        }}
        .stat-label {{
            font-size: 11.5px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
        }}
        h2 {{
            font-size: 16px;
            color: #111827;
            margin-top: 25px;
            margin-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 25px;
        }}
        th, td {{
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #f3f4f6;
        }}
        th {{
            background: #f9fafb;
            font-weight: 700;
            color: #4b5563;
        }}
        .footer {{
            margin-top: 40px;
            border-top: 1px solid #e5e7eb;
            padding-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #9ca3af;
        }}
        .print-btn {{
            position: fixed;
            top: 20px;
            right: 20px;
            background: #059669;
            color: white;
            border: none;
            padding: 10px 18px;
            font-weight: 700;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }}
        @media print {{
            .print-btn {{ display: none; }}
            body {{ padding: 0; }}
        }}
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

    <div class="header">
        <div class="brand">
            <div class="brand-logo">CB</div>
            <div>
                <h1 class="brand-title">CareBridge Bangladesh</h1>
                <p class="brand-sub">Unified Humanitarian Dispatch & Disaster Relief Ecosystem</p>
            </div>
        </div>
        <div class="report-meta">
            <div><strong>Report Type:</strong> Executive Impact Audit</div>
            <div><strong>Generated:</strong> {now_str}</div>
            <div><strong>Document ID:</strong> CB-AUDIT-{date_filename}</div>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Logged Cases</div>
            <div class="stat-val">{total_cases}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">High Urgency Dispatches</div>
            <div class="stat-val" style="color:#ef4444;">{high_priority}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Successfully Resolved</div>
            <div class="stat-val" style="color:#10b981;">{resolved}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Registered NGO Partners</div>
            <div class="stat-val" style="color:#059669;">{len(ngos)}</div>
        </div>
    </div>

    <h2>Active Humanitarian Incident Cases</h2>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned NGO</th>
                <th>Reported Time</th>
            </tr>
        </thead>
        <tbody>
            {case_rows}
        </tbody>
    </table>

    <h2>Registered NGO Partner Network</h2>
    <table>
        <thead>
            <tr>
                <th>Organization</th>
                <th>Gov Bureau ID</th>
                <th>Coverage Area</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Cases Handled</th>
            </tr>
        </thead>
        <tbody>
            {ngo_rows}
        </tbody>
    </table>

    <div class="footer">
        <div>Official Verification: Government of Bangladesh NGO Affairs Bureau Registered Hub</div>
        <div>Generated by CareBridge AI Command Engine</div>
    </div>
</body>
</html>
"""

    return Response(
        content=html_content,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="carebridge_executive_summary_{date_filename}.html"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
