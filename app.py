import os
import json
import mysql.connector
import re 
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- SECURITY: Rate Limiter Setup ---
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

# Helper function to connect to MySQL
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "success", "message": "Backend is Alive!"})

@app.route('/analyze', methods=['POST'])
@app.route('/analyze', methods=['POST'])
@limiter.limit("5 per minute") # SECURITY: Max 5 requests per minute per user
def analyze_code():
    data = request.json
    handle = data.get('handle')
    problem_id = data.get('problem_id')
    user_code = data.get('user_code')
    friends_codes = data.get('friends_codes', {})
    force_live = data.get('force_live', False)

    # --- SECURITY: Input Validation ---
    if not handle or not problem_id or len(str(handle)) > 50:
        return jsonify({"status": "error", "message": "Invalid Input Data."})
        
    # Check if problem_id is alphanumeric (e.g., "1791A") to prevent payload injections
    if not re.match(r"^\d+[A-Za-z0-9]+$", str(problem_id)):
        return jsonify({"status": "error", "message": "Mismatched Problem ID format."})

    if not user_code:
        return jsonify({"status": "error", "message": "Tumhara main code nahi mila."})

    # ... (Baaki poora database aur Gemini ka logic exactly same rahega) ...
    friends_list = list(friends_codes.keys())
    friends_list.sort()
    friends_hash = ",".join(friends_list) if friends_list else "none"

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # --- CACHING LOGIC (Bypass if force_live is True) ---
    if not force_live:
        try:
            cursor.execute(
                "SELECT ai_summary FROM analysis_cache WHERE problem_id = %s AND friends_hash = %s", 
                (problem_id, friends_hash)
            )
            cached_result = cursor.fetchone()

            if cached_result:
                print(f"⚡ CACHE HIT! Serving analysis for {problem_id}.")
                cursor.close()
                conn.close()
                return jsonify({"status": "success", "summary": cached_result['ai_summary'], "source": "cache"})
        except Exception as e:
            print(f"Database Error: {str(e)}")
    else:
        print("🔄 FORCE LIVE selected! Bypassing Cache...")

    # --- GEMINI API CALL ---
    print(f"🚀 Asking Gemini for {problem_id} (Main: {handle}).")
    
    friends_context = ""
    if friends_codes:
        for friend_name, f_code in friends_codes.items():
            friends_context += f"\n\n--- Friend: {friend_name} ---\n{f_code}\n"
    else:
        friends_context = "No friends have solved this problem yet."

    # UPDATED PROMPT: Adds Optimal TC/SC explicitly
    prompt = f"""
    Act as an expert Competitive Programmer and Tech Interviewer. Analyze the following C++ codes for Codeforces problem {problem_id}.
    
    CRITICAL RULES FOR OUTPUT FORMAT:
    1. DO NOT use any Markdown formatting (no asterisks *, no hashes #, no backticks `). Output pure plain text only.
    2. IGNORE ALL CP TEMPLATES. Focus STRICTLY on the core logic.
    3. Do NOT write any explanations for time or space complexity. Just give the exact values.
    4. USE ADVANCED REASONING: Recall the exact problem statement and constraints for Codeforces {problem_id}.
    
    You MUST follow this exact structure below:

    Main User TC: - [Main Exact Time Complexity]
    Main User SC: - [Main Exact Space Complexity]
    Optimal TC: - [Theoretical Best Time Complexity for this problem]
    Optimal SC: - [Theoretical Best Space Complexity for this problem]
    best solution:- [Name of the friend with the most optimal TC/SC, or "Main User" if theirs is best. Write N/A if no friends data]
    shortest Solution:- [Name of the friend with the cleanest/shortest core logic, or "Main User". Write N/A if no friends data]

    Constraint Check & Optimal Approach:
    - [Did the main user's code meet the expected time/space constraints for {problem_id}? What is the theoretically most optimal approach?]

    Interview & Code Improvements (For Main User):
    - [Point 1: What is wrong in the core logic]
    - [Point 2: Suggestions for cleaner C++ STL utilization]
    - [Point 3: Edge cases missed or structural improvements]

    Peer Insights & Comparisons:
    - [Briefly explain WHY the 'best solution' was chosen. What did they do differently?]

    Alternative Approaches by Peers:
    [List if any friend used a completely different algorithm/approach. Format exactly as: "FriendName solved it using:- [Algorithm]". If none, write "None"]
    
    === MAIN USER ({handle}) CODE ===
    {user_code}

    === FRIENDS' CODES ===
    {friends_context}
    """

    try:
        response = model.generate_content(prompt)
        ai_text = response.text
        
        # --- SAVE/UPDATE CACHE ---
        try:
            # Puraana delete karke naya insert karna (taaki REPLACE ho jaye)
            cursor.execute("DELETE FROM analysis_cache WHERE problem_id = %s AND friends_hash = %s", (problem_id, friends_hash))
            cursor.execute(
                "INSERT INTO analysis_cache (problem_id, main_handle, friends_hash, ai_summary) VALUES (%s, %s, %s, %s)",
                (problem_id, handle, friends_hash, ai_text)
            )
            conn.commit()
        except Exception as db_err:
            print(f"Failed to save to cache: {str(db_err)}")
        finally:
            cursor.close()
            conn.close()

        return jsonify({"status": "success", "summary": ai_text, "source": "gemini"})
        
    except Exception as e:
        print(f"\n🔥 GEMINI ERROR: {str(e)}\n")
        return jsonify({"status": "error", "message": "AI se connect hone mein error aaya."})

if __name__ == '__main__':
    app.run(debug=True, port=5000)