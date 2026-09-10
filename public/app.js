const API_BASE = "/api";

let token = localStorage.getItem("sangam_token") || null;
let currentUser = JSON.parse(localStorage.getItem("sangam_user") || "null");
let currentProfile = JSON.parse(localStorage.getItem("sangam_profile") || "null");

let facultyDirectory = [];
let studentDirectory = [];
let allLoadedIssues = [];
let isChallengesRevealed = false;

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
  if (!el) return;
  el.textContent = text;
  el.className = "msg " + (text ? (ok ? "ok" : "error") : "");
}

/* ================= TAB CONTROLLERS ================= */
document.querySelectorAll(".tab-clean").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-clean").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const isLogin = btn.dataset.tab === "login";
    document.getElementById("login-form").classList.toggle("hidden", !isLogin);
    document.getElementById("register-form").classList.toggle("hidden", isLogin);
  });
});

/* ================= ROLE SELECTOR ================= */
const roleRadios = document.querySelectorAll('input[name="role-pick"]');
const hiddenRoleSelect = document.getElementById("reg-role");

function syncRole(roleValue) {
  hiddenRoleSelect.value = roleValue;
  document.querySelectorAll(".role-fields").forEach((div) => div.classList.add("hidden"));
  const target = document.getElementById(`fields-${roleValue}`);
  if (target) target.classList.remove("hidden");
}

roleRadios.forEach((r) => {
  r.addEventListener("change", (e) => syncRole(e.target.value));
});

(async function loadInstitutions() {
  const facSel = document.getElementById("fac-institution");
  const stuSel = document.getElementById("stu-college");
  if (!facSel || !stuSel) return;
  try {
    const { institutions } = await api("/institutions");
    const options = institutions.map((i) => `<option value="${i.id}">${i.name}</option>`).join("");
    facSel.innerHTML = `<option value="">Choose institution…</option>${options}`;
    stuSel.innerHTML = `<option value="">Choose college…</option>${options}`;
  } catch (e) {
    // Fail silently on public browse
  }
})();

/* ================= AUTH ACTIONS ================= */
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const role = hiddenRoleSelect.value;
  const profile = {};

  if (role === "student") {
    profile.college = document.getElementById("stu-college").value;
    profile.branch = document.getElementById("stu-branch").value;
  } else if (role === "institution") {
    profile.institutionName = document.getElementById("inst-name").value;
    profile.fieldsOfExpertise = document.getElementById("inst-fields").value.split(",").map((s) => s.trim()).filter(Boolean);
    profile.manpower = Number(document.getElementById("inst-manpower").value) || undefined;
  } else if (role === "faculty") {
    profile.institution = document.getElementById("fac-institution").value;
    profile.department = document.getElementById("fac-department").value;
    profile.expertise = document.getElementById("fac-expertise").value.split(",").map((s) => s.trim()).filter(Boolean);
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
  document.getElementById("who-am-i").classList.add("hidden");
  document.getElementById("auth-actions").classList.remove("hidden");
  loadIssues();
});

function onLoggedIn(newToken, user, profile) {
  token = newToken; currentUser = user; currentProfile = profile || null;
  localStorage.setItem("sangam_token", token);
  localStorage.setItem("sangam_user", JSON.stringify(user));
  localStorage.setItem("sangam_profile", JSON.stringify(currentProfile));
  authModal.classList.add("hidden");
  showDashboard();
}

function showDashboard() {
  document.getElementById("auth-actions").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("who-am-i").classList.remove("hidden");
  document.getElementById("whoami-text").textContent = `${currentUser.name} (${currentUser.role})`;
  loadIssues();
}

/* ================= CHALLENGES & METRICS ================= */
async function loadIssues() {
  const container = document.getElementById("issue-list");
  try {
    const { issues } = await api("/issues");
    allLoadedIssues = issues || [];

    // Always keep hero counter synced with total live issues in database
    const metricCount = document.getElementById("metric-issues");
    if (metricCount) metricCount.textContent = allLoadedIssues.length;

    renderIssueCards();
    setupBrowseButton();
  } catch (err) {
    if (container) {
      container.innerHTML = `<p style="grid-column: 1/-1; color: #dc2626;">Error: ${err.message}</p>`;
    }
  }
}

