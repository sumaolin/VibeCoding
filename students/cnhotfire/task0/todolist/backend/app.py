from contextlib import closing
from datetime import datetime, timezone
import sqlite3
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = 'todos.db'

# Pydantic models
class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: Optional[str] = Field(default="todo")  # todo | in_progress | done
    dueDate: Optional[str] = None  # ISO8601
    priority: Optional[str] = Field(default="medium")  # low | medium | high

class TodoUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: Optional[str] = None
    dueDate: Optional[str] = None
    priority: Optional[str] = None

class TodoOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    dueDate: Optional[str]
    priority: str
    createdAt: str
    updatedAt: str


class TodoListResponse(BaseModel):
    items: List[TodoOut]
    page: int
    pageSize: int
    total: int

# DB init and migrations (simple)

def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def init_db():
    with closing(sqlite3.connect(DB_PATH)) as conn:
        c = conn.cursor()
        c.execute(
            '''
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'todo',
                due_date TEXT,
                priority TEXT NOT NULL DEFAULT 'medium',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0 -- legacy
            )
            '''
        )
        # add missing columns for legacy DBs
        for name, ddl in [
            ("description", "ALTER TABLE todos ADD COLUMN description TEXT"),
            ("status", "ALTER TABLE todos ADD COLUMN status TEXT NOT NULL DEFAULT 'todo'"),
            ("due_date", "ALTER TABLE todos ADD COLUMN due_date TEXT"),
            ("priority", "ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'"),
            ("created_at", "ALTER TABLE todos ADD COLUMN created_at TEXT NOT NULL"),
            ("updated_at", "ALTER TABLE todos ADD COLUMN updated_at TEXT NOT NULL"),
            ("completed", "ALTER TABLE todos ADD COLUMN completed INTEGER NOT NULL DEFAULT 0"),
        ]:
            if not column_exists(c, "todos", name):
                c.execute(ddl)
        # indexes
        c.execute("CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date)")
        conn.commit()

init_db()

@app.get('/api/health')
def health():
    return {"status": "ok"}

# Helpers
SORT_MAP = {
    "createdAt": "created_at",
    "updatedAt": "updated_at",
    "dueDate": "due_date",
    "priority": "priority",
}

STATUS_SET = {"todo", "in_progress", "done"}
PRIORITY_SET = {"low", "medium", "high"}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


def validate_iso_datetime(value: Optional[str], field_name: str) -> Optional[str]:
    if value is None:
        return None
    trimmed = value.strip()
    if trimmed == "":
        return None
    try:
        datetime.fromisoformat(trimmed.replace("Z", "+00:00"))
    except ValueError as exc:
        raise http_error(
            400,
            "VALIDATION_ERROR",
            f"{field_name} must be a valid ISO8601 datetime string",
        ) from exc
    return trimmed


def row_to_todo(row: sqlite3.Row) -> Dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "status": row["status"],
        "dueDate": row["due_date"],
        "priority": row["priority"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def fetch_todo_or_404(conn: sqlite3.Connection, todo_id: int) -> Dict:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, title, description, status, due_date, priority, created_at, updated_at FROM todos WHERE id = ?",
        (todo_id,),
    )
    row = cursor.fetchone()
    if not row:
        raise http_error(404, "NOT_FOUND", "Todo not found")
    return row_to_todo(row)

# List with pagination/filter/sort/search
@app.get('/api/todos', response_model=TodoListResponse)
def list_todos(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    sortBy: str = Query("createdAt"),
    sortOrder: str = Query("desc"),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    q: Optional[str] = None,
):
    sort_col = SORT_MAP.get(sortBy, "created_at")
    order_lower = sortOrder.lower()
    if order_lower not in {"asc", "desc"}:
        raise http_error(400, "VALIDATION_ERROR", "sortOrder must be asc or desc")
    order = "DESC" if order_lower == "desc" else "ASC"
    where_clauses = []
    params: List = []
    if status:
        if status not in STATUS_SET:
            raise http_error(400, "VALIDATION_ERROR", "invalid status")
        where_clauses.append("status = ?")
        params.append(status)
    if priority:
        if priority not in PRIORITY_SET:
            raise http_error(400, "VALIDATION_ERROR", "invalid priority")
        where_clauses.append("priority = ?")
        params.append(priority)
    if q:
        keyword = q.strip()
        if not keyword:
            keyword = None
        if keyword and len(keyword) > 200:
            raise http_error(400, "VALIDATION_ERROR", "search keyword too long")
        if keyword:
            where_clauses.append("(title LIKE ? OR description LIKE ?)")
            like = f"%{keyword}%"
            params.extend([like, like])
    where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    offset = (page - 1) * pageSize
    with closing(get_connection()) as conn:
        c = conn.cursor()
        c.execute(f"SELECT COUNT(1) FROM todos{where_sql}", params)
        total = c.fetchone()[0]
        c.execute(
            f"SELECT id, title, description, status, due_date, priority, created_at, updated_at FROM todos{where_sql} ORDER BY {sort_col} {order} LIMIT ? OFFSET ?",
            params + [pageSize, offset],
        )
        rows = c.fetchall()
    return {
        "items": [row_to_todo(r) for r in rows],
        "page": page,
        "pageSize": pageSize,
        "total": total,
    }

