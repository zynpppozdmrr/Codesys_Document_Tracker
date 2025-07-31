from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from flask_cors import CORS
import os

from services.diff_service import (
    generate_and_save_filtered_diff,
    get_diff_report_html_content,
    DIFF_REPORTS_DIR
)
from codesys_doc_tracker.models.diff_model import Diff
from codesys_doc_tracker import db

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

        # Diff kaydını DB'den bul
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
        import traceback
        traceback.print_exc()
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
        import traceback
        traceback.print_exc()
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
    removed = 0
    for d in Diff.query.all():
        if not os.path.exists(d.diffReport_path):
            db.session.delete(d)
            removed += 1
    if removed:
        db.session.commit()
    return jsonify({"success": True, "data": {"removed": removed}}), 200


# -------------------- DELETE --------------------
@apiDiff.route('/<int:diff_id>', methods=['DELETE'])
@jwt_required()
def delete_diff(diff_id):
    diff = Diff.query.get(diff_id)
    if not diff:
        return jsonify({"success": False, "message": "Kayıt bulunamadı."}), 404

    # Dosyayı sil
    try:
        if os.path.exists(diff.diffReport_path):
            os.remove(diff.diffReport_path)
    except Exception as e:
        print("Dosya silinemedi:", e)

    # DB kaydını sil
    db.session.delete(diff)
    db.session.commit()

    return jsonify({"success": True}), 200
