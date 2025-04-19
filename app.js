// Keys for localStorage
const TASKS_KEY = "srt_tasks";
const SRI_KEY = "srt_intervals";

// Default spaced repetition intervals
const DEFAULT_SRI = {
    Standard: [1, 3, 7, 14, 21],
    Aggressive: [1, 2, 3, 5, 7],
    Relaxed: [2, 5, 10, 20, 30]
};

// IST offset in minutes (UTC+5:30)
const IST_OFFSET_MINUTES = 330;

// Utility: Get today's date in IST (yyyy-mm-dd)
function getTodayIST() {
    const nowUTC = new Date();
    const istTime = new Date(nowUTC.getTime() + IST_OFFSET_MINUTES * 60000);
    return istTime.toISOString().split("T")[0];
}

// Utility: Convert a Date to IST yyyy-mm-dd
function convertToISTDateString(date) {
    const istTime = new Date(date.getTime() + IST_OFFSET_MINUTES * 60000);
    return istTime.toISOString().split("T")[0];
}

// Utility: Load tasks from localStorage
function loadTasks() {
    return JSON.parse(localStorage.getItem(TASKS_KEY)) || [];
}

// Utility: Save tasks to localStorage
function saveTasks(tasks) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// Utility: Load SRI from localStorage
function loadSRI() {
    return JSON.parse(localStorage.getItem(SRI_KEY)) || DEFAULT_SRI;
}

// Utility: Save SRI to localStorage
function saveSRI(sri) {
    localStorage.setItem(SRI_KEY, JSON.stringify(sri));
}

// Generate revision dates based on selected regime
function generateRevisions(startDate, regime) {
    const sri = loadSRI();
    const intervals = sri[regime] || DEFAULT_SRI.Standard;
    return intervals.map(days => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + days);
        return convertToISTDateString(date);
    });
}

// Add a new task
function addTask(title, detail, date, regime) {
    const tasks = loadTasks();
    const revisions = generateRevisions(new Date(date), regime);
    const task = {
        title,
        detail,
        date,
        regime,
        revisions: revisions.map(date => ({ date, status: false }))
    };
    tasks.push(task);
    saveTasks(tasks);
}

// Render today's revision tasks
function renderRevisionTasks() {
    const container = document.getElementById("revisionTasks");
    if (!container) return;

    const tasks = loadTasks();
    const today = getTodayIST();
    container.innerHTML = "";

    tasks.forEach((task, tIndex) => {
        task.revisions.forEach((rev, rIndex) => {
            if (rev.date === today) {
                const div = document.createElement("div");
                div.className = `task-item ${rev.status ? "done" : "due"}`;
                div.innerHTML = `
                    <input type="checkbox" ${rev.status ? "checked" : ""} onchange="toggleRevisionStatus(${tIndex}, ${rIndex}, this)">
                    <span class="task-title" onclick="toggleDetail(this)">${task.title}</span>
                    <div class="task-detail" style="display:none">${task.detail}</div>
                `;
                container.appendChild(div);
            }
        });
    });
}

// Toggle revision task status
function toggleRevisionStatus(taskIndex, revIndex, checkbox) {
    const tasks = loadTasks();
    tasks[taskIndex].revisions[revIndex].status = checkbox.checked;
    saveTasks(tasks);
    renderRevisionTasks();
}

// Show/hide task detail
function toggleDetail(span) {
    const detail = span.nextElementSibling;
    detail.style.display = detail.style.display === "none" ? "block" : "none";
}

// Render all tasks on All Tasks page
function renderAllTasks() {
    const container = document.getElementById("allTasksContainer");
    if (!container) return;

    const tasks = loadTasks();
    container.innerHTML = "";

    const grouped = {};
    tasks.forEach(task => {
        if (!grouped[task.date]) grouped[task.date] = [];
        grouped[task.date].push(task);
    });

    Object.keys(grouped).sort().forEach(date => {
        const section = document.createElement("div");
        section.innerHTML = `<h3>${date}</h3>`;

        grouped[date].forEach((task, index) => {
            const taskIndex = tasks.findIndex(
                t => t.title === task.title && t.date === task.date
            );
            const div = document.createElement("div");
            div.className = "task-item";
            div.innerHTML = `
                <strong>${task.title}</strong><br>
                <div>${task.detail}</div>
                <div>Regime: ${task.regime}</div>
                <button onclick="deleteTask(${taskIndex})">Delete</button>
            `;
            section.appendChild(div);
        });

        container.appendChild(section);
    });
}

// Delete a single task
function deleteTask(index) {
    const tasks = loadTasks();
    tasks.splice(index, 1);
    saveTasks(tasks);
    renderAllTasks();
}

// Reset all tasks
function resetAllTasks() {
    if (confirm("Are you sure you want to delete all tasks?")) {
        localStorage.removeItem(TASKS_KEY);
        renderAllTasks();
        renderRevisionTasks();
    }
}

// Download tasks to file
function downloadTasks() {
    const tasks = loadTasks();
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks_backup.txt";
    a.click();
    URL.revokeObjectURL(url);
}

// Upload tasks from .txt file
function uploadTasks(event) {
    const file = event.target.files[0];
    if (!file || file.type !== "text/plain") {
        alert("Please upload a valid .txt file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const tasks = JSON.parse(e.target.result);
            if (!Array.isArray(tasks)) throw new Error("Invalid format");
            saveTasks(tasks);
            renderAllTasks();
            renderRevisionTasks();
            alert("Tasks uploaded successfully.");
        } catch (err) {
            alert("Invalid file content.");
        }
    };
    reader.readAsText(file);
}

// Save updated SRI from update-sri.html
function saveCustomSRIFromForm() {
    const modes = ["Aggressive", "Relaxed"];
    const sri = loadSRI();

    modes.forEach(mode => {
        const input = document.getElementById(`sri-${mode.toLowerCase()}`);
        if (input) {
            sri[mode] = input.value
                .split(",")
                .map(v => parseInt(v.trim()))
                .filter(n => !isNaN(n));
        }
    });

    saveSRI(sri);
    alert("Custom SRI settings updated.");
}

// Prefill SRI form on update-sri.html
function prefillSRIForm() {
    const sri = loadSRI();
    if (document.getElementById("sri-aggressive")) {
        document.getElementById("sri-aggressive").value = sri.Aggressive.join(", ");
    }
    if (document.getElementById("sri-relaxed")) {
        document.getElementById("sri-relaxed").value = sri.Relaxed.join(", ");
    }
}
