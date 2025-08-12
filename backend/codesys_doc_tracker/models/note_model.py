import os
from datetime import datetime
from codesys_doc_tracker import db

class Note(db.Model):
    __tablename__ = "notes"

    id = db.Column(db.Integer, primary_key=True)
    diff_id = db.Column(db.Integer, db.ForeignKey("diffs.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)

    # Senin mevcut dosyanda zaman alanı "created_at" olarak geçiyor
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ---- İlişkiler ----
    # Notu yazan kullanıcı (self.user.username için gerekli)
    user = db.relationship("User", backref=db.backref("notes", lazy=True))

    # Diff ilişkisi (isteğe bağlı, aşağıdaki XMLFile ilişkisi için de kullanılıyor)
    diff = db.relationship("Diff", backref=db.backref("notes", lazy=True))

    # XMLFile'ı diff üzerinden görüntülemek: Note -> Diff(xmlfile_new_id) -> XMLFile
    # viewonly=True: bu ilişki sadece okumalık (Note tablosunda xmlfile_id sütunu yok)
    xmlfile = db.relationship(
        "XMLFile",
        secondary="diffs",
        primaryjoin="Note.diff_id==Diff.id",
        secondaryjoin="Diff.xmlfile_new_id==XMLFile.id",
        viewonly=True,
        lazy=True,
    )

    # İlişkiler (Relation) — notun ilişki kayıtları (varsa)
    relations = db.relationship("Relation", backref="note", lazy=True, cascade="all, delete-orphan")

    # Görünürlük kayıtları (NoteVisibility) — notu kimler görebilir
    visibilities = db.relationship("NoteVisibility", backref="note", lazy=True, cascade="all, delete-orphan")

    # ---- Yardımcı metotlar (notes.py bunları çağırıyor) ----
    @classmethod
    def create(cls, **kwargs):
        note = cls(**kwargs)
        db.session.add(note)
        db.session.commit()
        return note
    @classmethod
    def get_by_id(cls, note_id):
        try:
            return cls.query.get(int(note_id))
        except Exception:
            return None
    @classmethod
    def update_note(cls, note_id, **kwargs):
        note = cls.query.get(note_id)
        if not note:
            return None
        # Şimdilik sadece content güncelliyoruz (ihtiyaca göre genişletilebilir)
        if "content" in kwargs:
            note.content = kwargs["content"]
        db.session.commit()
        return note

    @classmethod
    def delete_note(cls, note_id):
        note = cls.query.get(note_id)
        if not note:
            return False
        db.session.delete(note)
        db.session.commit()
        return True

    def to_dict(self):
        # username güvenli erişim
        username = self.user.username if getattr(self, "user", None) else None

        # xmlfile_name: diff üzerinden bağlı ilk XMLFile'ın dosya adı
        xmlfile_name = None
        try:
            if self.xmlfile:
                # relationship list/collection olabilir; ilkini baz al
                xf = self.xmlfile[0] if isinstance(self.xmlfile, (list, tuple)) else self.xmlfile
                if getattr(xf, "file_path", None):
                    xmlfile_name = os.path.basename(xf.file_path)
        except Exception:
            xmlfile_name = None

        # relations güvenli listesi
        rel_list = []
        try:
            rel_list = [rel.to_dict() for rel in (self.relations or [])]
        except Exception:
            rel_list = []

        # görünür kullanıcı adları (NoteVisibility.user ilişkisinden)
        visible_usernames = []
        try:
            visible_usernames = [
                v.user.username for v in (self.visibilities or []) if getattr(v, "user", None)
            ]
        except Exception:
            visible_usernames = []

        return {
            "id": self.id,
            "diff_id": self.diff_id,
            "user_id": self.user_id,
            "username": username,
            "content": self.content,
            "created_at": (self.created_at.isoformat() if self.created_at else None),
            "xmlfile_name": xmlfile_name,
            "relations": rel_list,
            "visible_usernames": visible_usernames,
        }

    def __repr__(self):
        return f"<Note {self.id} - Diff {self.diff_id}>"
