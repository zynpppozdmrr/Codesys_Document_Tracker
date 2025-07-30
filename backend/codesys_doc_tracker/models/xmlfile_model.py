from datetime import datetime
from codesys_doc_tracker import db

class XMLFile(db.Model):
    __tablename__ = 'xmlfiles'

    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String(500), nullable=False, unique=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

