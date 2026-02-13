const age = document.getElementById("age");
const increment = document.getElementById("increment");
const decrement = document.getElementById("decrement");
const form = document.getElementById("form");
const submitButton = document.getElementById("submitButton");
const ageEntry = document.getElementById("ageEntry");

let currentAge = 0;

function updateDisplay() {
    age.textContent = `Your age is: ${currentAge}`;
    const sizePx = Math.min(64, Math.max(16, 12 + currentAge * 2));
    age.style.fontSize = `${sizePx}px`;
}

increment.addEventListener("click", () => {
    currentAge++;
    updateDisplay();
});

decrement.addEventListener("click", () => {
    if (currentAge > 0) {
        currentAge--;
        updateDisplay();
    }
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = Number(ageEntry.value);

    if (isNaN(input)) {
        alert("That's not a number!");
    } else {
        if (input < 0) {
            alert("Age must be ≥ 0");
        } else if (input > 120) {
            alert("!!");
            currentAge = input;
            updateDisplay();
        } else {
            currentAge = input;
            updateDisplay();
        }
    }
    ageEntry.value = "";
});
