import os
import xml.etree.ElementTree as ET
from typing import Optional, Tuple
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from services.xmlfile_service import get_file_path_by_id

# Yeni kod bloğunun ekleneceği başlangıç ve bitiş işaretçileri
# Bu işaretçiler, XML dosyasındaki "MESSAGE AREA" yorumlarını temsil eder.
INSERTION_START_MARKER = "//MESSAGE------"
INSERTION_END_MARKER = "//-----------------------------------------------------------------------------------------------------------------------------"

def merge_xml_and_get_content(file_id: int, new_xml_block: str) -> Optional[str]:
    """
    Belirtilen ID'deki XML dosyasına yeni bir kod bloğu ekler ve birleştirilmiş içeriği döndürür.
    Kod bloğunu, dosyadaki 'MESSAGE AREA' işaretçilerinin bulunduğu alana ekler.
    """
    print(f"DEBUG: merge_xml_and_get_content çağrıldı. file_id: {file_id}")
    try:
        file_path = get_file_path_by_id(file_id)
        if not file_path or not os.path.exists(file_path):
            print(f"Hata: Dosya ID'si bulunamadı veya dosya mevcut değil: {file_id}")
            return None

        # Dosyayı metin olarak oku
        with open(file_path, 'r', encoding='utf-8') as f:
            file_content = f.read()

        # Eklenecek yeni kod bloğunu hazırlama
        # Kullanıcının girdiği kod bloğunu CDATA içinde sararak XML'e uygun hale getiririz
        new_pou_code = f"\n{new_xml_block}\n" # Basitçe yeni bloğu ekle

        # Ekleme noktasını bulma
        # İlk 'MESSAGE AREA' işaretçisinin sonunu buluyoruz
        insertion_point = file_content.find(INSERTION_END_MARKER)
        
        if insertion_point == -1:
            print("Hata: Birleştirme hedefi olan 'MESSAGE AREA' işaretçisi bulunamadı.")
            return None

        # Yeni kodu, işaretçinin hemen sonrasına ekle
        # Bu, en üstteki MESSAGE AREA'nın altına ekler
        merged_content = file_content[:insertion_point] + new_pou_code + file_content[insertion_point:]

        return merged_content

    except Exception as e:
        print(f"Beklenmeyen bir hata oluştu: {e}")
        return None