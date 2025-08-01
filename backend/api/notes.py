import os
from flask_cors import CORS
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from codesys_doc_tracker.models.user_model import User
from codesys_doc_tracker.models.diff_model import Diff
from codesys_doc_tracker.models.note_model import Note
from codesys_doc_tracker.models.xmlfile_model import XMLFile

apiNotes = Blueprint("apiNotes", __name__, url_prefix="/api/notes")
CORS(apiNotes)

def _payload():
    if request.is_json:
        return request.get_json()
    return request.form

@apiNotes.route("/", methods=["POST"])
@jwt_required()
def add_note():
    """
    Body: diff_id, content
    xmlfile_id diff üzerinden otomatik alınır.
    """
    data = _payload()
    print("GELEN VERİ:", data)
    diff_id = data.get("diff_id", None)
    content = (data.get("content") or "").strip()

    if not diff_id or not content:
        return jsonify({"success": False, "message": "diff_id ve content zorunludur."}), 400

    diff = Diff.query.get(int(diff_id))
    if not diff:
        return jsonify({"success": False, "message": "Diff bulunamadı."}), 404

    # yeni eklediğimiz alan: xmlfile_id = ikinci dosya
    xmlfile_id = diff.xmlfile_new_id

    username = get_jwt_identity()
    user = User.get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "message": "Kullanıcı bulunamadı."}), 404

    # artık 4 parametre göndermeliyiz
    note = Note.create(
        user_id=user.id,
        diff_id=diff.id,
        xmlfile_id=xmlfile_id,
        content=content
    )

    return jsonify({
        "success": True,
        "data": {
            "id": note.id,
            "diff_id": note.diff_id,
            "xmlfile_id": note.xmlfile_id,
            "user_id": note.user_id,
            "username": user.username,
            "content": note.content,
            "timestamp": note.timestamp.isoformat()
        }
    })

@apiNotes.route("/<int:diff_id>", methods=["GET"])
@jwt_required()
def get_notes_by_diff(diff_id):
    notes = Note.query.filter_by(diff_id=diff_id).all()
    notes_data = []
    for note in notes:
        notes_data.append({
            "id": note.id,
            "content": note.content,
            "timestamp": note.timestamp,
            "user_id": note.user_id,
            "username": note.user.username if note.user else "Unknown"
        })
    return jsonify({"success": True, "notes": notes_data}), 200

@apiNotes.route("/", methods=["GET"])
@jwt_required()
def get_all_notes():
    notes = Note.query.all()
    notes_data = []
    for note in notes:
        xmlfile_name = None
        if note.xmlfile:
            xmlfile_name = os.path.basename(note.xmlfile.file_path)
        notes_data.append({
            "id": note.id,
            "content": note.content,
            "timestamp": note.timestamp.isoformat(),
            "user_id": note.user_id,
            "username": note.user.username if note.user else "Unknown",
            "xmlfile_name": xmlfile_name
        })
    return jsonify({"success": True, "notes": notes_data}), 200

@apiNotes.route("/<int:note_id>", methods=["DELETE"]) # Yeni DELETE endpoint'i
@jwt_required()
def delete_note(note_id):
    success = Note.delete_note(note_id)
    if success:
        return jsonify({"success": True, "message": "Not başarıyla silindi."}), 200
    return jsonify({"success": False, "message": "Not bulunamadı veya silinemedi."}), 404

@apiNotes.route("/<int:note_id>", methods=["PUT"]) # Yeni PUT endpoint'i
@jwt_required()
def update_note(note_id):
    data = _payload()
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify({"success": False, "message": "Not içeriği boş olamaz."}), 400

    note = Note.update_note(note_id, content=content)
    if note:
        return jsonify({
            "success": True,
            "message": "Not başarıyla güncellendi.",
            "data": {
                "id": note.id,
                "content": note.content,
                "timestamp": note.timestamp.isoformat(),
                "user_id": note.user_id,
                "username": note.user.username if note.user else "Unknown",
                "xmlfile_id": note.xmlfile_id # xmlfile_id'yi de döndürebiliriz
            }
        }), 200
    return jsonify({"success": False, "message": "Not bulunamadı veya güncellenemedi."}), 404