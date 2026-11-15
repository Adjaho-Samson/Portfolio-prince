let articles = [];
let pages = [];
let pendingDeleteId = null;

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...options.headers },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Une erreur est survenue");
  return data;
};

const loginView = document.querySelector("#login-view");
const loginForm = document.querySelector("#login-form");
const loginPassword = document.querySelector("#login-password");
const togglePasswordBtn = document.querySelector("#toggle-password");
const loginSubmitBtn = document.querySelector("#login-submit");
const loginError = document.querySelector("#login-error");
const adminShell = document.querySelector(".admin-shell");
const viewTitle = document.querySelector("#view-title");
const views = document.querySelectorAll(".admin-view");
const navLinks = document.querySelectorAll(".admin-nav-link");

const dialog = document.querySelector("#article-dialog");
const form = document.querySelector("#article-form");
const pageDialog = document.querySelector("#page-dialog");
const pageForm = document.querySelector("#page-form");
const confirmDialog = document.querySelector("#confirm-dialog");
const confirmMessage = document.querySelector("#confirm-message");
const confirmDeleteBtn = document.querySelector("#confirm-delete-btn");
const toastRegion = document.querySelector(".toast-region");

let toastTimer = null;
function showToast(message, isError = false) {
  if (!toastRegion) return;
  clearTimeout(toastTimer);
  const icon = isError
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
  toastRegion.innerHTML = `<span class="toast-pill ${isError ? "is-error" : ""}">${icon}<span></span></span>`;
  toastRegion.querySelector(".toast-pill span").textContent = message;
  toastRegion.classList.add("is-visible");
  toastTimer = setTimeout(() => {
    toastRegion.classList.remove("is-visible");
  }, 3800);
}

function showView(viewName) {
  views.forEach((view) =>
    view.classList.toggle("is-visible", view.id === `${viewName}-view`),
  );
  navLinks.forEach((link) =>
    link.classList.toggle("is-active", link.dataset.view === viewName),
  );
  viewTitle.textContent = {
    overview: "Vue d'ensemble",
    articles: "Articles",
    pages: "Pages du site",
  }[viewName];
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character],
  );
}

function bindCounter(inputId, countId, max) {
  const input = document.getElementById(inputId);
  const count = document.getElementById(countId);
  if (!input || !count) return () => {};
  const update = () => {
    count.textContent = `${input.value.length} / ${max}`;
  };
  input.addEventListener("input", update);
  return update;
}

const syncArticleTitleCount = bindCounter("article-title", "article-title-count", 90);
const syncArticleExcerptCount = bindCounter("article-excerpt", "article-excerpt-count", 180);
const syncPageTitleCount = bindCounter("page-title", "page-title-count", 90);
const syncPageExcerptCount = bindCounter("page-excerpt", "page-excerpt-count", 220);

