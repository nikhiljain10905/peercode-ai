# 🚀 PeerCode AI

**An AI-Powered Tech Interviewer & Peer Analyzer for Codeforces**

Ever wished you had an expert mentor to review your competitive programming code, compare it with your friends, and tell you exactly how to improve? That's exactly what PeerCode does. 

It is a Chrome Extension and backend ecosystem that analyzes your Codeforces submissions, seamlessly extracts code, and uses Google's Gemini AI to break down your Time/Space complexity just like a real tech interview.

---

## ✨ What's Inside

* **Smart "Ghost-Tab" Scraping:** Reliably extracts submission data using an asynchronous background tab, naturally bypassing Cloudflare protections without heavy bot-like workarounds.
* **AI Code Review (Gemini 2.5):** Evaluates problem constraints, calculates exact TC/SC, and highlights algorithmic flaws compared to theoretically optimal approaches.
* **Multi-Peer Comparison:** Fetches and compares your code with up to 5 friends simultaneously to figure out who wrote the cleanest and most optimal logic.
* **High-Speed Caching:** Uses a MySQL database layer to cache AI summaries. Repeated queries hit the cache and load in `<100ms`, drastically reducing API wait times.
* **Production-Grade Security:** The backend doesn't just work; it's secure. It features `Flask-Limiter` to prevent API abuse, Regex for input validation, and Parameterized Queries to block SQL injections.
* **Force Live Analysis:** Optimized your code after a bad review? Just check the "Force Live" box to bypass the database cache and get a fresh AI analysis.

---

## 🏗️ How it Works Under the Hood

The architecture is split into three main layers to keep things fast and modular:

1. **The Client (Chrome Extension):** Built with Vanilla JavaScript. It handles the UI, state management via Chrome Storage, and orchestrates the asynchronous scraping.
2. **The Engine (Python/Flask REST API):** Processes incoming code, structures the context for the LLM, handles rate-limiting, and talks to the Gemini API.
3. **The Memory (MySQL):** A relational database acting as a caching layer. It hashes problem IDs and peer lists to ensure you only query the AI when absolutely necessary.

### Tech Stack
**Frontend:** JavaScript, Chrome Extensions API (Manifest V3), HTML, CSS  
**Backend:** Python, Flask, Gunicorn  
**AI & Database:** Google Gemini 2.5 Flash, MySQL, mysql-connector-python

---

## ⚙️ Getting Started (Local Setup)

If you want to run PeerCode locally, follow these steps to get the environment up and running.

### 1. Database Setup
Ensure you have MySQL Server installed, then run this schema to create the caching table:
```sql
CREATE DATABASE peercode_db;
USE peercode_db;

CREATE TABLE analysis_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id VARCHAR(50) NOT NULL,
    main_handle VARCHAR(100) NOT NULL,
    friends_hash VARCHAR(255) NOT NULL,
    ai_summary TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Backend Setup
Clone the repository and install the required Python dependencies:
```bash
pip install -r requirements.txt
```
Create a `.env` file in the root directory to store your credentials safely:
```env
GEMINI_API_KEY=your_gemini_api_key
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=peercode_db
```
Start the local Flask server:
```bash
python app.py
```

### 3. Extension Setup
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer Mode** (top right corner).
3. Click **Load unpacked** and select the folder containing your extension files.
4. Pin the extension to your browser toolbar.

---

## 💡 How to Use

1. Navigate to a Codeforces problem page that you've successfully solved.
2. Open the PeerCode extension and enter your Codeforces Handle.
3. *(Optional)* Enter up to 5 friends' handles (comma-separated) to see how your code stacks up against theirs.
4. Hit **Analyze Code**. The extension will scrape the code, query the backend, and open a clean, full-screen results tab with your feedback.
