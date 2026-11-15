(() => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const isFinePointer = window.matchMedia("(hover: hover)").matches;

  /* ---------------------------------------------------------
     1. INTRODUCTION ARTISTIQUE (index.html uniquement)
     --------------------------------------------------------- */
  const introOverlay = document.getElementById("art-intro");
  if (introOverlay) {
    const hasSeenIntro =
      sessionStorage.getItem("princeart_intro_seen") === "1";

    const finishIntro = () => {
      if (!document.body.contains(introOverlay)) return;
      introOverlay.classList.add("is-leaving");
      sessionStorage.setItem("princeart_intro_seen", "1");
      document.body.classList.remove("intro-active", "intro-playing");
      document.body.classList.add("intro-done");
      setTimeout(() => introOverlay.remove(), 750);
    };

    if (prefersReducedMotion || hasSeenIntro) {
      introOverlay.remove();
      document.body.classList.add("intro-done");
    } else {
      document.body.classList.add("intro-active", "intro-playing");
      const skipBtn = document.getElementById("intro-skip");
      const autoTimer = setTimeout(finishIntro, 3200);
      if (skipBtn) {
        skipBtn.addEventListener(
          "click",
          () => {
            clearTimeout(autoTimer);
            finishIntro();
          },
          { once: true },
        );
      }
    }
  } else {
    document.body.classList.add("intro-done");
  }

  /* ---------------------------------------------------------
     2. EN-TÊTE AU DÉFILEMENT + BARRE DE PROGRESSION
     --------------------------------------------------------- */
  const header = document.getElementById("site-header");
  const progressBar = document.querySelector(".scroll-progress span");
  if (header || progressBar) {
    let ticking = false;
    const updateChrome = () => {
      const scrollY = window.scrollY;
      if (header) header.classList.toggle("is-scrolled", scrollY > 12);
      if (progressBar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = max > 0 ? `${(scrollY / max) * 100}%` : "0%";
      }
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(updateChrome);
          ticking = true;
        }
      },
      { passive: true },
    );
    updateChrome();
  }

  /* ---------------------------------------------------------
     3. MENU MOBILE PLEIN ÉCRAN
     --------------------------------------------------------- */
  const menuToggle = document.getElementById("menu-toggle");
  const menuOverlay = document.getElementById("menu-overlay");
  if (menuToggle && menuOverlay) {
    const setMenu = (open) => {
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute(
        "aria-label",
        open ? "Fermer le menu" : "Ouvrir le menu",
      );
      menuOverlay.hidden = !open;
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        const firstLink = menuOverlay.querySelector("a");
        if (firstLink) firstLink.focus();
      }
    };
    menuToggle.addEventListener("click", () =>
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true"),
    );
    menuOverlay.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menuOverlay.hidden) setMenu(false);
    });
  }

  /* ---------------------------------------------------------
     4. TRAITS DE PINCEAU : LONGUEURS RÉELLES
     --------------------------------------------------------- */
  document.querySelectorAll(".brush-path").forEach((path) => {
    try {
      path.style.setProperty("--len", Math.ceil(path.getTotalLength()));
    } catch {
      /* SVG non rendu : la valeur par défaut s'applique */
    }
  });

  /* ---------------------------------------------------------
     5. RÉVÉLATIONS AU DÉFILEMENT (Intersection Observer)
     --------------------------------------------------------- */
  const revealElements = document.querySelectorAll("[data-reveal]");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const delay = entry.target.getAttribute("data-delay");
          if (delay) {
            entry.target.style.setProperty("--reveal-delay", `${delay}ms`);
          }
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    revealElements.forEach((el) => observer.observe(el));
  }

  /* Traits de pinceau des sections : dessinés à l'approche */
  const brushSvgs = document.querySelectorAll(".page-hero-brush");
  if (brushSvgs.length > 0 && !prefersReducedMotion && "IntersectionObserver" in window) {
    const brushObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-drawn");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    brushSvgs.forEach((svg) => brushObserver.observe(svg));
  } else {
    brushSvgs.forEach((svg) => svg.classList.add("is-drawn"));
  }

  /* ---------------------------------------------------------
     6. PARALLAXE LÉGÈRE (bureau uniquement)
     --------------------------------------------------------- */
  const parallaxEls = document.querySelectorAll("[data-parallax]");
  if (
    !prefersReducedMotion &&
    parallaxEls.length > 0 &&
    window.innerWidth > 900
  ) {
    let ticking = false;
    const updateParallax = () => {
      const scrollY = window.scrollY;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.getAttribute("data-parallax")) || 0.05;
        const rect = el.getBoundingClientRect();
        const offset =
          (rect.top + scrollY - window.innerHeight / 2) * speed;
        const clamped = Math.max(-22, Math.min(22, offset));
        el.style.transform = `translate3d(0, ${clamped.toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(updateParallax);
          ticking = true;
        }
      },
      { passive: true },
    );
    updateParallax();
  }

  /* ---------------------------------------------------------
     7. VISIONNEUSE D'ŒUVRES (galeries)
     --------------------------------------------------------- */
  const galleryItems = Array.from(
    document.querySelectorAll(".gallery-placeholder"),
  );
  if (galleryItems.length > 0) {
    const lightbox = document.createElement("div");
    lightbox.className = "art-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Visionneuse d'œuvre");
    lightbox.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="Fermer la visionneuse">&times;</button>
      <button class="lightbox-nav lightbox-prev" type="button" aria-label="Œuvre précédente">&#8592;</button>
      <figure class="lightbox-figure">
        <img src="" alt="" />
        <figcaption>
          <span class="lightbox-index"></span>
          <h3 class="lightbox-title"></h3>
          <p class="lightbox-desc"></p>
        </figcaption>
      </figure>
      <button class="lightbox-nav lightbox-next" type="button" aria-label="Œuvre suivante">&#8594;</button>
    `;
    document.body.appendChild(lightbox);

    const lbImg = lightbox.querySelector("img");
    const lbIndex = lightbox.querySelector(".lightbox-index");
    const lbTitle = lightbox.querySelector(".lightbox-title");
    const lbDesc = lightbox.querySelector(".lightbox-desc");
    const closeBtn = lightbox.querySelector(".lightbox-close");
    const prevBtn = lightbox.querySelector(".lightbox-prev");
    const nextBtn = lightbox.querySelector(".lightbox-next");

    let currentIndex = 0;
    let lastOpener = null;

    const showItem = (index) => {
      currentIndex = (index + galleryItems.length) % galleryItems.length;
      const item = galleryItems[currentIndex];
      const img = item.querySelector("img");
      const num = item.querySelector("figcaption > span");
      const title = item.querySelector("figcaption h3");
      const desc = item.querySelector("figcaption p");
      if (img) {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
      }
      const total = String(galleryItems.length).padStart(2, "0");
      const current = String(currentIndex + 1).padStart(2, "0");
      lbIndex.textContent = `${num ? num.textContent : current} / ${total}`;
      lbTitle.textContent = title ? title.textContent : "";
      lbDesc.textContent = desc ? desc.textContent : "";
    };

    const openLightbox = (index, opener) => {
      lastOpener = opener || null;
      showItem(index);
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    };

    const closeLightbox = () => {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
      if (lastOpener) lastOpener.focus();
    };

    galleryItems.forEach((item, idx) => {
      item.addEventListener("click", () => openLightbox(idx, item));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(idx, item);
        }
      });
    });

    closeBtn.addEventListener("click", closeLightbox);
    prevBtn.addEventListener("click", () => showItem(currentIndex - 1));
    nextBtn.addEventListener("click", () => showItem(currentIndex + 1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") showItem(currentIndex - 1);
      if (event.key === "ArrowRight") showItem(currentIndex + 1);
    });
  }

  /* ---------------------------------------------------------
     8. CONSEILS — AFFICHES DÉPLIABLES (chiens.html)
     --------------------------------------------------------- */
  const advices = Array.from(document.querySelectorAll("[data-advice]"));
  const setAdvice = (advice, open) => {
    advice.classList.toggle("is-open", open);
    const head = advice.querySelector(".advice-head");
    if (head) head.setAttribute("aria-expanded", String(open));
  };

  if (advices.length > 0) {
    advices.forEach((advice, index) => {
      const head = advice.querySelector(".advice-head");
      if (head) {
        head.addEventListener("click", () => {
          const willOpen = !advice.classList.contains("is-open");
          advices.forEach((other) => setAdvice(other, false));
          setAdvice(advice, willOpen);
        });
      }
      const nextBtn = advice.querySelector("[data-next]");
      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          const next = advices[index + 1];
          if (next) {
            advices.forEach((other) => setAdvice(other, false));
            setAdvice(next, true);
            next.scrollIntoView({
              behavior: prefersReducedMotion ? "auto" : "smooth",
              block: "center",
            });
          } else {
            const note = document.getElementById("a-retenir");
            if (note) {
              note.scrollIntoView({
                behavior: prefersReducedMotion ? "auto" : "smooth",
                block: "center",
              });
            }
          }
        });
      }
    });

    // Survol bureau : les affiches se déplient aussi au survol
    // (le clic reste le moyen principal, accessible partout).
    if (isFinePointer && !prefersReducedMotion) {
      advices.forEach((advice) => {
        advice.addEventListener("mouseenter", () => {
          advices.forEach((other) => {
            if (other !== advice) setAdvice(other, false);
          });
          setAdvice(advice, true);
        });
      });
    }
  }
})();
