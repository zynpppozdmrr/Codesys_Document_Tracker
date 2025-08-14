# app/models/notification_model.py
import os
from datetime import datetime
from codesys_doc_tracker import db

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)

    # KİME görünecek (alıcı)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # KİM oluşturdu (notu yazan)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # Hangi nota ait
    note_id = db.Column(db.Integer, db.ForeignKey("notes.id"), nullable=False, index=True)

    # Mesaj (önizleme)
    message = db.Column(db.Text, nullable=False)

    is_read = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user  = db.relationship("User", foreign_keys=[user_id])
    actor = db.relationship("User", foreign_keys=[actor_id])
    note  = db.relationship("Note", foreign_keys=[note_id])

    def to_dict(self):
        """Bildirim + bağlamsal bilgiler (dosya adı & versiyon)"""
        xmlfile_name = None
        version_info = None
        diff_id = None

        try:
            if self.note:
                diff_id = getattr(self.note, "diff_id", None)

                # XML dosya adı (Note.to_dict içindeki mantığın hafifletilmişi)
                try:
                    xf = None
                    xmlfile_rel = getattr(self.note, "xmlfile", None)
                    if xmlfile_rel:
                        xf = xmlfile_rel[0] if isinstance(xmlfile_rel, (list, tuple)) else xmlfile_rel
                    fp = getattr(xf, "file_path", None)
                    if fp:
                        xmlfile_name = os.path.basename(fp)
                except Exception:
                    xmlfile_name = None

                # Versiyon bilgisi Diff üzerinden türet
                d = getattr(self.note, "diff", None)
                if d is not None:
                    # from_version → to_version formatı varsa onu kullan
                    fv = getattr(d, "from_version", None)
                    tv = getattr(d, "to_version", None)
                    if fv or tv:
                        version_info = f"{fv or '?'} → {tv or '?'}"
                    else:
                        # yaygın alan adlarını sırayla dene
                        for key in ("version_label", "version", "new_version", "ver", "target_version"):
                            v = getattr(d, key, None)
                            if v:
                                version_info = str(v)
                                break
        except Exception:
            pass

        return {
            "id": self.id,
            "user_id": self.user_id,
            "actor_id": self.actor_id,
            "actor_username": self.actor.username if self.actor else None,
            "note_id": self.note_id,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
            # ➕ bağlam
            "diff_id": diff_id,
            "xmlfile_name": xmlfile_name,
            "version_info": version_info,
        }

    # -------- helpers --------
    @classmethod
    def create(cls, **kwargs):
        obj = cls(**kwargs)
        db.session.add(obj)
        return obj

    @classmethod
    def bulk_create_for_note(cls, note, recipient_user_ids, actor_id):
        """Not oluşturulurken görünür kullanıcıların her birine bildirim üret."""
        content = (note.content or "").strip()
        preview = (content[:120] + "…") if len(content) > 120 else content or "Yeni bir not size görünür yapıldı."
        created = []
        for uid in set(recipient_user_ids or []):
            if uid == actor_id:
                continue
            n = cls(user_id=uid, actor_id=actor_id, note_id=note.id, message=preview)
            db.session.add(n)
            created.append(n)
        return created

    @classmethod
    def list_for_user(cls, user_id, only_unread=False, limit=20, offset=0):
        q = cls.query.filter_by(user_id=user_id)
        if only_unread:
            q = q.filter_by(is_read=False)
        total = q.count()
        rows = q.order_by(cls.created_at.desc()).offset(offset).limit(min(limit, 100)).all()
        return rows, total

    @classmethod
    def mark_read(cls, notif_id, user_id):
        n = cls.query.filter_by(id=notif_id, user_id=user_id).first()
        if not n:
            return None
        n.is_read = True
        db.session.commit()
        return n

    @classmethod
    def mark_all_read(cls, user_id):
        cls.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
        db.session.commit()
