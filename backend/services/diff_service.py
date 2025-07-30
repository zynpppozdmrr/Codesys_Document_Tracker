# services/diff_service.py

import os
import difflib # difflib import edilmiş
import uuid
import datetime
from codesys_doc_tracker import db
from codesys_doc_tracker.models.xmlfile_model import XMLFile

# Configurable directory for saving diff reports
DIFF_REPORTS_DIR = os.environ.get("DIFF_REPORTS_DIR", "DiffReports")

# Ensure the diff reports directory exists
if not os.path.exists(DIFF_REPORTS_DIR):
    os.makedirs(DIFF_REPORTS_DIR)

def generate_and_save_diff(file1_id: int, file2_id: int) -> tuple[str, str]:
    """
    Veritabanından iki XML dosyasını çeker, aralarındaki farkları metin tabanlı olarak oluşturur,
    kaydeder ve kaydedilen dosya adını ile bir özeti döndürür.
    """
    file1 = XMLFile.query.get(file1_id)
    file2 = XMLFile.query.get(file2_id)

    if not file1 or not file2:
        raise ValueError("Belirtilen dosyalardan biri veya ikisi bulunamadı.")

    try:
        with open(file1.file_path, 'r', encoding='utf-8') as f:
            text1 = f.read()
        with open(file2.file_path, 'r', encoding='utf-8') as f:
            text2 = f.read()
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Dosya okuma hatası: {e}. Dosya yollarının doğru olduğundan ve erişilebilir olduğundan emin olun.")
    except Exception as e:
        raise Exception(f"Dosya içeriği okunurken bir hata oluştu: {e}")

    # Dosya adlarını file_path'ten çıkaralım
    file1_name = os.path.basename(file1.file_path)
    file2_name = os.path.basename(file2.file_path)

    # difflib.unified_diff kullanarak metin tabanlı farkı oluştur
    # fromfile ve tofile parametreleri diff çıktısının başlığında kullanılır
    diff_lines = difflib.unified_diff(
        text1.splitlines(keepends=True), # Satır sonlarını koru
        text2.splitlines(keepends=True), # Satır sonlarını koru
        fromfile=f"OLD: {file1_name}",
        tofile=f"NEW: {file2_name}",
        lineterm='' # unify_diff varsayılan olarak newline ekler, burada istemediğimiz için boş bıraktık
    )
    
    # Diff satırlarını tek bir string'e birleştir
    text_diff = "".join(diff_lines)

    # Benzersiz dosya adı oluşturma (.txt uzantılı)
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    diff_filename = f"diff_report_{timestamp}_{unique_id}.txt" # <-- .txt uzantısı
    file_path = os.path.join(DIFF_REPORTS_DIR, diff_filename)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text_diff) # HTML yerine metin farkını yaz

    # Basit bir özet oluşturma
    diff_summary = f"{file1_name} ile {file2_name} arasındaki metin farkı başarıyla oluşturuldu."
    
    return diff_filename, diff_summary


def get_diff_report_html_content(filename: str) -> str:
    """
    Belirtilen diff rapor dosyasının HTML içeriğini (şimdi metin içeriği) okur ve döndürür.
    Fonksiyon adı 'html_content' olarak kalabilir, ancak artık metin döndürüyor.
    """
    file_path = os.path.join(DIFF_REPORTS_DIR, filename)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Diff rapor dosyası bulunamadı: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    return content