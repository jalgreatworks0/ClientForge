"""
LM Studio Python SDK - Agent Tools for ClientForge CRM
Location: D:\ClientForge\03_BOTS\elaria_command_center\python\agent_tools.py
Purpose: Define autonomous agent tools with .act() API
"""

import lmstudio as lms
from pathlib import Path
import json
import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import re


# ============================================================
# SECURITY UTILITIES
# ============================================================

def validate_sql_param(param: Any, param_type: str = "string") -> Any:
    """
    Validate SQL parameters to prevent SQL injection.

    Args:
        param: The parameter to validate
        param_type: Expected type ('string', 'int', 'float')

    Returns:
        Validated parameter

    Raises:
        ValueError: If parameter is invalid or contains suspicious content
    """
    if param is None:
        return None

    if param_type == "string":
        if not isinstance(param, str):
            raise ValueError(f"Expected string, got {type(param).__name__}")
        # Check for SQL injection patterns
        sql_patterns = [
            r"\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b",
            r"(;|--|/\*|\*/)",
        ]
        for pattern in sql_patterns:
            if re.search(pattern, param, re.IGNORECASE):
                raise ValueError("SQL parameter contains suspicious SQL keywords")
        return param

    elif param_type == "int":
        if not isinstance(param, int):
            try:
                return int(param)
            except (ValueError, TypeError):
                raise ValueError(f"Expected int, got {type(param).__name__}")
        return param

    elif param_type == "float":
        if not isinstance(param, (int, float)):
            try:
                return float(param)
            except (ValueError, TypeError):
                raise ValueError(f"Expected float, got {type(param).__name__}")
        return param

    raise ValueError(f"Unsupported parameter type: {param_type}")


def validate_file_path(file_path: str, allowed_base: Optional[Path] = None) -> Path:
    """
    Validate and sanitize file paths to prevent path traversal attacks.

    Args:
        file_path: The file path to validate
        allowed_base: Optional base directory that files must be within

    Returns:
        Validated Path object

    Raises:
        ValueError: If path is outside allowed base or contains suspicious patterns
    """
    if not file_path or not isinstance(file_path, str):
        raise ValueError("Invalid file path: must be a non-empty string")

    # Check for null bytes
    if "\0" in file_path:
        raise ValueError("Invalid file path: contains null byte")

    path_obj = Path(file_path).resolve()

    # If allowed_base specified, ensure path is within it
    if allowed_base:
        allowed_base = Path(allowed_base).resolve()
        try:
            path_obj.relative_to(allowed_base)
        except ValueError:
            raise ValueError(f"Path traversal attempt: {file_path} is outside allowed base")

    # Check for suspicious patterns
    if ".." in str(path_obj):
        raise ValueError("Invalid file path: contains parent directory traversal")

    return path_obj


# ============================================================
# DATABASE TOOLS
# ============================================================

def search_contacts(
    query: str,
    company: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 10
) -> str:
    """
    Search contacts in the ClientForge CRM database.

    Args:
        query: Search terms for contact name or email
        company: Optional company name filter
        status: Optional status filter (lead, prospect, customer, inactive)
        limit: Maximum number of results (default 10)

    Returns:
        JSON string with contact list or error message
    """
    try:
        db_path = Path("D:/ClientForge/02_CODE/backend/dbcrm.db")
        if not db_path.exists():
            return json.dumps({"error": "Database not found"})

        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Build query
        sql = "SELECT id, name, email, company, title, status FROM contacts WHERE 1=1"
        params = []

        if query:
            sql += " AND (name LIKE ? OR email LIKE ?)"
            params.extend([f"%{query}%", f"%{query}%"])

        if company:
            sql += " AND company LIKE ?"
            params.append(f"%{company}%")

        if status:
            sql += " AND status = ?"
            params.append(status)

        # Validate limit parameter to prevent SQL injection
        if not isinstance(limit, int) or limit < 1 or limit > 1000:
            limit = 10

        sql += " LIMIT ?"
        params.append(limit)

        cursor.execute(sql, params)
        results = cursor.fetchall()
        conn.close()

        contacts = [
            {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "company": row[3],
                "title": row[4],
                "status": row[5]
            }
            for row in results
        ]

        return json.dumps({
            "contacts": contacts,
            "total": len(contacts)
        })

    except Exception as e:
        return json.dumps({"error": str(e)})


