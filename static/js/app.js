/**
 * app.js
 * Client-side interactive controller for Wine Intelligence & NoSQL Website.
 * Gunda Venkatasai | CSE 494 CA2 Coursework
 */

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initDbStatus();
    initCharts();
    initNoSqlConsole();
    initClassifier();
    initDatasetExplorer();
    initDbModal();
});

/* ==========================================================================
   1. Tab Navigation
   ========================================================================== */
function initTabs() {
    const tabs = document.querySelectorAll(".nav-tab");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetId = `tab-${tab.getAttribute("data-tab")}`;
            
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.classList.add("active");
            }
        });
    });
}

/* ==========================================================================
   2. Database Status
   ========================================================================== */
async function initDbStatus() {
    try {
        const res = await fetch("/api/status");
        if (!res.ok) throw new Error("Failed to fetch status");
        const data = await res.json();

        const modeText = document.getElementById("dbModeText");
        const subText = document.getElementById("dbSubText");
        const badge = document.getElementById("nosqlDbBadge");
        const indicator = document.querySelector(".status-indicator");
        const modalMode = document.getElementById("modalCurrentMode");

        if (modeText) modeText.textContent = data.mode;
        if (subText) subText.textContent = `${data.database}.${data.collection} (${data.document_count} docs)`;
        if (badge) badge.textContent = `${data.database} / ${data.collection} • ${data.document_count} records`;
        if (modalMode) modalMode.textContent = `${data.mode} (${data.document_count} docs)`;

        if (data.is_atlas) {
            indicator.classList.remove("offline");
            indicator.classList.add("online");
        } else {
            indicator.classList.add("online");
        }
    } catch (err) {
        console.error("Status error:", err);
    }
}

/* ==========================================================================
   3. Charts (Chart.js)
   ========================================================================== */
let classDistChart = null;
let modelCompChart = null;

