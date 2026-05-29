from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Enabling CORS
CORS(app)

# Health Check Route
@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "success", "message": "PeerCode AI Backend is Alive!"})

# Main AI Analysis Route
@app.route('/analyze', methods=['POST'])
def analyze_code():
    data = request.json
    handle = data.get('handle')
    problem_id = data.get('problem_id')
    
    print(f"Extension se request aayi hai! Handle: {handle}, Problem: {problem_id}")

    # Abhi hum AI call nahi kar rahe, sirf dummy response bhej rahe hain test karne ke liye
    return jsonify({
        "status": "success",
        "summary": f"Backend connected successfully! Ready to analyze {problem_id} for {handle}."
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)