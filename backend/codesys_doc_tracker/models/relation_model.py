from datetime import datetime
from dataclasses import dataclass
from codesys_doc_tracker import db

@dataclass
class Relation(db.Model):
    __tablename__ = "relations"

    id: int
    diff_id: int
    relation_type: str
    relation_value: str
    created_at: datetime

    id = db.Column(db.Integer, primary_key=True)
    diff_id = db.Column(db.Integer, db.ForeignKey("diffs.id"), nullable=False, index=True)
    relation_type = db.Column(db.String(120), nullable=False)       # ör: "SRS", "Jira", "Doc", "Req"
    relation_value = db.Column(db.String(255), nullable=False)      # ör: "SRS-39"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Kolay erişim için ilişki
    diff = db.relationship("Diff", backref="relations", lazy=True)

    # ----- Class methods -----
    @classmethod
    def create(cls, diff_id: int, relation_type: str, relation_value: str) -> "Relation":
        r = cls(
            diff_id=diff_id,
            relation_type=(relation_type or "").strip(),
            relation_value=(relation_value or "").strip(),
        )
        db.session.add(r)
        db.session.commit()
        return r

    @classmethod
    def list_all(cls, diff_id: int | None = None):
        q = cls.query
        if diff_id:
            q = q.filter_by(diff_id=diff_id)
        return q.order_by(cls.created_at.desc()).all()

    @classmethod
    def get_by_id(cls, rel_id: int) -> "Relation | None":
        return cls.query.get(rel_id)

    @classmethod
    def update_relation(
        cls, rel_id: int, *, relation_type: str | None = None, relation_value: str | None = None
    ) -> "Relation | None":
        r = cls.query.get(rel_id)
        if not r:
            return None
        if relation_type is not None and relation_type.strip():
            r.relation_type = relation_type.strip()
        if relation_value is not None and relation_value.strip():
            r.relation_value = relation_value.strip()
        db.session.commit()
        return r

    @classmethod
    def delete_relation(cls, rel_id: int) -> bool:
        r = cls.query.get(rel_id)
        if not r:
            return False
        db.session.delete(r)
        db.session.commit()
        return True
