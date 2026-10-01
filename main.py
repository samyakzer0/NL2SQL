import os
import re
import datetime
from typing import Any, Dict, List, Optional
import sqlparse
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from google import genai
from google.genai import types
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="NL2SQL Engine",
    description="Natural Language to SQL Backend-as-a-Service powered by LLMs and SQLAlchemy.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    db_connection_uri: str = Field(
        ...,
        description="SQLAlchemy database connection URI (e.g. mysql+pymysql://user:pass@host:3306/db, sqlite:///test.db)"
    )
    user_prompt: str = Field(
        ...,
        description="Natural language question to translate into SQL and execute"
    )
    gemini_api_key: Optional[str] = Field(
        None,
        description="Google Gemini API key (or provide llm_api_key)"
    )
    llm_api_key: Optional[str] = Field(
        None,
        description="Generic LLM API key (works across providers)"
    )

    @model_validator(mode="after")
    def validate_api_key(self):
        # Resolve key from request fields or server environment
        resolved_key = (
            self.llm_api_key
            or self.gemini_api_key
            or os.getenv("LLM_API_KEY")
            or os.getenv("GEMINI_API_KEY")
        )
        # Allow testing sample database without requiring an API key
        if not resolved_key and self.db_connection_uri and "sample.db" in self.db_connection_uri.lower():
            resolved_key = "SAMPLE_DB_DEMO"

        if not resolved_key:
            raise ValueError("An LLM API key must be provided via 'llm_api_key', 'gemini_api_key', or environment variable.")
        # Normalize to both attributes for uniform access
        self.llm_api_key = resolved_key
        self.gemini_api_key = resolved_key
        return self


class QueryResponse(BaseModel):
    status: str
    sql_query: str
    row_count: int
    data: List[Dict[str, Any]]


def extract_database_schema(db_uri: str) -> str:
    engine = create_engine(db_uri)
    try:
        inspector = inspect(engine)

        schema_text = ""
        for table_name in inspector.get_table_names():
            schema_text += f"\nTable: {table_name}\nColumns:\n"
            for column in inspector.get_columns(table_name):
                schema_text += f"  - {column['name']} ({column['type']})\n"

        return schema_text
    except Exception as e:
        raise ValueError(f"Failed to connect or extract schema: {str(e)}")
    finally:
        engine.dispose()


def clean_sql_string(raw_sql: str) -> str:
    cleaned = re.sub(r"```(?:sql)?", "", raw_sql, flags=re.IGNORECASE)
    cleaned = cleaned.replace("```", "").strip()

    match = re.search(r"((?:WITH|SELECT)\s+.+?)(?:;|\Z)", cleaned, re.IGNORECASE | re.DOTALL)
    if match:
        cleaned = match.group(1) + ";"

    return cleaned.strip()