function initCharts() {
    // 1. Class Distribution Chart
    const classCtx = document.getElementById("classDistChart");
    if (classCtx && typeof Chart !== "undefined") {
        classDistChart = new Chart(classCtx, {
            type: "bar",
            data: {
                labels: ["Cultivar_1", "Cultivar_2", "Cultivar_3"],
                datasets: [{
                    label: "Number of Records",
                    data: [59, 71, 48],
                    backgroundColor: [
                        "rgba(16, 185, 129, 0.75)", // Emerald
                        "rgba(245, 158, 11, 0.75)", // Amber
                        "rgba(6, 182, 212, 0.75)"   // Cyan
                    ],
                    borderColor: [
                        "#10b981",
                        "#f59e0b",
                        "#06b6d4"
                    ],
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.raw} samples (${(ctx.raw / 178 * 100).toFixed(2)}%)`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 80,
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#94a3b8", font: { family: "'JetBrains Mono', monospace" } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: "#cbd5e1", font: { weight: "600" } }
                    }
                }
            }
        });
    }

    // 2. Model Metric Comparison Chart (DT vs LR vs RF)
    const modelCtx = document.getElementById("modelCompChart");
    if (modelCtx && typeof Chart !== "undefined") {
        modelCompChart = new Chart(modelCtx, {
            type: "bar",
            data: {
                labels: ["Decision Tree", "Logistic Regression", "Random Forest"],
                datasets: [
                    {
                        label: "Accuracy",
                        data: [0.9556, 1.0000, 1.0000],
                        backgroundColor: "rgba(16, 185, 129, 0.8)",
                        borderRadius: 4
                    },
                    {
                        label: "Precision (Macro)",
                        data: [0.9667, 1.0000, 1.0000],
                        backgroundColor: "rgba(245, 158, 11, 0.8)",
                        borderRadius: 4
                    },
                    {
                        label: "Recall (Macro)",
                        data: [0.9500, 1.0000, 1.0000],
                        backgroundColor: "rgba(6, 182, 212, 0.8)",
                        borderRadius: 4
                    },
                    {
                        label: "F1-Score (Macro)",
                        data: [0.9565, 1.0000, 1.0000],
                        backgroundColor: "rgba(52, 211, 153, 0.8)",
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: { color: "#cbd5e1", font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(2)}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 0.9,
                        max: 1.02,
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: {
                            color: "#94a3b8",
                            callback: (v) => `${(v * 100).toFixed(0)}%`,
                            font: { family: "'JetBrains Mono', monospace" }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: "#e2e8f0", font: { weight: "600" } }
                    }
                }
            }
        });
    }
}

/* ==========================================================================
   4. MongoDB NoSQL Console
   ========================================================================== */
function initNoSqlConsole() {
    const input = document.getElementById("queryInput");
    const btnRun = document.getElementById("btnRunQuery");
    const btnClear = document.getElementById("btnClearConsole");
    const jsonOutput = document.getElementById("jsonOutput");
    const btnCopy = document.getElementById("btnCopyJson");
    const chips = document.querySelectorAll(".chip");

    const resStatus = document.getElementById("resStatus");
    const resCount = document.getElementById("resCount");
    const resTime = document.getElementById("resTime");
    const resEngine = document.getElementById("resEngine");

    // Preset chips
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            const presetKey = chip.getAttribute("data-preset");
            runQuery({ preset: presetKey });
        });
    });

    btnRun.addEventListener("click", () => {
        const cmd = input.value.trim();
        if (!cmd) return;
        runQuery({ command: cmd });
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            btnRun.click();
        }
    });

    btnClear.addEventListener("click", () => {
        input.value = "";
        jsonOutput.innerHTML = `<code class="language-json">// Console cleared. Ready for input...</code>`;
        resStatus.textContent = "Ready";
        resCount.textContent = "0";
        resTime.textContent = "0 ms";
    });

    btnCopy.addEventListener("click", () => {
        const text = jsonOutput.textContent;
        navigator.clipboard.writeText(text).then(() => {
            btnCopy.textContent = "✓ Copied!";
            setTimeout(() => { btnCopy.textContent = "📋 Copy JSON"; }, 1500);
        });
    });

    async function runQuery(payload) {
        resStatus.textContent = "Executing...";
        resStatus.className = "amber";

        try {
            const res = await fetch("/api/nosql/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.command && input) {
                input.value = data.command;
            }

            if (data.error) {
                resStatus.textContent = "Error";
                resStatus.className = "amber";
                jsonOutput.innerHTML = `<code class="language-json" style="color: #f87171;">// Execution Error:\n${JSON.stringify(data, null, 2)}</code>`;
                return;
            }

            resStatus.textContent = "Success";
            resStatus.className = "emerald";
            resCount.textContent = data.count !== undefined ? data.count : (Array.isArray(data.data) ? data.data.length : 1);
            resTime.textContent = `${data.execution_time_ms} ms`;
            resEngine.textContent = data.source || "Hybrid Engine";

            const formatted = JSON.stringify(data.data, null, 2);
            jsonOutput.innerHTML = `<code class="language-json">${escapeHtml(formatted)}</code>`;
        } catch (err) {
            resStatus.textContent = "Network Error";
            resStatus.className = "amber";
            jsonOutput.innerHTML = `<code class="language-json" style="color: #f87171;">// Network Request Failed: ${err.message}</code>`;
        }
    }
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ==========================================================================
   5. Live Classifier & Predictor
   ========================================================================== */
function initClassifier() {
    const form = document.getElementById("predictionForm");
    const selectModel = document.getElementById("selectModel");

    const btnLoadC1 = document.getElementById("btnLoadC1");
    const btnLoadC2 = document.getElementById("btnLoadC2");
    const btnLoadC3 = document.getElementById("btnLoadC3");
    const btnRandom = document.getElementById("btnRandomSample");
    const btnReset = document.getElementById("btnResetInputs");

    let presetsCache = null;

    // Fetch presets from backend
    async function loadPresets() {
        try {
            const res = await fetch("/api/sample-presets");
            if (res.ok) {
                presetsCache = await res.json();
            }
        } catch (e) {
            console.error("Presets error:", e);
        }
    }
    loadPresets();

    function populateForm(sample) {
        if (!sample) return;
        const features = [
            "alcohol", "malic_acid", "ash", "alcalinity_of_ash", "magnesium",
            "total_phenols", "flavanoids", "nonflavanoid_phenols", "proanthocyanins",
            "color_intensity", "hue", "od280_od315", "proline"
        ];
        features.forEach(f => {
            const el = document.getElementById(`f_${f}`);
            if (el && sample[f] !== undefined) {
                el.value = sample[f];
            }
        });
        // Trigger prediction immediately on preset load
        submitPrediction();
    }

    btnLoadC1.addEventListener("click", () => {
        if (presetsCache && presetsCache["Cultivar_1"]) {
            populateForm(presetsCache["Cultivar_1"]);
        }
    });

    btnLoadC2.addEventListener("click", () => {
        if (presetsCache && presetsCache["Cultivar_2"]) {
            populateForm(presetsCache["Cultivar_2"]);
        }
    });

    btnLoadC3.addEventListener("click", () => {
        if (presetsCache && presetsCache["Cultivar_3"]) {
            populateForm(presetsCache["Cultivar_3"]);
        }
    });

    btnRandom.addEventListener("click", async () => {
        try {
            const res = await fetch("/api/data/samples?pageSize=50");
            const data = await res.json();
            if (data.records && data.records.length > 0) {
                const randomSample = data.records[Math.floor(Math.random() * data.records.length)];
                populateForm(randomSample);
            }
        } catch (e) {
            console.error(e);
        }
    });

    btnReset.addEventListener("click", () => {
        btnLoadC1.click();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        submitPrediction();
    });

    selectModel.addEventListener("change", () => {
        submitPrediction();
    });

    async function submitPrediction() {
        const model = selectModel.value;
        const payload = { model };

        const features = [
            "alcohol", "malic_acid", "ash", "alcalinity_of_ash", "magnesium",
            "total_phenols", "flavanoids", "nonflavanoid_phenols", "proanthocyanins",
            "color_intensity", "hue", "od280_od315", "proline"
        ];

        features.forEach(f => {
            const el = document.getElementById(`f_${f}`);
            if (el) payload[f] = parseFloat(el.value);
        });

        const statusTag = document.getElementById("resultStatusTag");
        statusTag.textContent = "Predicting...";

        try {
            const res = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            statusTag.textContent = "Live Inference";

            if (data.error) {
                alert(`Prediction Error: ${data.error}`);
                return;
            }

            renderPredictionResults(data, model);
        } catch (err) {
            statusTag.textContent = "Error";
            console.error("Prediction failed:", err);
        }
    }

    function renderPredictionResults(data, modelMode) {
        const titleEl = document.getElementById("predictedClassTitle");
        const confPill = document.getElementById("predictedConfidencePill");
        const multiConsensus = document.getElementById("multiModelConsensus");

        let primaryPred = "";
        let primaryConf = 0;
        let probs = {};

        if (modelMode === "all") {
            multiConsensus.style.display = "block";
            const comp = data.comparison;

            // Update consensus items
            const rf = comp.random_forest;
            const lr = comp.logistic_regression;
            const dt = comp.decision_tree;

            document.getElementById("rfPredLabel").textContent = rf.predicted_class;
            document.getElementById("rfConfLabel").textContent = `${rf.confidence_percent}%`;

            document.getElementById("lrPredLabel").textContent = lr.predicted_class;
            document.getElementById("lrConfLabel").textContent = `${lr.confidence_percent}%`;

            document.getElementById("dtPredLabel").textContent = dt.predicted_class;
            document.getElementById("dtConfLabel").textContent = `${dt.confidence_percent}%`;

            // Default main display to Random Forest
            primaryPred = rf.predicted_class;
            primaryConf = rf.confidence_percent;
            probs = rf.probabilities;
        } else {
            multiConsensus.style.display = "none";
            primaryPred = data.predicted_class;
            primaryConf = data.confidence_percent;
            probs = data.probabilities;
        }

        titleEl.textContent = primaryPred;
        titleEl.className = "predicted-title " + (primaryPred === "Cultivar_1" ? "emerald" : (primaryPred === "Cultivar_2" ? "amber" : "cyan"));
        confPill.textContent = `Confidence: ${primaryConf}%`;

        // Update probability bars
        const c1Val = ((probs["Cultivar_1"] || 0) * 100).toFixed(2);
        const c2Val = ((probs["Cultivar_2"] || 0) * 100).toFixed(2);
        const c3Val = ((probs["Cultivar_3"] || 0) * 100).toFixed(2);

        document.getElementById("probValC1").textContent = `${c1Val}%`;
        document.getElementById("probBarC1").style.width = `${c1Val}%`;

        document.getElementById("probValC2").textContent = `${c2Val}%`;
        document.getElementById("probBarC2").style.width = `${c2Val}%`;

        document.getElementById("probValC3").textContent = `${c3Val}%`;
        document.getElementById("probBarC3").style.width = `${c3Val}%`;
    }

    // Run once on load
    submitPrediction();
}

/* ==========================================================================
   6. Wine Dataset Explorer Table
   ========================================================================== */
function initDatasetExplorer() {
    let currentPage = 1;
    const pageSize = 15;
    const classFilter = document.getElementById("filterClassSelect");
    const searchInput = document.getElementById("filterSearchInput");
    const btnRefresh = document.getElementById("btnRefreshDataset");
    const btnPrev = document.getElementById("btnPrevPage");
    const btnNext = document.getElementById("btnNextPage");
    const tableBody = document.getElementById("wineDataBody");
    const paginationInfo = document.getElementById("paginationInfo");
    const pageIndicator = document.getElementById("pageIndicator");

    async function fetchTableData() {
        const cVal = classFilter.value;
        const sVal = searchInput.value.trim();

        const url = `/api/data/samples?page=${currentPage}&pageSize=${pageSize}&class=${encodeURIComponent(cVal)}&search=${encodeURIComponent(sVal)}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            renderRows(data.records, (currentPage - 1) * pageSize + 1);

            const start = data.records.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
            const end = (currentPage - 1) * pageSize + data.records.length;
            paginationInfo.textContent = `Showing ${start} to ${end} of ${data.total} records`;
            pageIndicator.textContent = `Page ${data.page} of ${data.totalPages}`;

            btnPrev.disabled = currentPage <= 1;
            btnNext.disabled = currentPage >= data.totalPages;
        } catch (err) {
            console.error("Dataset table error:", err);
        }
    }

    function renderRows(records, startIdx) {
        if (!records || records.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="14" class="text-center" style="padding: 20px; color: #94a3b8;">No matching wine records found.</td></tr>`;
            return;
        }

        const html = records.map((r, i) => {
            const cls = r.class || "Unknown";
            const badgeClass = cls === "Cultivar_1" ? "badge-c1" : (cls === "Cultivar_2" ? "badge-c2" : "badge-c3");
            return `
                <tr>
                    <td class="mono" style="color: #64748b;">${startIdx + i}</td>
                    <td><span class="badge ${badgeClass}">${cls}</span></td>
                    <td class="mono">${Number(r.alcohol).toFixed(2)}</td>
                    <td class="mono">${Number(r.malic_acid).toFixed(2)}</td>
                    <td class="mono">${Number(r.ash).toFixed(2)}</td>
                    <td class="mono">${Number(r.alcalinity_of_ash).toFixed(1)}</td>
                    <td class="mono">${Math.round(r.magnesium)}</td>
                    <td class="mono">${Number(r.total_phenols).toFixed(2)}</td>
                    <td class="mono font-bold ${cls === 'Cultivar_1' ? 'emerald' : ''}">${Number(r.flavanoids).toFixed(2)}</td>
                    <td class="mono">${Number(r.nonflavanoid_phenols).toFixed(2)}</td>
                    <td class="mono font-bold">${Number(r.color_intensity).toFixed(2)}</td>
                    <td class="mono">${Number(r.hue).toFixed(2)}</td>
                    <td class="mono">${Number(r.od280_od315).toFixed(2)}</td>
                    <td class="mono font-bold ${r.proline > 1000 ? 'gold' : ''}">${Math.round(r.proline)}</td>
                </tr>
            `;
        }).join("");

        tableBody.innerHTML = html;
    }

    classFilter.addEventListener("change", () => {
        currentPage = 1;
        fetchTableData();
    });

    let searchTimer = null;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentPage = 1;
            fetchTableData();
        }, 300);
    });

    btnRefresh.addEventListener("click", fetchTableData);

    btnPrev.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            fetchTableData();
        }
    });

    btnNext.addEventListener("click", () => {
        currentPage++;
        fetchTableData();
    });

    fetchTableData();
}

/* ==========================================================================
   7. MongoDB Atlas Modal
   ========================================================================== */
function initDbModal() {
    const modal = document.getElementById("dbModal");
    const btnOpen = document.getElementById("btnOpenDbModal");
    const btnClose = document.getElementById("btnCloseDbModal");
    const btnCancel = document.getElementById("btnCancelDbModal");
    const btnSave = document.getElementById("btnSaveDbModal");
    const uriInput = document.getElementById("mongoUriInput");

    function openModal() {
        modal.classList.add("active");
    }

    function closeModal() {
        modal.classList.remove("active");
    }

    btnOpen.addEventListener("click", openModal);
    btnClose.addEventListener("click", closeModal);
    btnCancel.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    btnSave.addEventListener("click", async () => {
        const uri = uriInput.value.trim();
        btnSave.textContent = "Connecting...";

        try {
            const res = await fetch("/api/reconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uri })
            });
            const data = await res.json();
            btnSave.textContent = "Connect / Save";
            closeModal();
            initDbStatus();
            alert(`Database updated!\nMode: ${data.mode}\nStatus: ${data.status_message}`);
        } catch (e) {
            btnSave.textContent = "Connect / Save";
            alert(`Error reconnecting: ${e.message}`);
        }
    });
}

