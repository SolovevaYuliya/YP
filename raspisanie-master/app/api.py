from fastapi import FastAPI, Request, Form, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
import io
import pandas as pd

from .models import store  # твой модуль с данными/CRUD

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()

# --- Middleware для отключения кэша JS/CSS ---
@app.middleware("http")
async def no_cache_static(request: Request, call_next):
    response = await call_next(request)
    # Проверяем, что это файл из /static и js или css
    if request.url.path.startswith("/static/") and (request.url.path.endswith(".js") or request.url.path.endswith(".css")):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# --- Подключение статических файлов и шаблонов ---
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# --- Главная страница ---
@app.get("/")
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# --- Groups ---
@app.get("/api/groups")
def get_groups(name: str = None):
    groups = store.list_groups()
    if name:
        name = name.lower()
        groups = [g for g in groups if name in g["name"].lower()]
    return JSONResponse(groups)

@app.post("/api/groups")
def post_group(name: str = Form(...)):
    if not name:
        raise HTTPException(400, "name required")
    return JSONResponse(store.create_group(name=name))

@app.put("/api/groups/{id_group}")
def put_group(id_group: int, name: str = Form(...)):
    updated = store.update_group(id_group, name)
    if not updated:
        raise HTTPException(404, "Group not found")
    return JSONResponse(updated)

@app.delete("/api/groups/{id_group}")
def delete_group(id_group: int):
    success = store.delete_group(id_group)
    if not success:
        raise HTTPException(404, "Group not found")
    return JSONResponse({"ok": True})

# --- Objects (subjects) ---
@app.get("/api/objects")
def get_objects(name: str = None):
    objs = store.list_objects()
    if name:
        name = name.lower()
        objs = [o for o in objs if name in o["name"].lower()]
    return JSONResponse(objs)

@app.post("/api/objects")
def post_object(name: str = Form(...)):
    if not name:
        raise HTTPException(400, "name required")
    return JSONResponse(store.create_object(name=name))

@app.put("/api/objects/{id_obj}")
def put_object(id_obj: int, name: str = Form(...)):
    updated = store.update_object(id_obj, name)
    if not updated:
        raise HTTPException(404, "Object not found")
    return JSONResponse(updated)

@app.delete("/api/objects/{id_obj}")
def delete_object(id_obj: int):
    success = store.delete_object(id_obj)
    if not success:
        raise HTTPException(404, "Object not found")
    return JSONResponse({"ok": True})

# --- Preps (teachers) ---
@app.get("/api/preps")
def get_preps(fio: str = None):
    preps = store.list_preps()
    if fio:
        fio = fio.lower()
        preps = [p for p in preps if fio in p["fio"].lower()]
    return JSONResponse(preps)

@app.post("/api/preps")
def post_prep(fio: str = Form(...)):
    if not fio:
        raise HTTPException(400, "fio required")
    return JSONResponse(store.create_prep(fio=fio))

@app.put("/api/preps/{id_prep}")
def put_prep(id_prep: int, fio: str = Form(...)):
    updated = store.update_prep(id_prep, fio)
    if not updated:
        raise HTTPException(404, "Prep not found")
    return JSONResponse(updated)

@app.delete("/api/preps/{id_prep}")
def delete_prep(id_prep: int):
    success = store.delete_prep(id_prep)
    if not success:
        raise HTTPException(404, "Prep not found")
    return JSONResponse({"ok": True})

# --- Auditorii ---
@app.get("/api/auditorii")
def get_auditorii(number: str = None):
    auds = store.list_aud()
    if number:
        number = number.lower()
        auds = [a for a in auds if number in a["number"].lower()]
    return JSONResponse(auds)

@app.post("/api/auditorii")
def post_aud(number: str = Form(...)):
    if not number:
        raise HTTPException(400, "number required")
    return JSONResponse(store.create_aud(number=number))

@app.put("/api/auditorii/{id_aud}")
def put_aud(id_aud: int, number: str = Form(...)):
    updated = store.update_aud(id_aud, number)
    if not updated:
        raise HTTPException(404, "Auditorium not found")
    return JSONResponse(updated)

@app.delete("/api/auditorii/{id_aud}")
def delete_aud(id_aud: int):
    success = store.delete_aud(id_aud)
    if not success:
        raise HTTPException(404, "Auditorium not found")
    return JSONResponse({"ok": True})

