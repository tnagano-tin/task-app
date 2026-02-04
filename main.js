// =====================
// Tabs + Tasks + Edit + History (per tab)
// Sort: dueDate asc, then priority high->medium->low
// =====================

// ----- current tab -----
let currentType = "dcard";

// ----- elements -----
const tabs = document.querySelectorAll(".tab");
const activeTabLabel = document.getElementById("activeTabLabel");

const taskTitleInput = document.getElementById("taskTitle");
const taskDueDateInput = document.getElementById("taskDueDate");
const taskPrioritySelect = document.getElementById("taskPriority");
const addTaskBtn = document.getElementById("addTaskBtn");

const todoList = document.getElementById("todoList");
const doneList = document.getElementById("doneList");

const titleHistoryBox = document.getElementById("titleHistoryBox");

// counts
const todoCountEl = document.getElementById("todoCount");
const doneCountEl = document.getElementById("doneCount");
const overdueCountEl = document.getElementById("overdueCount");

// theme
const themeToggle = document.getElementById("themeToggle");
const THEME_KEY = "deadline_theme_v1";

// edit modal
const editOverlay = document.getElementById("editOverlay");
const editTitle = document.getElementById("editTitle");
const editDueDate = document.getElementById("editDueDate");
const editPriority = document.getElementById("editPriority");
const editCancelBtn = document.getElementById("editCancelBtn");
const editSaveBtn = document.getElementById("editSaveBtn");

let editingTaskId = null;

// ----- storage keys (per tab) -----
const TASKS_KEY = () => `deadline_tasks_${currentType}_v1`;
const TITLE_HISTORY_KEY = () => `deadline_title_history_${currentType}_v1`;

// ----- state -----
let tasks = loadTasks();
let titleHistory = loadTitleHistory();

// ----- init -----
initTheme();
wireTabs();
wireHistoryUI();
wireAdd();
wireEditModal();
renderAll();

// =====================
// Theme
// =====================
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(saved);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggle) themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
}

// =====================
// Tabs
// =====================
function wireTabs() {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      currentType = tab.dataset.type;

      // reload per tab
      tasks = loadTasks();
      titleHistory = loadTitleHistory();

      if (activeTabLabel) activeTabLabel.textContent = tab.textContent;

      hideTitleHistory();
      renderAll();
    });
  });
}

// =====================
// Add Task
// =====================
function wireAdd() {
  addTaskBtn.addEventListener("click", () => {
    const title = taskTitleInput.value.trim();
    const dueDate = taskDueDateInput.value;
    const priority = taskPrioritySelect.value;

    if (!title || !dueDate) return;

    tasks.push({
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
      title,
      dueDate,
      priority,
      done: false,
    });

    pushTitleHistory(title);

    saveTasks();
    renderAll();

    taskTitleInput.value = "";
    taskDueDateInput.value = "";
    taskPrioritySelect.value = "medium";
    hideTitleHistory();
  });
}

// =====================
// Edit Modal
// =====================
function wireEditModal() {
  editCancelBtn.addEventListener("click", closeEditModal);
  editOverlay.addEventListener("click", (e) => {
    if (e.target === editOverlay) closeEditModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isEditOpen()) closeEditModal();
  });

  editSaveBtn.addEventListener("click", () => {
    if (!editingTaskId) return;

    const title = editTitle.value.trim();
    const dueDate = editDueDate.value;
    const priority = editPriority.value;

    if (!title || !dueDate) return;

    const t = tasks.find(x => x.id === editingTaskId);
    if (!t) return;

    t.title = title;
    t.dueDate = dueDate;
    t.priority = priority;

    pushTitleHistory(title);

    saveTasks();
    renderAll();
    closeEditModal();
  });
}

function openEditModal(taskId) {
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;

  editingTaskId = taskId;

  editTitle.value = t.title;
  editDueDate.value = t.dueDate;
  editPriority.value = t.priority || "medium";

  editOverlay.classList.add("open");
  editOverlay.setAttribute("aria-hidden", "false");

  editTitle.focus();
  editTitle.select();
}

function closeEditModal() {
  editingTaskId = null;
  editOverlay.classList.remove("open");
  editOverlay.setAttribute("aria-hidden", "true");
}

function isEditOpen() {
  return editOverlay.classList.contains("open");
}

// =====================
// History dropdown (task title suggestions) - per tab
// =====================
function wireHistoryUI() {
  taskTitleInput.addEventListener("focus", showHistory);
  taskTitleInput.addEventListener("click", showHistory);
  taskTitleInput.addEventListener("input", showHistory);

  taskTitleInput.addEventListener("blur", () => {
    setTimeout(hideTitleHistory, 120);
  });

  document.addEventListener("click", (e) => {
    if (e.target === taskTitleInput) return;
    if (titleHistoryBox.contains(e.target)) return;
    hideTitleHistory();
  });
}

function showHistory() {
  renderTitleHistory(taskTitleInput.value.trim());
  if (titleHistoryBox.childElementCount > 0) {
    titleHistoryBox.style.display = "block";
  }
}