# Get detail
@app.get('/api/todos/{todo_id}', response_model=TodoOut)
def get_todo(todo_id: int):
    with closing(get_connection()) as conn:
        return fetch_todo_or_404(conn, todo_id)

# Create
@app.post('/api/todos', response_model=TodoOut, status_code=201)
def create_todo(payload: TodoCreate):
    now = utc_now_iso()
    title = payload.title.strip()
    if not title:
        raise http_error(400, "VALIDATION_ERROR", "title is required")
    description = (payload.description or None)
    status_val = (payload.status or "todo")
    if status_val not in STATUS_SET:
        raise http_error(400, "VALIDATION_ERROR", "invalid status")
    priority_val = (payload.priority or "medium")
    if priority_val not in PRIORITY_SET:
        raise http_error(400, "VALIDATION_ERROR", "invalid priority")
    due_date = validate_iso_datetime(payload.dueDate, "dueDate")
    completed = 1 if status_val == "done" else 0
    with closing(get_connection()) as conn:
        c = conn.cursor()
        c.execute(
            'INSERT INTO todos (title, description, status, due_date, priority, created_at, updated_at, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (title, description, status_val, due_date, priority_val, now, now, completed),
        )
        conn.commit()
        todo_id = c.lastrowid
        return fetch_todo_or_404(conn, todo_id)

# Update (partial)
@app.patch('/api/todos/{todo_id}', response_model=TodoOut)
def patch_todo(todo_id: int, payload: TodoUpdate):
    with closing(get_connection()) as conn:
        c = conn.cursor()
        c.execute('SELECT id FROM todos WHERE id = ?', (todo_id,))
        if not c.fetchone():
            raise http_error(404, "NOT_FOUND", "Todo not found")
        updates = []
        params: List = []
        if payload.title is not None:
            title = payload.title.strip()
            if not title:
                raise http_error(400, "VALIDATION_ERROR", "title is required")
            updates.append('title = ?')
            params.append(title)
        if payload.description is not None:
            updates.append('description = ?')
            params.append(payload.description)
        if payload.status is not None:
            if payload.status not in STATUS_SET:
                raise http_error(400, "VALIDATION_ERROR", "invalid status")
            updates.append('status = ?')
            params.append(payload.status)
            # maintain completed legacy column
            updates.append('completed = ?')
            params.append(1 if payload.status == 'done' else 0)
        if payload.dueDate is not None:
            updates.append('due_date = ?')
            params.append(validate_iso_datetime(payload.dueDate, "dueDate"))
        if payload.priority is not None:
            if payload.priority not in PRIORITY_SET:
                raise http_error(400, "VALIDATION_ERROR", "invalid priority")
            updates.append('priority = ?')
            params.append(payload.priority)
        # updated_at
        updates.append('updated_at = ?')
        params.append(utc_now_iso())
        if updates:
            sql = f"UPDATE todos SET {', '.join(updates)} WHERE id = ?"
            params.append(todo_id)
            c.execute(sql, params)
            conn.commit()
        return fetch_todo_or_404(conn, todo_id)

# Delete
@app.delete('/api/todos/{todo_id}', status_code=204)
def delete_todo(todo_id: int):
    with closing(get_connection()) as conn:
        c = conn.cursor()
        c.execute('DELETE FROM todos WHERE id = ?', (todo_id,))
        if c.rowcount == 0:
            raise http_error(404, "NOT_FOUND", "Todo not found")
        conn.commit()
    return None
