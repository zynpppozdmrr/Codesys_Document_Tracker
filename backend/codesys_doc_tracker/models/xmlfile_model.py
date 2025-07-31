# codesys_doc_tracker/models/xmlfile_model.py

from datetime import datetime
import os
from codesys_doc_tracker import db


class XMLFile(db.Model):
    __tablename__ = 'xmlfiles'

    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String(500), unique=True, nullable=False)
    # version = db.Column(db.String(50)) # <-- BU SATIRI SİLİNDİ!
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<XMLFile {os.path.basename(self.file_path)}>'

    @classmethod
    def create(cls, file_path: str): # version parametresi kaldırıldı
        new_file = cls(file_path=file_path) # version ataması kaldırıldı
        db.session.add(new_file)
        db.session.commit()
        return new_file

    @classmethod
    def get_by_path(cls, file_path: str):
        return cls.query.filter_by(file_path=file_path).first()

    @classmethod
    def list_all(cls):
        return cls.query.order_by(cls.upload_date.desc()).all()

    @classmethod
    def update_file(cls, file_id: int, new_path: str = None): # new_version parametresi kaldırıldı
        file = cls.query.get(file_id)
        if not file:
            return None
        if new_path:
            file.file_path = new_path
        # if new_version: # <-- BU KISIM SİLİNDİ
        #     file.version = new_version
        db.session.commit()
        return file

    @classmethod
    def delete_file(cls, file_id: int):
        file = cls.query.get(file_id)
        if not file:
            return False
        db.session.delete(file)
        db.session.commit()
        return True