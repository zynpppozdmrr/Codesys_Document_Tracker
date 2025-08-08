import os
import re
import pandas as pd
from datetime import datetime
from html import unescape

from codesys_doc_tracker.models.xmlfile_model import XMLFile
from services.xmlfile_service import DEFAULT_EXPORT_DIR

# Projenin temel dizinini dinamik olarak bul
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# Excel dışa aktarma klasörünün tam yolunu oluştur ve oluştur
EXPORT_DIR = os.path.join(BASE_DIR, "backend/ExcelExports")
os.makedirs(EXPORT_DIR, exist_ok=True)

def extract_filtered_signals(file_id: int, keywords: list) -> tuple:
    """
    XML dosyasından anahtar kelimelere göre sinyal verilerini çeker.
    """
    xml_file = XMLFile.query.get(file_id)
    if not xml_file:
        return None, "Dosya bulunamadı."
    
    full_path_for_filter = xml_file.file_path
    normalized_path = os.path.normpath(full_path_for_filter)
    
    if not os.path.exists(normalized_path):
        return False, f"Dosya yolu bulunamadı: {normalized_path}"

    results = []
    
    try:
        with open(normalized_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        st_block_pattern = re.compile(r'<ST>.*?<xhtml[^>]*>(.*?)</xhtml>.*?</ST>', re.DOTALL | re.IGNORECASE)
        match = st_block_pattern.search(content)

        if match:
            st_content = match.group(1)
            st_content = unescape(st_content)

            current_id = ""
            lines = st_content.split('\n')
            for line in lines:
                # Düzeltme: Onaltılık (hexadecimal) ID'leri çeken regex
                id_match = re.search(r'ID:([0-9a-fA-F]+)', line)
                if id_match:
                    current_id = id_match.group(1)
                
                signal_match = re.search(
                    r'//-*\s*SIGNAL\s*->\s*(?P<signal_name>\S+)\s*'
                    r'Max\s*:\s*(?P<max>.*?)\s*'
                    r'Min\s*:\s*(?P<min>.*?)\s*'
                    r'Def\s*:\s*(?P<def>.*?)\s*'
                    r'Resolution\s*:\s*(?P<res>.*?)\s*'
                    r'Offset\s*:\s*(?P<off>.*?)\s*$',
                    line
                )
                
                if signal_match:
                    signal_name = signal_match.group('signal_name')
                    if any(keyword.strip() == signal_name.strip() for keyword in keywords):
                        results.append({
                            "ID": current_id,
                            "keyword": signal_name,
                            "Max": signal_match.group('max').strip(),
                            "Min": signal_match.group('min').strip(),
                            "Def": signal_match.group('def').strip(),
                            "Resolution": signal_match.group('res').strip(),
                            "Offset": signal_match.group('off').strip()
                        })
        else:
            return False, "ST bloğu veya xhtml bloğu XML dosyasında bulunamadı."
            
    except Exception as e:
        return False, f"Filtreleme fonksiyonu içinde hata: {e}"

    return results, None

def export_signals_to_excel(file_id: int) -> tuple:
    """
    Bir XML dosyasındaki tüm sinyalleri çeker ve Excel'e dönüştürür.
    """
    xml_file = XMLFile.query.get(file_id)
    if not xml_file:
        return False, "Dosya bulunamadı."

    full_path = xml_file.file_path
    normalized_path = os.path.normpath(full_path)

    if not os.path.exists(normalized_path):
        return False, f"Dosya yolu bulunamadı: {normalized_path}"

    try:
        with open(normalized_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return False, f"Dosya okunamadı: {str(e)}"

    data = []
    st_block_pattern = re.compile(r'<ST>.*?<xhtml[^>]*>(.*?)</xhtml>.*?</ST>', re.DOTALL | re.IGNORECASE)
    match = st_block_pattern.search(content)

    if match:
        st_content = match.group(1)
        st_content = unescape(st_content)
        
        current_id = ""
        lines = st_content.split('\n')
        for line in lines:
            # Düzeltme: Onaltılık (hexadecimal) ID'leri çeken regex
            id_match = re.search(r'ID:([0-9a-fA-F]+)', line)
            if id_match:
                current_id = id_match.group(1)
            
            signal_match = re.search(
                r'//-*\s*SIGNAL\s*->\s*(?P<signal_name>\S+)\s*'
                r'Max\s*:\s*(?P<max>.*?)\s*'
                r'Min\s*:\s*(?P<min>.*?)\s*'
                r'Def\s*:\s*(?P<def>.*?)\s*'
                r'Resolution\s*:\s*(?P<res>.*?)\s*'
                r'Offset\s*:\s*(?P<off>.*?)\s*$',
                line
            )
            
            if signal_match:
                data.append([
                    current_id,
                    signal_match.group('signal_name'),
                    signal_match.group('res').strip(),
                    signal_match.group('off').strip(),
                    signal_match.group('min').strip(),
                    signal_match.group('max').strip(),
                    signal_match.group('def').strip()
                ])

    if not data:
        return False, "Sinyal verisi bulunamadı"

    df = pd.DataFrame(data, columns=["ID", "Signal Name", "Resolution", "Offset", "Min", "Max", "Default"])

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    excel_filename = f"signal_table_{file_id}_{timestamp}.xlsx"
    excel_path = os.path.join(EXPORT_DIR, excel_filename)
    df.to_excel(excel_path, index=False)

    return True, excel_path