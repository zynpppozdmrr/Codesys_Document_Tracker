from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from codesys_doc_tracker.models.user_model import User

from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import functools

apiUsers = Blueprint('apiUser', __name__, url_prefix='/api/users')


# Yardımcı fonksiyon: Kullanıcının rolünü kontrol et
def admin_required():
    def wrapper(fn):
        @functools.wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            if claims["role"] != "admin":
                return jsonify({"msg": "Admin yetkisi gerekli!"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper


# Yeni Admin Başlatma Endpoint'i (SADECE HİÇ ADMIN YOKKEN ÇALIŞIR)
@apiUsers.route("/init-admin", methods=["POST"])
def init_admin():
    try:
        if User.query.filter_by(role='admin').count() > 0:
            return jsonify({"success": False, "message": "Sistemde zaten bir yönetici mevcut."}), 403

        data = request.form
        required_fields = ["username", "password"]
        if not all(field in data for field in required_fields):
            return jsonify({"success": False, "message": "Kullanıcı adı ve şifre zorunludur."}), 400

        existing_user = User.get_user_by_username(data["username"])
        if existing_user:
            return jsonify({"success": False, "message": "Bu kullanıcı adı zaten mevcut."}), 409

        user = User.add_user(
            username=data["username"],
            password=data["password"],
            role='admin' # Rolü doğrudan 'admin' olarak set ediyoruz
        )
        
        return jsonify({"success": True, "message": f"'{user.username}' admin olarak eklendi.", "user": {"id": user.id, "username": user.username, "role": user.role}}), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Yönetici oluşturulurken bir hata oluştu: {str(e)}"}), 500


# ADD USER (SADECE ADMINLER KULLANABİLİR)
@apiUsers.route("/addUser", methods=["POST"])
@admin_required()
def addUser():
    try:
        data = request.form
        required_fields = ["username", "password"]
        if not all(field in data for field in required_fields):
            return jsonify({"success": False, "message": "Kullanıcı adı ve şifre zorunludur."}), 400

        existing_user = User.get_user_by_username(data["username"])
        if existing_user:
            return jsonify({"success": False, "message": "Bu kullanıcı adı zaten mevcut."}), 409

        user = User.add_user(
            username=data["username"],
            password=data["password"],
            role=data.get("role", "user")
        )

        return jsonify({"success": True, "message": "Kullanıcı eklendi.", "user": {"id": user.id, "username": user.username, "role": user.role}}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Kullanıcı oluşturulurken bir hata oluştu: {str(e)}"}), 500


# GET ALL USERS (SADECE ADMINLER KULLANABİLİR)
@apiUsers.route("/", methods=["GET"])
@admin_required()
def users():
    try:
        all_users = User.get_all()
        users = []

        for user in all_users:
            users.append({
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "created_at": user.created_at.isoformat()
            })

        return jsonify({"success": True, "data": users, "count": len(users)}), 200
    except Exception as e:
        print("ERROR in users():", e)
        return jsonify({"success": False, "message": "Kullanıcılar getirilirken bir hata oluştu."}), 500


@apiUsers.route("/me", methods=["GET"])
@jwt_required()
def current_user_info():
    current_user_identity = get_jwt_identity()
    user = User.get_user_by_username(current_user_identity)
    if not user:
        return jsonify({"message": "Kullanıcı bulunamadı!"}), 404
    return jsonify({"username": user.username, "role": user.role}), 200


# GET, DELETE, PUT USER BY USERNAME (SADECE ADMINLER KULLANABİLİR)
@apiUsers.route("/<string:username>", methods=["GET", "PUT", "DELETE"])
@admin_required()
def user_by_username(username):
    try:
        user = User.get_user_by_username(username)
        if user is None:
            return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

        if request.method == "GET":
            user_data = {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "created_at": user.created_at.isoformat()
            }
            return jsonify({"success": True, "data": user_data}), 200
        
        elif request.method == "PUT":
            data = request.form
            updates = {}
            
            if "role" in data and data["role"]:
                updates["role"] = data["role"]

            if "password" in data and data["password"]:
                updates["password"] = data["password"]

            if not updates:
                return jsonify({"success": False, "message": "Güncellenecek veri bulunamadı."}), 400

            User.update_user(user.id, **updates)
            return jsonify({"success": True, "message": f"'{username}' kullanıcısı başarıyla güncellendi."}), 200

        elif request.method == "DELETE":
            data = request.form
            password = data.get("password")

            if not password:
                return jsonify({"success": False, "message": "Kullanıcıyı silmek için şifre zorunludur."}), 400

            if not check_password_hash(user.password, password):
                return jsonify({"success": False, "message": "Geçersiz şifre."}), 401

            deleted = User.delete_user(user.id)
            if deleted:
                return jsonify({"success": True, "message": f"'{username}' kullanıcısı kalıcı olarak silindi."}), 200
            else:
                return jsonify({"success": False, "message": "Kullanıcı silinemedi."}), 500

    except Exception as e:
        print("ERROR in user_by_username:", e)
        return jsonify({"success": False, "message": "İstek işlenirken bir hata oluştu."}), 500
