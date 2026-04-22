const monthTitle = document.getElementById("monthTitle");
const message = document.getElementById("message");
const titleInput = document.getElementById("titleInput");
const dateTimeInput = document.getElementById("dateTimeInput");
const notesInput = document.getElementById("notesInput");
const createAppointmentButton = document.getElementById("createAppointmentButton");

const now = new Date();
let currentMonth = now.getMonth() + 1;
let currentYear = now.getFullYear();

function showMessage(text, kind) {
  message.textContent = text;
  message.className = "message " + (kind || "");
}

function setMonthTitle(month, year) {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  monthTitle.textContent = names[month - 1] + " " + String(year);
}

function fetchAppointments() {
  return fetch("/appointments").then((response) => {
    if (!response.ok) {
      throw new Error("GET failed: " + response.status);
    }
    return response.json();
  });
}

function renderAppointments(appointmentsArray) {
  setMonthTitle(currentMonth, currentYear);
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  for (let i = 0; i < 42; i += 1) {
    const dayNumber = i - startWeekday + 1;
    const cell = document.createElement("div");
    cell.className = "dayCell";

    if (dayNumber >= 1 && dayNumber <= daysInMonth) {
      const label = document.createElement("div");
      label.className = "dayNumber";
      label.textContent = String(dayNumber);
      cell.appendChild(label);

      let dayHasAppointment = false;

      for (let j = 0; j < appointmentsArray.length; j += 1) {
        const appt = appointmentsArray[j];
        const dateTime = typeof appt.datetime === "string" ? appt.datetime : "";
        const datePart = dateTime.split("T")[0] || "";
        const parts = datePart.split("-");
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);

        if (year === currentYear && month === currentMonth && day === dayNumber) {
          dayHasAppointment = true;
          const item = document.createElement("div");
          item.className = "appointmentCard";

          const info = document.createElement("div");
          info.className = "appointmentInfo";

          const timeText = document.createElement("div");
          timeText.className = "appointmentTime";
          const timePart = dateTime.split("T")[1] || "";
          timeText.textContent = timePart || "Time TBD";

          const titleText = document.createElement("div");
          titleText.className = "appointmentTitle";
          titleText.textContent = appt.title || "Untitled";

          info.appendChild(timeText);
          info.appendChild(titleText);

          if (appt.notes) {
            const notesText = document.createElement("div");
            notesText.className = "appointmentNotes";
            notesText.textContent = appt.notes;
            info.appendChild(notesText);
          }

          const del = document.createElement("button");
          del.className = "deleteButton";
          del.textContent = "Delete";
          del.onclick = function () {
            deleteAppointment(j);
          };

          item.appendChild(info);
          item.appendChild(del);
          cell.appendChild(item);
        }
      }

      if (!dayHasAppointment) {
        const empty = document.createElement("div");
        empty.className = "emptyDay";
        empty.textContent = "No appointments";
        cell.appendChild(empty);
      }

      const today = new Date();
      if (
        dayNumber === today.getDate() &&
        currentMonth === today.getMonth() + 1 &&
        currentYear === today.getFullYear()
      ) {
        cell.classList.add("today");
      }
    } else {
      cell.className += " empty";
    }

    grid.appendChild(cell);
  }
}

function refreshCalendar() {
  fetchAppointments()
    .then((appointmentsArray) => {
      renderAppointments(appointmentsArray);
      if (appointmentsArray.length === 0) {
        showMessage("No appointments yet. Add one above.", "info");
      }
    })
    .catch((error) => {
      showMessage(error.message || "Unable to load appointments", "error");
    });
}

function createAppointment() {
  const title = titleInput.value.trim();
  const datetime = dateTimeInput.value.trim();
  const notes = notesInput.value.trim();

  if (!title || !datetime) {
    showMessage("Please enter a title and date/time.", "error");
    return;
  }

  const payload = { title, datetime, notes };

  fetch("/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text || "Create failed");
        });
      }
      return response.text();
    })
    .then(() => {
      showMessage("Appointment added.", "ok");
      titleInput.value = "";
      dateTimeInput.value = "";
      notesInput.value = "";
      refreshCalendar();
    })
    .catch((error) => {
      showMessage(error.message || "Create failed", "error");
    });
}

function deleteAppointment(index) {
  fetch("/appointments/" + String(index), { method: "DELETE" })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text || "Delete failed");
        });
      }
      return response.text();
    })
    .then(() => {
      showMessage("Appointment deleted.", "ok");
      refreshCalendar();
    })
    .catch((error) => {
      showMessage(error.message || "Delete failed", "error");
    });
}

createAppointmentButton.addEventListener("click", () => {
  createAppointment();
});

if (dateTimeInput) {
  const iso = new Date();
  iso.setMinutes(iso.getMinutes() - iso.getTimezoneOffset());
  dateTimeInput.value = iso.toISOString().slice(0, 16);
}

refreshCalendar();
