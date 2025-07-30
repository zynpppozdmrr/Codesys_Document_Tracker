from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from codesys_doc_tracker.models.diff_model import Diff
from codesys_doc_tracker.models.relation_model import Relation

apiRelations = Blueprint("apiRelations", __name__, url_prefix="/api/relations")

def _payload():
    return request.get_json(silent=True) or request.form


@apiRelations.route("/", methods=["POST"])
@jwt_required()   # istersen optional yapabiliriz
def add_relation():
    """
    Body: diff_id (int, zorunlu), relation_type (str), relation_value (str)
    """
    data = _payload()
    diff_id = data.get("diff_id", None)
    rtype = (data.get("relation_type") or "").strip()
    rvalue = (data.get("relation_value") or "").strip()

    if not diff_id or not rtype or not rvalue:
        return jsonify({"success": False, "message": "diff_id, relation_type, relation_value zorunludur."}), 400

    diff = Diff.query.get(int(diff_id))
    if not diff:
        return jsonify({"success": False, "message": "Diff bulunamadı."}), 404

    rel = Relation.create(diff_id=diff.id, relation_type=rtype, relation_value=rvalue)
    return jsonify({
        "success": True,
        "data": {
            "id": rel.id,
            "diff_id": rel.diff_id,
            "relation_type": rel.relation_type,
            "relation_value": rel.relation_value,
            "created_at": rel.created_at.isoformat()
        }
    })


@apiRelations.route("/", methods=["GET"])
@jwt_required(optional=True)
def list_relations():
    """
    Query: diff_id (opsiyonel)
    """
    diff_id = request.args.get("diff_id", type=int)
    rows = Relation.list_all(diff_id=diff_id)
    data = [{
        "id": r.id,
        "diff_id": r.diff_id,
        "relation_type": r.relation_type,
        "relation_value": r.relation_value,
        "created_at": r.created_at.isoformat(),
    } for r in rows]
    return jsonify({"success": True, "data": data})


@apiRelations.route("/<int:rel_id>", methods=["PUT"])
@jwt_required()
def update_relation(rel_id: int):
    """
    Body: relation_type (ops.), relation_value (ops.)
    """
    data = _payload()
    rtype = data.get("relation_type")
    rvalue = data.get("relation_value")

    rel = Relation.update_relation(rel_id, relation_type=rtype, relation_value=rvalue)
    if not rel:
        return jsonify({"success": False, "message": "Relation bulunamadı."}), 404

    return jsonify({
        "success": True,
        "message": "Relation güncellendi.",
        "data": {
            "id": rel.id,
            "diff_id": rel.diff_id,
            "relation_type": rel.relation_type,
            "relation_value": rel.relation_value,
            "created_at": rel.created_at.isoformat()
        }
    })


@apiRelations.route("/<int:rel_id>", methods=["DELETE"])
@jwt_required()
def delete_relation(rel_id: int):
    ok = Relation.delete_relation(rel_id)
    if not ok:
        return jsonify({"success": False, "message": "Relation bulunamadı."}), 404
    return jsonify({"success": True, "message": "Relation silindi."})
