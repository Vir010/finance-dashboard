const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE_KEY = "finance-dashboard-transactions-v1";

const seedTransactions = [
    { id: 1, title: "Зарплата", category: "Зарплата", type: "income", amount: 125000, date: "2026-10-25", status: "completed" },
    { id: 2, title: "Покупка продуктов", category: "Продукты", type: "expense", amount: 2840, date: "2026-10-24", status: "completed" },
    { id: 3, title: "Подписка на сервис", category: "Подписки", type: "expense", amount: 990, date: "2026-10-23", status: "completed" },
    { id: 4, title: "Фриланс-проект", category: "Дополнительный доход", type: "income", amount: 18500, date: "2026-10-22", status: "completed" },
    { id: 5, title: "Поездка на такси", category: "Транспорт", type: "expense", amount: 750, date: "2026-10-21", status: "pending" },
    { id: 6, title: "Кофейня", category: "Развлечения", type: "expense", amount: 460, date: "2026-10-20", status: "completed" },
    { id: 7, title: "Возврат покупки", category: "Покупки", type: "income", amount: 3200, date: "2026-10-18", status: "completed" }
];

const monthlyIncome = [48, 54, 43, 59, 52, 71, 64, 68, 57, 74, 62, 80];
const monthlyExpense = [28, 34, 26, 39, 31, 43, 35, 41, 37, 49, 42, 54];

let transactions = loadTransactions();
let activeView = "dashboard";
let toastTimer;

function loadTransactions() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const parsed = JSON.parse(saved);

            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn("Не удалось загрузить операции:", error);
    }

    return [...seedTransactions];
}

function saveTransactions() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(transactions)
        );
    } catch (error) {
        showToast("Не удалось сохранить данные браузера.");
    }
}

function money(value) {
    return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0
    })
        .format(value)
        .replace(/\u00a0/g, " ");
}

