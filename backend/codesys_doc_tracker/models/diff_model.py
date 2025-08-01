from datetime import datetime
from codesys_doc_tracker import db 
from codesys_doc_tracker.models.xmlfile_model import XMLFile 
import os

class Diff(db.Model):
    __tablename__ = 'diffs'
    id = db.Column(db.Integer, primary_key=True)
    xmlfile_old_id = db.Column(db.Integer, db.ForeignKey('xmlfiles.id'), nullable=False)
    xmlfile_new_id = db.Column(db.Integer, db.ForeignKey('xmlfiles.id'), nullable=False)
    diffReport_name = db.Column(db.String(255), nullable=False) 
    diffReport_path = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    old_file = db.relationship('XMLFile', foreign_keys=[xmlfile_old_id], backref='old_diffs', lazy=True)
    new_file = db.relationship('XMLFile', foreign_keys=[xmlfile_new_id], backref='new_diffs', lazy=True)

    def __repr__(self):
        return f'<Diff {self.id} | {self.diffReport_name}>'

    @classmethod
    def create(cls, old_id: int, new_id: int, diff_name: str, diff_path: str):
        new_diff = cls(
            xmlfile_old_id=old_id,
            xmlfile_new_id=new_id,
            diffReport_name=diff_name,
            diffReport_path=diff_path
        )
        db.session.add(new_diff)
        db.session.commit()
        return new_diff

    @classmethod
    def get_by_id(cls, diff_id: int):
        return cls.query.get(diff_id)

    @classmethod
    def get_by_file_ids(cls, old_id: int, new_id: int):
        return cls.query.filter_by(xmlfile_old_id=old_id, xmlfile_new_id=new_id).first()

    @classmethod
    def delete_by_id(cls, diff_id: int):
        diff = cls.query.get(diff_id)
        if not diff:
            return False, "Kayıt bulunamadı."

        try:
            if os.path.exists(diff.diffReport_path):
                os.remove(diff.diffReport_path)
        except Exception as e:
            print("Dosya silinemedi:", e)

        db.session.delete(diff)
        db.session.commit()
        return True, None

    @classmethod
    def resync_reports(cls):
        removed = 0
        for d in cls.query.all():
            if not os.path.exists(d.diffReport_path):
                db.session.delete(d)
                removed += 1
        if removed:
            db.session.commit()
        return removed
