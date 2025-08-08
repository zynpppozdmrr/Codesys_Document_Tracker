import os
import pandas as pd
from typing import List, Dict, Set, Optional, Tuple
from werkzeug.utils import secure_filename
from codesys_doc_tracker import db
from codesys_doc_tracker.models.excel_model import ExcelFile

EXCEL_EXPORT_DIR = "ExcelExports"
ALLOWED_EXTS = {".xlsx", ".xls"}


# ---------- Yardımcılar ----------

def _export_base_dir(base_dir: Optional[str] = None) -> str:
    """
    Excel export dizininin temel yolunu döndürür.
    """
    base = base_dir or os.environ.get("EXCEL_UPLOAD_DIR", EXCEL_EXPORT_DIR)
    return os.path.normpath(base)


def _ensure_dir(path: str) -> None:
    """
    Belirtilen dizinin var olmasını sağlar.
    """
    os.makedirs(path, exist_ok=True)


def _iter_excel_files(base_dir: str, recursive: bool = True):
    """
    Belirtilen dizindeki tüm Excel dosyalarını listeler.
    """
    if recursive:
        for root, _dirs, files in os.walk(base_dir):
            for name in files:
                if name.lower().endswith(tuple(ALLOWED_EXTS)):
                    yield os.path.join(root, name)
    else:
        for name in os.listdir(base_dir):
            full = os.path.join(base_dir, name)
            if os.path.isfile(full) and name.lower().endswith(tuple(ALLOWED_EXTS)):
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
    Dosya adının benzersiz olmasını sağlar.
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

def scan_and_sync_excel_files(base_dir: Optional[str] = None, recursive: bool = True) -> Dict[str, int]:
    """
    Yerel dosya sistemindeki Excel dosyalarını tarar ve veritabanı ile senkronize eder.
    """
    export_dir = _export_base_dir(base_dir)
    _ensure_dir(export_dir)
    base_name = os.path.basename(export_dir.rstrip("\\/"))

    added = 0
    fs_db_paths: Set[str] = set()

    for abs_path in _iter_excel_files(export_dir, recursive=recursive):
        abs_path = os.path.normpath(abs_path)
        db_path = _path_for_db(abs_path, export_dir)
        fs_db_paths.add(db_path)

        if not ExcelFile.get_by_path(db_path):
            ExcelFile.create(file_path=db_path)
            added += 1

    removed = ExcelFile.delete_missing_files(fs_db_paths, base_name)

    return {"added": added, "removed": removed}


def get_file_path_by_id(file_id: int) -> Optional[str]:
    """
    Verilen file_id'ye karşılık gelen dosyanın tam yolunu döndürür.
    """
    excelfile = ExcelFile.query.get(file_id)
    if not excelfile:
        return None
    
    relative_path = excelfile.file_path
    base_dir = _export_base_dir()
    full_path = os.path.join(base_dir, os.path.basename(relative_path))
    
    return os.path.normpath(full_path)


def save_uploaded_excels(file_storages: List) -> Dict[str, List[Dict]]:
    """
    Yüklenen Excel dosyalarını kaydeder ve veritabanını senkronize eder.
    """
    export_dir = _export_base_dir()
    _ensure_dir(export_dir)

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
            skipped.append({"filename": fn, "reason": "Sadece .xlsx ve .xls desteklenir"})
            continue

        target_abs, _ = _unique_target_path(export_dir, fn)

        try:
            fs.save(target_abs)
        except Exception as e:
            skipped.append({"filename": fn, "reason": f"Kaydedilemedi: {e}"})
            continue

    rescan_result = scan_and_sync_excel_files()
    
    message = f"{rescan_result.get('added', 0)} yeni dosya eklendi, {rescan_result.get('removed', 0)} dosya silindi."

    new_files = ExcelFile.list_all()
    
    saved_files = []
    for f in new_files:
        saved_files.append({
            "id": f.id, 
            "file_name": os.path.basename(f.file_path),
            "file_path": f.file_path
        })
    
    return {"saved": saved_files, "skipped": skipped, "message": message}


def compare_excel_files_by_id(file1_id: int, file2_id: int) -> Optional[List[Dict]]:
    """
    Verilen ID'lere sahip iki Excel dosyasını karşılaştırır ve farkları döndürür.
    """
    file1_path = get_file_path_by_id(file1_id)
    file2_path = get_file_path_by_id(file2_id)

    if not file1_path or not file2_path:
        raise FileNotFoundError("Dosyalardan biri veya ikisi bulunamadı.")

    try:
        df1 = pd.read_excel(file1_path)
        df2 = pd.read_excel(file2_path)
    except Exception as e:
        raise ValueError(f"Excel dosyası okuma hatası: {e}")

    # Farklılıkları bulmak için basit bir karşılaştırma (satır bazlı)
    # Varsayım: Her iki dosyada da aynı sütunlar aynı sırada.
    # Daha gelişmiş bir karşılaştırma için pandas.testing.assert_frame_equal veya benzeri kullanılabilir.
    
    diffs = []

    # İki DataFrame'i birleştirip farklı olanları bulalım
    merged_df = pd.merge(df1, df2, on=list(df1.columns), how='outer', indicator=True)
    
    diff_df = merged_df[merged_df['_merge'] != 'both']
    
    # Sadece sol ve sağ tarafta olanları göster
    left_only = diff_df[diff_df['_merge'] == 'left_only'].drop(columns=['_merge'])
    right_only = diff_df[diff_df['_merge'] == 'right_only'].drop(columns=['_merge'])

    if not left_only.empty:
        diffs.append({
            "file": os.path.basename(file1_path),
            "differences": left_only.to_dict('records')
        })

    if not right_only.empty:
        diffs.append({
            "file": os.path.basename(file2_path),
            "differences": right_only.to_dict('records')
        })
    
    return diffs