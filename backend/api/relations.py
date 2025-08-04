# codesys_doc_tracker/api/relations.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from flask_cors import CORS

from codesys_doc_tracker.models.note_model import Note
from codesys_doc_tracker.models.relation_model import Relation

apiRelations = Blueprint("apiRelations", __name__, url_prefix="/api/relations")
CORS(apiRelations)

def _payload():
    if request.is_json:
        return request.get_json()
    return request.form

@apiRelations.route("/", methods=["POST"])
@jwt_required()
def add_relation():
    data = _payload()
    note_id = data.get("note_id")
    relation_type = (data.get("relation_type") or "").strip()
    relation_value = (data.get("relation_value") or "").strip()

    if not all([note_id, relation_type, relation_value]):
        return jsonify({"success": False, "message": "note_id, relation_type ve relation_value zorunludur."}), 400

    note = Note.get_by_id(int(note_id))
    if not note:
        return jsonify({"success": False, "message": "Not bulunamadı."}), 404

    try:
        new_relation = Relation.create(
            note_id=int(note_id),
            relation_type=relation_type,
            relation_value=relation_value
        )
        return jsonify({
            "success": True,
            "message": "İlişki başarıyla eklendi.",
            "data": {
                "id": new_relation.id,
                "note_id": new_relation.note_id,
                "relation_type": new_relation.relation_type,
                "relation_value": new_relation.relation_value,
                "created_at": new_relation.created_at.isoformat()
            }
        }), 201
    except Exception as e:
        return jsonify({"success": False, "message": f"İlişki eklenirken hata: {e}"}), 500

@apiRelations.route("/<int:note_id>", methods=["GET"])
@jwt_required()
def get_relations_by_note_id(note_id: int):
    relations = Relation.list_by_note_id(note_id)
    relations_data = [{
        "id": r.id,
        "relation_type": r.relation_type,
        "relation_value": r.relation_value,
        "created_at": r.created_at.isoformat()
    } for r in relations]

    return jsonify({"success": True, "relations": relations_data}), 200

@apiRelations.route("/<int:relation_id>", methods=["DELETE"])
@jwt_required()
def delete_relation(relation_id: int):
    success = Relation.delete_by_id(relation_id)
    if success:
        return jsonify({"success": True, "message": "İlişki başarıyla silindi."}), 200
    return jsonify({"success": False, "message": "İlişki bulunamadı veya silinemedi."}), 404

@apiRelations.route("/<int:relation_id>", methods=["PUT"])
@jwt_required()
def update_relation(relation_id: int):
    data = _payload()
    relation_type = (data.get("relation_type") or "").strip()
    relation_value = (data.get("relation_value") or "").strip()

    if not all([relation_type, relation_value]):
        return jsonify({"success": False, "message": "relation_type ve relation_value zorunludur."}), 400

    relation = Relation.query.get(relation_id)
    if not relation:
        return jsonify({"success": False, "message": "İlişki bulunamadı."}), 404

    relation.relation_type = relation_type
    relation.relation_value = relation_value
    db.session.commit()

    return jsonify({"success": True, "message": "İlişki başarıyla güncellendi."})
