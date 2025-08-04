# codesys_doc_tracker/models/note_model.py
from datetime import datetime
from dataclasses import dataclass
from codesys_doc_tracker import db
from codesys_doc_tracker.models.relation_model import Relation

@dataclass
class Note(db.Model):
    __tablename__ = "notes"

    id: int
    user_id: int
    diff_id: int
    xmlfile_id: int
    content: str
    timestamp: datetime

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    diff_id = db.Column(db.Integer, db.ForeignKey("diffs.id"), nullable=False, index=True)
    xmlfile_id = db.Column(db.Integer, db.ForeignKey("xmlfiles.id"), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="notes", lazy=True)
    diff = db.relationship("Diff", backref="notes", lazy=True)
    xmlfile = db.relationship("XMLFile", backref="notes", lazy=True)

    # ✅ EKLENDİ: Notun ilişkileri
    relations = db.relationship("Relation", backref="note", lazy=True, cascade="all, delete-orphan")

    # ✅ EKLENDİ: JSON'a dönüştürmek için
    def to_dict(self):
        import os
        return {
            "id": self.id,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "username": self.user.username if self.user else None,
            "xmlfile_name": os.path.basename(self.xmlfile.file_path) if self.xmlfile and self.xmlfile.file_path else None,
            "relations": [r.to_dict() for r in self.relations]
        }

    @classmethod
    def create(cls, user_id: int, diff_id: int, xmlfile_id: int, content: str) -> "Note":
        note = cls(
            user_id=user_id,
            diff_id=diff_id,
            xmlfile_id=xmlfile_id,
            content=content.strip()
        )
        db.session.add(note)
        db.session.commit()
        return note

    @classmethod
    def get_by_id(cls, note_id: int) -> "Note | None":
        return cls.query.get(note_id)

    @classmethod
    def list_all(cls, diff_id: int | None = None):
        q = cls.query
        if diff_id:
            q = q.filter_by(diff_id=diff_id)
        return q.order_by(cls.timestamp.desc()).all()

    @classmethod
    def update_note(cls, note_id: int, *, content: str | None = None) -> "Note | None":
        note = cls.query.get(note_id)
        if not note:
            return None
        if content is not None:
            content = content.strip()
            if content:
                note.content = content
        db.session.commit()
        return note

    @classmethod
    def delete_note(cls, note_id: int) -> bool:
        note = cls.query.get(note_id)
        if not note:
            return False
        db.session.delete(note)
        db.session.commit()
        return True
