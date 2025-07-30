import os
from datetime import datetime
from typing import Optional

from codesys_doc_tracker import db
from codesys_doc_tracker.models.xmlfile_model import XMLFile


# Varsayılan export klasörü (env ile override edilebilir)
DEFAULT_EXPORT_DIR = "CodesysXML_Export"


def _export_base_dir(base_dir: Optional[str] = None) -> str:
    """
    Export klasörünün temel yolunu döndürür.
    Öncelik: parametre > env(CODESYS_XML_EXPORT_DIR) > DEFAULT_EXPORT_DIR
    """
    base = base_dir or os.environ.get("CODESYS_XML_EXPORT_DIR", DEFAULT_EXPORT_DIR)
    return os.path.normpath(base)


def _ensure_dir(path: str) -> None:
    """Klasör yoksa oluşturur."""
    os.makedirs(path, exist_ok=True)


def _iter_xml_files(base_dir: str, recursive: bool = True):
    """
    Verilen klasördeki .xml dosyalarını döner.
    recursive=True ise alt klasörleri de gezer.
    """
    if recursive:
        for root, _dirs, files in os.walk(base_dir):
            for name in files:
                if name.lower().endswith(".xml"):
                    yield os.path.join(root, name)
    else:
        # Sadece tek seviyeyi tara
        for name in os.listdir(base_dir):
            full = os.path.join(base_dir, name)
            if os.path.isfile(full) and name.lower().endswith(".xml"):
                yield full


def _path_for_db(abs_path: str, base_dir: str) -> str:
    """
    DB'de saklanacak yol stringini üretir.
    - Kayıtları 'CodesysXML_Export\\...' formatında saklamak için
      base klasör adını önek olarak kullanır.
    - Örn: abs_path = C:\\...\\CodesysXML_Export\\2025-07-30\\a.xml
           base_dir = C:\\...\\CodesysXML_Export
           DB path  = CodesysXML_Export\\2025-07-30\\a.xml
    """
    base_name = os.path.basename(base_dir.rstrip("\\/"))
    rel_inside = os.path.relpath(abs_path, start=base_dir)
    db_path = os.path.normpath(os.path.join(base_name, rel_inside))
    return db_path


def scan_and_register_xml_files(base_dir: Optional[str] = None, recursive: bool = True) -> int:
    """
    Export klasörünü tarar ve yeni .xml dosyalarını XMLFile tablosuna ekler.
    Dönüş: eklenen kayıt sayısı (int)

    Not: Bu fonksiyonun Flask app context'i içinde çağrılması gerekir:
        with app.app_context():
            scan_and_register_xml_files()
    """
    export_dir = _export_base_dir(base_dir)
    _ensure_dir(export_dir)

    added = 0

    for abs_path in _iter_xml_files(export_dir, recursive=recursive):
        abs_path = os.path.normpath(abs_path)

        # DB'de saklanacak path (proje kökünden bağımsız, sabit ön ek: klasör adı)
        db_path = _path_for_db(abs_path, export_dir)

        # Zaten kayıtlı mı?
        exists = XMLFile.query.filter_by(file_path=db_path).first()
        if exists:
            continue

        # Yeni kayıt oluştur
        row = XMLFile(
            file_path=db_path,                # Örn: "CodesysXML_Export\\2025-07-30\\a.xml"
            timestamp=datetime.utcnow()
        )
        db.session.add(row)
        added += 1

    if added:
        db.session.commit()

    return added
