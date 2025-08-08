from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from flask_cors import CORS
import io
import os

from services.xml_merge_service import merge_xml_and_get_content
from codesys_doc_tracker.models.xmlfile_model import XMLFile

apiXMLMerge = Blueprint('apiXMLMerge', __name__, url_prefix='/api/xml/merge')
CORS(apiXMLMerge)

@apiXMLMerge.route('/', methods=['POST'])
@jwt_required()
def merge_xml_files():
    data = request.get_json()
    file_id = data.get('file_id')
    code_block = data.get('code_block')

    if not file_id or not code_block:
        return jsonify({"success": False, "message": "Dosya ID ve kod bloğu gereklidir."}), 400

    merged_xml_content = merge_xml_and_get_content(file_id, code_block)

    if merged_xml_content:
        xmlfile = XMLFile.query.get(file_id)
        
        # Dosya adını ve uzantısını ayır
        original_file_name_without_ext, file_ext = os.path.splitext(os.path.basename(xmlfile.file_path))

        # Yeni dosya adını oluştur: 'dosya_adı_merged.xml'
        merged_file_name = f'{original_file_name_without_ext}_merged{file_ext}'

        return jsonify({
            "success": True,
            "message": "XML dosyası başarıyla birleştirildi.",
            "content": merged_xml_content,
            "file_name": merged_file_name
        }), 200
    else:
        return jsonify({
            "success": False,
            "message": "Birleştirme işlemi sırasında bir hata oluştu. Lütfen dosya ID'sini veya XML formatını kontrol edin."
        }), 500

@apiXMLMerge.route('/download', methods=['POST'])
@jwt_required()
def download_merged_xml():
    data = request.get_json()
    merged_xml_content = data.get('content')
    file_name = data.get('file_name', 'merged_file.xml')

    if not merged_xml_content:
        return jsonify({"success": False, "message": "İndirilecek içerik bulunamadı."}), 400
    
    file_stream = io.BytesIO(merged_xml_content.encode('utf-8'))
    file_stream.seek(0)
    
    return send_file(
        file_stream,
        mimetype='application/xml',
        as_attachment=True,
        download_name=file_name
    )