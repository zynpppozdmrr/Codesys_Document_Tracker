# backend/api/glossary.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError
from codesys_doc_tracker import db


apiGlossary = Blueprint("apiGlossary", __name__, url_prefix="/api/glossary")

# ---- yardımcılar ----
def _payload() -> dict:
    if request.is_json:
        return request.get_json(silent=True) or {}
    # form-urlencoded desteği (projede tercih edildiği oldu)
    return {k: v for k, v in request.form.items()}

def _to_int(v):
    if v is None or v == "":
        return None
    try:
        return int(v)
    except Exception:
        return None

# ---- Routes ----

@apiGlossary.route("/", methods=["GET"])
@jwt_required()
def list_items():
    from codesys_doc_tracker.models.glossary_model import Glossary

    q = (request.args.get("q") or "").strip()
    type_code = (request.args.get("type") or "").strip() or None
    sort = (request.args.get("sort") or "created_at").strip()
    direction = (request.args.get("direction") or "desc").strip()

    limit = _to_int(request.args.get("limit")) or 50
    offset = _to_int(request.args.get("offset")) or 0

    rows, total = Glossary.search(
        q=q or None,
        type_code=type_code,
        sort=sort,
        direction=direction,
        limit=limit,
        offset=offset,
    )

    return jsonify({
        "success": True,
        "count": total,
        "items": [r.to_dict() for r in rows]
    })

@apiGlossary.route("/", methods=["POST"])
@jwt_required()
def create_item():
    from codesys_doc_tracker.models.glossary_model import Glossary
    data = _payload()
    code = (data.get("code") or "").strip()
    desc = (data.get("desc") or "").strip()
    type_code = (data.get("type") or "").strip()
    order_no = _to_int(data.get("order"))
    project_no = (data.get("no") or "").strip()

    if not code or not type_code or not project_no:
        return jsonify({
            "success": False,
            "message": "code, type ve no alanları zorunludur."
        }), 400

    try:
        item = Glossary.create(
            code=code, desc=desc, type_code=type_code,
            order_no=order_no, project_no=project_no
        )
        return jsonify({"success": True, "item": item.to_dict()}), 201
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Aynı (code, no) kombinasyonu zaten mevcut."
        }), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Hata: {e}"}), 500

@apiGlossary.route("/<int:gid>", methods=["GET"])
@jwt_required()
def get_item(gid: int):
    from codesys_doc_tracker.models.glossary_model import Glossary
    item = Glossary.get_by_id(gid)
    if not item:
        return jsonify({"success": False, "message": "Kayıt bulunamadı."}), 404
    return jsonify({"success": True, "item": item.to_dict()})

@apiGlossary.route("/<int:gid>", methods=["PUT"])
@jwt_required()
def update_item(gid: int):
    from codesys_doc_tracker.models.glossary_model import Glossary
    data = _payload()
    try:
        item = Glossary.update_item(
            gid,
            code=data.get("code"),
            desc=data.get("desc"),
            type_code=data.get("type"),
            order_no=_to_int(data.get("order")) if "order" in data else None,
            project_no=data.get("no"),
        )
        if not item:
            return jsonify({"success": False, "message": "Kayıt bulunamadı."}), 404
        return jsonify({"success": True, "item": item.to_dict()})
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Aynı (code, no) kombinasyonu zaten mevcut."
        }), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Hata: {e}"}), 500

@apiGlossary.route("/<int:gid>", methods=["DELETE"])
@jwt_required()
def delete_item(gid: int):
    from codesys_doc_tracker.models.glossary_model import Glossary
    try:
        ok = Glossary.delete_item(gid)
        if not ok:
            return jsonify({"success": False, "message": "Kayıt bulunamadı."}), 404
        return jsonify({"success": True, "message": "Kayıt silindi."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Hata: {e}"}), 500
