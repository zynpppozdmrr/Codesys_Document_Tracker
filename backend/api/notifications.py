# api/notifications.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from codesys_doc_tracker.models.user_model import User
from codesys_doc_tracker import db

apiNotifications = Blueprint("apiNotifications", __name__, url_prefix="/api/notifications")

@apiNotifications.route("/unread-count", methods=["GET"])
@jwt_required()
def unread_count():
    from codesys_doc_tracker.models.notification_model import Notification
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404
    _, total = Notification.list_for_user(user.id, only_unread=True, limit=1, offset=0)
    return jsonify({"success": True, "count": total}), 200

@apiNotifications.route("/", methods=["GET"])
@jwt_required()
def list_notifications():
    from codesys_doc_tracker.models.notification_model import Notification
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404
    only_unread = (request.args.get("only_unread", "").lower() in ("1", "true"))
    limit  = int(request.args.get("limit", 20))
    offset = int(request.args.get("offset", 0))
    rows, total = Notification.list_for_user(user.id, only_unread=only_unread, limit=limit, offset=offset)
    return jsonify({"success": True, "count": total, "items": [r.to_dict() for r in rows]}), 200

@apiNotifications.route("/<int:notif_id>/read", methods=["PUT"])
@jwt_required()
def mark_read(notif_id):
    from codesys_doc_tracker.models.notification_model import Notification
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404
    n = Notification.mark_read(notif_id, user.id)
    if not n:
        return jsonify({"success": False, "message": "Bildirim bulunamadı."}), 404
    return jsonify({"success": True, "item": n.to_dict()}), 200

# ✅ Tekli silme
@apiNotifications.route("/<int:notif_id>", methods=["DELETE"])
@jwt_required()
def delete_one(notif_id):
    from codesys_doc_tracker.models.notification_model import Notification
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    n = Notification.query.filter_by(id=notif_id, user_id=user.id).first()
    if not n:
        return jsonify({"success": False, "message": "Bildirim bulunamadı."}), 404

    db.session.delete(n)
    db.session.commit()
    return jsonify({"success": True, "message": "Bildirim silindi."}), 200

# (Opsiyonel) ✅ Okunmuşları toplu sil
@apiNotifications.route("/delete-read", methods=["DELETE"])
@jwt_required()
def delete_read():
    from codesys_doc_tracker.models.notification_model import Notification
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    deleted = Notification.query.filter_by(user_id=user.id, is_read=True).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({"success": True, "deleted": deleted}), 200
