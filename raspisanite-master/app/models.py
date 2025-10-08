# app/models.py
from typing import Any, Dict, List, Optional
import threading
from psycopg2.pool import ThreadedConnectionPool
import psycopg2.extras
from datetime import date

CONNECTION_DSN = "host=localhost port=5432 dbname=Raspisanie user=postgres password=1234"
POOL_MINCONN = 1
POOL_MAXCONN = 10
# =====================================================

_lock = threading.Lock()
_pool: Optional[ThreadedConnectionPool] = None

def _ensure_pool():
    global _pool
    if _pool is None:
        with _lock:
            if _pool is None:
                try:
                    _pool = ThreadedConnectionPool(POOL_MINCONN, POOL_MAXCONN, dsn=CONNECTION_DSN)
                except Exception as e:
                    raise RuntimeError(f"Cannot create DB pool: {e}")

def _get_conn():
    _ensure_pool()
    assert _pool is not None
    return _pool.getconn()

def _put_conn(conn):
    assert _pool is not None
    _pool.putconn(conn)

# ---- mappers ----
def _map_group(row: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": str(row["id_group"]), "name": row.get("name_gr")}

def _map_object(row: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": str(row["id_obj"]), "name": row.get("name_obj")}

def _map_prep(row: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": str(row["id_prep"]), "fio": row.get("fio")}

def _map_aud(row: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": str(row["id_au"]), "number": row.get("number")}

def _map_itog(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(row["id_itog"]),
        "date": row["data"].isoformat() if row.get("data") else None,
        "time": row.get("time"),
        "object_id": str(row["id_obj_fk"]) if row.get("id_obj_fk") else None,
        "group_id": str(row["id_group_fk"]) if row.get("id_group_fk") else None,
        "prep_id": str(row["id_prep_fk"]) if row.get("id_prep_fk") else None,
        "aud_id": str(row["id_au_fk"]) if row.get("id_au_fk") else None,
        "type": row.get("type")
    }

# ===== DataStore working with Friend's DB schema =====
class DataStore:
    def __init__(self):
        _ensure_pool()

    # ---------- Groups ----------
    def list_groups(self) -> List[Dict[str, Any]]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('SELECT "id_group", "name_gr" FROM "Groups" ORDER BY "name_gr";')
                rows = cur.fetchall()
                return [_map_group(r) for r in rows]
        finally:
            _put_conn(conn)

    def create_group(self, name: str) -> Dict[str, Any]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('INSERT INTO "Groups" ("name_gr") VALUES (%s) RETURNING "id_group", "name_gr";', (name,))
                row = cur.fetchone()
                conn.commit()
                return _map_group(row)
        finally:
            _put_conn(conn)

    def update_group(self, id_group: int, name: Optional[str]) -> Optional[Dict[str, Any]]:
        if name is None: return None
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('UPDATE "Groups" SET "name_gr"=%s WHERE "id_group"=%s RETURNING "id_group", "name_gr";', (name, id_group))
                row = cur.fetchone(); conn.commit()
                return _map_group(row) if row else None
        finally:
            _put_conn(conn)

    def delete_group(self, id_group: int) -> bool:
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute('UPDATE "Itog" SET "id_group_fk" = NULL WHERE "id_group_fk" = %s;', (id_group,))
                cur.execute('DELETE FROM "Groups" WHERE "id_group" = %s;', (id_group,))
                conn.commit()
                return True
        finally:
            _put_conn(conn)

    # ---------- Objects ----------
    def list_objects(self) -> List[Dict[str, Any]]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('SELECT "id_obj", "name_obj" FROM "Objects" ORDER BY "name_obj";')
                return [_map_object(r) for r in cur.fetchall()]
        finally:
            _put_conn(conn)

    def create_object(self, name: str) -> Dict[str, Any]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('INSERT INTO "Objects" ("name_obj") VALUES (%s) RETURNING "id_obj", "name_obj";', (name,))
                row = cur.fetchone(); conn.commit(); return _map_object(row)
        finally:
            _put_conn(conn)

    def update_object(self, id_obj: int, name: Optional[str]) -> Optional[Dict[str, Any]]:
        if name is None: return None
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('UPDATE "Objects" SET "name_obj"=%s WHERE "id_obj"=%s RETURNING "id_obj", "name_obj";', (name, id_obj))
                row = cur.fetchone(); conn.commit(); return _map_object(row) if row else None
        finally:
            _put_conn(conn)

    def delete_object(self, id_obj: int) -> bool:
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                # Проверяем, существует ли объект
                cur.execute('SELECT 1 FROM "Objects" WHERE "id_obj" = %s;', (id_obj,))
                if not cur.fetchone():
                    return False  # объект не найден

                # Обнуляем связи в Itog
                cur.execute('UPDATE "Itog" SET "id_obj_fk" = NULL WHERE "id_obj_fk" = %s;', (id_obj,))
                # Удаляем объект
                cur.execute('DELETE FROM "Objects" WHERE "id_obj" = %s;', (id_obj,))
                conn.commit()
                return True
        finally:
            _put_conn(conn)

    # ---------- Prepodavateli ----------
    def list_preps(self) -> List[Dict[str, Any]]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('SELECT "id_prep", "fio" FROM "Prepodavateli" ORDER BY "fio";')
                return [_map_prep(r) for r in cur.fetchall()]
        finally:
            _put_conn(conn)

    def create_prep(self, fio: str) -> Dict[str, Any]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('INSERT INTO "Prepodavateli" ("fio") VALUES (%s) RETURNING "id_prep", "fio";', (fio,))
                row = cur.fetchone(); conn.commit(); return _map_prep(row)
        finally:
            _put_conn(conn)

    def update_prep(self, id_prep: int, fio: Optional[str]) -> Optional[Dict[str, Any]]:
        if fio is None: return None
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('UPDATE "Prepodavateli" SET "fio"=%s WHERE "id_prep"=%s RETURNING "id_prep", "fio";', (fio, id_prep))
                row = cur.fetchone(); conn.commit(); return _map_prep(row) if row else None
        finally:
            _put_conn(conn)

    def delete_prep(self, id_prep: int) -> bool:
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute('UPDATE "Itog" SET "id_prep_fk" = NULL WHERE "id_prep_fk" = %s;', (id_prep,))
                cur.execute('DELETE FROM "Prepodavateli" WHERE "id_prep" = %s;', (id_prep,))
                conn.commit(); return True
        finally:
            _put_conn(conn)

    # ---------- Auditorii ----------
    def list_aud(self) -> List[Dict[str, Any]]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('SELECT "id_au", "number" FROM "Auditorii" ORDER BY "number";')
                return [_map_aud(r) for r in cur.fetchall()]
        finally:
            _put_conn(conn)

    def create_aud(self, number: str) -> Dict[str, Any]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('INSERT INTO "Auditorii" ("number") VALUES (%s) RETURNING "id_au", "number";', (number,))
                row = cur.fetchone(); conn.commit(); return _map_aud(row)
        finally:
            _put_conn(conn)

    def update_aud(self, id_au: int, number: Optional[str]) -> Optional[Dict[str, Any]]:
        if number is None: return None
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('UPDATE "Auditorii" SET "number"=%s WHERE "id_au"=%s RETURNING "id_au", "number";', (number, id_au))
                row = cur.fetchone(); conn.commit(); return _map_aud(row) if row else None
        finally:
            _put_conn(conn)

    def delete_aud(self, id_au: int) -> bool:
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute('UPDATE "Itog" SET "id_au_fk" = NULL WHERE "id_au_fk" = %s;', (id_au,))
                cur.execute('DELETE FROM "Auditorii" WHERE "id_au" = %s;', (id_au,))
                conn.commit(); return True
        finally:
            _put_conn(conn)

    # ---------- Itog ----------
    def list_itog(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                sql = 'SELECT "id_itog", "data", "time", "id_obj_fk", "id_group_fk", "id_prep_fk", "id_au_fk", "type" FROM "Itog"'
                clauses = []
                params = []
                if filters:
                    if filters.get("date_from"):
                        clauses.append('"data" >= %s'); params.append(filters["date_from"])
                    if filters.get("date_to"):
                        clauses.append('"data" <= %s'); params.append(filters["date_to"])
                    if filters.get("group_id"):
                        clauses.append('"id_group_fk" = %s'); params.append(int(filters["group_id"]))
                    if filters.get("prep_id"):
                        clauses.append('"id_prep_fk" = %s'); params.append(int(filters["prep_id"]))
                    if filters.get("aud_id"):
                        clauses.append('"id_au_fk" = %s'); params.append(int(filters["aud_id"]))
                    if filters.get("object_id"):
                        clauses.append('"id_obj_fk" = %s'); params.append(int(filters["object_id"]))
                    if filters.get("type"):
                        clauses.append('"type" = %s'); params.append(filters["type"])
                if clauses:
                    sql += " WHERE " + " AND ".join(clauses)
                sql += ' ORDER BY "data" NULLS LAST, "time" NULLS LAST;'
                cur.execute(sql, tuple(params))
                rows = cur.fetchall()
                return [_map_itog(r) for r in rows]
        finally:
            _put_conn(conn)

    def create_itog(self, data_val: Optional[str], time_val: Optional[str],
                    id_obj_fk: Optional[int], id_group_fk: Optional[int],
                    id_prep_fk: Optional[int], id_au_fk: Optional[int], type_val: Optional[str]) -> Dict[str, Any]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO "Itog" ("data", "time", "id_obj_fk", "id_group_fk", "id_prep_fk", "id_au_fk", "type")
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING "id_itog", "data", "time", "id_obj_fk", "id_group_fk", "id_prep_fk", "id_au_fk", "type";
                """, (data_val, time_val, id_obj_fk, id_group_fk, id_prep_fk, id_au_fk, type_val))
                row = cur.fetchone(); conn.commit(); return _map_itog(row)
        finally:
            _put_conn(conn)

    def update_itog(self, id_itog: int, **kwargs) -> Optional[Dict[str, Any]]:
        conn = _get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                allowed = {"data","time","id_obj_fk","id_group_fk","id_prep_fk","id_au_fk","type"}
                sets = []; params = []
                for k, v in kwargs.items():
                    if k in allowed and v is not None:
                        sets.append(f'"{k}" = %s'); params.append(v)
                if not sets:
                    cur.execute('SELECT "id_itog", "data", "time", "id_obj_fk", "id_group_fk", "id_prep_fk", "id_au_fk", "type" FROM "Itog" WHERE "id_itog" = %s;', (id_itog,))
                    r = cur.fetchone(); return _map_itog(r) if r else None
                sql = 'UPDATE "Itog" SET ' + ", ".join(sets) + ' WHERE "id_itog" = %s RETURNING "id_itog", "data", "time", "id_obj_fk", "id_group_fk", "id_prep_fk", "id_au_fk", "type";'
                params.append(id_itog)
                cur.execute(sql, tuple(params))
                r = cur.fetchone(); conn.commit(); return _map_itog(r) if r else None
        finally:
            _put_conn(conn)

    def delete_itog(self, id_itog: int) -> bool:
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM "Itog" WHERE "id_itog" = %s;', (id_itog,))
                conn.commit(); return True
        finally:
            _put_conn(conn)

# singleton
store = DataStore()
