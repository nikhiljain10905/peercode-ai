document.addEventListener("DOMContentLoaded", () => {
    const analyzeBtn = document.getElementById("analyzeBtn");
    const handleInput = document.getElementById("cfHandle");

    // FIX 1: Chrome Storage se handle read karna (Asynchronous hota hai)
    chrome.storage.local.get(["cfHandle"], (result) => {
        if (result.cfHandle) {
            handleInput.value = result.cfHandle;
        }
    });

    analyzeBtn.addEventListener("click", async () => {
        const handle = handleInput.value.trim();
        if (!handle) {
            alert("Bhai, pehle apna Codeforces Handle toh daal!");
            return;
        }

        // FIX 2: Chrome Storage mein handle save karna
        chrome.storage.local.set({ "cfHandle": handle });

        // 1. UI ko Loading state mein daalo
        analyzeBtn.innerText = "Checking CF API...";
        analyzeBtn.style.backgroundColor = "#9ca3af"; 
        analyzeBtn.disabled = true;

        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // 2. URL se Contest ID aur Problem Index nikalna
        let problemMatch = tab.url.match(/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/) || 
                           tab.url.match(/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);

        if (!problemMatch) {
            alert("Error: Please open a specific Codeforces problem page!");
            resetButton();
            return;
        }

        const contestId = problemMatch[1];
        const index = problemMatch[2];

        // 3. Codeforces API Call
        try {
            const response = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=50`);
            const data = await response.json();

            if (data.status !== "OK") {
                alert("Codeforces API Error. Handle check karo ya API down hai.");
                resetButton();
                return;
            }

            // 4. Check for "OK" verdict
            const submissions = data.result;
            const acceptedSubmission = submissions.find(sub => 
                sub.problem.contestId == contestId && 
                sub.problem.index == index && 
                sub.verdict === "OK"
            );

            if (acceptedSubmission) {
                // SUCCESS: Backend Server Call
                analyzeBtn.innerText = "Accepted! Sending to AI...";
                analyzeBtn.style.backgroundColor = "#10b981"; 
                
                try {
                    const aiResponse = await fetch("http://127.0.0.1:5000/analyze", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            handle: handle,
                            problem_id: `${contestId}${index}`,
                            submission_id: acceptedSubmission.id
                        })
                    });

                    const aiData = await aiResponse.json();
                    
                    if(aiData.status === "success") {
                        alert(aiData.summary); 
                        analyzeBtn.innerText = "Analysis Complete!";
                    } else {
                        alert("Backend logic failed: " + aiData.message);
                        resetButton();
                    }
                } catch (backendError) {
                    alert("Backend server is not running! VS Code mein 'python app.py' chalao.");
                    resetButton();
                }

            } else {
                // FAILED: Not accepted yet
                analyzeBtn.innerText = "Make your correct submission first";
                analyzeBtn.style.backgroundColor = "#ef4444"; 
            }

        } catch (error) {
            alert("Network Error while connecting to Codeforces API.");
            resetButton();
        }
    });

    // Helper function
    function resetButton() {
        analyzeBtn.innerText = "Analyze Code";
        analyzeBtn.style.backgroundColor = "#3b82f6";
        analyzeBtn.disabled = false;
    }
});