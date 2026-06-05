document.addEventListener("DOMContentLoaded", () => {
    const resultText = document.getElementById("resultText");
    const sourceBadge = document.getElementById("sourceBadge");
    const copyBtn = document.getElementById("copyBtn");

    // Chrome storage se analysis data nikalna
    chrome.storage.local.get(["latestAnalysis", "analysisSource"], (data) => {
        if (data.latestAnalysis) {
            resultText.textContent = data.latestAnalysis;
            
            // Cache ya Live AI ka badge update karna
            if (data.analysisSource === "cache") {
                sourceBadge.textContent = "⚡ INSTANT CACHE HIT";
                sourceBadge.className = "badge cache";
            } else {
                sourceBadge.textContent = "🧠 LIVE AI ANALYSIS";
                sourceBadge.className = "badge live";
            }
        } else {
            resultText.textContent = "No analysis found. Please run the extension again.";
            sourceBadge.style.display = "none";
        }
    });

    // Copy to Clipboard logic
    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(resultText.textContent).then(() => {
            copyBtn.textContent = "Copied! ✅";
            copyBtn.style.backgroundColor = "#10b981"; // Green color on success
            
            // 2 second baad wapas normal kar do
            setTimeout(() => {
                copyBtn.textContent = "Copy to Clipboard";
                copyBtn.style.backgroundColor = "#3b82f6";
            }, 2000);
        });
    });
});