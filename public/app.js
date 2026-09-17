/* ==========================================================================
   Sangam — plain JS frontend wired to the real backend API.
   No frameworks, no build step. Open index.html via a local static server
   (see README) with the backend running on http://localhost:5000.
========================================================================== */

const API_BASE = "/api"; // same origin as this page - the backend serves this file too

// ---------- tiny state, kept in localStorage so a refresh stays logged in ----------
let token = localStorage.getItem("sangam_token") || null;
let currentUser = JSON.parse(localStorage.getItem("sangam_user") || "null");
let currentProfile = JSON.parse(localStorage.getItem("sangam_profile") || "null"); // role-specific profile doc, e.g. an institution's own InstitutionProfile

let facultyDirectory = [];   // cached list, used to populate "assign faculty" dropdowns
let studentDirectory = [];   // cached list, used to populate "add student" checkboxes

// ---------- fetch helper: attaches the JWT, throws with the server's message on error ----------
async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

function setMsg(id, text, ok = false) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = "msg " + (text ? (ok ? "ok" : "error") : "");
}

// ---------- API health check, shown in the top bar ----------
(async function checkHealth() {
  try {
    await fetch(`${API_BASE}/health`).then((r) => r.json());
    document.getElementById("api-status").textContent = "API connected";
  } catch {
    document.getElementById("api-status").textContent = "API unreachable — is the backend running?";
  }
})();

/* ---------- AUTH: tab switching ---------- */
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
    document.getElementById("login-form").classList.toggle("hidden", btn.dataset.tab !== "login");
    document.getElementById("register-form").classList.toggle("hidden", btn.dataset.tab !== "register");
  });
});

/* ---------- AUTH: show the right extra fields for the selected role ---------- */
const roleSelect = document.getElementById("reg-role");
function updateRoleFields() {
  document.querySelectorAll(".role-fields").forEach((div) => div.classList.add("hidden"));
  const target = document.getElementById(`fields-${roleSelect.value}`);
  if (target) target.classList.remove("hidden");
}
roleSelect.addEventListener("change", updateRoleFields);
updateRoleFields();

// Institutions list is public (no login needed) specifically so a faculty
// applicant can pick their institution before they have an account.
// Institutions list is public (no login needed) specifically so a faculty
// or student applicant can pick their institution/college before they have
// an account. Same list feeds both dropdowns - a college IS an institution.
(async function loadInstitutionsForRegister() {
  const facultySelect = document.getElementById("fac-institution");
  const studentSelect = document.getElementById("stu-college");
  try {
    const { institutions } = await api("/institutions");
    const options = institutions.map((i) => `<option value="${i.id}">${escapeHTML(i.name)}</option>`).join("");
    facultySelect.innerHTML = `<option value="">Choose your institution…</option>${options}`;
    studentSelect.innerHTML = `<option value="">Choose your college…</option>${options}`;
    if (!institutions.length) {
      facultySelect.innerHTML = `<option value="">No institutions registered yet</option>`;
      studentSelect.innerHTML = `<option value="">No colleges registered yet</option>`;
    }
  } catch {
    facultySelect.innerHTML = `<option value="">Could not load institutions</option>`;
    studentSelect.innerHTML = `<option value="">Could not load colleges</option>`;
  }
})();

/* ---------- AUTH: register ---------- */
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const role = roleSelect.value;
  const profile = {};
  if (role === "student") {
    profile.college = document.getElementById("stu-college").value;
    profile.branch = document.getElementById("stu-branch").value;
    if (!profile.college) return setMsg("register-msg", "Choose your college first.");
  } else if (role === "institution") {
    profile.institutionName = document.getElementById("inst-name").value;
    profile.fieldsOfExpertise = document.getElementById("inst-fields").value.split(",").map((s) => s.trim()).filter(Boolean);
    profile.manpower = Number(document.getElementById("inst-manpower").value) || undefined;
  } else if (role === "faculty") {
    profile.institution = document.getElementById("fac-institution").value;
    profile.department = document.getElementById("fac-department").value;
    profile.expertise = document.getElementById("fac-expertise").value.split(",").map((s) => s.trim()).filter(Boolean);
    if (!profile.institution) return setMsg("register-msg", "Choose your institution first.");
  } else if (role === "funding_org") {
    profile.orgName = document.getElementById("org-name").value;
    profile.focusAreas = document.getElementById("org-focus").value.split(",").map((s) => s.trim()).filter(Boolean);
  }

  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: {
        name: document.getElementById("reg-name").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-password").value,
        role,
        profile,
      },
    });
    onLoggedIn(data.token, data.user, data.profile);
    setMsg("register-msg", "Account created!", true);
  } catch (err) {
    setMsg("register-msg", err.message);
  }
});