function renderIssueCards() {
  const container = document.getElementById("issue-list");
  if (!container) return;

  // Initial load: hidden until user explicitly clicks browse
  if (!isChallengesRevealed) {
    container.innerHTML = `
      <p style="grid-column: 1/-1; color: var(--text-muted); font-size: 0.95rem;">
        Click <strong>Browse open challenges</strong> above to inspect active district problems.
      </p>`;
    return;
  }

  if (!allLoadedIssues.length) {
    container.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted);">No open challenges available at the moment.</p>`;
    return;
  }

  container.innerHTML = allLoadedIssues.map(issueCardHTML).join("");
  wireIssueCardActions(allLoadedIssues);
}

function setupBrowseButton() {
  const browseBtn = Array.from(document.querySelectorAll("button, a")).find((el) =>
    el.textContent.trim().toLowerCase().includes("browse open challenges") ||
    el.textContent.trim().toLowerCase().includes("close challenges")
  );

  if (!browseBtn || browseBtn.dataset.bound) return;
  browseBtn.dataset.bound = "true";

  browseBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Toggle the boolean state
    isChallengesRevealed = !isChallengesRevealed;

    // Update button text to reflect the action
    browseBtn.textContent = isChallengesRevealed ? "Close challenges" : "Browse open challenges";

    // Re-render the container
    renderIssueCards();

    // Scroll to the list when opened, or scroll back to top/hero when closed
    if (isChallengesRevealed) {
      const target = document.getElementById("issue-list") || document.querySelector(".challenges-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

function issueCardHTML(issue) {
  return `
    <div class="issue-card" data-id="${issue._id}">
      <div class="issue-meta">
        <span class="tag">${escapeHTML(issue.status.replace("_", " "))}</span>
        <span>${escapeHTML(issue.district || "Jharkhand")}</span>
        <span>·</span>
        <span>${escapeHTML(issue.sector || "General")}</span>
      </div>
      <h4>${escapeHTML(issue.title)}</h4>
      <p>${escapeHTML(issue.description)}</p>
      <div class="issue-actions" data-actions-for="${issue._id}"></div>
    </div>`;
}

function getSelectedIssuesForUser(userId) {
  try {
    const raw = localStorage.getItem(`sangam_selected_issues_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSelectedIssuesForUser(userId, list) {
  localStorage.setItem(`sangam_selected_issues_${userId}`, JSON.stringify(list));
}

function wireIssueCardActions(issues) {
  if (!currentUser) return;

  const currentUserId = String(currentUser._id || currentUser.id || "");
  const role = currentUser.role;
  let userSelections = getSelectedIssuesForUser(currentUserId);

  issues.forEach((issue) => {
    const box = document.querySelector(`[data-actions-for="${issue._id}"]`);
    if (!box) return;

    const submitterId = String(issue.submittedBy?._id || issue.submittedBy || "");
    const engagedInstId = String(issue.engagedInstitution?._id || issue.engagedInstitution || "");
    const currentInstId = String(currentProfile?._id || currentProfile?.id || "");

    const isSubmitter = submitterId && submitterId === currentUserId;
    const isEngagedInst = role === "institution" && currentInstId && engagedInstId === currentInstId;
    const isAdmin = role === "admin";
    const isSelectedByUser = userSelections.includes(String(issue._id));

    // 1. Admin Review Button for pending challenges
    if (isAdmin && issue.status === "pending_review") {
      box.innerHTML = `<button class="btn-primary-small" data-act="approve">Approve Challenge</button>`;
      box.querySelector('[data-act="approve"]').onclick = async () => {
        try {
          await api(`/issues/${issue._id}/approve`, { method: "PATCH" });
          loadIssues();
        } catch (err) {
          alert("Approval failed: " + err.message);
        }
      };
      return;
    }

    // 2. Selected State (Shows green check badge & Cancel button for any logged-in user)
    if (isSelectedByUser) {
      box.innerHTML = `
        <div style="margin-top: 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
          <span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #166534; background: #dcfce7; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; border: 1px solid #bbf7d0;">
            ✓ Selected to Solve
          </span>
          <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.65rem; color: #b91c1c; border-color: #fca5a5; cursor: pointer;" data-act="cancel-select">
            Cancel Selection
          </button>
        </div>`;

      box.querySelector('[data-act="cancel-select"]').onclick = () => {
        userSelections = userSelections.filter((id) => id !== String(issue._id));
        saveSelectedIssuesForUser(currentUserId, userSelections);
        wireIssueCardActions(issues);
      };
      return;
    }

    // 3. Unselected State: Available to choose
    if (["student", "faculty", "citizen", "institution"].includes(role) && issue.status === "approved") {
      box.innerHTML = `
        <button class="btn-secondary" style="margin-top: 0.75rem; font-size: 0.82rem; padding: 0.45rem 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;" data-act="select-issue">
          <span>✦</span> Select this Challenge
        </button>`;

      box.querySelector('[data-act="select-issue"]').onclick = async () => {
        // If institution, optionally claim on the backend as well
        if (role === "institution" && !issue.engagedInstitution) {
          try {
            await api(`/issues/${issue._id}/engage`, { method: "PATCH" });
          } catch (e) {
            // Proceed to save selection locally if offline/demo
          }
        }

        userSelections.push(String(issue._id));
        saveSelectedIssuesForUser(currentUserId, userSelections);
        wireIssueCardActions(issues);
      };
      return;
    }

    // 4. Mark Solved button for authorized leads/creators
    if (issue.status !== "solved" && issue.status !== "rejected") {
      if (isSubmitter || isEngagedInst || isAdmin) {
        box.innerHTML = `
          <button class="btn-secondary" style="margin-top: 0.75rem; color: #b91c1c; border-color: #fca5a5; font-size: 0.82rem; padding: 0.4rem 0.8rem; cursor: pointer;" data-act="mark-complete">
            ✓ End & Mark Solved
          </button>`;

        box.querySelector('[data-act="mark-complete"]').onclick = async () => {
          if (!confirm("Are you sure you want to mark this challenge as completed?")) return;
          try {
            await api(`/issues/${issue._id}/complete`, { method: "PATCH" });
            alert("Challenge marked as completed!");
            loadIssues();
          } catch (err) {
            alert("Error closing challenge: " + err.message);
          }
        };
      }
    }
  });
}

/* ================= RAISE ISSUE ================= */
document.getElementById("issue-form")?.addEventListener("submit", async (e) => {
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
    setMsg("issue-msg", "Challenge submitted successfully!", true);
    e.target.reset();
    loadIssues();
  } catch (err) {
    setMsg("issue-msg", err.message);
  }
});

/* ================= AUTH MODAL TRIGGERS ================= */
const authModal = document.getElementById("auth-modal");
const btnShowLogin = document.getElementById("btn-show-login");
const btnShowRegister = document.getElementById("btn-show-register");
const btnHeroSubmit = document.getElementById("btn-hero-submit");
const modalClose = document.getElementById("modal-close");
const modalBackdrop = document.getElementById("modal-backdrop");

function openAuth(tab) {
  authModal.classList.remove("hidden");
  document.querySelector(`.tab-clean[data-tab="${tab}"]`)?.click();
}

btnShowLogin?.addEventListener("click", () => openAuth("login"));
btnShowRegister?.addEventListener("click", () => openAuth("register"));

btnHeroSubmit?.addEventListener("click", () => {
  if (currentUser) {
    document.getElementById("dashboard").scrollIntoView({ behavior: "smooth" });
  } else {
    openAuth("login");
  }
});

modalClose?.addEventListener("click", () => authModal.classList.add("hidden"));
modalBackdrop?.addEventListener("click", () => authModal.classList.add("hidden"));

function escapeHTML(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ================= INITIALIZATION ================= */
if (token && currentUser) {
  showDashboard();
} else {
  loadIssues();
}
/* ================= FOOTER & INFO MODALS ================= */
const footerInfoContent = {
  about: {
    title: "About Sangam",
    body: "<p><strong>Sangam</strong> is Jharkhand's centralized civic-innovation bridge. We connect everyday citizens, local panchayats, and civic bodies with leading engineering colleges, universities, and research institutes to prototype practical solutions for grassroots district challenges.</p>"
  },
  "how-it-works": {
    title: "How It Works",
    body: "<p>1. <strong>Citizens & Reps</strong> submit verified local infrastructural or civic issues.<br>2. <strong>Admins</strong> review and approve entries for public engagement.<br>3. <strong>Academic institutions & student teams</strong> claim challenges as capstone or funded research projects.<br>4. <strong>Solutions</strong> are deployed and validated in the district.</p>"
  },
  guidelines: {
    title: "Submission Guidelines",
    body: "<p>Please ensure submitted problems include specific geographic districts, clear environmental or operational impact descriptions, and non-partisan language. Commercial solicitations or personal grievances outside civic scope are rejected.</p>"
  },
  privacy: {
    title: "Privacy Policy",
    body: "<p>Citizen personal contact information, phone numbers, and direct email addresses are strictly masked and protected under public grievance guidelines. Only verified district nodal institutions have access to follow-up triage channels.</p>"
  },
  terms: {
    title: "Terms of Service",
    body: "<p>All submissions made under Sangam are dedicated to the public benefit. By submitting a problem or proposal, participants agree that non-confidential project milestones and public outcomes can be openly showcased across the state innovation repository.</p>"
  },
  "open-data": {
    title: "Open Data Charter",
    body: "<p>Sangam provides anonymized real-time API endpoints covering district challenge categories, problem resolution timelines, and university participation metrics to foster transparent civic accountability.</p>"
  },
  contact: {
    title: "Support & Helpdesk",
    body: "<p>Need technical assistance or help claiming a project? Reach out to the technical team at <strong>support@sangam.gov.in</strong> or phone the State Innovation Cell helpdesk at <strong>+91 (0651) 244-0000</strong>.</p>"
  },
  nodal: {
    title: "District Nodal Officers",
    body: "<p>Each of the 24 districts of Jharkhand maintains a verified District Innovation Nodal Officer stationed at the District Collectorate to verify community problem statements and expedite site testing permissions.</p>"
  },
  faq: {
    title: "Frequently Asked Questions",
    body: "<p><strong>Can any student team join?</strong> Yes, any enrolled undergraduate or graduate team under an affiliated Jharkhand university can participate.<br><br><strong>Is project funding provided?</strong> Select projects can apply directly for university seed grants or partner CSR innovation pools.</p>"
  }
};

const infoModal = document.getElementById("info-modal");
const infoTitle = document.getElementById("info-modal-title");
const infoBody = document.getElementById("info-modal-body");
const infoClose = document.getElementById("info-modal-close");
const infoBackdrop = document.getElementById("info-modal-backdrop");

document.querySelectorAll("[data-footer-modal]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const key = link.getAttribute("data-footer-modal");
    const data = footerInfoContent[key];
    if (data && infoModal) {
      infoTitle.textContent = data.title;
      infoBody.innerHTML = data.body;
      infoModal.classList.remove("hidden");
    }
  });
});

const closeInfoModal = () => infoModal?.classList.add("hidden");
infoClose?.addEventListener("click", closeInfoModal);
infoBackdrop?.addEventListener("click", closeInfoModal);

// Auto-sync current year in copyright
const yearEl = document.getElementById("footer-year");
if (yearEl) yearEl.textContent = new Date().getFullYear();