function shortDate(dateString) {
    const date = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    })
        .format(date)
        .replace(" г.", "");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showToast(message) {
    const toast = $("#toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

function getTotals() {
    return transactions.reduce((totals, item) => {
        if (item.type === "income") {
            totals.income += Number(item.amount);
        } else {
            totals.expense += Number(item.amount);
        }

        return totals;
    }, {
        income: 0,
        expense: 0
    });
}

function updateSummary() {
    const totals = getTotals();

    $("#balanceValue").textContent =
        money(totals.income - totals.expense);

    $("#incomeValue").textContent =
        money(totals.income);

    $("#expenseValue").textContent =
        money(totals.expense);

    const budget = 250000;
    const percent = Math.round(
        totals.expense / budget * 100
    );

    const spendingPercent = $("#spendingPercent");
    const budgetAmount = $("#budgetAmount");
    const budgetProgress = $("#budgetProgress");
    const donutChart = $("#donutChart");

    if (spendingPercent) {
        spendingPercent.textContent =
            `${Math.min(percent, 999)}%`;
    }

    if (budgetAmount) {
        budgetAmount.textContent =
            `${money(totals.expense)} / ${money(budget)}`;
    }

    if (budgetProgress) {
        budgetProgress.style.width =
            `${Math.min(percent, 100)}%`;
    }

    if (donutChart) {
        const end = Math.min(percent, 100);

        donutChart.style.background = `
      conic-gradient(
        var(--purple-light) 0 35%,
        var(--cyan) 35% 60%,
        var(--pink) 60% ${end}%,
        #393950 ${end}% 100%
      )
    `;
    }
}

function getFilteredTransactions() {
    const searchInput =
        $("#transactionSearch")?.value ||
        $("#globalSearch")?.value ||
        "";

    const query = searchInput
        .trim()
        .toLocaleLowerCase("ru");

    const type = $("#typeFilter")?.value || "all";

    return [...transactions]
        .filter(item => {
            return type === "all" || item.type === type;
        })
        .filter(item => {
            if (!query) return true;

            return [
                item.title,
                item.category,
                item.date,
                item.status
            ].some(value =>
                String(value)
                    .toLocaleLowerCase("ru")
                    .includes(query)
            );
        })
        .sort((a, b) =>
            b.date.localeCompare(a.date) || b.id - a.id
        );
}

function renderTransactions() {
    const table = $("#transactionTable");

    if (!table) return;

    const filtered = getFilteredTransactions();

    const rows = activeView === "transactions"
        ? filtered
        : filtered.slice(0, 5);

    const icons = {
        "Зарплата": "₽",
        "Продукты": "▤",
        "Подписки": "◉",
        "Транспорт": "↗",
        "Покупки": "◇",
        "Развлечения": "♫",
        "Дополнительный доход": "↙"
    };

    table.innerHTML = rows.map(item => {
        const isIncome = item.type === "income";

        const statusText = item.status === "pending"
            ? "В обработке"
            : "Выполнено";

        return `
      <tr>
        <td>
          <div class="transaction-name">
            <span class="transaction-icon ${isIncome ? "income" : "expense"}">
              ${icons[item.category] || "•"}
            </span>
            <span>${escapeHTML(item.title)}</span>
          </div>
        </td>

        <td>${escapeHTML(shortDate(item.date))}</td>

        <td>${escapeHTML(item.category)}</td>

        <td class="amount ${isIncome ? "income" : "expense"}">
          ${isIncome ? "+" : "−"}${escapeHTML(money(Number(item.amount)))}
        </td>

        <td>
          <span class="status ${item.status === "pending" ? "pending" : "completed"}">
            ${statusText}
          </span>
        </td>

        <td>
          <button
            class="delete-row"
            data-delete="${item.id}"
            aria-label="Удалить операцию ${escapeHTML(item.title)}"
            title="Удалить"
          >×</button>
        </td>
      </tr>
    `;
    }).join("");

    const emptyState = $("#emptyState");

    if (emptyState) {
        emptyState.hidden = rows.length > 0;
    }

    const count = $("#transactionCount");

    if (count) {
        count.textContent =
            `Показано ${rows.length} из ${filtered.length} операций`;
    }
}

function drawChart() {
    const svg = $("#financeChart");

    if (!svg) return;

    const isHalf = $("#chartPeriod")?.value === "half";

    const income = isHalf
        ? monthlyIncome.slice(-6)
        : monthlyIncome;

    const expense = isHalf
        ? monthlyExpense.slice(-6)
        : monthlyExpense;

    const labels = isHalf
        ? ["Май", "Июн", "Июл", "Авг", "Сен", "Окт"]
        : ["Янв", "Фев", "Мар", "Апр", "Май", "Июн",
            "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

    const months = $("#chartMonths");

    if (months) {
        months.innerHTML = labels
            .map(label => `<span>${label}</span>`)
            .join("");
    }

    const width = 700;
    const height = 230;
    const max = 90;

    const groupWidth = width / income.length;
    const barWidth = Math.min(11, groupWidth * 0.25);

    let shapes = "";

    income.forEach((value, index) => {
        const x = index * groupWidth + groupWidth * 0.24;
        const incomeHeight = value / max * height;

        shapes += `
      <rect
        x="${x}"
        y="${height - incomeHeight}"
        width="${barWidth}"
        height="${incomeHeight}"
        rx="3"
        fill="#d4af37"
      >
        <title>Доходы: ${value} 000 ₽</title>
      </rect>
    `;

        const expenseHeight = expense[index] / max * height;

        shapes += `
      <rect
        x="${x + barWidth + 4}"
        y="${height - expenseHeight}"
        width="${barWidth}"
        height="${expenseHeight}"
        rx="3"
        fill="#2ecc71"
      >
        <title>Расходы: ${expense[index]} 000 ₽</title>
      </rect>
    `;
    });

    svg.innerHTML = shapes;
}

function setView(view) {
    activeView = view;

    const names = {
        dashboard: [
            "Dashboard",
            "Добро пожаловать, Али!",
            "Вот что происходит с твоими финансами сегодня."
        ],
        analytics: [
            "Analytics",
            "Финансовая аналитика",
            "Изучай динамику доходов и расходов."
        ],
        wallet: [
            "My Wallet",
            "Мой кошелёк",
            "Твоя финансовая сводка в одном месте."
        ],
        transactions: [
            "Transactions",
            "Все операции",
            "Полная история доходов и расходов."
        ],
        settings: [
            "Settings",
            "Настройки",
            "Управление твоим финансовым дашбордом."
        ]
    };

    const [title, heading, subtitle] =
        names[view] || names.dashboard;

    $("#pageTitle").textContent = title;

    $("#greeting").innerHTML =
        `${escapeHTML(heading)}${view === "dashboard"
            ? ' <span class="wave">✦</span>'
            : ""
        }`;

    $("#pageSubtitle").textContent = subtitle;

    $$(".nav-link").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });

    const transactionsPanel = $("#transactionsPanel");
    const analyticsPanel = $("#analyticsPanel");
    const activityPanel = $(".activity-panel");

    if (transactionsPanel) {
        transactionsPanel.hidden = view === "settings";
    }

    if (analyticsPanel) {
        analyticsPanel.hidden =
            ["settings", "wallet", "transactions"].includes(view);
    }

    if (activityPanel) {
        activityPanel.hidden =
            ["settings", "transactions"].includes(view);
    }

    const tableTitle = $("#transactionsPanel h2");

    if (tableTitle) {
        tableTitle.textContent =
            view === "transactions"
                ? "Все операции"
                : "Последние операции";
    }

    renderTransactions();

    $("#sidebar")?.classList.remove("open");

    if (view === "settings") {
        showToast(
            "Настройки демонстрационные. Данные сохраняются в браузере."
        );
    }
}

function openModal() {
    const modal = $("#transactionModal");

    if (!modal) return;

    modal.hidden = false;

    $("#formError").textContent = "";

    $("#transactionDate").value =
        new Date().toLocaleDateString("en-CA");

    $("#transactionForm").elements.title.focus();
}

function closeModal() {
    const modal = $("#transactionModal");

    if (modal) {
        modal.hidden = true;
    }

    $("#transactionForm")?.reset();

    const error = $("#formError");

    if (error) {
        error.textContent = "";
    }
}

function exportTransactions() {
    const headers = [
        "Название",
        "Тип",
        "Категория",
        "Сумма",
        "Дата",
        "Статус"
    ];

    const lines = transactions.map(item => [
        item.title,
        item.type === "income" ? "Доход" : "Расход",
        item.category,
        item.amount,
        item.date,
        item.status === "pending"
            ? "В обработке"
            : "Выполнено"
    ]);

    const csv = [headers, ...lines]
        .map(row =>
            row.map(value =>
                `"${String(value).replace(/"/g, '""')}"`
            ).join(";")
        )
        .join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "finance-transactions.csv";

    document.body.append(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Экспорт операций подготовлен.");
}

$("#addTransactionButton")?.addEventListener("click", openModal);
$("#quickAddButton")?.addEventListener("click", openModal);
$("#closeModalButton")?.addEventListener("click", closeModal);
$("#cancelModalButton")?.addEventListener("click", closeModal);

$("#transactionModal")?.addEventListener("click", event => {
    if (event.target === $("#transactionModal")) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        $("#transactionModal") &&
        !$("#transactionModal").hidden
    ) {
        closeModal();
    }
});

$("#transactionForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    const title = String(data.get("title")).trim();
    const amount = Number(data.get("amount"));

    if (!title) {
        $("#formError").textContent =
            "Введи название операции.";
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        $("#formError").textContent =
            "Введи сумму больше нуля.";
        return;
    }

    transactions.push({
        id: Date.now(),
        title,
        type: data.get("type"),
        category: data.get("category"),
        amount,
        date: data.get("date"),
        status: data.get("status")
    });

    saveTransactions();
    updateSummary();
    renderTransactions();
    closeModal();

    showToast("Операция успешно добавлена.");
});

