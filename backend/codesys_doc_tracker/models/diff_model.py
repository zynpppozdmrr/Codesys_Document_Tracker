from datetime import datetime
from codesys_doc_tracker import db

class Diff(db.Model):
    __tablename__ = "diffs"

    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign Key tanımları
    xmlfile_old_id = db.Column(db.Integer, db.ForeignKey("xmlfiles.id"), nullable=False)
    xmlfile_new_id = db.Column(db.Integer, db.ForeignKey("xmlfiles.id"), nullable=False)

    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

    # İlişki tanımları (Opsiyonel ama okunurluk için iyi olur)
    old_file = db.relationship("XMLFile", foreign_keys=[xmlfile_old_id], backref="old_diffs")
    new_file = db.relationship("XMLFile", foreign_keys=[xmlfile_new_id], backref="new_diffs")
