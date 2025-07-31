import os
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from flask_cors import CORS
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from services.xmlfile_service import scan_and_sync_xml_files  # <-- GÜNCELLENDİ
from codesys_doc_tracker import db


apiXMLFiles = Blueprint("apiXMLFiles", __name__, url_prefix="/api/xmlfiles")
CORS(apiXMLFiles)


@apiXMLFiles.route("/", methods=["GET"])
@jwt_required()
def list_xml_files():
    """
    Veritabanındaki XMLFile kayıtlarını listeler.
    """
    try:
        rows = XMLFile.query.order_by(XMLFile.timestamp.desc()).all()
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
        print(f"XML dosyaları çekilirken hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"XML dosyaları çekilirken bir hata oluştu: {str(e)}"}), 500


@apiXMLFiles.route("/rescan", methods=["POST"])
@jwt_required()
def rescan_xml_files_route():
    """
    Export klasörünü yeniden tarar:
      - yeni .xml dosyalarını DB'ye ekler,
      - export klasöründen silinen .xml dosyalarını DB'den kaldırır.
    """
    try:
        result = scan_and_sync_xml_files()
        added = result.get("added", 0)
        removed = result.get("removed", 0)
        return jsonify({
            "success": True,
            "message": f"{added} yeni dosya eklendi, {removed} dosya silindi.",
            "data": result
        }), 200
    except Exception as e:
        print(f"Yeniden tarama sırasında hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Yeniden tarama sırasında bir hata oluştu: {str(e)}"}), 500


@apiXMLFiles.route("/<int:file_id>", methods=["GET"])
@jwt_required()
def get_xml_file(file_id: int):
    """
    Tek bir XML dosyası kaydının meta bilgisini döner.
    """
    try:
        row = XMLFile.query.get(file_id)
        if not row:
            return jsonify({"success": False, "message": "XML file not found"}), 404

        return jsonify({
            "success": True,
            "data": {
                "id": row.id,
                "file_path": row.file_path,
                "file_name": os.path.basename(row.file_path),
                "upload_date": row.upload_date.isoformat() if row.upload_date else None,
                "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            }
        })
    except Exception as e:
        print(f"XML dosyası çekilirken hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"XML dosyası çekilirken bir hata oluştu: {str(e)}"}), 500