$("#transactionSearch")?.addEventListener("input", () => {
    if ($("#globalSearch")) {
        $("#globalSearch").value = "";
    }

    renderTransactions();
});

$("#globalSearch")?.addEventListener("input", () => {
    if ($("#transactionSearch")) {
        $("#transactionSearch").value = "";
    }

    renderTransactions();
});

$("#typeFilter")?.addEventListener(
    "change",
    renderTransactions
);

$("#chartPeriod")?.addEventListener(
    "change",
    drawChart
);

$("#exportButton")?.addEventListener(
    "click",
    exportTransactions
);

$("#mobileMenuButton")?.addEventListener("click", () => {
    $("#sidebar")?.classList.toggle("open");
});

$$("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        setView(button.dataset.view);
    });
});

$("#transactionTable")?.addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");

    if (!button) return;

    const id = Number(button.dataset.delete);

    const item = transactions.find(
        transaction => transaction.id === id
    );

    if (!item) return;

    if (!confirm(`Удалить операцию «${item.title}»?`)) {
        return;
    }

    transactions = transactions.filter(
        transaction => transaction.id !== id
    );

    saveTransactions();
    updateSummary();
    renderTransactions();

    showToast("Операция удалена.");
});

$("#activityPeriod")?.addEventListener("click", () => {
    showToast(
        "Здесь отображается сводка расходов за выбранный месяц."
    );
});

updateSummary();
drawChart();
renderTransactions();