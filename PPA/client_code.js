let currentAppointment = null;

function openAppointmentModal(appointment) {
    currentAppointment = appointment;

    // TODO: display modal dialog
    document.getElementById("appointmentModal").showModal();

    // TODO: populate form fields with appointment data
    document.getElementById("appointmentIdInput").value = appointment.id;
    document.getElementById("appointmentStartTimeInput").value = appointment.startTime;
    document.getElementById("appointmentEndTimeInput").value = appointment.endTime;
    document.getElementById("appointmentStatusInput").value = appointment.status;
}
function saveAppointmentChanges() {
    // TODO: read form inputs
    const id = Number(document.getElementById("appointmentIdInput").value);
    const startTime = document.getElementById("appointmentStartTimeInput").value;
    const endTime = document.getElementById("appointmentEndTimeInput").value;
    const status = document.getElementById("appointmentStatusInput").value;

    // TODO: construct updated appointment object
    const updatedAppointment = {
        id: id,
        startTime: startTime,
        endTime: endTime,
        status: status
    };

    // TODO: send PUT request to server
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", "/api/slots/" + encodeURIComponent(String(id)));
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
        if (xhr.status === 200) {
            currentAppointment = updatedAppointment;
            document.getElementById("appointmentModal").close();
            showMessage("Appointment updated", "ok");
            refreshCalendar();
        } else {
            const data = JSON.parse(xhr.responseText || "{}");
            showMessage(data.error || "Update failed", "error");
        }
    };
    xhr.send(JSON.stringify(updatedAppointment));
}
const deleteButtonHandler = () => {
    // TODO: send DELETE request
    const id = Number(document.getElementById("appointmentIdInput").value);
    const xhr = new XMLHttpRequest();
    xhr.open("DELETE", "/api/slots/" + encodeURIComponent(String(id)));

    // TODO: refresh calendar after deletion
    xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 204) {
            currentAppointment = null;
            document.getElementById("appointmentModal").close();
            showMessage("Appointment deleted", "ok");
            refreshCalendar();
        } else {
            const data = JSON.parse(xhr.responseText || "{}");
            showMessage(data.error || "Delete failed", "error");
        }
    };
    xhr.send();
}
