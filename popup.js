document.addEventListener("DOMContentLoaded", () => {
    const analyzeBtn = document.getElementById("analyzeBtn");
    const handleInput = document.getElementById("cfHandle");
    const friendsInput = document.getElementById("friendsHandles");
    const forceLiveCheckbox = document.getElementById("forceLive"); // Naya Checkbox

    // Load saved handles from Chrome Storage
    chrome.storage.local.get(["cfHandle", "friendsHandles"], (result) => {
        if (result.cfHandle) handleInput.value = result.cfHandle;
        if (result.friendsHandles) friendsInput.value = result.friendsHandles;
    });

    // Helper 1: Check if a user has solved the problem
    async function getAcceptedSubmissionId(targetHandle, contestId, index) {
        try {
            const res = await fetch(`https://codeforces.com/api/user.status?handle=${targetHandle}&from=1&count=50`);
            const data = await res.json();
            if (data.status !== "OK") return null;
            const accepted = data.result.find(sub => 
                sub.problem.contestId == contestId && sub.problem.index == index && sub.verdict === "OK"
            );
            return accepted ? accepted.id : null;
        } catch {
            return null;
        }
    }

    // Naya helper function: Code ko thodi der rokne ke liye
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // Helper 2: The Ghost Tab Scraper with Delay
    async function scrapeWithGhostTab(contestId, subId) {
        return new Promise((resolve) => {
            const url = `https://codeforces.com/contest/${contestId}/submission/${subId}`;
            chrome.tabs.create({ url: url, active: false }, (newTab) => {
                chrome.tabs.onUpdated.addListener(async function listener(tabId, info) {
                    if (tabId === newTab.id && info.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        
                        // FIX: Page load hone ke baad 1.5 seconds (1500ms) ka wait
                        await sleep(1500); 
                        
                        chrome.scripting.executeScript({
                            target: { tabId: newTab.id },
                            func: () => {
                                const el = document.getElementById("program-source-text");
                                return el ? el.innerText : null;
                            }
                        }, (results) => {
                            chrome.tabs.remove(newTab.id);
                            resolve(results && results[0] ? results[0].result : null);
                        });
                    }
                });
            });
        });
    }

    analyzeBtn.addEventListener("click", async () => {
        const handle = handleInput.value.trim();
        const friendsRaw = friendsInput.value.trim();
        const isForceLive = forceLiveCheckbox ? forceLiveCheckbox.checked : false; // Checkbox State
        
        if (!handle) {
            alert("Bhai, apna CF Handle toh daalo!");
            return;
        }

        let friendsArray = friendsRaw.split(",").map(f => f.trim()).filter(f => f.length > 0).slice(0, 5); 
        chrome.storage.local.set({ "cfHandle": handle, "friendsHandles": friendsArray.join(", ") });

        analyzeBtn.innerText = "Checking problem details...";
        analyzeBtn.style.backgroundColor = "#9ca3af"; 
        analyzeBtn.disabled = true;

        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let problemMatch = tab.url.match(/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/) || 
                           tab.url.match(/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);

        if (!problemMatch) {
            alert("Error: Please open a specific Codeforces problem page!");
            resetButton(); return;
        }

        const contestId = problemMatch[1];
        const index = problemMatch[2];

        try {
            // 1. Process Main User
            analyzeBtn.innerText = "Validating your submission...";
            const userSubId = await getAcceptedSubmissionId(handle, contestId, index);
            
            if (!userSubId) {
                analyzeBtn.innerText = "Make your correct submission first";
                analyzeBtn.style.backgroundColor = "#ef4444"; 
                return; // Stop here if main user hasn't solved it
            }

            analyzeBtn.innerText = "Scraping your code...";
            const userCode = await scrapeWithGhostTab(contestId, userSubId);
            
            if (!userCode) {
                alert("Failed to scrape your code.");
                resetButton(); return;
            }

            // 2. Process Friends
            let friendsCodes = {};
            for (let friend of friendsArray) {
                analyzeBtn.innerText = `Checking ${friend}...`;
                const friendSubId = await getAcceptedSubmissionId(friend, contestId, index);
                
                if (friendSubId) {
                    analyzeBtn.innerText = `Scraping ${friend}...`;
                    const fCode = await scrapeWithGhostTab(contestId, friendSubId);
                    if (fCode) friendsCodes[friend] = fCode;
                }
            }

            // 3. Send Everything to AI
            analyzeBtn.innerText = "Asking Gemini AI...";
            analyzeBtn.style.backgroundColor = "#10b981"; 

            const aiResponse = await fetch("https://peercode-ai.onrender.com/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    handle: handle,
                    problem_id: `${contestId}${index}`,
                    user_code: userCode,
                    friends_codes: friendsCodes,
                    force_live: isForceLive // Naya addition backend ke liye
                })
            });

            const aiData = await aiResponse.json();
            
            if(aiData.status === "success") {
                // Data ko Chrome storage mein save karo
                chrome.storage.local.set({
                    "latestAnalysis": aiData.summary,
                    "analysisSource": aiData.source
                }, () => {
                    // Alert hatakar naya full-screen tab khol do
                    chrome.tabs.create({ url: chrome.runtime.getURL("result.html") });
                });
        
                analyzeBtn.innerText = "Opening Results...";
            } 
            else {
                alert("Backend Error: " + aiData.message);
                resetButton();
            }

        } catch (error) {
            console.error(error);
            alert("Unexpected Error Occurred.");
            resetButton();
        }
    });

    function resetButton() {
        analyzeBtn.innerText = "Analyze Code";
        analyzeBtn.style.backgroundColor = "#3b82f6";
        analyzeBtn.disabled = false;
    }
});