function renderOverview() {
  const published = articles.filter((a) => a.status === "published");
  const drafts = articles.filter((a) => a.status === "draft");
  const sorted = [...articles].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  );

  document.getElementById("stat-published").textContent = String(published.length);
  document.getElementById("stat-drafts").textContent = String(drafts.length);
  document.getElementById("stat-pages").textContent = String(pages.length);
  document.getElementById("stat-latest").textContent = sorted[0]
    ? formatShortDate(sorted[0].updatedAt)
    : "—";
  document.getElementById("stat-total-badge").textContent =
    `${articles.length} ${articles.length > 1 ? "articles" : "article"}`;

  // Category distribution chart
  const categories = ["Conseils chiens", "Écriture", "Actualité", "Art"];
  const counts = categories.map((cat) => ({
    name: cat,
    published: articles.filter((a) => a.category === cat && a.status === "published").length,
    draft: articles.filter((a) => a.category === cat && a.status === "draft").length,
  }));
  const maxVal = Math.max(1, ...counts.map((c) => c.published + c.draft));

  const chartEl = document.getElementById("category-chart");
  chartEl.innerHTML = `
    <div class="category-legend">
      <span><i class="legend-dot legend-dot--pub"></i> Publiés</span>
      <span><i class="legend-dot legend-dot--draft"></i> Brouillons</span>
    </div>
    <div class="category-bars">
      ${counts
        .map((c) => {
          const total = c.published + c.draft;
          const pctPub = (c.published / maxVal) * 100;
          const pctDraft = (c.draft / maxVal) * 100;
          return `
            <div class="cat-bar-row">
              <span class="cat-bar-label">${escapeHTML(c.name)}</span>
              <div class="cat-bar-track" title="${escapeHTML(c.name)} : ${c.published} publié(s), ${c.draft} brouillon(s)">
                <span class="cat-bar-fill cat-bar-fill--pub" style="width:${pctPub}%"></span>
                <span class="cat-bar-fill cat-bar-fill--draft" style="width:${pctDraft}%"></span>
              </div>
              <strong class="cat-bar-value">${total}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  // Overview pages list
  const overviewPagesEl = document.getElementById("overview-pages-list");
  overviewPagesEl.innerHTML = pages
    .map(
      (page, i) => `
      <li>
        <span><b>0${i + 1}</b>${escapeHTML(page.name)}</span>
        <a href="${escapeHTML(page.path)}" target="_blank" rel="noopener" class="page-quick-link">
          ${escapeHTML(page.path)} ↗
        </a>
      </li>
    `,
    )
    .join("");

  // Recent activity from real DB items
  const activityEl = document.getElementById("recent-activity-list");
  activityEl.innerHTML = sorted.length
    ? sorted
        .slice(0, 4)
        .map(
          (article) => `
        <div class="activity-item">
          <span class="activity-icon ${article.status === "published" ? "activity-publish" : "activity-edit"}" aria-hidden="true">
            ${
              article.status === "published"
                ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
                : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
            }
          </span>
          <p>
            <strong>${article.status === "published" ? "Article publié" : "Brouillon enregistré"} · ${escapeHTML(article.category)}</strong>
            <small>${escapeHTML(article.title)}</small>
          </p>
          <time datetime="${escapeHTML(article.updatedAt)}">${escapeHTML(formatDate(article.updatedAt))}</time>
        </div>
      `,
        )
        .join("")
    : `<div class="empty-state">Aucune publication enregistrée pour le moment.</div>`;
}

function renderArticles() {
  const list = document.querySelector("#article-list");
  const search = document.querySelector("#article-search").value.toLowerCase().trim();
  const statusFilter = document.querySelector("#article-filter").value;
  const catFilter = document.querySelector("#article-category-filter").value;
  const statusEl = document.querySelector("#article-count-status");

  const visible = articles.filter(
    (article) =>
      `${article.title} ${article.excerpt} ${article.category}`
        .toLowerCase()
        .includes(search) &&
      (statusFilter === "all" || article.status === statusFilter) &&
      (catFilter === "all" || article.category === catFilter),
  );

  if (statusEl) {
    statusEl.textContent = `${visible.length} ${visible.length > 1 ? "articles affichés" : "article affiché"} sur ${articles.length}`;
  }

  list.innerHTML = visible.length
    ? visible
        .map(
          (article) => `
    <article class="article-row">
      <span class="article-marker" aria-hidden="true">${escapeHTML(article.category.slice(0, 1))}</span>
      <div class="article-info">
        <h3>${escapeHTML(article.title)}</h3>
        <p>${escapeHTML(article.excerpt)}</p>
        <small>${escapeHTML(article.category)} · Modifié le ${escapeHTML(formatDate(article.updatedAt))}</small>
      </div>
      <span class="status-badge ${article.status}">${article.status === "published" ? "Publié" : "Brouillon"}</span>
      <div class="row-actions">
        <button type="button" data-edit="${article.id}" aria-label="Modifier ${escapeHTML(article.title)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button type="button" class="btn-delete-row" data-delete="${article.id}" aria-label="Supprimer ${escapeHTML(article.title)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </article>`,
        )
        .join("")
    : `<div class="empty-state">
        <p>Aucun article ne correspond à ces critères.</p>
        <button type="button" class="admin-secondary" id="reset-article-filters">Réinitialiser les filtres</button>
      </div>`;
}

