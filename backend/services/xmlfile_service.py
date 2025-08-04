import os
from datetime import datetime
from typing import Optional, Dict, Set, List, Tuple

from werkzeug.utils import secure_filename

from codesys_doc_tracker.models.xmlfile_model import XMLFile
from codesys_doc_tracker.models.diff_model import Diff

DEFAULT_EXPORT_DIR = "CodesysXML_Export"
ALLOWED_EXTS = {".xml"}


# ---------- Yardımcılar ----------

def _export_base_dir(base_dir: Optional[str] = None) -> str:
    """
    Export dizininin temel yolunu döndürür. Ortam değişkeni veya varsayılan dizin kullanılır.
    """
    base = base_dir or os.environ.get("CODESYS_XML_EXPORT_DIR", DEFAULT_EXPORT_DIR)
    return os.path.normpath(base)


def _ensure_dir(path: str) -> None:
    """
    Belirtilen dizinin var olmasını sağlar. Eğer yoksa oluşturur.
    """
    os.makedirs(path, exist_ok=True)


def _iter_xml_files(base_dir: str, recursive: bool = True):
    """
    Belirtilen dizindeki tüm XML dosyalarını (opsiyonel olarak alt dizinlerde) listeler.
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
    Yol ayracını sistemden bağımsız hale getirir.
    """
    return os.path.normpath(p).replace("\\", "/")


def _path_for_db(abs_path: str, base_dir: str) -> str:
    """
    Veritabanında saklamak için göreli bir dosya yolu oluşturur.
    """
    base_name = os.path.basename(base_dir.rstrip("\\/"))
    rel_inside = os.path.relpath(abs_path, start=base_dir)
    raw = os.path.join(base_name, rel_inside)
    return _canonize_slashes(raw)


def _unique_target_path(dir_path: str, file_name: str) -> Tuple[str, str]:
    """
    Dosya adının benzersiz olmasını sağlar, eğer aynı isimde dosya varsa sonuna sayı ekler.
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


# ---------- Tarama & Temizleme ----------

def scan_and_sync_xml_files(base_dir: Optional[str] = None, recursive: bool = True) -> Dict[str, int]:
    """
    Yerel dosya sistemindeki XML dosyalarını tarar ve veritabanı ile senkronize eder.
    """
    export_dir = _export_base_dir(base_dir)
    _ensure_dir(export_dir)
    base_name = os.path.basename(export_dir.rstrip("\\/"))

    added = 0
    fs_db_paths: Set[str] = set()

    for abs_path in _iter_xml_files(export_dir, recursive=recursive):
        abs_path = os.path.normpath(abs_path)
        db_path = _path_for_db(abs_path, export_dir)
        fs_db_paths.add(db_path)

        if not XMLFile.get_by_path(db_path):
            XMLFile.create(file_path=db_path)
            added += 1

    removed = XMLFile.delete_missing_files(fs_db_paths, base_name)

    return {"added": added, "removed": removed}


def scan_and_register_xml_files(base_dir: Optional[str] = None, recursive: bool = True) -> int:
    """
    scan_and_sync_xml_files fonksiyonunu çağırır ve eklenen dosya sayısını döndürür.
    """
    result = scan_and_sync_xml_files(base_dir=base_dir, recursive=recursive)
    return result.get("added", 0)


# ---------- Upload & Silme ----------

def save_uploaded_xmls(file_storages: List) -> Dict[str, List[Dict]]:
    """
    Yüklenen XML dosyalarını kaydeder ve veritabanını otomatik olarak senkronize eder.
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

        target_abs, final_name = _unique_target_path(export_dir, fn)

        try:
            fs.save(target_abs)
        except Exception as e:
            skipped.append({"filename": fn, "reason": f"Kaydedilemedi: {e}"})
            continue

    # Dosya kaydetme işlemi tamamlandıktan sonra, veritabanını tarayıp senkronize et
    rescan_result = scan_and_sync_xml_files()
    
    # Yeni eklenen ve silinen dosyalar hakkında bilgi veren bir mesaj oluştur
    message = f"{rescan_result.get('added', 0)} yeni dosya eklendi, {rescan_result.get('removed', 0)} dosya silindi."

    # Güncel dosya listesini veritabanından al
    new_files = XMLFile.list_all()
    
    saved_files = []
    for f in new_files:
        saved_files.append({
            "id": f.id, 
            "file_name": os.path.basename(f.file_path),
            "file_path": f.file_path
        })
    
    # Güncellenmiş sonuçları döndür
    return {"saved": saved_files, "skipped": skipped, "message": message}


def delete_xml_file(file_id: int) -> bool:
    """
    Belirtilen ID'ye sahip XML dosyasını diskten ve veritabanından siler.
    """
    return XMLFile.delete_by_id_with_diffs(file_id)
