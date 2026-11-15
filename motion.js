(() => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ---------------------------------------------------------
     1. INTRO CANVAS ANIMATION (index.html only)
     --------------------------------------------------------- */
  const introOverlay = document.getElementById("art-intro");
  if (introOverlay) {
    const hasSeenIntro = sessionStorage.getItem("princeart_intro_seen") === "1";

    const finishIntro = () => {
      introOverlay.classList.add("is-leaving");
      sessionStorage.setItem("princeart_intro_seen", "1");
      document.body.classList.remove("intro-active");
      setTimeout(() => {
        introOverlay.remove();
      }, 750);
    };

    if (prefersReducedMotion || hasSeenIntro) {
      introOverlay.remove();
      document.body.classList.remove("intro-active");
    } else {
      document.body.classList.add("intro-active");
      const skipBtn = document.getElementById("intro-skip");
      if (skipBtn) {
        skipBtn.addEventListener("click", finishIntro);
      }

      // Auto-transition after the 3.8s artistic sequence
      const autoTimer = setTimeout(finishIntro, 3800);
      if (skipBtn) {
        skipBtn.addEventListener("click", () => clearTimeout(autoTimer), {
          once: true,
        });
      }
    }
  }

  /* ---------------------------------------------------------
     2. SCROLL REVEAL (Intersection Observer)
     --------------------------------------------------------- */
  const revealElements = document.querySelectorAll("[data-reveal]");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.getAttribute("data-delay");
            if (delay) {
              entry.target.style.transitionDelay = `${delay}ms`;
            }
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    revealElements.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     3. SUBTLE PARALLAX ON SCROLL
     --------------------------------------------------------- */
  if (!prefersReducedMotion) {
    const parallaxEls = document.querySelectorAll("[data-parallax]");
    if (parallaxEls.length > 0) {
      let ticking = false;
      const updateParallax = () => {
        const scrollY = window.scrollY;
        parallaxEls.forEach((el) => {
          const speed = parseFloat(el.getAttribute("data-parallax")) || 0.06;
          const rect = el.getBoundingClientRect();
          const offset = (rect.top + scrollY - window.innerHeight / 2) * speed;
          el.style.transform = `translate3d(0, ${Math.max(-24, Math.min(24, offset))}px, 0)`;
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
    }
  }

  /* ---------------------------------------------------------
     4. GALLERY LIGHTBOX (Graffiti / Dessin)
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
      <button class="lightbox-close" aria-label="Fermer la visionneuse">&times;</button>
      <button class="lightbox-nav lightbox-prev" aria-label="Œuvre précédente">&#8592;</button>
      <figure class="lightbox-figure">
        <img src="" alt="" />
        <figcaption>
          <span class="lightbox-index"></span>
          <h3 class="lightbox-title"></h3>
          <p class="lightbox-desc"></p>
        </figcaption>
      </figure>
      <button class="lightbox-nav lightbox-next" aria-label="Œuvre suivante">&#8594;</button>
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

    const showItem = (index) => {
      currentIndex = (index + galleryItems.length) % galleryItems.length;
      const item = galleryItems[currentIndex];
      const img = item.querySelector("img");
      const span = item.querySelector("span");
      const title = item.querySelector("h3");
      const desc = item.querySelector("p");

      if (img) {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
      }
      lbIndex.textContent = span ? span.textContent : "";
      lbTitle.textContent = title ? title.textContent : "";
      lbDesc.textContent = desc ? desc.textContent : "";
    };

    const openLightbox = (index) => {
      showItem(index);
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    };

    const closeLightbox = () => {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
    };

    galleryItems.forEach((item, idx) => {
      const img = item.querySelector("img");
      if (img) {
        img.style.cursor = "zoom-in";
        img.addEventListener("click", () => openLightbox(idx));
      }
    });

    closeBtn.addEventListener("click", closeLightbox);
    prevBtn.addEventListener("click", () => showItem(currentIndex - 1));
    nextBtn.addEventListener("click", () => showItem(currentIndex + 1));

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showItem(currentIndex - 1);
      if (e.key === "ArrowRight") showItem(currentIndex + 1);
    });
  }
})();
