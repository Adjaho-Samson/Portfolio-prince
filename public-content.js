(() => {
  const pageIdByPath = {
    "": "home",
    "index.html": "home",
    "presentation.html": "presentation",
    "contact.html": "contact",
    "chiens.html": "dogs",
  };

  const escapeHTML = (value) =>
    String(value).replace(
      /[&<>'"]/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[ch],
    );

  const formatDate = (iso) => {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return "";
    }
  };

  const currentFile = window.location.pathname.split("/").pop() || "";
  const pageId = pageIdByPath[currentFile] || null;

  if (pageId) {
    fetch("/api/public/pages")
      .then((response) => (response.ok ? response.json() : []))
      .then((pages) => {
        if (!Array.isArray(pages)) return;
        const page = pages.find((item) => item.id === pageId);
        if (!page) return;

        if (pageId !== "home") {
          document.title = `${page.title} — Prince-Abraham`;
        }

        const titleEl = document.querySelector("[data-cms-title]");
        const excerptEl = document.querySelector("[data-cms-excerpt]");

        if (titleEl) {
          if (
            pageId === "home" &&
            page.title.trim() === "Prince-Abraham Junior Shègun ADJAHO"
          ) {
            titleEl.innerHTML =
              "Prince-Abraham Junior Shègun <strong>ADJAHO</strong>";
          } else {
            titleEl.textContent = page.title;
          }
        }
        if (excerptEl) {
          excerptEl.textContent = page.excerpt;
        }
      })
      .catch(() => {});
  }

  const articleContainers = document.querySelectorAll("[data-cms-articles]");
  if (articleContainers.length > 0) {
    fetch("/api/public/articles")
      .then((response) => (response.ok ? response.json() : []))
      .then((articles) => {
        if (!Array.isArray(articles)) return;
        articleContainers.forEach((container) => {
          const filterCategory = container.getAttribute("data-cms-category");
          const limit = Number(container.getAttribute("data-cms-limit")) || 0;

          let list = filterCategory
            ? articles.filter(
                (a) =>
                  a.category.toLowerCase() === filterCategory.toLowerCase(),
              )
            : articles;
          if (limit > 0) list = list.slice(0, limit);

          if (list.length === 0) {
            const section = container.closest("[data-articles-section]");
            if (section && container.hasAttribute("data-hide-if-empty")) {
              section.hidden = true;
            }
            return;
          }

          container.innerHTML = list
            .map(
              (article) => `
              <article class="publication-card">
                <div class="publication-meta">
                  <span class="publication-tag">${escapeHTML(article.category)}</span>
                  <time datetime="${escapeHTML(article.updatedAt)}">${escapeHTML(formatDate(article.updatedAt))}</time>
                </div>
                <h3>${escapeHTML(article.title)}</h3>
                <p>${escapeHTML(article.excerpt)}</p>
              </article>
            `,
            )
            .join("");
        });
      })
      .catch(() => {});
  }
})();
