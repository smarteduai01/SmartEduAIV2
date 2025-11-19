from flask import Flask, request, jsonify, session
from flask_cors import CORS
from pymongo import MongoClient
from urllib.parse import quote_plus
import bcrypt
from functools import wraps

# -----------------------------------------
# FLASK INITIALIZATION
# -----------------------------------------
app = Flask(__name__)
app.secret_key = "SUPER_SECRET_KEY_CHANGE_THIS"   # important for sessions
CORS(app, supports_credentials=True)


# -----------------------------------------
# MONGODB CONNECTION
# -----------------------------------------
username = quote_plus("JayanthSrinivas02")
password = quote_plus("gFVKHiFFX86oZ6wj")
uri = f"mongodb+srv://{username}:{password}@smarteduai.bo81fvz.mongodb.net/?appName=SmartEduAI"

client = MongoClient(uri)
db = client["QuizAI"]
users_col = db["users"]
quiz_results_col = db["quiz_results"]


# -----------------------------------------
# LOGIN REQUIRED DECORATOR
# -----------------------------------------
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'username' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated


# -----------------------------------------
# SIGNUP (username + password)
# Frontend also sends confirmPassword, but
# backend only needs username, password.
# -----------------------------------------
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    # Check if user exists
    if users_col.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 400

    # Hash password
    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    # Store user
    users_col.insert_one({
        "username": username,
        "password": hashed_pw
    })

    return jsonify({"message": "User created successfully"}), 201


# -----------------------------------------
# LOGIN
# -----------------------------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    # Check user
    user = users_col.find_one({"username": username})

    if user and bcrypt.checkpw(password.encode(), user["password"]):
        session["username"] = username  # Create session cookie
        return jsonify({
            "message": "Login successful",
            "username": username
        }), 200

    return jsonify({"error": "Invalid username or password"}), 401


# -----------------------------------------
# LOGOUT
# -----------------------------------------
@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200


# -----------------------------------------
# CHECK AUTH (for frontend persistent login)
# -----------------------------------------
@app.route("/check_auth", methods=["GET"])
def check_auth():
    if "username" in session:
        return jsonify({
            "authenticated": True,
            "username": session["username"]
        }), 200

    return jsonify({"authenticated": False}), 200


# -----------------------------------------
# RUN SERVER
# -----------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