function renderPages() {
  document.querySelector("#page-list").innerHTML = pages
    .map(
      (page) => `
    <article class="page-row">
      <div class="page-row-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="page-info">
        <h3>${escapeHTML(page.name)}</h3>
        <p><strong>${escapeHTML(page.title)}</strong> — ${escapeHTML(page.excerpt)}</p>
        <small>${escapeHTML(page.description)} · <code>${escapeHTML(page.path)}</code></small>
      </div>
      <div class="page-row-actions">
        <a href="${escapeHTML(page.path)}" target="_blank" rel="noopener" class="admin-secondary">
          Aperçu ↗
        </a>
        <button type="button" class="admin-secondary page-edit" data-page-edit="${escapeHTML(page.id)}">
          Modifier
        </button>
      </div>
    </article>`,
    )
    .join("");
}

function openArticle(article) {
  document.querySelector("#dialog-title").textContent = article
    ? "Modifier l'article"
    : "Nouvel article";
  document.querySelector("#article-id").value = article?.id || "";
  document.querySelector("#article-title").value = article?.title || "";
  document.querySelector("#article-excerpt").value = article?.excerpt || "";
  document.querySelector("#article-category").value =
    article?.category || "Conseils chiens";
  document.querySelector("#article-status").value =
    article?.status || "published";
  syncArticleTitleCount();
  syncArticleExcerptCount();
  dialog.showModal();
}

async function loadContent() {
  [articles, pages] = await Promise.all([
    api("/api/articles"),
    api("/api/pages"),
  ]);
  renderOverview();
  renderArticles();
  renderPages();
}

async function unlockDashboard() {
  const session = await api("/api/session");
  if (!session.authenticated) {
    loginView.hidden = false;
    adminShell.hidden = true;
    adminShell.classList.remove("is-unlocked");
    return;
  }
  loginView.hidden = true;
  adminShell.hidden = false;
  adminShell.classList.add("is-unlocked");
  await loadContent();
}

async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
    loginView.hidden = false;
    adminShell.hidden = true;
    adminShell.classList.remove("is-unlocked");
    loginPassword.focus();
    showToast("Session fermée.");
  } catch (error) {
    showToast(error.message, true);
  }
}

if (togglePasswordBtn && loginPassword) {
  togglePasswordBtn.addEventListener("click", () => {
    const isHidden = loginPassword.type === "password";
    loginPassword.type = isHidden ? "text" : "password";
    togglePasswordBtn.setAttribute("aria-pressed", String(isHidden));
    togglePasswordBtn.setAttribute(
      "aria-label",
      isHidden ? "Masquer le mot de passe" : "Afficher le mot de passe",
    );
    const eyeShow = togglePasswordBtn.querySelector("[data-eye-show]");
    const eyeHide = togglePasswordBtn.querySelector("[data-eye-hide]");
    if (eyeShow) eyeShow.hidden = isHidden;
    if (eyeHide) eyeHide.hidden = !isHidden;
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  loginSubmitBtn.disabled = true;
  const originalLabel = loginSubmitBtn.textContent;
  loginSubmitBtn.textContent = "Connexion...";
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        password: loginPassword.value,
      }),
    });
    loginForm.reset();
    await unlockDashboard();
    showToast("Connexion réussie.");
  } catch (error) {
    loginError.textContent = error.message;
    loginPassword.focus();
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = originalLabel;
  }
});

document.querySelectorAll("#logout-btn, #logout-btn-mobile").forEach((btn) => {
  btn.addEventListener("click", handleLogout);
});

