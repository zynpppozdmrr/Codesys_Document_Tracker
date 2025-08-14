# backend/seed_glossary.py
from typing import List, Tuple
from sqlalchemy.exc import IntegrityError

# Uygulama ve DB
try:
    # app.py içinde "app = Flask(__name__)" varsa:
    from app import app
except ImportError:
    # Eğer dosyayı wsgi.py olarak yeniden adlandırdıysan:
    from wsgi import app

from codesys_doc_tracker import db
from codesys_doc_tracker.models.glossary_model import Glossary  # lazy import'a gerek yok; scriptte döngü olmaz

PROJECT_ITEMS = [
  { "code": "IPAx3",          "desc": "",                                  "type": "1", "order":  2, "no": "1002" },
  { "code": "URFAx12",        "desc": "",                                  "type": "1", "order":  3, "no": "1003" },
  { "code": "YYAx1",          "desc": "",                                  "type": "1", "order":  4, "no": "1004" },
  { "code": "YYTx1",          "desc": "",                                  "type": "1", "order":  5, "no": "1005" },
  { "code": "TIMTROx33",      "desc": "Timisoara Troleybüs 18m",           "type": "1", "order":  6, "no": "1006" },
  { "code": "ALIBUSx2",       "desc": "İzmir Aliağa Ebus",                 "type": "1", "order":  7, "no": "1007" },
  { "code": "HOMTRO",         "desc": "Homologasyon 18m Troleybüs",        "type": "1", "order":  8, "no": "1008" },
  { "code": "PRGTROx7",       "desc": "Prag Troleybüs",                    "type": "1", "order":  9, "no": "1009" },
  { "code": "TIMTROx33",      "desc": "Timisoara Troleybüs 12m",           "type": "1", "order": 10, "no": "1010" },
  { "code": "YYAx1",          "desc": "YYA Ebus 18m - CS için eklendi",    "type": "1", "order": 11, "no": "1011" },

  { "code": "TIM&IASIx56",    "desc": "",                                  "type": "2", "order":  1, "no": "2001" },
  { "code": "GEBx7",          "desc": "",                                  "type": "2", "order":  2, "no": "2002" },
  { "code": "IST100x25",      "desc": "",                                  "type": "2", "order":  3, "no": "2003" },

  { "code": "Charger V2x1",   "desc": "",                                  "type": "3", "order":  3, "no": "3003" },

  { "code": "VEMSx1",         "desc": "",                                  "type": "4", "order": None, "no": "400X" },
  { "code": "VEMS_LRVx1",     "desc": "",                                  "type": "4", "order": None, "no": "400X" },

  { "code": "PAPIS_KAYBUS",   "desc": "",                                  "type": "4", "order":  1, "no": "4001" },
  { "code": "IST100PAPISx25", "desc": "",                                  "type": "4", "order":  2, "no": "4002" },
  { "code": "SAMLRVPAPISx10", "desc": "",                                  "type": "4", "order":  3, "no": "4003" },
  { "code": "ALIBUSPAPISx2",  "desc": "",                                  "type": "4", "order":  5, "no": "4005" },
]

def seed() -> None:
    with app.app_context():
        # (İsteğe bağlı) tablo yoksa oluştur
        try:
            db.create_all()
        except Exception:
            pass

        # Mevcut (code, project_no) çiftlerini oku
        existing: List[Tuple[str, str]] = db.session.query(Glossary.code, Glossary.project_no).all()
        existing_set = set(existing)

        to_insert = []
        for it in PROJECT_ITEMS:
            key = (it["code"], it["no"])
            if key in existing_set:
                continue  # zaten var, atla

            g = Glossary(
                code=it["code"],
                desc=(it.get("desc") or None),
                type_code=it["type"],
                order_no=it.get("order"),
                project_no=it["no"],
            )
            to_insert.append(g)

        if not to_insert:
            print("Yeni eklenecek kayıt yok. (Tüm öğeler zaten mevcut)")
            return

        try:
            db.session.add_all(to_insert)
            db.session.commit()
            print(f"Tamamlandı: {len(to_insert)} kayıt eklendi.")
        except IntegrityError as ie:
            db.session.rollback()
            print("Unique constraint hatası (muhtemelen aynı (code,no) tekrar eklendi):", ie)
        except Exception as e:
            db.session.rollback()
            print("Hata:", e)

if __name__ == "__main__":
    seed()
