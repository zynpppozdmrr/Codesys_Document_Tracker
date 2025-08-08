from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from flask_cors import CORS
import os

from services.excel_service import (
    compare_excel_files_by_id,
    save_uploaded_excels,
    scan_and_sync_excel_files
)
from codesys_doc_tracker.models.excel_model import ExcelFile

apiExcelDiff = Blueprint('apiExcelDiff', __name__, url_prefix='/api/excel')
CORS(apiExcelDiff)


# ---------- LİSTELEME ----------

@apiExcelDiff.route("", methods=['GET'])
@jwt_required()
def list_excel_files():
    try:
        rows = ExcelFile.list_all()
        data = [
            {
                "id": r.id,
                "file_path": r.file_path,
                "file_name": os.path.basename(r.file_path),
                "upload_date": r.upload_date.isoformat() if r.upload_date else None,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            }
            for r in rows
        ]
        return jsonify({"success": True, "files": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Listeleme hatası: {e}"}), 500


# ---------- YÜKLEME (Sürükle bırak) ----------
@apiExcelDiff.route("/upload", methods=["POST"])
@jwt_required()
def upload_excel_files():
    try:
        files = request.files.getlist("files")
        if not files:
            return jsonify({"success": False, "message": "Dosya bulunamadı."}), 400

        result = save_uploaded_excels(files)
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Yükleme hatası: {e}"}), 500


# ---------- KARŞILAŞTIRMA ----------
@apiExcelDiff.route('/compare', methods=['POST'])
@jwt_required()
def compare_excel_files():
    data = request.get_json()
    file1_id = data.get('file1_id')
    file2_id = data.get('file2_id')

    if not file1_id or not file2_id:
        return jsonify({"success": False, "message": "Her iki dosya ID'si de gerekli."}), 400

    try:
        diff_report = compare_excel_files_by_id(file1_id, file2_id)

        if not diff_report:
            return jsonify({
                "success": True,
                "message": "Dosyalar arasında bir fark bulunamadı.",
                "data": []
            }), 200

        return jsonify({
            "success": True,
            "message": "Farklılıklar başarıyla listelendi.",
            "data": diff_report
        }), 200

    except FileNotFoundError as e:
        return jsonify({"success": False, "message": f"Dosya bulunamadı hatası: {str(e)}"}), 404
    except ValueError as e:
        return jsonify({"success": False, "message": f"Dosya işleme hatası: {str(e)}"}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Bir hata oluştu: {str(e)}"}), 500


# ---------- DİSKTEN SİLMEYLE SENKRONİZE ETME ----------
@apiExcelDiff.route('/resync', methods=['POST'])
@jwt_required()
def resync_excel_reports():
    try:
        result = scan_and_sync_excel_files()
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Senkronizasyon hatası: {e}"}), 500


# ---------- SİLME ----------
@apiExcelDiff.route('/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_excel_file_route(file_id: int):
    try:
        ok = ExcelFile.delete_by_id(file_id)
        if ok:
            return jsonify({"success": True}), 200
        return jsonify({"success": False, "message": "Kayıt bulunamadı."}), 404
    except Exception as e:
        return jsonify({"success": False, "message": f"Silme hatası: {e}"}), 500