
const symptomForm = document.getElementById("symptomForm");
const analyzeBtn = document.getElementById("analyzeBtn");

const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const resultContent = document.getElementById("resultContent");
const errorMessage = document.getElementById("errorMessage");
const emergencyAlert = document.getElementById("emergencyAlert");

const analysisText = document.getElementById("analysisText");
const disclaimerText = document.getElementById("disclaimerText");
const downloadBtn = document.getElementById("downloadBtn");

let latestReport = null;

function hidePreviousMessages() {
    errorMessage.hidden = true;
    emergencyAlert.hidden = true;
    resultContent.hidden = true;
    loadingState.hidden = true;
    emptyState.hidden = true;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    loadingState.hidden = true;
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML =
        '<span>✦</span> Analyze My Symptoms <span class="button-arrow">→</span>';
}

function formatAnalysis(text) {
    // Display plain text safely; do not interpret AI output as HTML.
    analysisText.textContent = text;
}

symptomForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!symptomForm.reportValidity()) {
        return;
    }

    const patient = {
        age: document.getElementById("age").value,
        sex: document.getElementById("sex").value || "Not provided",
        symptoms: document.getElementById("symptoms").value.trim(),
        duration: document.getElementById("duration").value,
        severity: document.getElementById("severity").value,
        history: document.getElementById("history").value.trim() || "Not provided",
        medications: document.getElementById("medications").value.trim() || "Not provided",
        allergies: document.getElementById("allergies").value.trim() || "Not provided"
    };

    if (!patient.symptoms) {
        showError("Please describe your symptoms before continuing.");
        return;
    }

    hidePreviousMessages();
    latestReport = null;

    loadingState.hidden = false;
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    try {
        const response = await fetch("/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(patient)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to analyze symptoms.");
        }

        if (data.urgent_warning && data.emergency_message) {
            emergencyAlert.textContent = data.emergency_message;
            emergencyAlert.hidden = false;
        }

        formatAnalysis(data.analysis || "No analysis was returned.");

        disclaimerText.textContent = data.disclaimer ||
            "This is general health information, not a medical diagnosis.";

        latestReport = {
            patient: patient,
            analysis: data.analysis || "No analysis was returned.",
            disclaimer: disclaimerText.textContent,
            emergencyMessage: data.emergency_message || "",
            createdAt: new Date().toLocaleString()
        };

        loadingState.hidden = true;
        resultContent.hidden = false;

        // Move keyboard and screen-reader users to the result.
        document.getElementById("resultsPanel").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        showError(
            error.message ||
            "Unable to connect to the application. Please try again."
        );
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML =
            '<span>✦</span> Analyze My Symptoms <span class="button-arrow">→</span>';
    }
});

downloadBtn.addEventListener("click", function () {
    if (!latestReport) {
        return;
    }

    const patient = latestReport.patient;

    const report = `
MEDIASSIST AI
MEDICAL SYMPTOM INFORMATION REPORT
==================================

Generated: ${latestReport.createdAt}

PATIENT INFORMATION
-------------------
Age: ${patient.age}
Sex: ${patient.sex}
Symptoms: ${patient.symptoms}
Duration: ${patient.duration}
Severity: ${patient.severity}
Medical history: ${patient.history}
Current medications: ${patient.medications}
Known allergies: ${patient.allergies}

AI-GENERATED HEALTH INFORMATION
-------------------------------
${latestReport.analysis}

${latestReport.emergencyMessage
    ? "URGENT WARNING\n--------------\n" + latestReport.emergencyMessage + "\n"
    : ""}

MEDICAL DISCLAIMER
-----------------
${latestReport.disclaimer}

This report is for informational and educational purposes only.
It is not a medical diagnosis and does not replace professional
medical evaluation or treatment.
`.trim();

    const blob = new Blob([report], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "MediAssist_Symptom_Report.txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});
