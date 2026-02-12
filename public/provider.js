
function setMessage(text, kind) {
    const p = document.getElementById("message");
    p.textContent = text;
    p.className = kind;

    setTimeout(() => {
        p.style.display = "none";
    }, 3000);
}

function addSlotRow(slot) {
    const tbody = document.getElementById("slotTableBody");
    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    const tdStart = document.createElement("td");
    const tdEnd = document.createElement("td");
    const tdStatus = document.createElement("td");

    tdId.textContent = slot.id;
    tdStart.textContent = slot.startTime;
    tdEnd.textContent = slot.endTime;
    tdStatus.textContent = slot.status;
    tdStatus.className = slot.status === "available" ? "status-available" : "status-booked";

    tr.appendChild(tdId);
    tr.appendChild(tdStart);
    tr.appendChild(tdEnd);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
}

function parseJsonSafely(text) {
    try {
        return { ok: true, value: JSON.parse(text) };
    } catch (err) {
        return { ok: false, value: null };
    }
}

function loadSlots() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/slots");

    xhr.onload = function () {
        if (xhr.status === 200) {
            const result = parseJsonSafely(xhr.responseText);
            if (result.ok) {
                const tbody = document.getElementById("slotTableBody");
                tbody.innerHTML = "";
                result.value.forEach(slot => addSlotRow(slot));
            }
        }
    };

    xhr.send();
}

// POST /api/slots?startTime=...&endTime=...
function submitNewSlot(startTime, endTime) {
    const xhr = new XMLHttpRequest();
    const requestUrl =
        "/api/slots?startTime=" + encodeURIComponent(startTime) +
        "&endTime=" + encodeURIComponent(endTime);

    const createBtn = document.getElementById("createBtn");
    createBtn.disabled = true;
    createBtn.textContent = "Creating...";

    xhr.open("POST", requestUrl);

    xhr.onload = function () {
        createBtn.disabled = false;
        createBtn.textContent = "Create Slot";

        const result = parseJsonSafely(xhr.responseText);

        if (xhr.status === 201) {
            if (result.ok) {
                addSlotRow(result.value);
                setMessage("✅ Slot created successfully!", "ok");

                document.getElementById("startTime").value = "";
                document.getElementById("endTime").value = "";

                document.getElementById("startTime").focus();
            }
        } else if (xhr.status === 400) {
            if (result.ok && result.value.error) {
                setMessage("❌ " + result.value.error, "error");
            } else {
                setMessage("❌ Invalid input", "error");
            }
        } else if (xhr.status === 409) {
            if (result.ok && result.value.error) {
                setMessage("❌ " + result.value.error, "error");
            } else {
                setMessage("❌ Duplicate slot", "error");
            }
        } else {
            setMessage("❌ Unexpected error occurred", "error");
        }
    };

    xhr.onerror = function () {
        createBtn.disabled = false;
        createBtn.textContent = "Create Slot";
        setMessage("❌ Network error", "error");
    };

    xhr.send();
}

document.getElementById("slotForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const startTime = document.getElementById("startTime").value.trim();
    const endTime = document.getElementById("endTime").value.trim();

    if (!startTime || !endTime) {
        setMessage("❌ Please fill in both fields", "error");
        return;
    }

    submitNewSlot(startTime, endTime);
});

window.onload = loadSlots;