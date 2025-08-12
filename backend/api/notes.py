import os
from flask_cors import CORS
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_

from codesys_doc_tracker import db
from codesys_doc_tracker.models.user_model import User
from codesys_doc_tracker.models.diff_model import Diff
from codesys_doc_tracker.models.note_model import Note
from codesys_doc_tracker.models.note_visibility_model import NoteVisibility

apiNotes = Blueprint("apiNotes", __name__, url_prefix="/api/notes")
CORS(apiNotes)  # bu blueprint altındaki tüm rotalara CORS uygula

def _payload():
    return request.get_json() if request.is_json else request.form

def _is_admin(u):
    return bool(getattr(u, "is_admin", False) or getattr(u, "isAdmin", False) or (getattr(u, "role", None) == "admin"))

def _order_col():
    # created_at varsa onu, yoksa timestamp, o da yoksa id ile sırala
    col = getattr(Note, "created_at", None) or getattr(Note, "timestamp", None)
    return col if col is not None else Note.id

# -------------------------
# Not oluştur (görünürlük dahil)
# -------------------------
@apiNotes.route("/", methods=["POST"])
@jwt_required()
def add_note():
    """
    Body: diff_id (int), content (str), visible_user_ids (list[int] | "1,2,3")
    """
    data = _payload()
    diff_id = data.get("diff_id", None)
    content = (data.get("content") or "").strip()

    # Görünür kullanıcılar (opsiyonel)
    raw_vis = data.get("visible_user_ids", [])
    if isinstance(raw_vis, str):
        visible_user_ids = [int(x) for x in raw_vis.split(",") if x.strip().isdigit()]
    else:
        visible_user_ids = [int(x) for x in (raw_vis or []) if str(x).isdigit()]

    if not diff_id or not content:
        return jsonify({"success": False, "message": "diff_id ve content zorunludur."}), 400

    diff = Diff.query.get(int(diff_id))
    if not diff:
        return jsonify({"success": False, "message": "Diff bulunamadı."}), 404

    # Kimlik
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    # Note oluştur
    note = Note.create(
        user_id=user.id,
        diff_id=diff.id,
        content=content
    )

    # Görünürlük kayıtları (kendini ekleme)
    unique_ids = {uid for uid in visible_user_ids if isinstance(uid, int) and uid != user.id}
    for uid in unique_ids:
        db.session.add(NoteVisibility(note_id=note.id, user_id=uid))
    db.session.commit()

    return jsonify({"success": True, "data": note.to_dict()}), 200

# -------------------------
# Belirli diff için notları getir
# -------------------------
@apiNotes.route("/<int:diff_id>", methods=["GET"])
@jwt_required()
def get_notes_by_diff(diff_id):
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    is_admin = _is_admin(user)

    q = Note.query.filter_by(diff_id=diff_id)
    if not is_admin:
        q = q.outerjoin(NoteVisibility, NoteVisibility.note_id == Note.id)\
             .filter(or_(Note.user_id == user.id, NoteVisibility.user_id == user.id))

    notes = q.order_by(_order_col().desc()).all()
    notes_data = [n.to_dict() for n in notes]
    return jsonify({"success": True, "notes": notes_data, "is_admin": is_admin, "current_username": user.username}), 200

# -------------------------
# Tüm notlar (+ admin için username filtresi)
# -------------------------
@apiNotes.route("/", methods=["GET"])
@jwt_required()
def get_all_notes():
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    is_admin = _is_admin(user)
    q = Note.query

    if is_admin:
        # Admin isme göre filtreleyebilir: ?username=...
        filter_username = (request.args.get("username") or "").strip()
        if filter_username:
            target = User.get_user_by_username(filter_username)
            if target:
                q = q.filter_by(user_id=target.id)
            else:
                return jsonify({"success": True, "notes": [], "is_admin": True, "current_username": user.username}), 200
    else:
        # User: kendi notu veya kendisine görünür yapılmış notlar
        q = q.outerjoin(NoteVisibility, NoteVisibility.note_id == Note.id)\
             .filter(or_(Note.user_id == user.id, NoteVisibility.user_id == user.id))

    notes = q.order_by(_order_col().desc()).all()
    notes_data = [n.to_dict() for n in notes]
    return jsonify({
        "success": True,
        "notes": notes_data,
        "is_admin": is_admin,
        "current_username": user.username
    }), 200

