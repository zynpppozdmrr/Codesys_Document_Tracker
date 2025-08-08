from datetime import datetime
import os
from codesys_doc_tracker import db


class ExcelFile(db.Model):
    __tablename__ = 'excelfiles'

    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String(500), unique=True, nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<ExcelFile {os.path.basename(self.file_path)}>'

    @classmethod
    def create(cls, file_path: str):
        new_file = cls(file_path=file_path)
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
    def delete_by_id(cls, file_id: int) -> bool:
        row = cls.query.get(file_id)
        if not row:
            return False

        # Dosyayı diskten sil
        try:
            abs_path = os.path.normpath(row.file_path)
            if os.path.exists(abs_path):
                os.remove(abs_path)
        except Exception as e:
            print(f"Excel dosyası silinemedi: {row.file_path} - {e}")
        
        db.session.delete(row)
        db.session.commit()
        return True
    
    @classmethod
    def delete_missing_files(cls, valid_paths: set, base_name: str) -> int:
        removed = 0
        for row in cls.query.all():
            row_path = os.path.normpath(row.file_path).replace("\\", "/")
            if not row_path.startswith(base_name + "/"):
                continue
            if row_path not in valid_paths:
                db.session.delete(row)
                removed += 1
        db.session.commit()
        return removed