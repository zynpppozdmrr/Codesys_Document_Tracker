# api/diffs.py

from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.diff_service import generate_and_save_diff, get_diff_report_html_content, DIFF_REPORTS_DIR
from flask_cors import CORS


apiDiff = Blueprint('apiDiff', __name__, url_prefix='/api/diffs')
CORS(apiDiff)


@apiDiff.route('/compare', methods=['POST'])
@jwt_required()
def compare_xml_files():
    data = request.get_json()
    file1_id = data.get('file1_id')
    file2_id = data.get('file2_id')

    if not file1_id or not file2_id:
        return jsonify({"success": False, "message": "Her iki dosya ID'si de gerekli."}), 400

    try:
        diff_filename, diff_summary = generate_and_save_diff(file1_id, file2_id)
        
        return jsonify({
            "success": True,
            "message": "Fark karşılaştırma başarılı. Rapor oluşturuldu.",
            "data": {
                "diff_filename": diff_filename,
                "summary": diff_summary
            }
        }), 200

    except FileNotFoundError as e:
        return jsonify({"success": False, "message": f"Dosya bulunamadı hatası: {str(e)}"}), 404
    except Exception as e:
        print(f"Hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Bir hata oluştu: {str(e)}"}), 500


@apiDiff.route('/report/<path:filename>', methods=['GET'])
@jwt_required()
def get_diff_report(filename):
    try:
        html_content = get_diff_report_html_content(filename)
        # Content-Type'ı metin olarak değiştirdik
        return html_content, 200, {'Content-Type': 'text/plain; charset=utf-8'} # <-- Content-Type güncellendi
    except FileNotFoundError:
        return jsonify({"success": False, "message": "Fark raporu bulunamadı."}), 404
    except Exception as e:
        print(f"Hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Rapor çekilirken bir hata oluştu: {str(e)}"}), 500