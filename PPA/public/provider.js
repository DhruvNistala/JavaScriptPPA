// public/provider.js
// Provider calendar UI for PPA 5
// CRUD calendar UI
let currentMonth = 3; // 1 to 12
let currentYear = 2026;
let allSlots = [];
// Run once when the page loads
refreshCalendar();
// Show a user facing message
function showMessage(text, kind) {
  const el = document.getElementById("message");
  el.textContent = text;
  el.className = kind;
}
// GET all slots then re render the month view
function refreshCalendar() {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/slots");
  xhr.onload = function () {
    if (xhr.status === 200) {
      allSlots = JSON.parse(xhr.responseText);
      renderCalendar(allSlots);
    } else {
      showMessage("GET failed " + String(xhr.status), "error");
    }
  };
  xhr.send();
}

// Render the month grid, then insert slot items into each day cell
function renderCalendar(rawSlots) {
  setMonthTitle(currentMonth, currentYear);
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";
  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const startWeekday = firstDay.getDay(); // 0 Sunday to 6 Saturday
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const now = new Date();
  for (let i = 0; i < 42; i += 1) {
    const dayNumber = i - startWeekday + 1;
    const cell = document.createElement("div");
    cell.className = "dayCell";
    if (dayNumber >= 1 && dayNumber <= daysInMonth) {
      // Day label at the top of the cell
      const label = document.createElement("div");
      label.className = "dayNumber";
      label.textContent = String(dayNumber);
      cell.appendChild(label);
      let slotCount = 0;

      if (
        dayNumber === now.getDate() &&
        currentMonth === now.getMonth() + 1 &&
        currentYear === now.getFullYear()
      ) {
        cell.classList.add("today");
      }
      // Insert all matching slots for this day
      for (let j = 0; j < rawSlots.length; j += 1) {
        const slot = rawSlots[j];
        const slotDate = new Date(slot.startTime);
        if (
          slotDate.getFullYear() === currentYear &&
          slotDate.getMonth() === currentMonth - 1 &&
          slotDate.getDate() === dayNumber
        ) {
          slotCount += 1;
          const item = document.createElement("div");
          item.className = "slotItem";
          // Display just the clock times to keep it readable
          const startClock = slot.startTime.split("T")[1];
          const endClock = slot.endTime.split("T")[1];
          const text = document.createElement("span");
          text.textContent = startClock + " to " + endClock + " (" + slot.status + ")";
          item.appendChild(text);
          item.addEventListener("click", function () {
            openAppointmentModal(slot);
          });
          cell.appendChild(item);
        }
      }
      if (slotCount > 0) {
        const countLabel = document.createElement("div");
        countLabel.className = "slotCountLabel";
        countLabel.textContent = slotCount + " appointment(s) today.";
        cell.appendChild(countLabel);
      } else {
        cell.classList.add("free");
      }
      // cell.appendChild(slotCount);
    } else {
      // Cells outside the current month remain empty
      cell.className += " empty";
    }
    grid.appendChild(cell);
  }
}
// Send POST then refresh the calendar on success
function sendCreateSlot(startTime, endTime) {
  const xhr = new XMLHttpRequest();
  const path =
    "/api/slots?startTime=" + encodeURIComponent(startTime) +
    "&endTime=" + encodeURIComponent(endTime);
  xhr.open("POST", path);
  xhr.onload = function () {
    if (xhr.status === 201) {
      showMessage("Slot created", "ok");
      refreshCalendar();
    } else {
      const data = JSON.parse(xhr.responseText || "{}");
      showMessage(data.error || "Create failed", "error");
    }
  };
  xhr.send();
}
// Update the month title header
function setMonthTitle(month, year) {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  document.getElementById("monthTitle").textContent =
    names[month - 1] + " " + String(year);
}
// Button click creates a slot
document.getElementById("createSlotButton").addEventListener("click",
  function () {
    const startTime = document.getElementById("startTimeInput").value;
    const endTime = document.getElementById("endTimeInput").value;
    sendCreateSlot(startTime, endTime);
  });

document.getElementById("prevMonthButton").addEventListener("click", function () {
  currentMonth -= 1;
  if (currentMonth === 0) {
    currentMonth = 12;
    currentYear -= 1;
  }
  renderCalendar(allSlots);
});

document.getElementById("nextMonthButton").addEventListener("click", function () {
  currentMonth += 1;
  if (currentMonth === 13) {
    currentMonth = 1;
    currentYear += 1;
  }
  renderCalendar(allSlots);
});

document.getElementById("saveAppointmentButton").addEventListener("click", function () {
  saveAppointmentChanges();
});

document.getElementById("deleteAppointmentButton").addEventListener("click", function () {
  deleteButtonHandler();
});

document.getElementById("closeAppointmentButton").addEventListener("click", function () {
  document.getElementById("appointmentModal").close();
});
