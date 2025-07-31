# services/xmlfile_service.py

import os
from datetime import datetime
from typing import Optional

from codesys_doc_tracker import db
from codesys_doc_tracker.models.xmlfile_model import XMLFile


DEFAULT_EXPORT_DIR = "CodesysXML_Export"


def _export_base_dir(base_dir: Optional[str] = None) -> str:
    base = base_dir or os.environ.get("CODESYS_XML_EXPORT_DIR", DEFAULT_EXPORT_DIR)
    return os.path.normpath(base)


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _iter_xml_files(base_dir: str, recursive: bool = True):
    if recursive:
        for root, _dirs, files in os.walk(base_dir):
            for name in files:
                if name.lower().endswith(".xml"):
                    yield os.path.join(root, name)
    else:
        for name in os.listdir(base_dir):
            full = os.path.join(base_dir, name)
            if os.path.isfile(full) and name.lower().endswith(".xml"):
                yield full


def _path_for_db(abs_path: str, base_dir: str) -> str:
    base_name = os.path.basename(base_dir.rstrip("\\/"))
    rel_inside = os.path.relpath(abs_path, start=base_dir)
    db_path = os.path.normpath(os.path.join(base_name, rel_inside))
    return db_path


def scan_and_register_xml_files(base_dir: Optional[str] = None, recursive: bool = True) -> int:
    export_dir = _export_base_dir(base_dir)
    _ensure_dir(export_dir)

    added = 0

    for abs_path in _iter_xml_files(export_dir, recursive=recursive):
        abs_path = os.path.normpath(abs_path)
        db_path = _path_for_db(abs_path, export_dir)

        exists = XMLFile.query.filter_by(file_path=db_path).first()
        if exists:
            continue

        row = XMLFile(
            file_path=db_path,
            upload_date=datetime.utcnow(),
            # version="1.0" # <-- Kaldırıldı
        )
        db.session.add(row)
        added += 1

    if added:
        db.session.commit()

    return added