function hideTitleHistory() {
  titleHistoryBox.style.display = "none";
}

function renderTitleHistory(filterText = "") {
  titleHistoryBox.innerHTML = "";

  const f = (filterText || "").toLowerCase();
  const list = (f
    ? titleHistory.filter(t => t.toLowerCase().includes(f))
    : titleHistory
  ).slice(0, 20);

  if (list.length === 0) {
    hideTitleHistory();
    return;
  }

  for (const t of list) {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = t;

    // blurより先に反応させる
    div.addEventListener("mousedown", (e) => {
      e.preventDefault();
      taskTitleInput.value = t;
      hideTitleHistory();
      taskTitleInput.focus();
    });

    titleHistoryBox.appendChild(div);
  }
}

function pushTitleHistory(title) {
  titleHistory = titleHistory.filter(t => t !== title);
  titleHistory.unshift(title);
  if (titleHistory.length > 30) titleHistory = titleHistory.slice(0, 30);
  localStorage.setItem(TITLE_HISTORY_KEY(), JSON.stringify(titleHistory));
}

function loadTitleHistory() {
  const raw = localStorage.getItem(TITLE_HISTORY_KEY());
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// =====================
// Rendering
// =====================
function renderAll() {
  renderLists();
  updateStats();
}

function renderLists() {
  todoList.innerHTML = "";
  doneList.innerHTML = "";

  const sorted = [...tasks].sort(compareTasks);

  for (const task of sorted) {
    const li = document.createElement("li");

    const left = document.createElement("div");
    left.className = "taskLeft";

    const titleEl = document.createElement("div");
    titleEl.className = "taskTitle";
    titleEl.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "metaRow";

    const dueBadge = document.createElement("span");
    dueBadge.className = "badge";
    dueBadge.textContent = `締切: ${task.dueDate}`;

    const prBadge = document.createElement("span");
    prBadge.className = `badge ${task.priority}`;
    prBadge.textContent =
      task.priority === "high" ? "優先度: 高" :
      task.priority === "medium" ? "優先度: 中" : "優先度: 低";

    meta.appendChild(dueBadge);
    meta.appendChild(prBadge);

    if (!task.done && isOverdue(task.dueDate)) {
      const od = document.createElement("span");
      od.className = "badge overdue";
      od.textContent = "期限切れ";
      meta.appendChild(od);
    }

    left.appendChild(titleEl);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "taskActions";

    if (task.done) {
      const backBtn = makeBtn("戻す", () => {
        const t = tasks.find(x => x.id === task.id);
        if (!t) return;
        t.done = false;
        saveTasks();
        renderAll();
      });

      const delBtn = makeBtn("削除", () => {
        tasks = tasks.filter(x => x.id !== task.id);
        saveTasks();
        renderAll();
      });

      actions.appendChild(backBtn);
      actions.appendChild(delBtn);

      li.appendChild(left);
      li.appendChild(actions);
      doneList.appendChild(li);
    } else {
      const doneBtn = makeBtn("完了", () => {
        const t = tasks.find(x => x.id === task.id);
        if (!t) return;
        t.done = true;
        saveTasks();
        renderAll();
      });

      const editBtn = makeBtn("編集", () => {
        openEditModal(task.id);
      });

      actions.appendChild(doneBtn);
      actions.appendChild(editBtn);

      li.appendChild(left);
      li.appendChild(actions);
      todoList.appendChild(li);
    }
  }
}

function makeBtn(text, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

// ----- sort: dueDate asc, then priority high->medium->low -----
function priorityRank(p) {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2; // low
}

function compareTasks(a, b) {
  const d = a.dueDate.localeCompare(b.dueDate);
  if (d !== 0) return d;

  const pr = priorityRank(a.priority) - priorityRank(b.priority);
  if (pr !== 0) return pr;

  return (a.id || "").localeCompare(b.id || "");
}

// ----- overdue check (YYYY-MM-DD string compare) -----
function isOverdue(dueDate) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  return dueDate < todayStr;
}

function updateStats() {
  const todo = tasks.filter(t => !t.done).length;
  const done = tasks.filter(t => t.done).length;
  const overdue = tasks.filter(t => !t.done && isOverdue(t.dueDate)).length;

  if (todoCountEl) todoCountEl.textContent = String(todo);
  if (doneCountEl) doneCountEl.textContent = String(done);
  if (overdueCountEl) overdueCountEl.textContent = String(overdue);
}

// =====================
// Storage (per tab)
// =====================
function saveTasks() {
  localStorage.setItem(TASKS_KEY(), JSON.stringify(tasks));
}

function loadTasks() {
  const raw = localStorage.getItem(TASKS_KEY());
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(t => ({
      id: String(t.id ?? Date.now()),
      title: String(t.title ?? ""),
      dueDate: String(t.dueDate ?? ""),
      priority: (t.priority === "high" || t.priority === "medium" || t.priority === "low") ? t.priority : "medium",
      done: Boolean(t.done),
    })).filter(t => t.title && t.dueDate);
  } catch {
    return [];
  }
}
