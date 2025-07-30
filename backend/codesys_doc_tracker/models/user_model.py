from datetime import datetime
from codesys_doc_tracker import db
from dataclasses import dataclass
from werkzeug.security import generate_password_hash


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
    password = db.Column(db.String(512), nullable=False) # hashed password
    role = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @classmethod
    def add_user(cls, username, password, role="user"):
        hashed_password = generate_password_hash(password)


         # Veritabanında hiç kullanıcı var mı diye kontrol et
        if cls.query.count() == 0:
            # Eğer hiç kullanıcı yoksa, bu ilk kullanıcıdır, rolünü 'admin' yap.
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
    def delete_user(cls, user_id):
        user = cls.query.get(user_id)
        if user:
            db.session.delete(user)  # kullanıcıyı kalıcı olarak sil
            db.session.commit()
            return True
        return False
   



    @classmethod
    def get_user_by_username(cls, username):
        return cls.query.filter_by(username=username).first()
    

    @classmethod
    def update_user(cls, user_id, **kwargs):
        user = cls.query.get(user_id)
        if user:
            for key, value in kwargs.items():
                # Şifre hash'leme işlemi
                if key == "password" and value:
                    from werkzeug.security import generate_password_hash
                    value = generate_password_hash(value)

                # Yalnızca mevcut attribute'lar ve boş olmayan veriler güncellenir
                if hasattr(user, key) and value is not None:
                    setattr(user, key, value)

            db.session.commit()
            return user
