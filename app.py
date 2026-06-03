import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "success", "message": "Backend is Alive!"})

@app.route('/analyze', methods=['POST'])
def analyze_code():
    data = request.json
    handle = data.get('handle')
    problem_id = data.get('problem_id')
    user_code = data.get('user_code')
    friends_codes = data.get('friends_codes', {}) # Dictionary: { "akshat": "code...", "dharahas": "code..." }

    if not user_code:
        return jsonify({"status": "error", "message": "Tumhara main code nahi mila."})

    print(f"Analyzing {problem_id} for {handle} + {len(friends_codes)} friends.")

    # Doston ka code string format mein tayar karna
    friends_context = ""
    if friends_codes:
        for friend_name, f_code in friends_codes.items():
            friends_context += f"\n\n--- Friend: {friend_name} ---\n{f_code}\n"
    else:
        friends_context = "No friends have solved this problem yet."

    prompt = f"""
    Act as an expert Competitive Programmer and Tech Interviewer. Analyze the following C++ codes for Codeforces problem {problem_id}.
    
    CRITICAL RULES FOR OUTPUT FORMAT:
    1. DO NOT use any Markdown formatting (no asterisks *, no hashes #, no backticks `). Output pure plain text only.
    2. IGNORE ALL CP TEMPLATES. Focus STRICTLY on the core logic inside the main() function and explicitly called helper functions.
    3. Do NOT write any explanations for time or space complexity. Just give the exact values for the MAIN USER's code.
    4. USE ADVANCED REASONING: Recall the exact problem statement and constraints for Codeforces {problem_id}. Evaluate if the solutions meet these strict mathematical constraints.
    5. You MUST follow this exact structure below:

    TC: - [Main User Exact Time Complexity]
    SC: - [Main User Exact Space Complexity]
    best solution:- [Name of the friend with the most optimal TC/SC, or "Main User" if theirs is best. If no friends data, write N/A]
    shortest Solution:- [Name of the friend with the cleanest/shortest core logic, or "Main User". If no friends data, write N/A]

    Constraint Check & Optimal Approach:
    - [Did the main user's code meet the expected time/space constraints for {problem_id}? What is the theoretically most optimal approach?]

    Interview & Code Improvements (For Main User):
    - [Point 1: What is wrong in the core logic]
    - [Point 2: Suggestions for cleaner C++ STL utilization]
    - [Point 3: Edge cases missed or structural improvements]

    Peer Insights & Comparisons:
    - [Briefly explain WHY the 'best solution' was chosen. What did they do differently in their core logic?]

    Alternative Approaches by Peers:
    [List if any friend used a completely different algorithm/approach. Format exactly as: "FriendName solved it using:- [Algorithm/Approach]". If none, write "None"]
    
    === MAIN USER ({handle}) CODE ===
    {user_code}

    === FRIENDS' CODES ===
    {friends_context}
    """

    try:
        response = model.generate_content(prompt)
        print("Analysis Complete!")
        return jsonify({"status": "success", "summary": response.text})
    except Exception as e:
        print(f"\n🔥 GEMINI ERROR: {str(e)}\n")
        return jsonify({"status": "error", "message": "AI se connect hone mein error aaya."})

if __name__ == '__main__':
    app.run(debug=True, port=5000)