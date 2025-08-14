from datetime import datetime
from dataclasses import dataclass
from werkzeug.security import generate_password_hash
from codesys_doc_tracker import db

@dataclass
class User(db.Model):
    __tablename__ = 'users'

    id: int
    username: str
    password: str
    role: str
    created_at: datetime

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(512), nullable=False)  # hashed
    role = db.Column(db.String(50), nullable=True, default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @classmethod
    def add_user(cls, username, password, role="user"):
        hashed_password = generate_password_hash(password)

        # Eğer hiç kullanıcı yoksa, ilk kullanıcı admin olsun (mevcut iş kuralına uyum)
        if cls.query.count() == 0:
            role = 'admin'

        new_user = cls(
            username=username,
            password=hashed_password,
            role=role,
            created_at=datetime.utcnow()
        )
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @classmethod
    def get_all(cls):
        return cls.query.all()

    @classmethod
    def get_user_by_id(cls, user_id):
        return cls.query.get(user_id)

    @classmethod
    def get_user_by_username(cls, username):
        return cls.query.filter_by(username=username).first()

    @classmethod
    def update_user(cls, user_id, **kwargs):
        user = cls.query.get(user_id)
        if not user:
            return None

        for key, value in kwargs.items():
            if key == "password" and value:
                value = generate_password_hash(value)
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)

        db.session.commit()
        return user

    @classmethod
    def delete_user(cls, user_id):
        user = cls.query.get(user_id)
        if not user:
            return False
        db.session.delete(user)
        db.session.commit()
        return True
