let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = null;
let expenses = [];

function init() {
  if (currentUser) {
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("trackerSection").classList.remove("hidden");
    showExpenses(expenses);
    setupYearlySummaryButton();
  }
}

document.getElementById("showRegister").onclick = () => {
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("registerForm").classList.remove("hidden");
};

document.getElementById("showLogin").onclick = () => {
  document.getElementById("registerForm").classList.add("hidden");
  document.getElementById("loginForm").classList.remove("hidden");
};

document.getElementById("registerBtn").onclick = () => {
  const username = document.getElementById("regUsername").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;

  if (username && email && password) {
    const existing = users.find(u => u.username === username);
    if (existing) return alert("Username already exists");

    users.push({ username, email, password });
    localStorage.setItem("users", JSON.stringify(users));
    alert("Account created! Please login.");
    document.getElementById("showLogin").click();
  } else {
    alert("Please fill all fields to register.");
  }
};

document.getElementById("loginBtn").onclick = () => {
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    currentUser = user;
    expenses = JSON.parse(localStorage.getItem(`expenses_${currentUser.username}`)) || [];

    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("trackerSection").classList.remove("hidden");

    showExpenses(expenses);
    setupYearlySummaryButton();
  } else {
    alert("Invalid login credentials.");
  }
};

document.getElementById("addExpense").onclick = () => {
  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;
  const description = document.getElementById("description").value || "N/A";

  if (amount && category && date) {
    const newExpense = { username: currentUser.username, amount, category, date, description };
    expenses.push(newExpense);
    localStorage.setItem(`expenses_${currentUser.username}`, JSON.stringify(expenses));
    clearInputs();
    showExpenses(expenses);
  } else {
    alert("Please fill all fields.");
  }
};

document.getElementById("filterBtn").onclick = () => {
  const month = document.getElementById("filter-month").value;
  const category = document.getElementById("filter-category").value.toLowerCase();
  const date = document.getElementById("filter-date").value;

  let filtered = expenses;

  if (month) {
    filtered = filtered.filter(e => e.date.startsWith(month));
  }
  if (category) {
    filtered = filtered.filter(e => e.category.toLowerCase().includes(category));
  }
  if (date) {
    filtered = filtered.filter(e => e.date === date);
  }

  showExpenses(filtered);
};

function clearInputs() {
  document.getElementById("amount").value = '';
  document.getElementById("category").value = '';
  document.getElementById("date").value = '';
  document.getElementById("description").value = '';
}

function showExpenses(data) {
  const container = document.getElementById("monthlyExpenses");
  container.innerHTML = '';

  if (!data.length) {
    container.innerHTML = `<p style="color: red; font-weight: bold;">No expenses found for the selected filter.</p>`;
    return;
  }
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  const grouped = {};
  data.forEach((e, index) => {
    const key = e.date.slice(0, 7);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ ...e, index });
  });

  for (const month in grouped) {
    const section = document.createElement("div");

    const title = document.createElement("h3");
    const readableMonth = new Date(month + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });
    title.innerText = `${readableMonth}`;
    section.appendChild(title);

    const total = grouped[month].reduce((sum, e) => sum + e.amount, 0);
    const totalDiv = document.createElement("div");
    totalDiv.innerHTML = `<strong>Total for ${readableMonth}: ₹${total}</strong>`;
    section.appendChild(totalDiv);

    const table = document.createElement("table");
    table.classList.add("expense-table");

    const header = table.insertRow();
    ["Amount", "Category", "Date", "Description", "Actions"].forEach(h => {
      const th = document.createElement("th");
      th.innerText = h;
      header.appendChild(th);
    });

    grouped[month].forEach(exp => {
      const row = table.insertRow();
      row.insertCell().innerText = `₹${exp.amount}`;
      row.insertCell().innerText = exp.category;
      row.insertCell().innerText = exp.date;
      row.insertCell().innerText = exp.description;

      const delBtn = document.createElement("button");
      delBtn.innerText = "Delete";
      delBtn.classList.add("delete-btn");
      delBtn.onclick = () => deleteExpense(exp);
      const actionCell = row.insertCell();
      actionCell.appendChild(delBtn);
    });

    section.appendChild(table);

    const canvas = document.createElement("canvas");
    section.appendChild(canvas);

    container.appendChild(section);

    drawBarChart(canvas, grouped[month]);
  }
}

function deleteExpense(expenseToDelete) {
  expenses = expenses.filter((e) =>
    !(e.amount === expenseToDelete.amount &&
      e.category === expenseToDelete.category &&
      e.date === expenseToDelete.date &&
      e.description === expenseToDelete.description)
  );
  localStorage.setItem(`expenses_${currentUser.username}`, JSON.stringify(expenses));
  showExpenses(expenses);
}

function drawBarChart(canvas, data) {
  const ctx = canvas.getContext("2d");
  const categories = [...new Set(data.map(e => e.category))];
  const totals = categories.map(cat =>
    data.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
  );

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [{
        label: 'Expenses',
        data: totals,
        backgroundColor: categories.map((_, i) => `hsl(${i * 60}, 70%, 60%)`)
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Category' } },
        y: { title: { display: true, text: 'Amount' } }
      }
    }
  });
}

function generateYearlySummary(year) {
  const summaryData = Array(12).fill(0);
  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === year) {
      summaryData[d.getMonth()] += e.amount;
    }
  });

  const canvas = document.getElementById("yearlySummaryChart");
  const ctx = canvas.getContext("2d");

  if (window.yearlyChart) {
    window.yearlyChart.destroy();
  }

  window.yearlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [{
        label: `Monthly Expenses in ${year}`,
        data: summaryData,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Amount (₹)"
          }
        },
        x: {
          title: {
            display: true,
            text: "Month"
          }
        }
      }
    }
  });
}

function setupYearlySummaryButton() {
  const summaryBtn = document.getElementById("summaryBtn");
  const summarySection = document.getElementById("yearlySummarySection");
  const yearSelect = document.getElementById("yearSelect");
  const allExpenses = JSON.parse(localStorage.getItem(`expenses_${currentUser.username}`)) || [];
  const years = [...new Set(expenses.map(e => new Date(e.date).getFullYear()))];
  yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");

  summaryBtn.onclick = () => {
    summarySection.style.display = 'block';
    const selectedYear = parseInt(yearSelect.value);
    generateYearlySummary(selectedYear);
  };

  yearSelect.onchange = () => {
    const selectedYear = parseInt(yearSelect.value);
    generateYearlySummary(selectedYear);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
