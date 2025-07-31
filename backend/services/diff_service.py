import os
import difflib
import uuid
import datetime
from codesys_doc_tracker import db
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from codesys_doc_tracker.models.diff_model import Diff  

# Configurable directory for saving diff reports
DIFF_REPORTS_DIR = os.environ.get("DIFF_REPORTS_DIR", "DiffReports")

# Ensure the diff reports directory exists
if not os.path.exists(DIFF_REPORTS_DIR):
    os.makedirs(DIFF_REPORTS_DIR)

def generate_and_save_filtered_diff(file1_id: int, file2_id: int) -> tuple[str, str]:
    """
    Veritabanından iki XML dosyasını çeker, farkları oluşturur, gereksiz diff başlıklarını ve metadata'yı filtreleyerek kaydeder.
    Ayrıca diff çıktısını veritabanına kaydeder.
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
    except Exception as e:
        raise Exception(f"Dosya okunurken hata oluştu: {e}")

    file1_name = os.path.basename(file1.file_path)
    file2_name = os.path.basename(file2.file_path)

    diff_lines = difflib.unified_diff(
        text1.splitlines(keepends=True),
        text2.splitlines(keepends=True),
        fromfile=f"OLD: {file1_name}",
        tofile=f"NEW: {file2_name}",
        lineterm=''
    )

 
    filtered_lines = []
    for line in diff_lines:
        if line.startswith('--- OLD') or line.startswith('+++ NEW'):
            continue  # diff başlıklarını atla
        if line.startswith('@@'):
            continue  # @@ -1,7 +1,7 @@ gibi konum bilgilerini atla
        if line.strip().startswith('<?xml') or line.strip().startswith('<project xmlns='):
            continue  # XML başlangıç satırlarını atla
        if line.strip().startswith('<coordinateInfo>') or '<coordinateInfo>' in line:
            continue  # XML içindeki koordinat bilgilerini atla
        if line.strip().startswith('<fbd>') or '<fbd>' in line:
            continue  # fbd bloğunu atla
        if line.strip().startswith('<scaling') or '<scaling' in line:
            continue  # scaling satırını atla
        filtered_lines.append(line)

    text_diff = ''.join(filtered_lines)

    # Dosya adı karşılaştırılan XML adlarını içersin
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    diff_filename = f"{file1_name}_VS_{file2_name}_{timestamp}_{unique_id}.txt"
    file_path = os.path.join(DIFF_REPORTS_DIR, diff_filename)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text_diff)

    # Diff çıktısını veritabanına kaydet
    Diff.create(
        old_id=file1_id,
        new_id=file2_id,
        diff_name=diff_filename,
        diff_path=file_path
    )

    summary = f"{file1_name} ile {file2_name} arasındaki metin farkı başarıyla oluşturuldu (filtrelenmiş)."
    return diff_filename, summary

def get_diff_report_html_content(filename: str) -> str:
    """
    Belirtilen diff rapor dosyasının içeriğini okur ve döndürür.
    """
    file_path = os.path.join(DIFF_REPORTS_DIR, filename)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Diff rapor dosyası bulunamadı: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    return content
