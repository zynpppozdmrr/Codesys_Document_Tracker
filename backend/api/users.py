from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import functools

from codesys_doc_tracker import db
from codesys_doc_tracker.models.user_model import User
from codesys_doc_tracker.models.note_model import Note
from codesys_doc_tracker.models.note_visibility_model import NoteVisibility
from sqlalchemy.exc import IntegrityError

apiUsers = Blueprint('apiUser', __name__, url_prefix='/api/users')


# Yardımcı: admin rolü zorunluluğu
def admin_required():
    def wrapper(fn):
        @functools.wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt() or {}
            if claims.get("role") != "admin":
                return jsonify({"success": False, "message": "Admin yetkisi gerekli!"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper


@apiUsers.route("/init-admin", methods=["POST"])
def init_admin():
    try:
        if User.query.filter_by(role='admin').count() > 0:
            return jsonify({"success": False, "message": "Sistemde zaten bir yönetici mevcut."}), 403

        data = request.form
        if not data.get("username") or not data.get("password"):
            return jsonify({"success": False, "message": "Kullanıcı adı ve şifre zorunludur."}), 400

        if User.get_user_by_username(data["username"]):
            return jsonify({"success": False, "message": "Bu kullanıcı adı zaten mevcut."}), 409

        user = User.add_user(username=data["username"], password=data["password"], role='admin')
        return jsonify({
            "success": True,
            "message": f"'{user.username}' admin olarak eklendi.",
            "user": {"id": user.id, "username": user.username, "role": user.role}
        }), 201
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": f"Yönetici oluşturulurken bir hata oluştu: {str(e)}"}), 500


@apiUsers.route("/addUser", methods=["POST"])
@admin_required()
def addUser():
    try:
        data = request.form
        if not data.get("username") or not data.get("password"):
            return jsonify({"success": False, "message": "Kullanıcı adı ve şifre zorunludur."}), 400

        if User.get_user_by_username(data["username"]):
            return jsonify({"success": False, "message": "Bu kullanıcı adı zaten mevcut."}), 409

        user = User.add_user(
            username=data["username"],
            password=data["password"],
            role=data.get("role", "user")
        )

        return jsonify({
            "success": True,
            "message": "Kullanıcı eklendi.",
            "user": {"id": user.id, "username": user.username, "role": user.role}
        }), 201
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": f"Kullanıcı oluşturulurken bir hata oluştu: {str(e)}"}), 500


@apiUsers.route("/", methods=["GET"])
@admin_required()
def users():
    try:
        all_users = User.get_all()
        users_out = [{
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in all_users]
        return jsonify({"success": True, "data": users_out, "count": len(users_out)}), 200
    except Exception as e:
        print("ERROR in users():", e)
        return jsonify({"success": False, "message": "Kullanıcılar getirilirken bir hata oluştu."}), 500


@apiUsers.route("/me", methods=["GET"])
@jwt_required()
def current_user_info():
    current_user_identity = get_jwt_identity()
    user = User.get_user_by_username(current_user_identity)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı!"}), 404
    return jsonify({"success": True, "username": user.username, "role": user.role}), 200


@apiUsers.route("/<string:username>", methods=["GET", "PUT", "DELETE"])
@admin_required()
def user_by_username(username):
    try:
        user = User.get_user_by_username(username)
        if user is None:
            return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

        if request.method == "GET":
            data = {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            return jsonify({"success": True, "data": data}), 200

        elif request.method == "PUT":
            data = request.form
            updates = {}
            if data.get("role"):
                updates["role"] = data["role"]
            if data.get("password"):
                updates["password"] = data["password"]

            if not updates:
                return jsonify({"success": False, "message": "Güncellenecek veri bulunamadı."}), 400

            User.update_user(user.id, **updates)
            return jsonify({"success": True, "message": f"'{username}' kullanıcısı başarıyla güncellendi."}), 200

        elif request.method == "DELETE":
            # Frontend "Admin Şifresi" gönderiyor → giriş yapmış admin'in şifresini doğrula
            data = request.form or {}
            admin_password = data.get("password")
            if not admin_password:
                return jsonify({"success": False, "message": "Kullanıcıyı silmek için admin şifresi zorunludur."}), 400

            admin_username = get_jwt_identity()
            admin_user = User.get_user_by_username(admin_username)
            if not admin_user or not check_password_hash(admin_user.password, admin_password):
                return jsonify({"success": False, "message": "Admin şifresi hatalı."}), 401

            # Bu kullanıcı not yazarı mı? ise silme (iş kuralı)
            has_notes = db.session.query(Note.id).filter_by(user_id=user.id).first() is not None
            if has_notes:
                return jsonify({
                    "success": False,
                    "message": "Kullanıcının yazdığı notlar var. Önce notları devret/sil, sonra kullanıcıyı sil."
                }), 409

            try:
                # Kullanıcının tüm görünürlük kayıtlarını (note_visibility) temizle
                NoteVisibility.query.filter_by(user_id=user.id).delete(synchronize_session=False)

                # Kullanıcıyı sil
                db.session.delete(user)
                db.session.commit()
                return jsonify({"success": True, "message": f"'{username}' kullanıcısı kalıcı olarak silindi."}), 200
            except IntegrityError as ie:
                db.session.rollback()
                return jsonify({
                    "success": False,
                    "message": "Kullanıcıya bağlı kayıtlar nedeniyle silinemedi."
                }), 409
            except Exception as e:
                db.session.rollback()
                print("ERROR in user_by_username DELETE:", e)
                return jsonify({"success": False, "message": "Kullanıcı silinirken beklenmeyen bir hata oluştu."}), 500

    except Exception as e:
        print("ERROR in user_by_username:", e)
        return jsonify({"success": False, "message": "İstek işlenirken bir hata oluştu."}), 500
