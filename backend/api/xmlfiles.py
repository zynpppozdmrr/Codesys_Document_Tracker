import os
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from flask_cors import CORS

from codesys_doc_tracker.models.xmlfile_model import XMLFile
from services.xmlfile_service import (
    scan_and_sync_xml_files,
    save_uploaded_xmls,
    delete_xml_file,
)

apiXMLFiles = Blueprint("apiXMLFiles", __name__, url_prefix="/api/xmlfiles")
CORS(apiXMLFiles)


# ---------- LİSTELEME ----------
@apiXMLFiles.route("/", methods=["GET"])
@jwt_required()
def list_xml_files():
    try:
        rows = XMLFile.list_all()  # ✅ Artık model method'u
        data = []
        for r in rows:
            data.append({
                "id": r.id,
                "file_path": r.file_path,
                "file_name": os.path.basename(r.file_path),
                "upload_date": r.upload_date.isoformat() if r.upload_date else None,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            })
        return jsonify({"success": True, "files": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Listeleme hatası: {e}"}), 500


# ---------- RESCAN ----------
@apiXMLFiles.route("/rescan", methods=["POST"])
@jwt_required()
def rescan_xml_files_route():
    try:
        result = scan_and_sync_xml_files()
        return jsonify({
            "success": True,
            "message": f"{result.get('added',0)} eklendi, {result.get('removed',0)} silindi.",
            "data": result
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Yeniden tarama hatası: {e}"}), 500


# ---------- YÜKLEME (Sürükle bırak) ----------
@apiXMLFiles.route("/upload", methods=["POST"])
@jwt_required()
def upload_xml_files():
    """
    multipart/form-data, field adı 'files' (çoklu destekli)
    """
    try:
        files = request.files.getlist("files")
        if not files:
            return jsonify({"success": False, "message": "Dosya bulunamadı."}), 400

        result = save_uploaded_xmls(files)
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Yükleme hatası: {e}"}), 500


# ---------- SİLME ----------
@apiXMLFiles.route("/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_xml_file_route(file_id: int):
    try:
        ok = delete_xml_file(file_id)
        if ok:
            return jsonify({"success": True}), 200
        return jsonify({"success": False, "message": "Kayıt bulunamadı."}), 404
    except Exception as e:
        return jsonify({"success": False, "message": f"Silme hatası: {e}"}), 500
