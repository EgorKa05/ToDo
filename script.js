const STORAGE_KEY = 'todo_tasks_v1';
const MAX_LENGTH = 100;

const state = {
  tasks: [],
  filter: 'all',
  editingTaskId: null,
};

const form = document.getElementById('todo-form');
const taskInput = document.getElementById('task-input');
const priorityInput = document.getElementById('priority-input');
const message = document.getElementById('message');
const list = document.getElementById('todo-list');
const counter = document.getElementById('counter');
const clearCompletedBtn = document.getElementById('clear-completed');
const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));

loadTasks();
render();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  addTask(taskInput.value, priorityInput.value);
});

clearCompletedBtn.addEventListener('click', () => {
  const beforeCount = state.tasks.length;
  state.tasks = state.tasks.filter((task) => !task.completed);

  if (beforeCount === state.tasks.length) {
    setMessage('Нет выполненных задач для очистки.');
    return;
  }

  saveTasks();
  render();
  setMessage('Выполненные задачи удалены.');
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    updateFilterButtons();
    render();
  });
});

function addTask(text, priority) {
  const trimmed = text.trim();

  if (!trimmed) {
    setMessage('Нельзя добавить пустую задачу.');
    return;
  }

  if (trimmed.length > MAX_LENGTH) {
    setMessage(`Максимальная длина задачи — ${MAX_LENGTH} символов.`);
    return;
  }

  state.tasks.push({
    id: crypto.randomUUID(),
    text: trimmed,
    completed: false,
    priority,
    createdAt: Date.now(),
  });

  taskInput.value = '';
  priorityInput.value = 'medium';
  saveTasks();
  render();
  setMessage('Задача добавлена.');
}

function render() {
  list.innerHTML = '';

  const tasksToRender = getFilteredTasks();
  tasksToRender.forEach((task) => {
    list.appendChild(createTaskItem(task));
  });

  const activeCount = state.tasks.filter((task) => !task.completed).length;
  counter.textContent = `Осталось: ${activeCount}`;

  if (!tasksToRender.length) {
    const empty = document.createElement('li');
    empty.className = 'todo-item';
    empty.textContent = 'Задач в этом фильтре нет.';
    list.appendChild(empty);
  }

  updateFilterButtons();
}

function getFilteredTasks() {
  if (state.filter === 'active') {
    return state.tasks.filter((task) => !task.completed);
  }

  if (state.filter === 'completed') {
    return state.tasks.filter((task) => task.completed);
  }

  return state.tasks;
}

function createTaskItem(task) {
  const li = document.createElement('li');
  li.className = `todo-item ${task.completed ? 'completed' : ''}`;
  li.draggable = true;
  li.dataset.id = task.id;

  li.addEventListener('dragstart', () => {
    li.classList.add('dragging');
  });

  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
    const reorderedIds = Array.from(list.querySelectorAll('.todo-item[data-id]')).map((item) => item.dataset.id);
    if (reorderedIds.length === state.tasks.length) {
      state.tasks.sort((a, b) => reorderedIds.indexOf(a.id) - reorderedIds.indexOf(b.id));
      saveTasks();
      render();
    }
  });

  li.addEventListener('dragover', (event) => {
    event.preventDefault();
    const draggingElement = list.querySelector('.dragging');
    if (!draggingElement || draggingElement === li) {
      return;
    }

    const rect = li.getBoundingClientRect();
    const offset = event.clientY - rect.top - rect.height / 2;

    if (offset > 0) {
      li.after(draggingElement);
    } else {
      li.before(draggingElement);
    }
  });

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.completed;
  checkbox.addEventListener('change', () => {
    task.completed = checkbox.checked;
    saveTasks();
    render();
  });

  const main = document.createElement('div');
  main.className = 'todo-main';

  const text = document.createElement('p');
  text.className = 'todo-text';
  text.textContent = task.text;

  const badge = document.createElement('span');
  badge.className = `priority-badge priority-${task.priority}`;
  badge.textContent = priorityLabel(task.priority);

  main.append(text, badge);

  const actions = document.createElement('div');
  actions.className = 'todo-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.textContent = 'Редактировать';
  editBtn.addEventListener('click', () => {
    state.editingTaskId = task.id;
    render();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete';
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', () => {
    state.tasks = state.tasks.filter((current) => current.id !== task.id);
    saveTasks();
    render();
  });

  actions.append(editBtn, deleteBtn);

  li.append(checkbox, main, actions);

  if (state.editingTaskId === task.id) {
    startEdit(li, task);
  }

  return li;
}

function startEdit(li, task) {
  const main = li.querySelector('.todo-main');
  const actions = li.querySelector('.todo-actions');
  if (!main || !actions) {
    return;
  }

  main.innerHTML = '';
  actions.innerHTML = '';

  const editBlock = document.createElement('div');
  editBlock.className = 'edit-block';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = task.text;
  input.className = 'edit-input';
  input.maxLength = MAX_LENGTH;

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Сохранить';
  saveBtn.className = 'save';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Отмена';

  saveBtn.addEventListener('click', () => saveEdit(task, input.value));
  cancelBtn.addEventListener('click', () => {
    state.editingTaskId = null;
    render();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      saveEdit(task, input.value);
    }

    if (event.key === 'Escape') {
      state.editingTaskId = null;
      render();
    }
  });

  editBlock.append(input, saveBtn, cancelBtn);
  main.appendChild(editBlock);
  input.focus();
}

function saveEdit(task, value) {
  const trimmed = value.trim();

  if (!trimmed) {
    setMessage('Текст задачи не может быть пустым.');
    return;
  }

  if (trimmed.length > MAX_LENGTH) {
    setMessage(`Максимальная длина задачи — ${MAX_LENGTH} символов.`);
    return;
  }

  task.text = trimmed;
  state.editingTaskId = null;
  saveTasks();
  render();
  setMessage('Задача обновлена.');
}

function priorityLabel(priority) {
  if (priority === 'high') return 'Высокий';
  if (priority === 'low') return 'Низкий';
  return 'Средний';
}

function setMessage(text) {
  message.textContent = text;
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    state.tasks = [];
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      state.tasks = [];
      return;
    }

    state.tasks = parsed.map((task) => ({
      id: typeof task.id === 'string' ? task.id : crypto.randomUUID(),
      text: typeof task.text === 'string' ? task.text : '',
      completed: Boolean(task.completed),
      priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
      createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now(),
    })).filter((task) => task.text.trim());
  } catch {
    state.tasks = [];
  }
}

function updateFilterButtons() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === state.filter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}