# -------------------------
# Not güncelle (sadece sahibi veya admin)
# -------------------------
@apiNotes.route("/<int:note_id>", methods=["PUT"])
@jwt_required()
def update_note(note_id):
    data = _payload()
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"success": False, "message": "Not içeriği boş olamaz."}), 400

    # Kimlik
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    note = Note.query.get(note_id)
    if not note:
        return jsonify({"success": False, "message": "Not bulunamadı."}), 404

    # Yetki
    if not ( _is_admin(user) or note.user_id == user.id ):
        return jsonify({"success": False, "message": "Bu notu güncelleme yetkiniz yok."}), 403

    note = Note.update_note(note_id, content=content)
    return jsonify({"success": True, "message": "Not başarıyla güncellendi.", "data": note.to_dict()}), 200

# -------------------------
# Not sil (sadece sahibi veya admin)
# -------------------------
@apiNotes.route("/<int:note_id>", methods=["DELETE"])
@jwt_required()
def delete_note(note_id):
    # Kimlik
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    note = Note.query.get(note_id)
    if not note:
        return jsonify({"success": False, "message": "Not bulunamadı."}), 404

    # Yetki
    if not ( _is_admin(user) or note.user_id == user.id ):
        return jsonify({"success": False, "message": "Bu notu silme yetkiniz yok."}), 403

    ok = Note.delete_note(note_id)
    if ok:
        return jsonify({"success": True, "message": "Not başarıyla silindi."}), 200
    return jsonify({"success": False, "message": "Not silinemedi."}), 400

# -------------------------
# Görünür kullanıcı listesi (checkbox'ları doldurmak için)
# -------------------------
@apiNotes.route("/visible-users", methods=["GET"])
@jwt_required()
def list_visible_users():
    users = User.query.order_by(User.username.asc()).all()
    return jsonify({"success": True, "users": [{"id": u.id, "username": u.username} for u in users]}), 200

# -------------------------
# Görünürlük güncelle (SADECE notun sahibi)
# -------------------------
@apiNotes.route("/<int:note_id>/visibility", methods=["PUT"])
@jwt_required()
def update_visibility(note_id):
    """
    Body: visible_user_ids: list[int] | "1,2,3"
    Yalnızca NOTUN SAHİBİ çağırabilir.
    """
    data = _payload()
    raw_vis = data.get("visible_user_ids", [])
    if isinstance(raw_vis, str):
        new_ids = [int(x) for x in raw_vis.split(",") if x.strip().isdigit()]
    else:
        new_ids = [int(x) for x in (raw_vis or []) if str(x).isdigit()]

    # Kimlik
    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    note = Note.query.get(note_id)
    if not note:
        return jsonify({"success": False, "message": "Not bulunamadı."}), 404

    # YETKİ: SADECE NOTUN SAHİBİ
    if note.user_id != user.id:
        return jsonify({"success": False, "message": "Görünürlük değiştirme yetkiniz yok."}), 403

    # Kendini listeye eklemeye gerek yok (zaten sahibi)
    new_ids = {uid for uid in new_ids if isinstance(uid, int) and uid != user.id}

    # Eski görünürlükleri sil, yenilerini yaz
    NoteVisibility.query.filter_by(note_id=note.id).delete()
    for uid in new_ids:
        db.session.add(NoteVisibility(note_id=note.id, user_id=uid))
    db.session.commit()

    return jsonify({"success": True, "message": "Görünür kullanıcılar güncellendi.", "data": note.to_dict()}), 200
