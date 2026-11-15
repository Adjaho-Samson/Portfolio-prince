const pageIdByPath = {
  "": "home",
  "index.html": "home",
  "presentation.html": "presentation",
  "contact.html": "contact",
  "chiens.html": "dogs",
};

const pageId = pageIdByPath[window.location.pathname.split("/").pop()] || null;

if (pageId) {
  fetch("/api/public/pages")
    .then((response) => (response.ok ? response.json() : []))
    .then((pages) => {
      const page = pages.find((item) => item.id === pageId);
      if (!page) return;
      document.title = `${page.title} - Prince-Abraham`;
      /* Éléments dédiés au contenu administrable (design préservé) */
      const titleEl = document.querySelector("[data-cms-title]");
      const excerptEl = document.querySelector("[data-cms-excerpt]");
      if (titleEl) titleEl.textContent = page.title;
      if (excerptEl) excerptEl.textContent = page.excerpt;
      /* Repli historique si une page n'a pas encore ces marqueurs */
      if (!titleEl) {
        const heading = document.querySelector("main h1");
        if (heading) heading.textContent = page.title;
      }
      if (!excerptEl) {
        const introduction = document.querySelector(
          ".hero > p:not(.surtitle), .hero-content > p:not(.surtitle), .page-content > p",
        );
        if (introduction) introduction.textContent = page.excerpt;
      }
    })
    .catch(() => {});
}
