from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from codesys_doc_tracker.models.user_model import User

from flask_jwt_extended import jwt_required, get_jwt_identity


apiUsers = Blueprint('apiUser', __name__, url_prefix='/api/users')


# ADD USER
@apiUsers.route("/addUser", methods=["POST"])
def addUser():
    try:
        data = request.form
        required_fields = ["username", "password"]
        if not all(field in data for field in required_fields):
            return jsonify({"success": False, "message": "Missing required fields"})

        user = User.add_user(
            username=data["username"],
            password=data["password"],
            role=data.get("role", "user")
        )

        return jsonify({"success": True, "message": "User added", "user": {"id": user.id}})
    except Exception as e:
        import traceback
        traceback.print_exc()  # Tüm stack trace'i gösterir
        return jsonify({"success": False, "message": f"There was an error creating the user: {str(e)}"})


# GET ALL USERS
@apiUsers.route("/", methods=["GET"])
def users():
    try:
        all_users = User.get_all()
        users = []

        for user in all_users:
            users.append({
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "created_at": user.created_at
            })

        return jsonify({"success": True, "data": users, "count": len(users)})
    except Exception as e:
        print("ERROR in users():", e)
        return jsonify({"success": False, "message": "There was an error retrieving users"})

#Login olduktan sonra oturum başlatılır----------------------------------------------------------------------
@apiUsers.route("/me", methods=["GET"])
@jwt_required()
def current_user_info():
    current_user = get_jwt_identity()
    return jsonify({"message": f"Welcome, {current_user}!"})

# GET, DELETE, PUT USER BY USERNAME
@apiUsers.route("/<string:username>", methods=["GET", "PUT", "DELETE"])
def user_by_username(username):
    try:
        user = User.get_user_by_username(username)
        if user is None:
            return jsonify({"success": False, "message": "User not found"})

        if request.method == "GET":
            user_data = {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "created_at": user.created_at
            }
            return jsonify({"success": True, "data": user_data})
        
        elif request.method == "PUT":
            updates = {
                "role": request.form.get("role")
            }

            password = request.form.get("password")
            if password:
                updates["password"] = password  # Hash işlemi update_user içinde yapılacak

            User.update_user(user.id, **updates)
            return jsonify({"success": True, "message": f"User '{username}' updated successfully"})


    

        elif request.method == "DELETE":
            password = request.form.get("password")
            if not password:
                return jsonify({"success": False, "message": "Password is required to delete user"})

            from werkzeug.security import check_password_hash
            if not check_password_hash(user.password, password):
                return jsonify({"success": False, "message": "Invalid password"})

            deleted = User.delete_user(user.id)
            if deleted:
                return jsonify({"success": True, "message": f"User '{username}' deleted permanently"})
            else:
                return jsonify({"success": False, "message": "User could not be deleted"})


    except Exception as e:
        print("ERROR in user_by_username:", e)
        return jsonify({"success": False, "message": "There was an error processing the request"})




