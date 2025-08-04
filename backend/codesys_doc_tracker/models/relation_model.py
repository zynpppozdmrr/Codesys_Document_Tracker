from datetime import datetime
from dataclasses import dataclass
from codesys_doc_tracker import db

@dataclass
class Relation(db.Model):
    __tablename__ = "relations"

    id: int
    note_id: int
    relation_type: str
    relation_value: str
    created_at: datetime

    id = db.Column(db.Integer, primary_key=True)
    note_id = db.Column(db.Integer, db.ForeignKey("notes.id"), nullable=False, index=True)
    relation_type = db.Column(db.String(100), nullable=False)
    relation_value = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @classmethod
    def create(cls, note_id: int, relation_type: str, relation_value: str) -> "Relation":
        new_relation = cls(
            note_id=note_id,
            relation_type=relation_type.strip(),
            relation_value=relation_value.strip()
        )
        db.session.add(new_relation)
        db.session.commit()
        return new_relation

    @classmethod
    def list_by_note_id(cls, note_id: int):
        return cls.query.filter_by(note_id=note_id).order_by(cls.created_at.desc()).all()

    @classmethod
    def delete_by_id(cls, relation_id: int) -> bool:
        relation = cls.query.get(relation_id)
        if not relation:
            return False
        db.session.delete(relation)
        db.session.commit()
        return True

    def to_dict(self):
        return {
            "id": self.id,
            "relation_type": self.relation_type,
            "relation_value": self.relation_value,
            "created_at": self.created_at.isoformat()
        }
