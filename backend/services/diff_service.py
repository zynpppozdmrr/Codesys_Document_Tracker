# services/diff_service.py
import os
from datetime import datetime
from difflib import unified_diff

from codesys_doc_tracker import db
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from codesys_doc_tracker.models.diff_model import Diff

# İstersen burada klasör adını özelleştirebilirsin
XML_EXPORT_DIR = os.environ.get("CODESYS_XML_EXPORT_DIR", "CodesysXML_Export")
DIFF_REPORTS_DIR = os.environ.get("DIFF_REPORTS_DIR", "DiffReports")


def _ensure_dirs():
    os.makedirs(XML_EXPORT_DIR, exist_ok=True)
    os.makedirs(DIFF_REPORTS_DIR, exist_ok=True)


def _read_lines(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return f.read().splitlines()


def generate_and_save_diff(old_id: int, new_id: int):
    """
    1) DB'den eski/yeni XMLFile kayıtlarını bulur
    2) Dosyaları okur ve unified diff üretir
    3) DiffReports klasörüne rapor olarak kaydeder
    4) Diff tablosuna (old_id, new_id, generated_at) kaydeder
    5) Özet bilgiyi döner
    """
    _ensure_dirs()

    if old_id == new_id:
        raise ValueError("Karşılaştırma için iki farklı XML seçmelisiniz.")

    old_file = XMLFile.query.get(old_id)
    new_file = XMLFile.query.get(new_id)

    if not old_file:
        raise FileNotFoundError(f"XMLFile(id={old_id}) bulunamadı.")
    if not new_file:
        raise FileNotFoundError(f"XMLFile(id={new_id}) bulunamadı.")

    old_path = os.path.normpath(old_file.file_path)
    new_path = os.path.normpath(new_file.file_path)

    if not os.path.exists(old_path):
        raise FileNotFoundError(f"Eski dosya bulunamadı: {old_path}")
    if not os.path.exists(new_path):
        raise FileNotFoundError(f"Yeni dosya bulunamadı: {new_path}")

    old_lines = _read_lines(old_path)
    new_lines = _read_lines(new_path)

    diff_lines = list(unified_diff(
        old_lines,
        new_lines,
        fromfile=f"OLD: {os.path.basename(old_path)}",
        tofile=f"NEW: {os.path.basename(new_path)}",
        lineterm=""
    ))

    # Diff rapor dosya adı (ör: diff_12_15_20250730_131530.txt)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    diff_filename = f"diff_{old_id}_{new_id}_{ts}.txt"
    diff_file_path = os.path.join(DIFF_REPORTS_DIR, diff_filename)

    # Raporu yaz
    with open(diff_file_path, "w", encoding="utf-8") as f:
        if diff_lines:
            f.write("\n".join(diff_lines))
        else:
            f.write("No changes.\n")

    # Diff kaydını DB'ye yaz
    diff_row = Diff(
        xmlfile_old_id=old_id,
        xmlfile_new_id=new_id,
        generated_at=datetime.utcnow()
    )
    db.session.add(diff_row)
    db.session.commit()

    return {
        "diff_id": diff_row.id,
        "diff_filename": diff_filename,
        "diff_file_path": diff_file_path,
        "line_count": len(diff_lines),
        "old_file_path": old_path,
        "new_file_path": new_path
    }


def resolve_diff_path_by_id(diff_id: int) -> str:
    """
    Diff id'sinden rapor dosyasının adını ve yolunu çözer.
    Diff kaydında dosya adı saklamıyoruz; dosyayı isme göre değil,
    rapor klasöründe desenle aramak da mümkün. En kolayı:
    diff_id biliniyor → en yakın eşleşen dosya adını bul.
    """
    _ensure_dirs()
    # Basit yaklaşım: diff_OLD_NEW_*.txt şeklinde yazdığımız için
    # ID'den değil, dosya listesinden döndürmek daha güvenli olur.
    # Alternatif olarak Diff tablosuna 'report_filename' alanı ekleyebilirsin.
    # Şimdilik klasörde tarayıp geri döndürelim (opsiyonel).
    # Burayı istersen boş bırakabilir veya ileride geliştirebilirsin.
    raise NotImplementedError("Dosya adını DB'de saklamak istersen Diff'e 'report_filename' sütunu ekle.")
