# api/xmlfiles.py
import os
from flask import Blueprint, jsonify, send_file
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from services.xmlfile_service import scan_and_register_xml_files

apiXMLFiles = Blueprint("apiXMLFiles", __name__, url_prefix="/api/xmlfiles")


@apiXMLFiles.route("/", methods=["GET"])
def list_xml_files():
    """
    Veritabanındaki XMLFile kayıtlarını listeler.
    """
    rows = XMLFile.query.order_by(XMLFile.timestamp.desc()).all()
    data = []
    for r in rows:
        # Dosya sisteminde hâlâ var mı bilgisi (UI için faydalı olabilir)
        exists = os.path.exists(r.file_path)
        data.append({
            "id": r.id,
            "file_path": r.file_path,
            "filename": os.path.basename(r.file_path),
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "exists": exists,
        })
    return jsonify({"success": True, "files": data})


@apiXMLFiles.route("/rescan", methods=["POST"])
def rescan_xml_files():
    """
    Export klasörünü yeniden tarar, yeni .xml dosyalarını DB'ye ekler.
    """
    added = scan_and_register_xml_files()
    return jsonify({"success": True, "added": added})


@apiXMLFiles.route("/<int:file_id>", methods=["GET"])
def get_xml_file(file_id: int):
    """
    Tek bir XML dosyası kaydının meta bilgisini döner.
    """
    row = XMLFile.query.get(file_id)
    if not row:
        return jsonify({"success": False, "message": "XML file not found"}), 404

    return jsonify({
        "success": True,
        "data": {
            "id": row.id,
            "file_path": row.file_path,
            "filename": os.path.basename(row.file_path),
            "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            "exists": os.path.exists(row.file_path),
        }
    })

