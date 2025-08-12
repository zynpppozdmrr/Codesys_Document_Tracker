from codesys_doc_tracker import db

class NoteVisibility(db.Model):
    __tablename__ = "note_visibility"

    id = db.Column(db.Integer, primary_key=True)
    note_id = db.Column(db.Integer, db.ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    user = db.relationship("User", backref="note_visibilities", lazy=True)

    @classmethod
    def create(cls, note_id, user_id):
        visibility = cls(note_id=note_id, user_id=user_id)
        db.session.add(visibility)
        db.session.commit()
        return visibility

    @classmethod
    def delete_by_note_and_user(cls, note_id, user_id):
        rec = cls.query.filter_by(note_id=note_id, user_id=user_id).first()
        if rec:
            db.session.delete(rec)
            db.session.commit()
