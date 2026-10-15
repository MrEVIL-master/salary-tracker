const STORAGE_KEY = "salary-tracker-ops";

const CATEGORIES = {
  income: ["зарплата", "фриланс", "бонус", "другое"],
  expense: ["еда", "жильё", "транспорт", "подписки", "прочее"],
};

const THEME_KEY = "salary-tracker-theme";

const PIE_COLORS = {
  dark: {
    income: ["#eaff00", "#c6de00", "#fff4a3", "#8ea000"],
    expense: ["#ffb000", "#e09000", "#ffe08a", "#c47a00", "#a86818"],
  },
  light: {
    income: ["#7a8800", "#a3b000", "#5c6800", "#c6d24a"],
    expense: ["#c47a00", "#a35a00", "#e0a030", "#8a4e10", "#6e5a28"],
  },
};

function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function piePalette() {
  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  return PIE_COLORS[theme];
}

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function uid() {
  return crypto.randomUUID();
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function save(ops) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

function seed() {
  return [
    { id: uid(), type: "income", amount: 120000, category: "зарплата", date: "2026-10-05", note: "Оклад" },
    { id: uid(), type: "income", amount: 28000, category: "фриланс", date: "2026-10-12", note: "Макет" },
    { id: uid(), type: "expense", amount: 18400, category: "еда", date: "2026-10-08", note: "Продукты" },
    { id: uid(), type: "expense", amount: 42000, category: "жильё", date: "2026-10-01", note: "Аренда" },
    { id: uid(), type: "expense", amount: 3600, category: "транспорт", date: "2026-10-10", note: "" },
    { id: uid(), type: "expense", amount: 990, category: "подписки", date: "2026-10-03", note: "" },
    { id: uid(), type: "income", amount: 115000, category: "зарплата", date: "2026-09-05", note: "" },
    { id: uid(), type: "income", amount: 15000, category: "бонус", date: "2026-09-20", note: "" },
    { id: uid(), type: "expense", amount: 16200, category: "еда", date: "2026-09-14", note: "" },
    { id: uid(), type: "expense", amount: 42000, category: "жильё", date: "2026-09-01", note: "" },
    { id: uid(), type: "expense", amount: 5400, category: "прочее", date: "2026-09-18", note: "" },
    { id: uid(), type: "income", amount: 110000, category: "зарплата", date: "2026-08-05", note: "" },
    { id: uid(), type: "expense", amount: 14800, category: "еда", date: "2026-08-11", note: "" },
    { id: uid(), type: "expense", amount: 42000, category: "жильё", date: "2026-08-01", note: "" },
    { id: uid(), type: "expense", amount: 2100, category: "транспорт", date: "2026-08-22", note: "" },
  ];
}

function create(ops, item) {
  const next = { ...item, id: uid(), amount: Number(item.amount) };
  ops.push(next);
  save(ops);
  return next;
}

function update(ops, id, patch) {
  const index = ops.findIndex((op) => op.id === id);
  if (index < 0) return;
  ops[index] = { ...ops[index], ...patch, id, amount: Number(patch.amount) };
  save(ops);
}

function remove(ops, id) {
  const index = ops.findIndex((op) => op.id === id);
  if (index >= 0) ops.splice(index, 1);
  save(ops);
}

function list(ops, type) {
  const items = type === "all" ? ops.slice() : ops.filter((op) => op.type === type);
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

function inPeriod(dateStr, period, today) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return false;
  if (period === "all") return true;
  const start = period === "month"
    ? new Date(today.getFullYear(), today.getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return date >= start && date <= end;
}

function summarize(ops, period, today = new Date()) {
  const filtered = ops.filter((op) => inPeriod(op.date, period, today));
  let income = 0;
  let expense = 0;
  const byMonth = new Map();
  const byCategory = { income: new Map(), expense: new Map() };

  for (const op of filtered) {
    if (op.type === "income") income += op.amount;
    else expense += op.amount;

    const key = op.date.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, { income: 0, expense: 0 });
    byMonth.get(key)[op.type] += op.amount;

    const bag = byCategory[op.type];
    bag.set(op.category, (bag.get(op.category) || 0) + op.amount);
  }

  const months = [...byMonth.keys()].sort().map((key) => {
    const [year, month] = key.split("-").map(Number);
    return {
      label: `${MONTHS[month - 1]} ${String(year).slice(2)}`,
      ...byMonth.get(key),
    };
  });

  const slices = (type) => [...byCategory[type].entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({
      label,
      value,
      color: piePalette()[type][index % piePalette()[type].length],
    }));

  return {
    income,
    expense,
    balance: income - expense,
    months,
    incomeSlices: slices("income"),
    expenseSlices: slices("expense"),
  };
}

function money(value) {
  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${value < 0 ? "−" : ""}${formatted} ₽`;
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.getBoundingClientRect().width || canvas.width;
  const height = (Number(canvas.getAttribute("height")) / Number(canvas.getAttribute("width"))) * width;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

function roundRect(ctx, x, y, width, height, radius) {
  if (height <= 0 || width <= 0) return;
  const rad = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + width, y, x + width, y + height, rad);
  ctx.arcTo(x + width, y + height, x, y + height, rad);
  ctx.arcTo(x, y + height, x, y, rad);
  ctx.arcTo(x, y, x + width, y, rad);
  ctx.closePath();
  ctx.fill();
}

function drawBars(canvas, months) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.font = "13px Segoe UI, system-ui, sans-serif";
  if (!months.length) {
    ctx.fillStyle = cssColor("--muted");
    ctx.fillText("Нет данных за период", 8, 24);
    return;
  }

  const pad = { left: 4, right: 4, top: 8, bottom: 26 };
  const max = Math.max(...months.flatMap((month) => [month.income, month.expense]), 1);
  const groupWidth = (width - pad.left - pad.right) / months.length;
  const barWidth = Math.min(22, groupWidth * 0.28);
  const plotHeight = height - pad.top - pad.bottom;

  months.forEach((month, index) => {
    const center = pad.left + groupWidth * index + groupWidth / 2;
    const base = height - pad.bottom;
    ctx.fillStyle = cssColor("--income");
    roundRect(ctx, center - barWidth - 2, base - (plotHeight * month.income) / max, barWidth, (plotHeight * month.income) / max, 4);
    ctx.fillStyle = cssColor("--expense");
    roundRect(ctx, center + 2, base - (plotHeight * month.expense) / max, barWidth, (plotHeight * month.expense) / max, 4);
    ctx.fillStyle = cssColor("--muted");
    ctx.textAlign = "center";
    ctx.fillText(month.label, center, height - 8);
  });
}

function drawPie(canvas, slices) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  if (!slices.length) {
    ctx.fillStyle = cssColor("--muted");
    ctx.font = "13px Segoe UI, system-ui, sans-serif";
    ctx.fillText("Нет данных", 8, 24);
    return;
  }

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;
  let angle = -Math.PI / 2;

  for (const slice of slices) {
    const sweep = (slice.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    angle += sweep;
  }

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.56, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function renderLegend(listEl, slices) {
  listEl.replaceChildren();
  for (const slice of slices) {
    const item = document.createElement("li");
    const swatch = document.createElement("i");
    swatch.className = "swatch";
    swatch.style.background = slice.color;
    item.append(swatch, document.createTextNode(`${slice.label} · ${money(slice.value)}`));
    listEl.append(item);
  }
}

let ops = load();
if (!ops) {
  ops = seed();
  save(ops);
}

let editingId = null;

const form = document.getElementById("form");
const typeEl = document.getElementById("type");
const categoryEl = document.getElementById("category");
const amountEl = document.getElementById("amount");
const dateEl = document.getElementById("date");
const noteEl = document.getElementById("note");
const errorEl = document.getElementById("form-error");
const submitBtn = document.getElementById("submit");
const cancelBtn = document.getElementById("cancel");
const formTitle = document.getElementById("form-title");

function fillCategories(type, selected) {
  categoryEl.replaceChildren();
  for (const name of CATEGORIES[type]) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === selected) option.selected = true;
    categoryEl.append(option);
  }
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function setEditing(op) {
  editingId = op ? op.id : null;
  formTitle.textContent = op ? "Изменить операцию" : "Новая операция";
  submitBtn.textContent = op ? "Сохранить" : "Добавить";
  cancelBtn.hidden = !op;
  if (!op) {
    form.reset();
    typeEl.value = "expense";
    fillCategories("expense");
    dateEl.value = todayIso();
    return;
  }
  typeEl.value = op.type;
  fillCategories(op.type, op.category);
  amountEl.value = String(op.amount);
  dateEl.value = op.date;
  noteEl.value = op.note || "";
}

function showError(message) {
  errorEl.hidden = !message;
  errorEl.textContent = message || "";
}

function render() {
  const summary = summarize(ops, document.getElementById("period").value);
  document.getElementById("total-income").textContent = money(summary.income);
  document.getElementById("total-expense").textContent = money(summary.expense);
  const balanceEl = document.getElementById("total-balance");
  balanceEl.textContent = money(summary.balance);
  balanceEl.classList.toggle("negative", summary.balance < 0);

  drawBars(document.getElementById("bars"), summary.months);
  drawPie(document.getElementById("pie-expense"), summary.expenseSlices);
  drawPie(document.getElementById("pie-income"), summary.incomeSlices);
  renderLegend(document.getElementById("legend-expense"), summary.expenseSlices);
  renderLegend(document.getElementById("legend-income"), summary.incomeSlices);

  const items = list(ops, document.getElementById("list-filter").value);
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  listEl.replaceChildren();
  emptyEl.hidden = items.length > 0;

  for (const op of items) {
    const row = document.createElement("li");
    row.className = "op";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = op.category;
    const meta = document.createElement("div");
    meta.className = "meta";
    const kind = op.type === "income" ? "доход" : "расход";
    meta.textContent = `${kind} · ${formatDate(op.date)}${op.note ? ` · ${op.note}` : ""}`;
    info.append(title, meta);

    const amount = document.createElement("div");
    amount.className = `amount ${op.type}`;
    amount.textContent = `${op.type === "income" ? "+" : "−"}${money(op.amount)}`;

    const actions = document.createElement("div");
    actions.className = "row-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "tiny";
    editBtn.textContent = "Изменить";
    editBtn.addEventListener("click", () => {
      setEditing(op);
      showError("");
      showTab("form");
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "tiny danger";
    deleteBtn.textContent = "Удалить";
    deleteBtn.addEventListener("click", () => {
      if (!confirm("Удалить эту операцию?")) return;
      remove(ops, op.id);
      if (editingId === op.id) setEditing(null);
      render();
    });

    actions.append(editBtn, deleteBtn);
    row.append(info, amount, actions);
    listEl.append(row);
  }
}

typeEl.addEventListener("change", () => fillCategories(typeEl.value));
document.getElementById("period").addEventListener("change", render);
document.getElementById("list-filter").addEventListener("change", render);
window.addEventListener("resize", render);

cancelBtn.addEventListener("click", () => {
  setEditing(null);
  showError("");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(amountEl.value);
  const date = dateEl.value;
  const type = typeEl.value;
  const category = categoryEl.value;

  if (!(amount > 0)) {
    showError("Сумма должна быть больше нуля.");
    return;
  }
  if (!date) {
    showError("Укажите дату.");
    return;
  }
  if (!CATEGORIES[type].includes(category)) {
    showError("Выберите категорию для этого типа.");
    return;
  }

  const payload = {
    type,
    amount,
    category,
    date,
    note: noteEl.value.trim(),
  };

  if (editingId) update(ops, editingId, payload);
  else create(ops, payload);

  setEditing(null);
  showError("");
  showTab("list");
});

function trackGlow(frame) {
  frame.addEventListener("mousemove", (event) => {
    const rect = frame.getBoundingClientRect();
    frame.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    frame.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
  frame.addEventListener("mouseleave", () => {
    frame.style.setProperty("--mx", "-80px");
    frame.style.setProperty("--my", "-80px");
  });
}

const themeBtn = document.getElementById("theme");

function applyTheme(theme) {
  const light = theme === "light";
  document.documentElement.dataset.theme = light ? "light" : "dark";
  localStorage.setItem(THEME_KEY, light ? "light" : "dark");
  themeBtn.textContent = light ? "Тёмная тема" : "Светлая тема";
  themeBtn.setAttribute("aria-pressed", String(light));
  render();
}

themeBtn.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
});

function showTab(name) {
  const next = document.getElementById(`tab-${name}`);
  const current = document.querySelector(".pane.active");
  if (current?.classList.contains("leaving")) return;
  document.querySelectorAll(".tab").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.tab === name));
  });
  if (!next || next === current) return;

  const openNext = () => {
    next.hidden = false;
    next.classList.add("active");
    requestAnimationFrame(render);
  };

  if (!current) {
    openNext();
    return;
  }

  const swap = () => {
    current.classList.remove("active", "leaving");
    current.hidden = true;
    openNext();
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    swap();
    return;
  }

  current.classList.add("leaving");
  current.addEventListener("animationend", function onEnd(event) {
    if (event.target !== current) return;
    current.removeEventListener("animationend", onEnd);
    swap();
  });
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

document.querySelectorAll(".stat, .panel").forEach(trackGlow);

setEditing(null);
applyTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");
