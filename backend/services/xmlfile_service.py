# services/xmlfile_service.py

import os
from datetime import datetime
from typing import Optional, Dict, Set

from sqlalchemy import or_

from codesys_doc_tracker import db
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from codesys_doc_tracker.models.diff_model import Diff  # <-- bağlı diff'leri silebilmek için


DEFAULT_EXPORT_DIR = "CodesysXML_Export"


def _export_base_dir(base_dir: Optional[str] = None) -> str:
    """
    Taranacak kök klasörü belirler.
    ENV: CODESYS_XML_EXPORT_DIR varsa onu, yoksa DEFAULT_EXPORT_DIR'i kullanır.
    """
    base = base_dir or os.environ.get("CODESYS_XML_EXPORT_DIR", DEFAULT_EXPORT_DIR)
    return os.path.normpath(base)


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _iter_xml_files(base_dir: str, recursive: bool = True):
    """
    base_dir altındaki .xml dosyalarını (recursive seçime göre) üretir.
    """
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
    """
    Karşılaştırmalar için slash'ları normalize eder (Windows/Unix tutarlılığı).
    """
    return os.path.normpath(p).replace("\\", "/")


def _path_for_db(abs_path: str, base_dir: str) -> str:
    """
    DB'de tutulan yol formatını üretir:
      <base_name>/<relative_inside_base>
    Ör: 'CodesysXML_Export/sub/f1.xml'
    """
    base_name = os.path.basename(base_dir.rstrip("\\/"))
    rel_inside = os.path.relpath(abs_path, start=base_dir)
    raw = os.path.join(base_name, rel_inside)
    return _canonize_slashes(raw)


def scan_and_sync_xml_files(base_dir: Optional[str] = None, recursive: bool = True) -> Dict[str, int]:
    """
    Export klasörünü tarar, yeni .xml dosyalarını DB'ye ekler ve
    export klasöründen silinmiş dosyaları DB'den kaldırır.

    Dönüş:
        {"added": <int>, "removed": <int>}
    """
    export_dir = _export_base_dir(base_dir)
    _ensure_dir(export_dir)

    base_name = os.path.basename(export_dir.rstrip("\\/"))

    added = 0
    removed = 0

    # 1) Dosya sisteminde şu an var olan tüm dosyaların, DB-formatındaki (kanonik) yolları
    fs_db_paths: Set[str] = set()
    for abs_path in _iter_xml_files(export_dir, recursive=recursive):
        abs_path = os.path.normpath(abs_path)
        db_path = _path_for_db(abs_path, export_dir)  # daima forward-slash
        fs_db_paths.add(db_path)

        # DB'de yoksa ekle
        exists = XMLFile.query.filter_by(file_path=db_path).first()
        if exists:
            continue

        row = XMLFile(
            file_path=db_path,
            upload_date=datetime.utcnow(),
        )
        db.session.add(row)
        added += 1

    # 2) DB'deki kayıtlar içinde, bu export köküne ait olup artık FS'te bulunmayanları sil
    #    (Farklı köklerden gelebilecek kayıtları yanlışlıkla silmemek için base_name ile süz.)
    for row in XMLFile.query.all():
        row_path = _canonize_slashes(row.file_path)  # DB'deki mevcut kayıt
        if not row_path.startswith(base_name + "/"):
            # Bu kayıt farklı bir kökten geliyor olabilir; dokunma.
            continue

        if row_path not in fs_db_paths:
            # ---- ÖNCE bağlı Diff kayıtlarını kaldır ----
            (
                db.session.query(Diff)
                .filter(or_(Diff.xmlfile_old_id == row.id, Diff.xmlfile_new_id == row.id))
                .delete(synchronize_session=False)
            )
            # ---- Sonra XML kaydını sil ----
            db.session.delete(row)
            removed += 1

    if added or removed:
        db.session.commit()

    return {"added": added, "removed": removed}


# Eski isimle geriye dönük uyumluluk:
def scan_and_register_xml_files(base_dir: Optional[str] = None, recursive: bool = True) -> int:
    """
    Eski fonksiyon ismi. Yeni senaryoda eklenen sayısını döndürür.
    """
    result = scan_and_sync_xml_files(base_dir=base_dir, recursive=recursive)
    return result.get("added", 0)
