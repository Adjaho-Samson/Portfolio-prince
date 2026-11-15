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
      const heading = document.querySelector("main h1");
      const introduction = document.querySelector(
        ".hero > p:not(.surtitle), .hero-content > p:not(.surtitle), .page-content > p",
      );
      if (heading) heading.textContent = page.title;
      if (introduction) introduction.textContent = page.excerpt;
    })
    .catch(() => {});
}
