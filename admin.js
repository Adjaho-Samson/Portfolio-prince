let articles = [];
let pages = [];

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
const loginError = document.querySelector("#login-error");
const adminShell = document.querySelector(".admin-shell");
const viewTitle = document.querySelector("#view-title");
const views = document.querySelectorAll(".admin-view");
const navLinks = document.querySelectorAll(".admin-nav-link");
const dialog = document.querySelector("#article-dialog");
const form = document.querySelector("#article-form");
const pageDialog = document.querySelector("#page-dialog");
const pageForm = document.querySelector("#page-form");

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

function escapeHTML(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}

function renderArticles() {
  const list = document.querySelector("#article-list");
  const search = document.querySelector("#article-search").value.toLowerCase();
  const filter = document.querySelector("#article-filter").value;
  const visible = articles.filter(
    (article) =>
      `${article.title} ${article.category}`.toLowerCase().includes(search) &&
      (filter === "all" || article.status === filter),
  );
  list.innerHTML = visible.length
    ? visible
        .map(
          (article) => `
    <article class="article-row">
      <span class="article-marker">${escapeHTML(article.category.slice(0, 1))}</span>
      <div class="article-info"><h3>${escapeHTML(article.title)}</h3><p>${escapeHTML(article.excerpt)}</p><small>${escapeHTML(article.category)} · Modifié ${formatDate(article.updatedAt)}</small></div>
      <span class="status-badge ${article.status}">${article.status === "published" ? "Publié" : "Brouillon"}</span>
      <div class="row-actions"><button data-edit="${article.id}" aria-label="Modifier ${escapeHTML(article.title)}">✎</button><button data-delete="${article.id}" aria-label="Supprimer ${escapeHTML(article.title)}">×</button></div>
    </article>`,
        )
        .join("")
    : `<div class="empty-state">Aucun article ne correspond à votre recherche.</div>`;
}

function renderPages() {
  document.querySelector("#page-list").innerHTML = pages
    .map(
      (page) => `
    <article class="page-row"><div class="page-row-icon">⌘</div><div class="page-info"><h3>${escapeHTML(page.name)}</h3><p>${escapeHTML(page.description)}</p><small>${escapeHTML(page.path)}</small></div><button class="admin-secondary page-edit" data-page-edit="${escapeHTML(page.id)}">Modifier la page</button></article>`,
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
  dialog.showModal();
}

async function loadContent() {
  [articles, pages] = await Promise.all([
    api("/api/articles"),
    api("/api/pages"),
  ]);
  renderArticles();
  renderPages();
}

async function unlockDashboard() {
  const session = await api("/api/session");
  if (!session.authenticated) return;
  loginView.hidden = true;
  adminShell.classList.add("is-unlocked");
  await loadContent();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        password: document.querySelector("#login-password").value,
      }),
    });
    loginForm.reset();
    await unlockDashboard();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

document
  .querySelectorAll("[data-view], [data-view-link]")
  .forEach((control) =>
    control.addEventListener("click", () =>
      showView(control.dataset.view || control.dataset.viewLink),
    ),
  );
document
  .querySelector("#new-article")
  .addEventListener("click", () => openArticle());
document
  .querySelector("#article-search")
  .addEventListener("input", renderArticles);
document
  .querySelector("#article-filter")
  .addEventListener("change", renderArticles);

document
  .querySelector("#article-list")
  .addEventListener("click", async (event) => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;
    if (editId)
      openArticle(articles.find((article) => String(article.id) === editId));
    if (
      deleteId &&
      confirm("Supprimer cet article ? Cette action est immédiate.")
    ) {
      try {
        await api(`/api/articles/${deleteId}`, { method: "DELETE" });
        await loadContent();
      } catch (error) {
        alert(error.message);
      }
    }
  });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.querySelector("#article-id").value;
  const article = {
    title: document.querySelector("#article-title").value,
    excerpt: document.querySelector("#article-excerpt").value,
    category: document.querySelector("#article-category").value,
    status: document.querySelector("#article-status").value,
  };
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
    renderArticles();
    dialog.close();
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#page-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-page-edit]");
  if (!button) return;
  const page = pages.find((item) => item.id === button.dataset.pageEdit);
  document.querySelector("#page-id").value = page.id;
  document.querySelector("#page-title").value = page.title;
  document.querySelector("#page-excerpt").value = page.excerpt;
  pageDialog.showModal();
});

pageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.querySelector("#page-id").value;
  try {
    const saved = await api(`/api/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: document.querySelector("#page-title").value,
        excerpt: document.querySelector("#page-excerpt").value,
      }),
    });
    pages = pages.map((page) => (page.id === saved.id ? saved : page));
    renderPages();
    pageDialog.close();
  } catch (error) {
    alert(error.message);
  }
});

unlockDashboard().catch((error) => {
  loginError.textContent = error.message;
});
