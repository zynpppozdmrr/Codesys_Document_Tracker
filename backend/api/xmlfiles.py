# api/xmlfiles.py

import os
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from flask_cors import CORS
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from services.xmlfile_service import scan_and_register_xml_files
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
                "id": r.id, # <-- ID'yi tekrar ekledik!
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
    Export klasörünü yeniden tarar, yeni .xml dosyalarını DB'ye ekler.
    """
    try:
        added = scan_and_register_xml_files()
        return jsonify({"success": True, "message": f"{added} yeni dosya eklendi."}), 200
    except Exception as e:
        print(f"Yeniden tarama sırasında hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Yeniden tarama sırasında bir hata oluştu: {str(e)}"}), 500


@apiXMLFiles.route("/upload", methods=['POST'])
@jwt_required()
def upload_xml_file():
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "Dosya bulunamadı."}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "Dosya adı boş olamaz."}), 400

    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "UploadedXMLs")
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        new_file = XMLFile(
            file_path=file_path,
            version=request.form.get("version", "1.0") # Eğer version sütununu geri eklediyseniz, bunu burada kullanın
                                                       # Yoksa bu satırı silin
        )
        db.session.add(new_file)
        db.session.commit()
        return jsonify({"success": True, "message": "Dosya başarıyla yüklendi ve kaydedildi.", "file_id": new_file.id}), 201
    except Exception as e:
        db.session.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        print(f"Dosya veritabanına kaydedilirken hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Dosya kaydedilirken bir hata oluştu: {str(e)}"}), 500


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
                "id": row.id, # <-- ID'yi tekrar ekledik!
                "file_path": row.file_path,
                "file_name": os.path.basename(row.file_path),
                "version": row.version, # Eğer version sütununu geri eklediyseniz, bunu burada kullanın
                                        # Yoksa bu satırı silin
                "upload_date": row.upload_date.isoformat() if row.upload_date else None,
                "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            }
        })
    except Exception as e:
        print(f"XML dosyası çekilirken hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"XML dosyası çekilirken bir hata oluştu: {str(e)}"}), 500