from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from codesys_doc_tracker.models.user_model import User
from codesys_doc_tracker.models.diff_model import Diff
from codesys_doc_tracker.models.note_model import Note

apiNotes = Blueprint("apiNotes", __name__, url_prefix="/api/notes")

def _payload():
    return request.get_json(silent=True) or request.form


@apiNotes.route("/", methods=["POST"])
@jwt_required()
def add_note():
    """
    Body: diff_id, content
    """
    data = _payload()
    diff_id = data.get("diff_id", None)
    content = (data.get("content") or "").strip()

    if not diff_id or not content:
        return jsonify({"success": False, "message": "diff_id ve content zorunludur."}), 400

    diff = Diff.query.get(int(diff_id))
    if not diff:
        return jsonify({"success": False, "message": "Diff bulunamadı."}), 404

    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    note = Note.create(user_id=user.id, diff_id=diff.id, content=content)

    return jsonify({
        "success": True,
        "data": {
            "id": note.id,
            "diff_id": note.diff_id,
            "user_id": note.user_id,
            "username": user.username,
            "content": note.content,
            "timestamp": note.timestamp.isoformat()
        }
    })


@apiNotes.route("/", methods=["GET"])
@jwt_required(optional=True)
def list_notes():
    """
    Query: diff_id (opsiyonel)
    """
    diff_id = request.args.get("diff_id", type=int)
    rows = Note.list_all(diff_id=diff_id)

    result = []
    for n in rows:
        result.append({
            "id": n.id,
            "diff_id": n.diff_id,
            "user_id": n.user_id,
            "username": n.user.username if n.user else None,
            "content": n.content,
            "timestamp": n.timestamp.isoformat()
        })
    return jsonify({"success": True, "data": result})


@apiNotes.route("/<int:note_id>", methods=["PUT"])
@jwt_required()
def update_note(note_id: int):
    """
    Body: content (zorunlu)
    Varsayılan: sadece sahibi güncelleyebilir.
    """
    data = _payload()
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"success": False, "message": "content zorunludur."}), 400

    note = Note.get_by_id(note_id)
    if not note:
        return jsonify({"success": False, "message": "Not bulunamadı."}), 404

    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user or user.id != note.user_id:
        return jsonify({"success": False, "message": "Bu notu güncelleme yetkiniz yok."}), 403

    updated = Note.update_note(note_id, content=content)
    return jsonify({"success": True, "message": "Not güncellendi.", "data": {
        "id": updated.id,
        "content": updated.content,
        "timestamp": updated.timestamp.isoformat()
    }})


@apiNotes.route("/<int:note_id>", methods=["DELETE"])
@jwt_required()
def delete_note(note_id: int):
    note = Note.get_by_id(note_id)
    if not note:
        return jsonify({"success": False, "message": "Not bulunamadı."}), 404

    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user or user.id != note.user_id:
        return jsonify({"success": False, "message": "Bu notu silme yetkiniz yok."}), 403

    ok = Note.delete_note(note_id)
    return jsonify({"success": ok, "message": "Not silindi." if ok else "Silinemedi."})