def search_deals(
    query: Optional[str] = None,
    stage: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    limit: int = 10
) -> str:
    """
    Search deals in the ClientForge CRM pipeline.

    Args:
        query: Search terms for deal name
        stage: Deal stage filter (prospecting, qualification, proposal, negotiation, closed)
        min_value: Minimum deal value in dollars
        max_value: Maximum deal value in dollars
        limit: Maximum number of results (default 10)

    Returns:
        JSON string with deal list or error message
    """
    try:
        db_path = Path("D:/ClientForge/02_CODE/backend/dbcrm.db")
        if not db_path.exists():
            return json.dumps({"error": "Database not found"})

        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        sql = "SELECT id, name, value, stage, probability, expected_close FROM deals WHERE 1=1"
        params = []

        if query:
            sql += " AND name LIKE ?"
            params.append(f"%{query}%")

        if stage:
            sql += " AND stage = ?"
            params.append(stage)

        if min_value is not None:
            sql += " AND value >= ?"
            params.append(min_value)

        if max_value is not None:
            sql += " AND value <= ?"
            params.append(max_value)

        # Validate limit parameter to prevent SQL injection
        if not isinstance(limit, int) or limit < 1 or limit > 1000:
            limit = 10

        sql += " LIMIT ?"
        params.append(limit)

        cursor.execute(sql, params)
        results = cursor.fetchall()
        conn.close()

        deals = [
            {
                "id": row[0],
                "name": row[1],
                "value": row[2],
                "stage": row[3],
                "probability": row[4],
                "expected_close": row[5]
            }
            for row in results
        ]

        return json.dumps({
            "deals": deals,
            "total": len(deals)
        })

    except Exception as e:
        return json.dumps({"error": str(e)})


def get_contact_analytics(contact_id: int) -> str:
    """
    Get detailed analytics for a specific contact.

    Args:
        contact_id: Contact ID in the database

    Returns:
        JSON string with contact analytics including:
        - Total deals value
        - Number of deals
        - Engagement score
        - Last interaction date
        - Activity timeline
    """
    try:
        db_path = Path("D:/ClientForge/02_CODE/backend/dbcrm.db")
        if not db_path.exists():
            return json.dumps({"error": "Database not found"})

        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Get contact info
        cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
        contact = cursor.fetchone()

        if not contact:
            return json.dumps({"error": "Contact not found"})

        # Get deals
        cursor.execute(
            "SELECT COUNT(*), SUM(value), AVG(probability) FROM deals WHERE contact_id = ?",
            (contact_id,)
        )
        deals_stats = cursor.fetchone()

        # Get activities (last 10)
        cursor.execute(
            """SELECT type, subject, created_at FROM activities
               WHERE contact_id = ? ORDER BY created_at DESC LIMIT 10""",
            (contact_id,)
        )
        activities = cursor.fetchall()

        conn.close()

        analytics = {
            "contact_id": contact_id,
            "total_deals": deals_stats[0] or 0,
            "total_value": deals_stats[1] or 0,
            "avg_win_probability": deals_stats[2] or 0,
            "recent_activities": [
                {
                    "type": act[0],
                    "subject": act[1],
                    "date": act[2]
                }
                for act in activities
            ]
        }

        return json.dumps(analytics)

    except Exception as e:
        return json.dumps({"error": str(e)})


# ============================================================
# FILE SYSTEM TOOLS
# ============================================================

def create_report(name: str, content: str, format: str = "md") -> str:
    """
    Create a report file in the reports directory.

    Args:
        name: Report filename (without extension)
        content: Report content
        format: File format (md, txt, json)

    Returns:
        Success or error message
    """
    try:
        reports_dir = Path("D:/ClientForge/02_CODE/backend/reports")
        reports_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{name}.{format}"
        file_path = reports_dir / filename

        if file_path.exists():
            return f"Error: Report '{filename}' already exists"

        file_path.write_text(content, encoding="utf-8")
        return f"Report created successfully: {filename}"

    except Exception as e:
        return f"Error creating report: {str(e)}"


def read_context_file(filename: str) -> str:
    """
    Read a context file from the ClientForge shared AI context pack.

    Args:
        filename: Name of the context file (e.g., "project_overview.md")

    Returns:
        File contents or error message
    """
    try:
        context_dir = Path("D:/ClientForge/05_SHARED_AI/context_pack")
        file_path = context_dir / filename

        if not file_path.exists():
            return f"Error: File '{filename}' not found in context pack"

        content = file_path.read_text(encoding="utf-8")
        return content

    except Exception as e:
        return f"Error reading file: {str(e)}"


