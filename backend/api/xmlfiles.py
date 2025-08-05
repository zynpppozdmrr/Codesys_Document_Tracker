import os
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from flask_cors import CORS

from codesys_doc_tracker.models.xmlfile_model import XMLFile
from services.xmlfile_service import (
    save_uploaded_xmls,
    delete_xml_file,
)

apiXMLFiles = Blueprint("apiXMLFiles", __name__, url_prefix="/api/xmlfiles")
CORS(apiXMLFiles)


# ---------- LİSTELEME ----------
@apiXMLFiles.route("/", methods=["GET"])
@apiXMLFiles.route("", methods=["GET"])
@jwt_required()
def list_xml_files():
    try:
        rows = XMLFile.list_all()
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
        # Yeni dönüş formatı ile başarılı yanıt döndür
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




# ---------- TEK BİR DOSYANIN DETAYINI GETİRME ----------
@apiXMLFiles.route("/<int:file_id>", methods=["GET"])
@jwt_required()
def get_xml_file_details(file_id: int):
    try:
        xmlfile = XMLFile.query.get(file_id)
        if not xmlfile:
            return jsonify({"success": False, "message": "Dosya bulunamadı."}), 404
        
        # Dosyaya ait diff'leri bul
        from codesys_doc_tracker.models.diff_model import Diff
        related_diffs = Diff.query.filter(
            (Diff.xmlfile_old_id == file_id) | (Diff.xmlfile_new_id == file_id)
        ).all()
        
        diffs_data = []
        for diff in related_diffs:
            # Her diff'e ait notları ve ilişkilerini çek
            notes_data = [note.to_dict() for note in diff.notes]
            
            diff_dict = {
                "id": diff.id,
                # İlişki adlarını `diff_model.py` dosyanızla eşleştirdik
                "file_old_name": os.path.basename(diff.old_file.file_path) if diff.old_file else None,
                "file_new_name": os.path.basename(diff.new_file.file_path) if diff.new_file else None,
                "diff_content": diff.diffReport_name, # diff_content alanını diffReport_name olarak güncelledik
                "timestamp": diff.created_at.isoformat() if diff.created_at else None, # created_at kullanıyoruz
                "notes": notes_data
            }
            diffs_data.append(diff_dict)

        file_data = {
            "id": xmlfile.id,
            "file_name": os.path.basename(xmlfile.file_path),
            "upload_date": xmlfile.upload_date.isoformat() if xmlfile.upload_date else None,
            "timestamp": xmlfile.timestamp.isoformat() if xmlfile.timestamp else None,
            "diffs": diffs_data
        }
        
        return jsonify({"success": True, "file": file_data}), 200
    except Exception as e:
        print(f"Detay getirme hatası: {e}")
        return jsonify({"success": False, "message": f"Detay getirme hatası: {e}"}), 500



