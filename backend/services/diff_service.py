import os
import difflib
import datetime
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
        stripped = line.strip()
    
        if line.startswith('--- OLD') or line.startswith('+++ NEW'):
            continue  # diff başlıklarını atla
        if line.startswith('@@'):
            continue  # @@ -1,7 +1,7 @@ gibi konum bilgilerini atla

        # XML başlangıç ve özel içerikler
        if stripped.startswith('<?xml') or '<?xml' in line:
            continue  # XML bildirimi
        if stripped.startswith('<project xmlns=') or '<project xmlns=' in line:
            continue
        if stripped.startswith('<fileHeader') or '<fileHeader' in line:
            continue  # fileHeader'ı atla
        if stripped.startswith('<contentHeader') or '<contentHeader' in line:
            continue  # contentHeader'ı atla
        if stripped.startswith('<coordinateInfo>') or '<coordinateInfo>' in line:
            continue
        if stripped.startswith('<fbd>') or '<fbd>' in line:
            continue
        if stripped.startswith('<scaling') or '<scaling' in line:
            continue

        filtered_lines.append(line)

    text_diff = ''.join(filtered_lines)

    # Dosya adı karşılaştırılan XML adlarını içersin
    timestamp = datetime.datetime.now().strftime("%Y%m%d")
    diff_filename = f"{file1_name}_VS_{file2_name}_{timestamp}.txt"
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

    # Summary mesajı — eğer boşsa dosyalar aynı demektir
    if not text_diff.strip():
        summary = f"{file1_name} ile {file2_name} tamamen aynı görünüyor. Farklılık bulunamadı :("
    else:
        summary = f"{file1_name} ile {file2_name} arasındaki metin farkı başarıyla oluşturuldu :)"


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
