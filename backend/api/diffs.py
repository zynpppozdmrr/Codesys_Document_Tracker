import os
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy import desc

from codesys_doc_tracker import db
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from codesys_doc_tracker.models.diff_model import Diff
from services.diff_service import generate_and_save_diff

apiDiff = Blueprint("apiDiff", __name__, url_prefix="/api/diffs")


def _get_payload():
    """
    Hem JSON hem x-www-form-urlencoded destekleyelim.
    """
    data = request.get_json(silent=True) or request.form
    return data


@apiDiff.route("/compare", methods=["POST"])
def compare():
    """
    Body:
      - old_id (int)
      - new_id (int)
    Response:
      - diff_id, diff_filename, line_count, old_file_path, new_file_path
    """
    try:
        data = _get_payload()
        old_id = int(data.get("old_id", 0))
        new_id = int(data.get("new_id", 0))

        if not old_id or not new_id:
            return jsonify({"success": False, "message": "old_id ve new_id zorunludur."}), 400

        result = generate_and_save_diff(old_id, new_id)
        return jsonify({"success": True, "data": result})

    except ValueError as ve:
        return jsonify({"success": False, "message": str(ve)}), 400
    except FileNotFoundError as fe:
        return jsonify({"success": False, "message": str(fe)}), 404
    except Exception as e:
        # Geliştirme için:
        # import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": f"Beklenmeyen hata: {str(e)}"}), 500


@apiDiff.route("/", methods=["GET"])
def list_diffs():
    """
    Diff kayıtlarını listeler (en yeni ilk).
    """
    rows = Diff.query.order_by(desc(Diff.generated_at)).all()
    data = []
    for r in rows:
        old_file = XMLFile.query.get(r.xmlfile_old_id)
        new_file = XMLFile.query.get(r.xmlfile_new_id)
        data.append({
            "id": r.id,
            "generated_at": r.generated_at.isoformat(),
            "old_id": r.xmlfile_old_id,
            "new_id": r.xmlfile_new_id,
            "old_file_path": old_file.file_path if old_file else None,
            "new_file_path": new_file.file_path if new_file else None,
        })
    return jsonify({"success": True, "data": data})


@apiDiff.route("/<int:diff_id>", methods=["GET"])
def get_diff(diff_id: int):
    """
    Tek bir diff kaydının meta bilgisini getirir (dosya içeriği değil).
    """
    r = Diff.query.get(diff_id)
    if not r:
        return jsonify({"success": False, "message": "Diff bulunamadı"}), 404

    old_file = XMLFile.query.get(r.xmlfile_old_id)
    new_file = XMLFile.query.get(r.xmlfile_new_id)

    return jsonify({
        "success": True,
        "data": {
            "id": r.id,
            "generated_at": r.generated_at.isoformat(),
            "old_id": r.xmlfile_old_id,
            "new_id": r.xmlfile_new_id,
            "old_file_path": old_file.file_path if old_file else None,
            "new_file_path": new_file.file_path if new_file else None,
        }
    })