def generate_sql_for_sample_db(user_prompt: str) -> str:
    prompt_lower = user_prompt.strip().lower()

    # Direct SQL passthrough if user typed SQL
    if prompt_lower.startswith("select") or prompt_lower.startswith("with"):
        return user_prompt.strip()

    # Predefined sample queries
    if "email" in prompt_lower and "user" in prompt_lower:
        return "SELECT id, name, email, role, created_at FROM users;"

    if "under 50" in prompt_lower or ("stock" in prompt_lower and ("50" in prompt_lower or "desc" in prompt_lower)):
        return "SELECT * FROM products WHERE stock < 50 ORDER BY price DESC;"

    if "revenue" in prompt_lower or ("order count" in prompt_lower and "user" in prompt_lower):
        return "SELECT user_id, COUNT(*) AS order_count, ROUND(SUM(total_amount), 2) AS total_revenue FROM orders GROUP BY user_id;"

    if "july" in prompt_lower or "august" in prompt_lower or "between" in prompt_lower:
        current_year = datetime.date.today().year
        return f"SELECT * FROM orders WHERE DATE(created_at) BETWEEN '{current_year}-07-25' AND '{current_year}-08-01';"

    # Products queries
    if any(k in prompt_lower for k in ["product", "item", "stock", "price"]):
        if any(k in prompt_lower for k in ["expensive", "highest price", "top", "highest"]):
            return "SELECT * FROM products ORDER BY price DESC LIMIT 5;"
        if any(k in prompt_lower for k in ["cheapest", "lowest price", "lowest"]):
            return "SELECT * FROM products ORDER BY price ASC LIMIT 5;"
        if "category" in prompt_lower:
            return "SELECT category, COUNT(*) AS total_items, ROUND(AVG(price), 2) AS avg_price FROM products GROUP BY category;"
        if "stock" in prompt_lower:
            return "SELECT * FROM products ORDER BY stock ASC;"
        return "SELECT * FROM products;"

    # Orders queries
    if any(k in prompt_lower for k in ["order", "sale", "spent", "revenue", "booking"]):
        if "deliver" in prompt_lower:
            return "SELECT * FROM orders WHERE status = 'delivered';"
        if "ship" in prompt_lower:
            return "SELECT * FROM orders WHERE status = 'shipped';"
        if "cancel" in prompt_lower:
            return "SELECT * FROM orders WHERE status = 'cancelled';"
        if "recent" in prompt_lower or "latest" in prompt_lower:
            return "SELECT * FROM orders ORDER BY created_at DESC;"
        return "SELECT * FROM orders;"

    # Users queries
    if any(k in prompt_lower for k in ["user", "customer", "client", "people", "employee", "member"]):
        if any(k in prompt_lower for k in ["count", "how many", "total"]):
            return "SELECT COUNT(*) AS total_users FROM users;"
        if "customer" in prompt_lower:
            return "SELECT * FROM users WHERE role = 'customer';"
        if "admin" in prompt_lower:
            return "SELECT * FROM users WHERE role = 'admin';"
        if "staff" in prompt_lower:
            return "SELECT * FROM users WHERE role = 'staff';"
        return "SELECT * FROM users;"

    # General fallback
    return "SELECT * FROM users LIMIT 10;"


def generate_sql_query(schema: str, user_prompt: str, llm_api_key: str) -> str:
    if llm_api_key == "SAMPLE_DB_DEMO":
        return generate_sql_for_sample_db(user_prompt)

    client = genai.Client(api_key=llm_api_key)

    current_date = datetime.date.today().strftime("%Y-%m-%d")
    current_year = datetime.date.today().year

    system_prompt = f"""
You are an expert, strict SQL translation engine.
Your sole job is to translate natural language user requests into valid MySQL SELECT queries based ONLY on the provided schema.

Target Database Schema:
{schema}

Current Reference Date: {current_date} (Year: {current_year})

CRITICAL RULES:
1. Output ONLY the raw MySQL query. Do NOT wrap it in markdown code blocks (no ```sql or ```).
2. Do NOT include explanatory commentary or introductory text.
3. Strictly generate valid MySQL syntax compatible with MySQL 8.0 `sql_mode=ONLY_FULL_GROUP_BY`.
4. When finding duplicate rows, records with same values (e.g. same email on same day/date), use window functions with CTEs like:
   WITH grouped_records AS (
       SELECT *, COUNT(*) OVER(PARTITION BY col1, DATE(date_col)) AS match_count
       FROM table_name
   )
   SELECT * FROM grouped_records WHERE match_count > 1;
   DO NOT use invalid `WHERE (col1, DATE(col2)) IN (SELECT col1, DATE(col2) FROM table GROUP BY col1, DATE(col2) HAVING COUNT(*) > 1)` because MySQL rejects non-aggregated HAVING in subqueries.
5. Use standard ISO date formats ('YYYY-MM-DD') for date range comparisons (e.g. DATE(created_at) BETWEEN '2026-07-25' AND '2026-08-01').
6. If a year is omitted in a date request (e.g., "25th july and 1st august"), default to the current reference year ({current_year}).
7. Do NOT use double quotes (") for column or table names. Use backticks (`) or no quotes.
8. Strictly generate SELECT queries. Never output INSERT, UPDATE, DELETE, or DROP.

EXAMPLES OF CORRECT RESPONSES:
User: Show all bookings from month 8
Output: SELECT * FROM bookings WHERE MONTH(createdAt) = 8;

User: Show bookings between 25th july and 1st august
Output: SELECT * FROM bookings WHERE DATE(createdAt) BETWEEN '{current_year}-07-25' AND '{current_year}-08-01';

User: Find all the records, having bookings from the same email, on the same day
Output: WITH duplicate_bookings AS (SELECT *, COUNT(*) OVER(PARTITION BY email, DATE(createdAt)) AS booking_count FROM bookings) SELECT * FROM duplicate_bookings WHERE booking_count > 1;

User: Find top 5 highest paid employees
Output: SELECT * FROM employees ORDER BY salary DESC LIMIT 5;
"""

    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=2048,
            system_instruction=system_prompt,
            temperature=0.0
        )
    )

    return clean_sql_string(response.text)