document
  .querySelectorAll("[data-view], [data-view-link]")
  .forEach((control) =>
    control.addEventListener("click", () =>
      showView(control.dataset.view || control.dataset.viewLink),
    ),
  );

document.querySelectorAll("#new-article, [data-quick-new]").forEach((btn) => {
  btn.addEventListener("click", () => openArticle());
});

document
  .querySelector("#article-search")
  .addEventListener("input", renderArticles);
document
  .querySelector("#article-filter")
  .addEventListener("change", renderArticles);
document
  .querySelector("#article-category-filter")
  .addEventListener("change", renderArticles);

document.querySelectorAll("[data-close-dialog]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const parentDialog = btn.closest("dialog");
    if (parentDialog) parentDialog.close();
  });
});

document
  .querySelector("#article-list")
  .addEventListener("click", (event) => {
    const resetBtn = event.target.closest("#reset-article-filters");
    if (resetBtn) {
      document.querySelector("#article-search").value = "";
      document.querySelector("#article-filter").value = "all";
      document.querySelector("#article-category-filter").value = "all";
      renderArticles();
      return;
    }

    const editBtn = event.target.closest("[data-edit]");
    const deleteBtn = event.target.closest("[data-delete]");
    if (editBtn) {
      const target = articles.find(
        (article) => String(article.id) === editBtn.dataset.edit,
      );
      if (target) openArticle(target);
      return;
    }
    if (deleteBtn) {
      const target = articles.find(
        (article) => String(article.id) === deleteBtn.dataset.delete,
      );
      if (!target) return;
      pendingDeleteId = target.id;
      confirmMessage.textContent = `Supprimer « ${target.title} » ? Cette action est définitive.`;
      confirmDialog.showModal();
    }
  });

confirmDeleteBtn.addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  confirmDeleteBtn.disabled = true;
  try {
    await api(`/api/articles/${pendingDeleteId}`, { method: "DELETE" });
    pendingDeleteId = null;
    confirmDialog.close();
    await loadContent();
    showToast("Article supprimé.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    confirmDeleteBtn.disabled = false;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.querySelector("#article-id").value;
  const submitBtn = document.querySelector("#article-submit");
  const article = {
    title: document.querySelector("#article-title").value,
    excerpt: document.querySelector("#article-excerpt").value,
    category: document.querySelector("#article-category").value,
    status: document.querySelector("#article-status").value,
  };
  submitBtn.disabled = true;
  try {
    const saved = id
      ? await api(`/api/articles/${id}`, {
          method: "PATCH",
          body: JSON.stringify(article),
        })
      : await api("/api/articles", {
          method: "POST",
          body: JSON.stringify(article),
        });
    if (!id) articles.unshift(saved);
    else
      articles = articles.map((item) => (item.id === saved.id ? saved : item));
    renderOverview();
    renderArticles();
    dialog.close();
    showToast(id ? "Article mis à jour." : "Article créé.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

document.querySelector("#page-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-page-edit]");
  if (!button) return;
  const page = pages.find((item) => item.id === button.dataset.pageEdit);
  if (!page) return;
  document.querySelector("#page-id").value = page.id;
  document.querySelector("#page-title").value = page.title;
  document.querySelector("#page-excerpt").value = page.excerpt;
  syncPageTitleCount();
  syncPageExcerptCount();
  pageDialog.showModal();
});

pageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.querySelector("#page-id").value;
  const submitBtn = document.querySelector("#page-submit");
  submitBtn.disabled = true;
  try {
    const saved = await api(`/api/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: document.querySelector("#page-title").value,
        excerpt: document.querySelector("#page-excerpt").value,
      }),
    });
    pages = pages.map((page) => (page.id === saved.id ? saved : page));
    renderOverview();
    renderPages();
    pageDialog.close();
    showToast("Page mise à jour.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

unlockDashboard().catch((error) => {
  loginError.textContent = error.message;
});
