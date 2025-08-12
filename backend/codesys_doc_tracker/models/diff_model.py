# codesys_doc_tracker/models/diff_model.py
from datetime import datetime
from codesys_doc_tracker import db
import os
from codesys_doc_tracker.models.note_model import Note

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

        # 1. Diff'e bağlı notlar var mı? Varsa silme, 409 sebebiyle mesaj dön.
        has_notes = db.session.query(Note.id).filter_by(diff_id=diff_id).first() is not None
        if has_notes:
            return False, "Bu Diff raporuna bağlı notlar ve ilişkiler mevcut, silinemez."

        # 2. Diff raporu dosyasını sil (eğer varsa)
        try:
            if diff.diffReport_path and os.path.exists(diff.diffReport_path):
                os.remove(diff.diffReport_path)
        except Exception as e:
            # Dosya silinemese bile DB kaydını silmeyi deneyebiliriz
            print("Diff rapor dosyası silinemedi:", e)

        # 3. Diff kaydını veritabanından sil
        try:
            db.session.delete(diff)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, f"Veritabanından silinirken hata oluştu: {e}"

    @classmethod
    def resync_reports(cls):
        """
        Diskte olmayan diff kayıtlarını DB'den temizler.
        NOT: Diff'e bağlı not varsa SİLMEZ, atlar (skip).
        Sonuç: {"removed": X, "skipped": Y}
        """
        removed = 0
        skipped = 0

        for d in cls.query.all():
            if os.path.exists(d.diffReport_path):
                continue  # dosya duruyor, dokunma

            # Bağlı not var mı?
            has_notes = db.session.query(Note.id).filter_by(diff_id=d.id).first() is not None
            if has_notes:
                # NOT NULL ihlali yaşamamak için silme, atla
                skipped += 1
                continue

            # Güvenle sil
            db.session.delete(d)
            removed += 1

        if removed or skipped:
            db.session.commit()

        return {"removed": removed, "skipped": skipped}