/* ---------- AUTH: login ---------- */
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: {
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value,
      },
    });
    onLoggedIn(data.token, data.user, data.profile);
  } catch (err) {
    setMsg("login-msg", err.message);
  }
});

document.getElementById("btn-logout").addEventListener("click", () => {
  token = null; currentUser = null; currentProfile = null;
  localStorage.removeItem("sangam_token");
  localStorage.removeItem("sangam_user");
  localStorage.removeItem("sangam_profile");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("auth-section").classList.remove("hidden");
  document.getElementById("who-am-i").classList.add("hidden");
});

function onLoggedIn(newToken, user, profile) {
  token = newToken; currentUser = user; currentProfile = profile || null;
  localStorage.setItem("sangam_token", token);
  localStorage.setItem("sangam_user", JSON.stringify(user));
  localStorage.setItem("sangam_profile", JSON.stringify(currentProfile));
  showDashboard();
}

function showDashboard() {
  document.getElementById("auth-section").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("who-am-i").classList.remove("hidden");
  document.getElementById("whoami-text").textContent = `${currentUser.name} · ${currentUser.role}`;
  loadDirectories();
  loadIssues();
  loadFunding();
}

/* ---------- directories (for dropdowns / checkboxes) ---------- */
async function loadDirectories() {
  try {
    if (currentUser.role === "institution" && currentProfile?._id) {
      // only OUR OWN faculty - the backend also enforces this on assign, but
      // there's no reason to even show other institutions' faculty here
      facultyDirectory = (await api(`/faculty?institution=${currentProfile._id}`)).faculty;
    }
    if (currentUser.role === "faculty" && currentProfile?.institution?._id) {
      // only students who belong to OUR OWN institution - the backend also
      // enforces this on team creation, but no reason to show others here
      studentDirectory = (await api(`/students?college=${currentProfile.institution._id}`)).students;
    }
  } catch (err) {
    console.error("Could not load directories:", err.message);
  }
}

/* ---------- raise a new challenge ---------- */
document.getElementById("issue-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/issues", {
      method: "POST",
      body: {
        title: document.getElementById("issue-title").value,
        district: document.getElementById("issue-district").value,
        sector: document.getElementById("issue-sector").value,
        theme: document.getElementById("issue-theme").value,
        description: document.getElementById("issue-desc").value,
      },
    });
    setMsg("issue-msg", "Submitted!", true);
    e.target.reset();
    loadIssues();
  } catch (err) {
    setMsg("issue-msg", err.message);
  }
});

document.getElementById("btn-refresh-issues").addEventListener("click", loadIssues);
document.getElementById("btn-load-funding").addEventListener("click", loadFunding);

/* ---------- render the challenge list, with role-appropriate actions per card ---------- */
async function loadIssues() {
  const container = document.getElementById("issue-list");
  container.textContent = "Loading…";
  try {
    const { issues } = await api("/issues");
    container.innerHTML = issues.map(issueCardHTML).join("") || "<p>No challenges yet.</p>";
    wireIssueCardActions(issues);
  } catch (err) {
    container.textContent = `Error: ${err.message}`;
  }
}

// Statuses during which the assigned faculty can post updates / mark complete - mirrors the backend.
const ACTIVE_FOR_FACULTY = ["assigned", "team_formed", "seeking_funds", "funded", "in_progress"];
const COMPLETABLE = ["team_formed", "seeking_funds", "funded", "in_progress"];