def validate_sql_query(sql_query: str) -> bool:
    clean_sql = sql_query.strip().rstrip(';')

    parsed = sqlparse.parse(clean_sql)

    if not parsed:
        raise ValueError("Invalid SQL query: Unable to parse.")

    # Multiple statements are detected here
    non_empty_stmts = [s for s in parsed if str(s).strip()]
    if len(non_empty_stmts) > 1:
        raise ValueError("Security Block: Multiple SQL statements detected.")

    stmt = non_empty_stmts[0]
    statement_type = stmt.get_type()

    # Handling comments, whitespace, and parentheses
    lines = [line.strip() for line in clean_sql.splitlines() if line.strip()]
    while lines and (lines[0].startswith("--") or lines[0].startswith("/*")):
        lines.pop(0)
    sql_no_comments = " ".join(lines).strip().lstrip("(").strip()
    normalized_upper = sql_no_comments.upper()

    # Fallback check if sqlparse marks valid SELECT/WITH as UNKNOWN
    if statement_type == 'UNKNOWN':
        if normalized_upper.startswith("SELECT") or normalized_upper.startswith("WITH"):
            statement_type = 'SELECT'

    if statement_type != 'SELECT' and not normalized_upper.startswith("WITH"):
        raise ValueError(f"Security Block: Expected SELECT statement, got '{statement_type}'.")

    return True


def serialize_row_value(val: Any) -> Any:
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    if hasattr(val, "__str__") and type(val).__name__ == "Decimal":
        return float(val)
    return val


@app.get("/", tags=["General"])
@app.get("/api", tags=["General"])
async def root(request: Request):
    accept = request.headers.get("accept", "")
    static_index = os.path.join(os.path.dirname(__file__), "static", "index.html")
    # If requested by browser HTML client, serve frontend SPA
    if "text/html" in accept and os.path.exists(static_index):
        return FileResponse(static_index)

    return {
        "service": "NL2SQL Engine (Backend-as-a-Service)",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "endpoints": {
            "health": "GET /health",
            "query": "POST /query"
        }
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    icon_path = os.path.join(os.path.dirname(__file__), "static", "favicon.ico")
    if os.path.exists(icon_path):
        return FileResponse(icon_path, media_type="image/x-icon")
    raise HTTPException(status_code=404)


@app.get("/health", tags=["General"])
async def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.utcnow().isoformat()}


@app.post("/query", response_model=QueryResponse, tags=["Query"])
async def query_endpoint(request: QueryRequest):
    engine = None
    try:
        schema = extract_database_schema(request.db_connection_uri)
        
        # Use generalized llm_api_key (populated by validator)
        generated_sql = generate_sql_query(schema, request.user_prompt, request.llm_api_key)

        validate_sql_query(generated_sql)

        engine = create_engine(request.db_connection_uri)
        with engine.connect() as connection:
            # This prevents sql 1055 error on MySQL
            if "mysql" in request.db_connection_uri.lower():
                try:
                    connection.execute(text("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));"))
                except Exception:
                    pass

            result = connection.execute(text(generated_sql))
            rows = [
                {k: serialize_row_value(v) for k, v in dict(row._mapping).items()}
                for row in result
            ]
            
            return {
                "status": "success",
                "sql_query": generated_sql, 
                "row_count": len(rows),
                "data": rows
            }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")
    finally:
        if engine:
            engine.dispose()


# Mount static assets for frontend bundle
static_dir = os.path.join(os.path.dirname(__file__), "static")
assets_dir = os.path.join(static_dir, "assets")
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
if os.path.exists(static_dir):
    # Mount root static files (favicon, etc.)
    app.mount("/static", StaticFiles(directory=static_dir), name="static_root")