# --- Itog (schedule) ---
@app.get("/api/itog")
def get_itog(
    date_from: str = None, date_to: str = None,
    group_id: str = None, prep_id: str = None, aud_id: str = None,
    object_id: str = None, type: str = None
):
    filt = {}
    if date_from: filt["date_from"] = date_from
    if date_to: filt["date_to"] = date_to
    if group_id: filt["group_id"] = group_id
    if prep_id: filt["prep_id"] = prep_id
    if aud_id: filt["aud_id"] = aud_id
    if object_id: filt["object_id"] = object_id
    if type: filt["type"] = type
    return JSONResponse(store.list_itog(filters=filt if filt else None))

@app.post("/api/itog")
def post_itog(
    data: str = Form(None),
    time: str = Form(None),
    id_obj_fk: int = Form(None),
    id_group_fk: int = Form(None),
    id_prep_fk: int = Form(None),
    id_au_fk: int = Form(None),
    type: str = Form(None)
):
    t = store.create_itog(data, time, id_obj_fk, id_group_fk, id_prep_fk, id_au_fk, type)
    return JSONResponse(t)

@app.put("/api/itog/{id_itog}")
def put_itog(id_itog: int,
             data: str = Form(None),
             time: str = Form(None),
             id_obj_fk: int = Form(None),
             id_group_fk: int = Form(None),
             id_prep_fk: int = Form(None),
             id_au_fk: int = Form(None),
             type: str = Form(None)):
    updated = store.update_itog(id_itog,
                                data=data, time=time,
                                id_obj_fk=id_obj_fk, id_group_fk=id_group_fk,
                                id_prep_fk=id_prep_fk, id_au_fk=id_au_fk, type=type)
    if not updated:
        raise HTTPException(404, "Not found")
    return JSONResponse(updated)

@app.delete("/api/itog/{id_itog}")
def delete_itog(id_itog: int):
    success = store.delete_itog(id_itog)
    if not success:
        raise HTTPException(404, "Not found")
    return JSONResponse({"ok": True})

# --- Export Excel ---
@app.get("/api/export")
def export_itog():
    itogs = store.list_itog()
    rows = []
    for r in itogs:
        obj = next((x["name"] for x in store.list_objects() if x["id"]==r["object_id"]), "")
        grp = next((x["name"] for x in store.list_groups() if x["id"]==r["group_id"]), "")
        prep = next((x["fio"] for x in store.list_preps() if x["id"]==r["prep_id"]), "")
        aud = next((x["number"] for x in store.list_aud() if x["id"]==r["aud_id"]), "")
        rows.append({
            "date": r["date"], "time": r["time"], "subject": obj,
            "group": grp, "prepod": prep, "auditorium": aud, "type": r["type"]
        })
    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Itog', index=False)
    buf.seek(0)
    headers = {'Content-Disposition': 'attachment; filename="itog_export.xlsx"'}
    return StreamingResponse(buf, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers=headers)

# --- Import Excel ---
@app.post("/api/import")
def import_itog(file: UploadFile = File(...)):
    if file.content_type not in ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel"):
        raise HTTPException(400, "Unsupported file type")
    data = file.file.read()
    df = pd.read_excel(io.BytesIO(data))
    created = []
    for _, row in df.iterrows():
        date_val = row.get("date")
        time_val = str(row.get("time")) if not pd.isna(row.get("time")) else None
        subject = row.get("subject")
        group = row.get("group")
        prepod = row.get("prepod")
        auditorium = row.get("auditorium")
        type_val = row.get("type")
        obj_id = None
        group_id = None
        prep_id = None
        aud_id = None
        if subject and not pd.isna(subject):
            match = next((o for o in store.list_objects() if o["name"].lower()==str(subject).lower()), None)
            obj_id = int(match["id"]) if match else int(store.create_object(str(subject))["id"])
        if group and not pd.isna(group):
            match = next((g for g in store.list_groups() if g["name"].lower()==str(group).lower()), None)
            group_id = int(match["id"]) if match else int(store.create_group(str(group))["id"])
        if prepod and not pd.isna(prepod):
            match = next((p for p in store.list_preps() if p["fio"].lower()==str(prepod).lower()), None)
            prep_id = int(match["id"]) if match else int(store.create_prep(str(prepod))["id"])
        if auditorium and not pd.isna(auditorium):
            match = next((a for a in store.list_aud() if a["number"].lower()==str(auditorium).lower()), None)
            aud_id = int(match["id"]) if match else int(store.create_aud(str(auditorium))["id"])
        created.append(store.create_itog(date_val if not pd.isna(date_val) else None,
                                         time_val, obj_id, group_id, prep_id, aud_id, type_val))
    return JSONResponse({"created": created, "count": len(created)})

