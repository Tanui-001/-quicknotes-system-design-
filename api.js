"use strict";

// JSONPlaceholder is a fake REST API for testing. It accepts POST and DELETE
// requests and returns plausible responses, but it does NOT persist data.
// Created notes get a fake id (101) and are not stored server-side; deleted
// notes reappear on reload. We handle this by managing a local in-memory
// list of notes in the UI and clearly noting the limitation to the user.
const API_URL = "https://jsonplaceholder.typicode.com/posts";

// ---- DOM references -------------------------------------------------------
const loadBtn    = document.getElementById("load-btn");
const submitBtn  = document.getElementById("submit-btn");
const statusEl   = document.getElementById("status");
const notesList  = document.getElementById("notes-list");
const noteForm   = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput  = document.getElementById("body-input");

// Local cache of notes currently shown in the DOM.
const notes = [];

// ---- UI helpers -----------------------------------------------------------
function setStatus(message, type) {
  // type: "loading" | "success" | "error" | "" (neutral)
  statusEl.textContent = message;
  statusEl.className = type || "";
}

function setBusy(isBusy, which) {
  // Disable buttons while a request is in flight.
  if (which === "load"   || which === "all") loadBtn.disabled   = isBusy;
  if (which === "submit" || which === "all") submitBtn.disabled = isBusy;
}

function renderNotes() {
  notesList.textContent = "";
  if (notes.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No notes yet. Load or create one.";
    notesList.appendChild(li);
    return;
  }
  for (const note of notes) {
    notesList.appendChild(buildNoteItem(note));
  }
}

function buildNoteItem(note) {
  const li = document.createElement("li");
  li.className = "note";

  const titleEl = document.createElement("h3");
  titleEl.textContent = note.title || "(untitled)"; // textContent only — safe

  const bodyEl = document.createElement("p");
  bodyEl.textContent = note.body || "";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => handleDelete(note.id, deleteBtn));

  li.append(titleEl, bodyEl, deleteBtn);
  return li;
}

// ---- Reusable request helper ----------------------------------------------
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  // DELETE may return empty body in some APIs; guard against that.
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ---- GET: load 10 notes ---------------------------------------------------
async function loadNotes() {
  setBusy(true, "load");
  setStatus("Loading notes...", "loading");
  try {
    const data = await request(`${API_URL}?_limit=10`);
    notes.length = 0;
    for (const post of data) {
      notes.push({ id: post.id, title: post.title, body: post.body });
    }
    renderNotes();
    setStatus(`Loaded ${data.length} notes from the server.`, "success");
  } catch (err) {
    setStatus("Sorry, we couldn't load your notes. Please try again.", "error");
  } finally {
    setBusy(false, "load");
  }
}

// ---- POST: create a note --------------------------------------------------
async function createNote(title, body) {
  const payload = { title, body, userId: 1 };
  const created = await request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return created;
}

function validateNote(title) {
  if (!title || title.trim() === "") return "Title is required.";
  if (title.length > 100) return "Title must be 100 characters or fewer.";
  return null;
}

async function handleSubmit(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body  = bodyInput.value.trim();

  const validationError = validateNote(title);
  if (validationError) {
    setStatus(validationError, "error");
    titleInput.focus();
    return;
  }

  setBusy(true, "submit");
  setStatus("Creating note...", "loading");
  try {
    const created = await createNote(title, body);
    // Prepend to local list so the UI reflects the new note immediately.
    notes.unshift({ id: created.id, title: created.title, body: created.body });
    renderNotes();
    setStatus(`Note created (status 201, id ${created.id}).`, "success");
    noteForm.reset();
  } catch (err) {
    setStatus("Couldn't create the note. Please try again.", "error");
  } finally {
    setBusy(false, "submit");
  }
}

// ---- DELETE: remove a note ------------------------------------------------
async function handleDelete(id, buttonEl) {
  buttonEl.disabled = true;
  setStatus("Deleting note...", "loading");
  try {
    await request(`${API_URL}/${id}`, { method: "DELETE" });
    // JSONPlaceholder returns 200/204 and doesn't actually delete, so we
    // remove it from our local list to keep the UI in sync.
    const idx = notes.findIndex((n) => n.id === id);
    if (idx !== -1) notes.splice(idx, 1);
    renderNotes();
    setStatus(`Note ${id} deleted (status 200).`, "success");
  } catch (err) {
    setStatus("Couldn't delete the note. Please try again.", "error");
    buttonEl.disabled = false;
  }
}

// ---- Wire up events -------------------------------------------------------
loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", handleSubmit);

// Initial empty state
renderNotes();