function issueCardHTML(issue) {
  const updates = (issue.updates || []).slice().reverse(); // newest first
  const updatesHTML = updates.map((u) => `
    <div class="update-item">
      <strong>${escapeHTML(u.postedBy?.name || "Faculty")}</strong>
      <span class="update-time">${new Date(u.at).toLocaleString()}</span>
      <p>${escapeHTML(u.text)}</p>
    </div>`).join("");

  return `
    <div class="issue-card" data-id="${issue._id}">
      <h4>${escapeHTML(issue.title)}</h4>
      <div class="issue-meta">
        <span class="tag">${issue.status}</span>
        <span>${escapeHTML(issue.district)}</span>
        <span>${escapeHTML(issue.sector)}</span>
      </div>
      <p>${escapeHTML(issue.description)}</p>
      ${updates.length ? `<div class="issue-updates"><strong>Progress updates</strong>${updatesHTML}</div>` : ""}
      <div class="issue-actions" data-actions-for="${issue._id}"></div>
    </div>`;
}

// Builds the buttons/forms available for THIS issue given the logged-in user's role + the issue's status.
function wireIssueCardActions(issues) {
  issues.forEach((issue) => {
    const box = document.querySelector(`[data-actions-for="${issue._id}"]`);
    if (!box) return;
    const role = currentUser.role;

    if (role === "admin" && issue.status === "pending_review") {
      box.innerHTML = `<button data-act="approve">Approve</button><button data-act="reject" class="secondary">Reject</button>`;
      box.querySelector('[data-act="approve"]').onclick = () => runAction(`/issues/${issue._id}/approve`, "PATCH");
      box.querySelector('[data-act="reject"]').onclick = () => runAction(`/issues/${issue._id}/reject`, "PATCH");
    }

    else if (role === "institution" && issue.status === "approved") {
      box.innerHTML = `<button data-act="engage">Engage with this challenge</button>`;
      box.querySelector('[data-act="engage"]').onclick = () => runAction(`/issues/${issue._id}/engage`, "PATCH");
    }

    else if (role === "institution" && issue.status === "engaged") {
      const options = facultyDirectory.map((f) => `<option value="${f.id}">${escapeHTML(f.name || f.email)}</option>`).join("");
      box.innerHTML = `<select data-role="faculty-select"><option value="">Choose faculty…</option>${options}</select>
                        <button data-act="assign">Assign faculty</button>`;
      box.querySelector('[data-act="assign"]').onclick = () => {
        const facultyId = box.querySelector('[data-role="faculty-select"]').value;
        if (!facultyId) return alert("Pick a faculty member first.");
        runAction(`/issues/${issue._id}/assign-faculty`, "PATCH", { facultyId });
      };
    }

    else if (role === "faculty" && issue.status === "assigned") {
      const checks = studentDirectory.map((s) =>
        `<label style="display:block;font-weight:normal"><input type="checkbox" value="${s.id}"> ${escapeHTML(s.name || s.email)} (${escapeHTML(s.branch || "")})</label>`
      ).join("");
      box.innerHTML = `<div><input type="text" placeholder="Team name" data-role="team-name" style="margin-bottom:.4em"></div>
                        <div>${checks || "<em>No registered students yet</em>"}</div>
                        <button data-act="create-team">Form team</button>`;
      box.querySelector('[data-act="create-team"]').onclick = () => {
        const name = box.querySelector('[data-role="team-name"]').value;
        const studentIds = [...box.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value);
        if (!name) return alert("Give the team a name.");
        runAction(`/teams`, "POST", { issueId: issue._id, name, studentIds });
      };
    }

    else if (role === "faculty" && (issue.status === "team_formed" || issue.status === "in_progress")) {
      // Team is formed - funding is optional. Faculty can either raise a
      // funding request or just start solving without one.
      box.innerHTML = `<input type="number" placeholder="Amount needed (₹)" data-role="amount" style="width:140px">
                        <button data-act="request-funding">Request funding</button>
                        ${issue.status === "team_formed" ? '<button data-act="skip-funding" class="secondary">Skip funding — start solving</button>' : ""}`;
      box.querySelector('[data-act="request-funding"]').onclick = () => {
        const amountNeeded = Number(box.querySelector('[data-role="amount"]').value);
        if (!amountNeeded) return alert("Enter an amount.");
        runAction(`/funding-requests`, "POST", { issueId: issue._id, amountNeeded });
      };
      const skipBtn = box.querySelector('[data-act="skip-funding"]');
      if (skipBtn) skipBtn.onclick = () => runAction(`/issues/${issue._id}/start`, "PATCH");
    }

    else if (role === "faculty" && ACTIVE_FOR_FACULTY.includes(issue.status)) {
      // handled entirely by appendFacultyExtras below (update form / mark complete) - no separate primary action here
      box.innerHTML = "";
    }

    else {
      box.innerHTML = `<em style="font-size:.8rem;color:#4c5b62">No action available for your role at this stage.</em>`;
    }

    appendFacultyExtras(box, issue); // progress updates + "mark completed", independent of the status branch above
  });
}

