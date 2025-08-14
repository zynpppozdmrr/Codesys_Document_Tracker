# backend/app/models/glossary_model.py
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy import Index, UniqueConstraint
from codesys_doc_tracker import db  # Projedeki mevcut pattern'e uygun

class Glossary(db.Model):
    __tablename__ = "glossary"

    id = db.Column(db.Integer, primary_key=True)

    # Proje Kısa Adı
    code = db.Column(db.String(64), nullable=False)

    # Açıklama
    desc = db.Column(db.Text, nullable=True)

    # Tip Kodu
    type_code = db.Column(db.String(16), nullable=False, index=True)

    # Proje Sıra No (opsiyonel)
    order_no = db.Column(db.Integer, nullable=True)

    # Kod/No
    project_no = db.Column(db.String(32), nullable=False)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Aynı kısa ad + Kod/No kombinasyonunun tekrarını engelle
    __table_args__ = (
        UniqueConstraint("code", "project_no", name="uq_glossary_code_no"),
        Index("ix_glossary_code", "code"),
        Index("ix_glossary_project_no", "project_no"),
    )

    # ---------- Serileştirme ----------
    def to_dict(self) -> dict:
        """
        Frontend ile bire bir uyumlu anahtarlar döner:
        code, desc, type, order, no
        """
        return {
            "id": self.id,
            "code": self.code,
            "desc": self.desc or "",
            "type": self.type_code,
            "order": self.order_no,
            "no": self.project_no,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    # ---------- CRUD Classmethod'lar ----------
    @classmethod
    def create(
        cls,
        *,
        code: str,
        desc: Optional[str],
        type_code: str,
        order_no: Optional[int],
        project_no: str,
    ) -> "Glossary":
        item = cls(
            code=(code or "").strip(),
            desc=(desc or "").strip() if desc else None,
            type_code=(type_code or "").strip(),
            order_no=order_no,
            project_no=(project_no or "").strip(),
        )
        db.session.add(item)
        db.session.commit()
        return item

    @classmethod
    def get_by_id(cls, gid: int) -> Optional["Glossary"]:
        return cls.query.get(gid)

    @classmethod
    def update_item(
        cls,
        gid: int,
        *,
        code: Optional[str] = None,
        desc: Optional[str] = None,
        type_code: Optional[str] = None,
        order_no: Optional[Optional[int]] = None,
        project_no: Optional[str] = None,
    ) -> Optional["Glossary"]:
        item = cls.query.get(gid)
        if not item:
            return None

        if code is not None:
            item.code = code.strip()
        if desc is not None:
            item.desc = desc.strip() if desc else None
        if type_code is not None:
            item.type_code = type_code.strip()
        if order_no is not None:
            # order_no None gelebilir -> nullable
            item.order_no = order_no
        if project_no is not None:
            item.project_no = project_no.strip()

        db.session.commit()
        return item

    @classmethod
    def delete_item(cls, gid: int) -> bool:
        item = cls.query.get(gid)
        if not item:
            return False
        db.session.delete(item)
        db.session.commit()
        return True

    @classmethod
    def search(
        cls,
        *,
        q: Optional[str] = None,
        type_code: Optional[str] = None,
        sort: str = "created_at",
        direction: str = "desc",
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List["Glossary"], int]:
        """
        Basit arama + filtreleme + sıralama + pagination
        """
        query = cls.query

        if q:
            s = f"%{q.strip().lower()}%"
            # code, desc, type_code, order_no, project_no alanlarında arama
            from sqlalchemy import or_, cast, String
            query = query.filter(
                or_(
                    db.func.lower(cls.code).like(s),
                    db.func.lower(cls.desc).like(s),
                    db.func.lower(cls.type_code).like(s),
                    cast(cls.order_no, String).like(s),
                    db.func.lower(cls.project_no).like(s),
                )
            )

        if type_code and type_code.lower() != "all":
            query = query.filter(cls.type_code == type_code)

        # Sıralama
        sort_map = {
            "created_at": cls.created_at,
            "updated_at": cls.updated_at,
            "code": cls.code,
            "type": cls.type_code,
            "order": cls.order_no,
            "no": cls.project_no,
        }
        col = sort_map.get(sort, cls.created_at)
        col = col.desc() if direction.lower() == "desc" else col.asc()

        total = query.count()
        rows = query.order_by(col).offset(max(0, offset)).limit(max(1, min(limit, 500))).all()
        return rows, total

    def __repr__(self) -> str:
        return f"<Glossary {self.code}#{self.project_no}>"
