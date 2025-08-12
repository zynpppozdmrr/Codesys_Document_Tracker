from codesys_doc_tracker import createApp, db
from services.xmlfile_service import scan_and_register_xml_files
from codesys_doc_tracker.models.user_model import User
from codesys_doc_tracker.models.diff_model import Diff
from codesys_doc_tracker.models.xmlfile_model import XMLFile
from codesys_doc_tracker.models.note_model import Note
from codesys_doc_tracker.models.relation_model import Relation
from codesys_doc_tracker.models.excel_model import ExcelFile
from codesys_doc_tracker.models.note_visibility_model import NoteVisibility
def createDB():
    app = createApp()
    with app.app_context():
        db.create_all()
        scan_and_register_xml_files()
        print("Database created successfully.")


