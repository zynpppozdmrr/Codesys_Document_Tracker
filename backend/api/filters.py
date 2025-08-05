from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from flask_cors import CORS
import os
import re

from codesys_doc_tracker.models.xmlfile_model import XMLFile
from services.filter_service import (
    extract_filtered_signals,
    export_signals_to_excel
)

# Blueprint'i tanımla
apiFilters = Blueprint("apiFilters", __name__, url_prefix="/api/filters")
CORS(apiFilters)

@apiFilters.route("/filter_xml", methods=["POST"])
@jwt_required()
def filter_xml_file():
    """
    Kullanıcıdan gelen dosya ID'si ve anahtar kelimelere göre filtreleme yapar.
    """
    data = request.get_json()
    file_id = data.get("file_id")
    keywords = data.get("keywords", [])

    if not file_id or not keywords:
        return jsonify({"success": False, "message": "Dosya ID'si ve anahtar kelimeler gerekli."}), 400

    results, message = extract_filtered_signals(file_id, keywords)

    if results is False:
        return jsonify({"success": False, "message": message}), 500
    
    if not results:
        return jsonify({"success": True, "results": []}), 200

    return jsonify({"success": True, "results": results}), 200

@apiFilters.route("/export-signal-table", methods=["POST"])
@jwt_required()
def export_signal_table():
    """
    Tüm sinyal tablolarını Excel'e aktarır ve indirilmek üzere sunar.
    """
    data = request.get_json()
    file_id = data.get("file_id")
    
    if not file_id:
        return jsonify({"success": False, "message": "Dosya ID'si gerekli."}), 400

    success, message_or_path = export_signals_to_excel(file_id)

    if not success:
        return jsonify({"success": False, "message": message_or_path}), 500

    return send_file(message_or_path, as_attachment=True, download_name=os.path.basename(message_or_path))