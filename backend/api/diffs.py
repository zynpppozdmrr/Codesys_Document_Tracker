from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError

from services.diff_service import (
    generate_and_save_filtered_diff,
    get_diff_report_html_content,
)
from codesys_doc_tracker.models.diff_model import Diff

apiDiff = Blueprint('apiDiff', __name__, url_prefix='/api/diffs')
CORS(apiDiff)

# -------------------- COMPARE --------------------
@apiDiff.route('/compare', methods=['POST'])
@jwt_required()
def compare_xml_files():
    data = request.get_json()
    file1_id = data.get('file1_id')
    file2_id = data.get('file2_id')

    if not file1_id or not file2_id:
        return jsonify({"success": False, "message": "Her iki dosya ID'si de gerekli."}), 400

    try:
        diff_filename, diff_summary = generate_and_save_filtered_diff(file1_id, file2_id)

        diff_row = Diff.query.filter_by(diffReport_name=diff_filename).order_by(Diff.created_at.desc()).first()
        diff_id = diff_row.id if diff_row else None

        return jsonify({
            "success": True,
            "message": "Fark karşılaştırma başarılı. Rapor oluşturuldu.",
            "data": {
                "diff_id": diff_id,
                "diff_filename": diff_filename,
                "summary": diff_summary
            }
        }), 200

    except FileNotFoundError as e:
        return jsonify({"success": False, "message": f"Dosya bulunamadı hatası: {str(e)}"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": f"Bir hata oluştu: {str(e)}"}), 500


# -------------------- REPORT CONTENT --------------------
@apiDiff.route('/report/<path:filename>', methods=['GET'])
@jwt_required()
def get_diff_report(filename):
    try:
        html_content = get_diff_report_html_content(filename)
        return html_content, 200, {'Content-Type': 'text/plain; charset=utf-8'}
    except FileNotFoundError:
        return jsonify({"success": False, "message": "Fark raporu bulunamadı."}), 404
    except Exception as e:
        return jsonify({"success": False, "message": f"Rapor çekilirken bir hata oluştu: {str(e)}"}), 500


# -------------------- LIST --------------------
@apiDiff.route('/', methods=['GET'])
@jwt_required()
def list_diff_reports():
    rows = Diff.query.order_by(Diff.created_at.desc()).all()
    data = [
        {
            "id": r.id,
            "file_name": r.diffReport_name,
            "file_path": r.diffReport_path,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in rows
    ]
    return jsonify({"success": True, "data": data}), 200


# -------------------- RESYNC --------------------
@apiDiff.route('/resync', methods=['POST'])
@jwt_required()
def resync_diff_reports():
    try:
        result = Diff.resync_reports()  # {"removed": X, "skipped": Y}
        return jsonify({"success": True, "data": result}), 200
    except IntegrityError:
        # Her ihtimale karşı FK ihlalinde 409 dön
        return jsonify({
            "success": False,
            "message": "Bu kayıt ilişkili not/ilişkiler içerdiği için silinemez."
        }), 409
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# -------------------- DELETE --------------------
@apiDiff.route('/<int:diff_id>', methods=['DELETE'])
@jwt_required()
def delete_diff(diff_id):
    success, error = Diff.delete_by_id(diff_id)
    if success:
        return jsonify({"success": True}), 200

    # Hata tipine göre uygun HTTP kodu
    msg = (error or "").lower()
    if "bulunamadı" in msg:
        return jsonify({"success": False, "message": error}), 404
    if "silinemez" in msg or "ilişkili" in msg or "not" in msg:
        return jsonify({"success": False, "message": error}), 409
    return jsonify({"success": False, "message": error or "Silme sırasında hata oluştu."}), 400
