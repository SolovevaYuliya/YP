# app/models.py
from datetime import date
from typing import Optional, List, Dict, Any

from sqlalchemy import Column, Integer, String, Date, ForeignKey, create_engine
from sqlalchemy.orm import relationship, declarative_base, sessionmaker, Session

# ======= Настройка базы =========
DATABASE_URL = "postgresql+psycopg2://postgres:1234@localhost:5432/Raspisanie"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()


# ----------------- ORM Models -----------------
class Group(Base):
    __tablename__ = "Groups"
    id = Column("id_group", Integer, primary_key=True)
    name = Column("name_gr", String, nullable=False)
    itogs = relationship("Itog", back_populates="group", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": str(self.id), "name": self.name}


class Object(Base):
    __tablename__ = "Objects"
    id = Column("id_obj", Integer, primary_key=True)
    name = Column("name_obj", String, nullable=False)
    itogs = relationship("Itog", back_populates="object", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": str(self.id), "name": self.name}


class Prepod(Base):
    __tablename__ = "Prepodavateli"
    id = Column("id_prep", Integer, primary_key=True)
    fio = Column(String, nullable=False)
    itogs = relationship("Itog", back_populates="prep", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": str(self.id), "fio": self.fio}


class Aud(Base):
    __tablename__ = "Auditorii"
    id = Column("id_au", Integer, primary_key=True)
    number = Column(String, nullable=False)
    itogs = relationship("Itog", back_populates="aud", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": str(self.id), "number": self.number}


class Itog(Base):
    __tablename__ = "Itog"
    id = Column("id_itog", Integer, primary_key=True)
    date = Column("data", Date)
    time = Column(String)
    type = Column(String)

    object_id = Column("id_obj_fk", Integer, ForeignKey("Objects.id_obj"))
    group_id = Column("id_group_fk", Integer, ForeignKey("Groups.id_group"))
    prep_id = Column("id_prep_fk", Integer, ForeignKey("Prepodavateli.id_prep"))
    aud_id = Column("id_au_fk", Integer, ForeignKey("Auditorii.id_au"))

    object = relationship("Object", back_populates="itogs")
    group = relationship("Group", back_populates="itogs")
    prep = relationship("Prepod", back_populates="itogs")
    aud = relationship("Aud", back_populates="itogs")

    def to_dict(self):
        return {
            "id": str(self.id),
            "date": self.date.isoformat() if self.date else None,
            "time": self.time,
            "object_id": str(self.object_id) if self.object_id else None,
            "group_id": str(self.group_id) if self.group_id else None,
            "prep_id": str(self.prep_id) if self.prep_id else None,
            "aud_id": str(self.aud_id) if self.aud_id else None,
            "type": self.type
        }


# ----------------- DataStore -----------------
class DataStore:
    def __init__(self):
        self.db: Session = SessionLocal()

    # ---------- Groups ----------
    def list_groups(self) -> List[Dict[str, Any]]:
        return [g.to_dict() for g in self.db.query(Group).order_by(Group.name).all()]

    def create_group(self, name: str) -> Dict[str, Any]:
        g = Group(name=name)
        self.db.add(g)
        self.db.commit()
        self.db.refresh(g)
        return g.to_dict()

    def update_group(self, id_group: int, name: Optional[str]) -> Optional[Dict[str, Any]]:
        g = self.db.get(Group, id_group)
        if g and name:
            g.name = name
            self.db.commit()
            self.db.refresh(g)
            return g.to_dict()
        return None

    def delete_group(self, id_group: int) -> bool:
        g = self.db.get(Group, id_group)
        if not g:
            return False
        for it in g.itogs:
            it.group_id = None
        self.db.delete(g)
        self.db.commit()
        return True

    # ---------- Objects ----------
    def list_objects(self) -> List[Dict[str, Any]]:
        return [o.to_dict() for o in self.db.query(Object).order_by(Object.name).all()]

    def create_object(self, name: str) -> Dict[str, Any]:
        o = Object(name=name)
        self.db.add(o)
        self.db.commit()
        self.db.refresh(o)
        return o.to_dict()

    def update_object(self, id_obj: int, name: Optional[str]) -> Optional[Dict[str, Any]]:
        o = self.db.get(Object, id_obj)
        if o and name:
            o.name = name
            self.db.commit()
            self.db.refresh(o)
            return o.to_dict()
        return None

    def delete_object(self, id_obj: int) -> bool:
        o = self.db.get(Object, id_obj)
        if not o:
            return False
        for it in o.itogs:
            it.object_id = None
        self.db.delete(o)
        self.db.commit()
        return True

    # ---------- Prepodavateli ----------
    def list_preps(self) -> List[Dict[str, Any]]:
        return [p.to_dict() for p in self.db.query(Prepod).order_by(Prepod.fio).all()]

    def create_prep(self, fio: str) -> Dict[str, Any]:
        p = Prepod(fio=fio)
        self.db.add(p)
        self.db.commit()
        self.db.refresh(p)
        return p.to_dict()

    def update_prep(self, id_prep: int, fio: Optional[str]) -> Optional[Dict[str, Any]]:
        p = self.db.get(Prepod, id_prep)
        if p and fio:
            p.fio = fio
            self.db.commit()
            self.db.refresh(p)
            return p.to_dict()
        return None

    def delete_prep(self, id_prep: int) -> bool:
        p = self.db.get(Prepod, id_prep)
        if not p:
            return False
        for it in p.itogs:
            it.prep_id = None
        self.db.delete(p)
        self.db.commit()
        return True

    # ---------- Auditorii ----------
    def list_aud(self) -> List[Dict[str, Any]]:
        return [a.to_dict() for a in self.db.query(Aud).order_by(Aud.number).all()]

    def create_aud(self, number: str) -> Dict[str, Any]:
        a = Aud(number=number)
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a.to_dict()

    def update_aud(self, id_au: int, number: Optional[str]) -> Optional[Dict[str, Any]]:
        a = self.db.get(Aud, id_au)
        if a and number:
            a.number = number
            self.db.commit()
            self.db.refresh(a)
            return a.to_dict()
        return None

    def delete_aud(self, id_au: int) -> bool:
        a = self.db.get(Aud, id_au)
        if not a:
            return False
        for it in a.itogs:
            it.aud_id = None
        self.db.delete(a)
        self.db.commit()
        return True

    # ---------- Itog ----------
    def list_itog(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        query = self.db.query(Itog)
        if filters:
            if filters.get("date_from"):
                query = query.filter(Itog.date >= filters["date_from"])
            if filters.get("date_to"):
                query = query.filter(Itog.date <= filters["date_to"])
            if filters.get("group_id"):
                query = query.filter(Itog.group_id == int(filters["group_id"]))
            if filters.get("prep_id"):
                query = query.filter(Itog.prep_id == int(filters["prep_id"]))
            if filters.get("aud_id"):
                query = query.filter(Itog.aud_id == int(filters["aud_id"]))
            if filters.get("object_id"):
                query = query.filter(Itog.object_id == int(filters["object_id"]))
            if filters.get("type"):
                query = query.filter(Itog.type == filters["type"])
        query = query.order_by(Itog.date.asc().nullslast(), Itog.time.asc().nullslast())
        return [it.to_dict() for it in query.all()]

    def create_itog(
        self,
        data_val: Optional[str],
        time_val: Optional[str],
        id_obj_fk: Optional[int],
        id_group_fk: Optional[int],
        id_prep_fk: Optional[int],
        id_au_fk: Optional[int],
        type_val: Optional[str]
    ) -> Dict[str, Any]:
        it = Itog(
            date=data_val,
            time=time_val,
            object_id=id_obj_fk,
            group_id=id_group_fk,
            prep_id=id_prep_fk,
            aud_id=id_au_fk,
            type=type_val
        )
        self.db.add(it)
        self.db.commit()
        self.db.refresh(it)
        return it.to_dict()

    def update_itog(self, id_itog: int, **kwargs) -> Optional[Dict[str, Any]]:
        it = self.db.get(Itog, id_itog)
        if not it:
            return None
        for key in ["date", "time", "object_id", "group_id", "prep_id", "aud_id", "type"]:
            if key in kwargs and kwargs[key] is not None:
                setattr(it, key, kwargs[key])
        self.db.commit()
        self.db.refresh(it)
        return it.to_dict()

    def delete_itog(self, id_itog: int) -> bool:
        it = self.db.get(Itog, id_itog)
        if not it:
            return False
        self.db.delete(it)
        self.db.commit()
        return True


# ----------------- singleton -----------------
store = DataStore()

# Создать таблицы, если их нет
Base.metadata.create_all(engine)
