from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token

from codesys_doc_tracker.models.user_model import User

apiAuth = Blueprint("auth", __name__, url_prefix="/api/auth")


@apiAuth.route("/login", methods=["POST"])
def login():
    data = request.form

    if not data or not data.get("username") or not data.get("password"):
        return jsonify({"success": False, "message": "Username and password required"}), 400

    user = User.get_user_by_username(data["username"])
    if not user or not check_password_hash(user.password, data["password"]):
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    access_token = create_access_token(identity=user.username)
    return jsonify({"success": True, "token": access_token})