# ============================================================
# ANALYSIS TOOLS
# ============================================================

def calculate_deal_forecast(days_ahead: int = 30) -> str:
    """
    Calculate deal forecast for the next N days.

    Args:
        days_ahead: Number of days to forecast (default 30)

    Returns:
        JSON string with forecast data
    """
    try:
        db_path = Path("D:/ClientForge/02_CODE/backend/dbcrm.db")
        if not db_path.exists():
            return json.dumps({"error": "Database not found"})

        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        end_date = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

        cursor.execute(
            """SELECT stage, COUNT(*), SUM(value), AVG(probability)
               FROM deals
               WHERE expected_close <= ?
               GROUP BY stage""",
            (end_date,)
        )

        results = cursor.fetchall()
        conn.close()

        forecast = {
            "forecast_period_days": days_ahead,
            "end_date": end_date,
            "by_stage": [
                {
                    "stage": row[0],
                    "count": row[1],
                    "total_value": row[2],
                    "avg_probability": row[3],
                    "weighted_value": row[2] * (row[3] / 100)
                }
                for row in results
            ]
        }

        # Calculate totals
        forecast["total_deals"] = sum(s["count"] for s in forecast["by_stage"])
        forecast["total_value"] = sum(s["total_value"] for s in forecast["by_stage"])
        forecast["weighted_forecast"] = sum(s["weighted_value"] for s in forecast["by_stage"])

        return json.dumps(forecast)

    except Exception as e:
        return json.dumps({"error": str(e)})


def identify_at_risk_deals() -> str:
    """
    Identify deals that are at risk of being lost.

    Criteria:
    - In negotiation stage for >30 days
    - Probability dropped recently
    - No activity in last 7 days

    Returns:
        JSON string with at-risk deals
    """
    try:
        db_path = Path("D:/ClientForge/02_CODE/backend/dbcrm.db")
        if not db_path.exists():
            return json.dumps({"error": "Database not found"})

        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Deals in negotiation for >30 days
        cursor.execute(
            """SELECT d.id, d.name, d.value, d.stage, d.probability,
                      MAX(a.created_at) as last_activity
               FROM deals d
               LEFT JOIN activities a ON d.id = a.deal_id
               WHERE d.stage = 'negotiation'
               GROUP BY d.id
               HAVING julianday('now') - julianday(d.created_at) > 30
                  OR julianday('now') - julianday(MAX(a.created_at)) > 7"""
        )

        results = cursor.fetchall()
        conn.close()

        at_risk = [
            {
                "id": row[0],
                "name": row[1],
                "value": row[2],
                "stage": row[3],
                "probability": row[4],
                "last_activity": row[5],
                "risk_reason": "Long negotiation period or inactive"
            }
            for row in results
        ]

        return json.dumps({
            "at_risk_deals": at_risk,
            "total": len(at_risk),
            "total_value_at_risk": sum(d["value"] for d in at_risk)
        })

    except Exception as e:
        return json.dumps({"error": str(e)})


# ============================================================
# UTILITY TOOLS
# ============================================================

def send_notification(title: str, message: str, priority: str = "normal") -> str:
    """
    Send a notification to the system log.

    Args:
        title: Notification title
        message: Notification message
        priority: Priority level (low, normal, high, urgent)

    Returns:
        Confirmation message
    """
    try:
        log_dir = Path("D:/ClientForge/02_CODE/backend/logs")
        log_dir.mkdir(parents=True, exist_ok=True)

        log_file = log_dir / "agent_notifications.log"

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{priority.upper()}] {title}: {message}\n"

        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)

        return f"Notification logged: {title}"

    except Exception as e:
        return f"Error sending notification: {str(e)}"


# ============================================================
# TOOL REGISTRY
# ============================================================

# All available tools for agents
ALL_TOOLS = [
    search_contacts,
    search_deals,
    get_contact_analytics,
    create_report,
    read_context_file,
    calculate_deal_forecast,
    identify_at_risk_deals,
    send_notification,
]

# Categorized tool sets
DATABASE_TOOLS = [search_contacts, search_deals, get_contact_analytics]
ANALYSIS_TOOLS = [calculate_deal_forecast, identify_at_risk_deals]
FILE_TOOLS = [create_report, read_context_file]
UTILITY_TOOLS = [send_notification]
