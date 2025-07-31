# services/xmlfile_service.py

import os
from datetime import datetime
from typing import Optional, Dict, Set, List, Tuple

from sqlalchemy import or_
from werkzeug.utils import secure_filename

from codesys_doc_tracker import db
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from codesys_doc_tracker.models.diff_model import Diff  # bağlı diffs'leri silebilmek için


DEFAULT_EXPORT_DIR = "CodesysXML_Export"
ALLOWED_EXTS = {".xml"}


# ---------- Yardımcılar ----------

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


def _canonize_slashes(p: str) -> str:
    return os.path.normpath(p).replace("\\", "/")


def _path_for_db(abs_path: str, base_dir: str) -> str:
    """DB'de tutulan yol formatı: <base_name>/<relative_inside_base>"""
    base_name = os.path.basename(base_dir.rstrip("\\/"))
    rel_inside = os.path.relpath(abs_path, start=base_dir)
    raw = os.path.join(base_name, rel_inside)
    return _canonize_slashes(raw)


def _unique_target_path(dir_path: str, file_name: str) -> Tuple[str, str]:
    """
    Aynı isim varsa sonuna (_1), (_2) ekleyerek benzersiz hale getirir.
    Returns: (abs_path, final_name)
    """
    base, ext = os.path.splitext(file_name)
    final = file_name
    abs_path = os.path.join(dir_path, final)
    i = 1
    while os.path.exists(abs_path):
        final = f"{base}({i}){ext}"
        abs_path = os.path.join(dir_path, final)
        i += 1
    return abs_path, final


# ---------- Scan & Sync (mevcut davranış + diff temizliği) ----------

def scan_and_sync_xml_files(base_dir: Optional[str] = None, recursive: bool = True) -> Dict[str, int]:
    """
    Export klasörünü tarar, yeni .xml dosyalarını DB'ye ekler ve
    export klasöründen silinmiş dosyaları DB'den (ve bağlı diff'leriyle birlikte) kaldırır.
    """
    export_dir = _export_base_dir(base_dir)
    _ensure_dir(export_dir)

    base_name = os.path.basename(export_dir.rstrip("\\/"))

    added = 0
    removed = 0

    # 1) FS'te mevcut .xml'ler
    fs_db_paths: Set[str] = set()
    for abs_path in _iter_xml_files(export_dir, recursive=recursive):
        abs_path = os.path.normpath(abs_path)
        db_path = _path_for_db(abs_path, export_dir)
        fs_db_paths.add(db_path)

        exists = XMLFile.query.filter_by(file_path=db_path).first()
        if exists:
            continue

        row = XMLFile(file_path=db_path, upload_date=datetime.utcnow())
        db.session.add(row)
        added += 1

    # 2) DB’de olup FS’te olmayanları sil (ve bağlı diff’leri)
    for row in XMLFile.query.all():
        row_path = _canonize_slashes(row.file_path)
        if not row_path.startswith(base_name + "/"):
            continue

        if row_path not in fs_db_paths:
            # Bağlı diffs
            (
                db.session.query(Diff)
                .filter(or_(Diff.xmlfile_old_id == row.id, Diff.xmlfile_new_id == row.id))
                .delete(synchronize_session=False)
            )
            db.session.delete(row)
            removed += 1

    if added or removed:
        db.session.commit()

    return {"added": added, "removed": removed}


# Geriye dönük uyumluluk
def scan_and_register_xml_files(base_dir: Optional[str] = None, recursive: bool = True) -> int:
    result = scan_and_sync_xml_files(base_dir=base_dir, recursive=recursive)
    return result.get("added", 0)


# ---------- Yeni: Yükleme & Silme ----------

def save_uploaded_xmls(file_storages: List) -> Dict[str, List[Dict]]:
    """
    Bir veya daha fazla FileStorage (werkzeug) alır, Export klasörüne kaydeder ve DB'ye ekler.
    Dönüş: {"saved": [...], "skipped": [...]}
    """
    export_dir = _export_base_dir()
    _ensure_dir(export_dir)

    saved = []
    skipped = []

    for fs in file_storages:
        if not fs:
            continue

        fn = secure_filename(fs.filename or "")
        if not fn:
            skipped.append({"filename": fs.filename, "reason": "Geçersiz dosya adı"})
            continue

        _, ext = os.path.splitext(fn)
        if ext.lower() not in ALLOWED_EXTS:
            skipped.append({"filename": fn, "reason": "Sadece .xml desteklenir"})
            continue

        # benzersiz hedef yol
        target_abs, final_name = _unique_target_path(export_dir, fn)

        try:
            fs.save(target_abs)
        except Exception as e:
            skipped.append({"filename": fn, "reason": f"Kaydedilemedi: {e}"})
            continue

        db_path = _path_for_db(target_abs, export_dir)

        # DB'ye ekle (zaten varsa tekrar eklemeyelim)
        exists = XMLFile.query.filter_by(file_path=db_path).first()
        if not exists:
            row = XMLFile(file_path=db_path, upload_date=datetime.utcnow())
            db.session.add(row)
            db.session.commit()
            saved.append({"id": row.id, "file_name": final_name, "file_path": db_path})
        else:
            saved.append({"id": exists.id, "file_name": final_name, "file_path": db_path})

    return {"saved": saved, "skipped": skipped}


def delete_xml_file(file_id: int) -> bool:
    """
    Tek bir XML kaydını hem diskten hem DB'den (ve bağlı diff'lerle birlikte) siler.
    """
    row = XMLFile.query.get(file_id)
    if not row:
        return False

    # Diski sil
    try:
        # DB'deki path genelde 'CodesysXML_Export/...' şeklinde relative
        abs_path = os.path.normpath(row.file_path)  # çalışma dizinine göre relative kullanılabilir
        if os.path.exists(abs_path):
            os.remove(abs_path)
    except Exception as e:
        # dosya yoksa sorun değil
        print(f"XML dosyası silinemedi: {row.file_path} - {e}")

    # Bağlı diffs'i temizle
    (
        db.session.query(Diff)
        .filter(or_(Diff.xmlfile_old_id == row.id, Diff.xmlfile_new_id == row.id))
        .delete(synchronize_session=False)
    )

    db.session.delete(row)
    db.session.commit()
    return True