// Adds a "post an update" form and, when eligible, a "mark completed" button
// below whatever primary action buttons were rendered above. Uses
// insertAdjacentHTML (not innerHTML +=) so it doesn't wipe out the
// listeners already attached to the primary action buttons.
function appendFacultyExtras(box, issue) {
  if (currentUser.role !== "faculty") return;
  if (!currentProfile?.id || String(issue.assignedFaculty) !== String(currentProfile.id)) return;
  if (!ACTIVE_FOR_FACULTY.includes(issue.status)) return;

  const wrapId = `extras-${issue._id}`;
  const completeBtn = COMPLETABLE.includes(issue.status)
    ? `<button data-act="mark-complete" class="secondary">Mark project completed</button>` : "";

  box.insertAdjacentHTML("beforeend", `
    <div class="update-form" id="${wrapId}">
      <textarea data-role="update-text" placeholder="Post a progress update…" rows="2"></textarea>
      <div style="margin-top:.4em;display:flex;gap:.5em;flex-wrap:wrap">
        <button data-act="post-update">Post update</button>
        ${completeBtn}
      </div>
    </div>`);

  const wrap = document.getElementById(wrapId);
  wrap.querySelector('[data-act="post-update"]').onclick = () => {
    const text = wrap.querySelector('[data-role="update-text"]').value;
    if (!text.trim()) return alert("Write something first.");
    runAction(`/issues/${issue._id}/updates`, "POST", { text });
  };
  const completeButton = wrap.querySelector('[data-act="mark-complete"]');
  if (completeButton) {
    completeButton.onclick = () => {
      if (confirm("Mark this project as completed? This is final.")) {
        runAction(`/issues/${issue._id}/complete`, "PATCH");
      }
    };
  }
}

async function runAction(path, method, body) {
  try {
    await api(path, { method, body });
    loadIssues();
    loadFunding();
  } catch (err) {
    alert(err.message);
  }
}

/* ---------- funding requests, with a pledge form for funding orgs ---------- */
async function loadFunding() {
  const container = document.getElementById("funding-list");
  const panel = document.getElementById("funding-browse-panel");
  // Only funding orgs need to see/act on this; keep the dashboard uncluttered for other roles.
  if (currentUser.role !== "funding_org") { panel.classList.add("hidden"); return; }
  panel.classList.remove("hidden");

  container.textContent = "Loading…";
  try {
    const { fundingRequests } = await api("/funding-requests?status=open");
    container.innerHTML = fundingRequests.map((fr) => `
      <div class="funding-card" data-id="${fr._id}">
        <strong>${escapeHTML(fr.issue?.title || "Untitled")}</strong> — needs ₹${fr.amountNeeded}, raised ₹${fr.amountRaised}
        <form data-role="pledge-form">
          <input type="number" placeholder="Amount" required>
          <button type="submit">Pledge</button>
        </form>
      </div>`).join("") || "<p>No open funding requests right now.</p>";

    container.querySelectorAll('[data-role="pledge-form"]').forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = form.closest(".funding-card").dataset.id;
        const amount = Number(form.querySelector("input").value);
        try {
          await api(`/funding-requests/${id}/pledge`, { method: "POST", body: { amount } });
          loadFunding();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    container.textContent = `Error: ${err.message}`;
  }
}

function escapeHTML(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- restore session on refresh ---------- */
if (token && currentUser) showDashboard();
