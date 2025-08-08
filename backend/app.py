from flask import jsonify
from flask_cors import CORS


from codesys_doc_tracker import createApp
from codesys_doc_tracker.initialize_db import createDB


from api.users import apiUsers
from api.auth import apiAuth
from api.diffs import apiDiff
from api.xmlfiles import apiXMLFiles
from api.notes import apiNotes
from api.relations import apiRelations
from api.filters import apiFilters
from api.excelDiff import apiExcelDiff
from api.xmlMerge import apiXMLMerge


# Diğer blueprintler ileride buraya eklenecek


# APP AND DB CREATION ---------------------------------------------------------
app = createApp()
CORS(app)
createDB()
# -----------------------------------------------------------------------------



# BLUEPRINT REGISTERS ---------------------------------------------------------
app.register_blueprint(apiUsers)
app.register_blueprint(apiAuth)
app.register_blueprint(apiDiff)
app.register_blueprint(apiXMLFiles)
app.register_blueprint(apiNotes)
app.register_blueprint(apiRelations)
app.register_blueprint(apiFilters)
app.register_blueprint(apiExcelDiff)
app.register_blueprint(apiXMLMerge)


# Ana test endpoint'i
@app.route("/")
def index():
    return jsonify({"success": True, "message": "Codesys Doc Tracker API is running."})

# Uygulamayı çalıştır
if __name__ == "__main__":
    app.run(debug=True, port=5000)
