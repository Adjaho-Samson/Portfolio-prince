(() => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ---------------------------------------------------------
     TOAST ACCESSIBLE (aria-live="polite")
     --------------------------------------------------------- */
  let toastRegion = document.querySelector(".toast-region");
  if (!toastRegion) {
    toastRegion = document.createElement("div");
    toastRegion.className = "toast-region";
    toastRegion.setAttribute("role", "status");
    toastRegion.setAttribute("aria-live", "polite");
    toastRegion.setAttribute("aria-atomic", "true");
    document.body.appendChild(toastRegion);
  }

  let toastTimer = null;
  const showToast = (message) => {
    if (!toastRegion) return;
    clearTimeout(toastTimer);
    toastRegion.innerHTML = `<span class="toast-pill"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span></span></span>`;
    toastRegion.querySelector(".toast-pill span").textContent = message;
    toastRegion.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      toastRegion.classList.remove("is-visible");
    }, 3600);
  };

  /* ---------------------------------------------------------
     UTILITAIRE : ISOLATION DU FOND (inert)
     --------------------------------------------------------- */
  const setBackgroundInert = (isInert, excludeSelectors = []) => {
    const targets = [
      document.querySelector(".site-header"),
      document.querySelector("main"),
      document.querySelector("footer"),
      document.querySelector(".scroll-progress"),
    ];
    targets.forEach((el) => {
      if (!el) return;
      if (excludeSelectors.some((sel) => el.matches(sel))) return;
      el.inert = isInert;
    });
  };

  /* ---------------------------------------------------------
     1. INTRODUCTION ARTISTIQUE (index.html uniquement)
     --------------------------------------------------------- */
  const introOverlay = document.getElementById("art-intro");
  if (introOverlay) {
    const hasSeenIntro =
      sessionStorage.getItem("princeart_intro_seen") === "1";

    const finishIntro = (moveFocusToPage = false) => {
      if (!document.body.contains(introOverlay)) return;
      const skipHadFocus =
        document.activeElement &&
        introOverlay.contains(document.activeElement);
      introOverlay.classList.add("is-leaving");
      introOverlay.inert = true;
      sessionStorage.setItem("princeart_intro_seen", "1");
      document.body.classList.remove("intro-active", "intro-playing");
      document.body.classList.add("intro-done");
      if (moveFocusToPage || skipHadFocus) {
        const target =
          document.querySelector(".logo") ||
          document.querySelector("main");
        if (target) target.focus({ preventScroll: true });
      }
      setTimeout(() => introOverlay.remove(), 650);
    };

    if (prefersReducedMotion || hasSeenIntro) {
      introOverlay.remove();
      document.body.classList.add("intro-done");
    } else {
      document.body.classList.add("intro-active", "intro-playing");
      const skipBtn = document.getElementById("intro-skip");
      const autoTimer = setTimeout(() => finishIntro(false), 2600);

      const handleIntroSkip = () => {
        clearTimeout(autoTimer);
        finishIntro(true);
      };

      if (skipBtn) {
        skipBtn.addEventListener("click", handleIntroSkip, { once: true });
      }
      document.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape" && document.body.contains(introOverlay)) {
            handleIntroSkip();
          }
        },
        { once: true },
      );
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
        progressBar.style.width =
          max > 0 ? `${Math.min(100, (scrollY / max) * 100)}%` : "0%";
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
     3. MENU MOBILE PLEIN ÉCRAN (FOCUS TRAP + INERT)
     --------------------------------------------------------- */
  const menuToggle = document.getElementById("menu-toggle");
  const menuOverlay = document.getElementById("menu-overlay");
  if (menuToggle && menuOverlay) {
    let closeTimer = null;

    const setMenu = (open, restoreFocus = true) => {
      clearTimeout(closeTimer);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute(
        "aria-label",
        open ? "Fermer le menu" : "Ouvrir le menu",
      );

      if (open) {
        menuOverlay.hidden = false;
        requestAnimationFrame(() => menuOverlay.classList.add("is-open"));
        document.body.style.overflow = "hidden";
        setBackgroundInert(true, [".site-header"]);
        const firstLink = menuOverlay.querySelector("a");
        if (firstLink) firstLink.focus();
      } else {
        menuOverlay.classList.remove("is-open");
        document.body.style.overflow = "";
        setBackgroundInert(false);
        const delay = prefersReducedMotion ? 0 : 240;
        closeTimer = setTimeout(() => {
          if (!menuOverlay.classList.contains("is-open")) {
            menuOverlay.hidden = true;
          }
        }, delay);
        if (restoreFocus) menuToggle.focus();
      }
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      setMenu(!isOpen, isOpen);
    });

    menuOverlay.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false, false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menuOverlay.hidden) {
        setMenu(false, true);
      }
    });

    const desktopMedia = window.matchMedia("(min-width: 1081px)");
    const handleViewportChange = (event) => {
      if (event.matches && !menuOverlay.hidden) {
        setMenu(false, false);
      }
    };
    desktopMedia.addEventListener("change", handleViewportChange);
  }

  /* ---------------------------------------------------------
     4. BANDEAU DÉFILANT : CONTRÔLE LECTURE / PAUSE
     --------------------------------------------------------- */
  const marquee = document.querySelector(".marquee");
  const marqueeToggle = document.getElementById("marquee-toggle");
  if (marquee && marqueeToggle) {
    let isPaused = prefersReducedMotion;
    const syncMarquee = () => {
      marquee.classList.toggle("is-paused", isPaused);
      marqueeToggle.setAttribute("aria-pressed", String(isPaused));
      marqueeToggle.setAttribute(
        "aria-label",
        isPaused
          ? "Relancer le bandeau des disciplines"
          : "Mettre en pause le bandeau des disciplines",
      );
      const label = marqueeToggle.querySelector("[data-marquee-label]");
      const iconPause = marqueeToggle.querySelector("[data-icon-pause]");
      const iconPlay = marqueeToggle.querySelector("[data-icon-play]");
      if (label) label.textContent = isPaused ? "Lire" : "Pause";
      if (iconPause) iconPause.hidden = isPaused;
      if (iconPlay) iconPlay.hidden = !isPaused;
    };

    syncMarquee();
    marqueeToggle.addEventListener("click", () => {
      isPaused = !isPaused;
      syncMarquee();
    });
  }

  /* ---------------------------------------------------------
     5. TRAITS DE PINCEAU : LONGUEURS RÉELLES
     --------------------------------------------------------- */
  document.querySelectorAll(".brush-path").forEach((path) => {
    try {
      path.style.setProperty("--len", Math.ceil(path.getTotalLength()));
    } catch {
      /* SVG non rendu */
    }
  });

  /* ---------------------------------------------------------
     6. RÉVÉLATIONS AU DÉFILEMENT (Intersection Observer)
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
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
    );
    revealElements.forEach((el) => observer.observe(el));
  }

  const brushSvgs = document.querySelectorAll(".page-hero-brush");
  if (
    brushSvgs.length > 0 &&
    !prefersReducedMotion &&
    "IntersectionObserver" in window
  ) {
    const brushObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-drawn");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 },
    );
    brushSvgs.forEach((svg) => brushObserver.observe(svg));
  } else {
    brushSvgs.forEach((svg) => svg.classList.add("is-drawn"));
  }

  /* ---------------------------------------------------------
     7. PARALLAXE LÉGÈRE (bureau uniquement)
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
     8. VISIONNEUSE D'ŒUVRES (galeries + focus trap + swipe)
     --------------------------------------------------------- */
  const galleryItems = Array.from(
    document.querySelectorAll(".gallery-placeholder"),
  );
  if (galleryItems.length > 0) {
    const lightbox = document.createElement("div");
    lightbox.className = "art-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-labelledby", "lightbox-title");
    lightbox.hidden = true;
    lightbox.innerHTML = `
      <div class="lightbox-topbar">
        <span class="lightbox-index" aria-live="polite" aria-atomic="true"></span>
        <button class="lightbox-close" type="button" aria-label="Fermer la visionneuse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <button class="lightbox-nav lightbox-prev" type="button" aria-label="Œuvre précédente">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <figure class="lightbox-figure">
        <div class="lightbox-media">
          <img src="" alt="" />
        </div>
        <figcaption>
          <h3 class="lightbox-title" id="lightbox-title"></h3>
          <p class="lightbox-desc"></p>
        </figcaption>
      </figure>
      <button class="lightbox-nav lightbox-next" type="button" aria-label="Œuvre suivante">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    `;
    document.body.appendChild(lightbox);

    const lbImg = lightbox.querySelector("img");
    const lbIndex = lightbox.querySelector(".lightbox-index");
    const lbTitle = lightbox.querySelector(".lightbox-title");
    const lbDesc = lightbox.querySelector(".lightbox-desc");
    const closeBtn = lightbox.querySelector(".lightbox-close");
    const prevBtn = lightbox.querySelector(".lightbox-prev");
    const nextBtn = lightbox.querySelector(".lightbox-next");
    const focusables = [closeBtn, prevBtn, nextBtn];

    let currentIndex = 0;
    let lastOpener = null;
    let closeTimer = null;

    const showItem = (index) => {
      currentIndex = (index + galleryItems.length) % galleryItems.length;
      const item = galleryItems[currentIndex];
      const img = item.querySelector("img");
      const title = item.querySelector("figcaption h3");
      const desc = item.querySelector("figcaption p");
      if (img) {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
      }
      const total = String(galleryItems.length).padStart(2, "0");
      const current = String(currentIndex + 1).padStart(2, "0");
      const titleText = title ? title.textContent.trim() : "";
      lbIndex.textContent = `${current} / ${total}`;
      lbTitle.textContent = titleText;
      lbDesc.textContent = desc ? desc.textContent.trim() : "";
    };

    const openLightbox = (index, opener) => {
      clearTimeout(closeTimer);
      lastOpener = opener || null;
      showItem(index);
      lightbox.hidden = false;
      requestAnimationFrame(() => lightbox.classList.add("is-open"));
      document.body.style.overflow = "hidden";
      setBackgroundInert(true);
      closeBtn.focus();
    };

    const closeLightbox = () => {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
      setBackgroundInert(false);
      const delay = prefersReducedMotion ? 0 : 260;
      closeTimer = setTimeout(() => {
        if (!lightbox.classList.contains("is-open")) {
          lightbox.hidden = true;
        }
      }, delay);
      if (lastOpener && typeof lastOpener.focus === "function") {
        lastOpener.focus();
      }
    };

    galleryItems.forEach((item, idx) => {
      const trigger = item.querySelector(".gallery-trigger");
      if (trigger) {
        trigger.addEventListener("click", () => openLightbox(idx, trigger));
      } else {
        item.addEventListener("click", () => openLightbox(idx, item));
        item.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLightbox(idx, item);
          }
        });
      }
    });

    closeBtn.addEventListener("click", closeLightbox);
    prevBtn.addEventListener("click", () => showItem(currentIndex - 1));
    nextBtn.addEventListener("click", () => showItem(currentIndex + 1));

    lightbox.addEventListener("click", (event) => {
      if (
        event.target === lightbox ||
        event.target.classList.contains("lightbox-figure")
      ) {
        closeLightbox();
      }
    });

    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showItem(currentIndex - 1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showItem(currentIndex + 1);
        return;
      }
      if (event.key === "Tab") {
        const currentFocusIdx = focusables.indexOf(document.activeElement);
        event.preventDefault();
        if (event.shiftKey) {
          const prevIdx =
            (currentFocusIdx - 1 + focusables.length) % focusables.length;
          focusables[prevIdx].focus();
        } else {
          const nextIdx = (currentFocusIdx + 1) % focusables.length;
          focusables[nextIdx].focus();
        }
      }
    });

    // Touch swipe navigation with clear movement threshold (40px)
    let touchStartX = null;
    let touchStartY = null;
    lightbox.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true },
    );
    lightbox.addEventListener(
      "touchend",
      (event) => {
        if (touchStartX === null || event.changedTouches.length !== 1) return;
        const dx = event.changedTouches[0].clientX - touchStartX;
        const dy = event.changedTouches[0].clientY - touchStartY;
        touchStartX = null;
        touchStartY = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          if (dx > 0) showItem(currentIndex - 1);
          else showItem(currentIndex + 1);
        }
      },
      { passive: true },
    );
  }

  /* ---------------------------------------------------------
     9. CONSEILS — AFFICHES DÉPLIABLES (chiens.html)
     Clic/clavier uniquement (pas de saut de mise en page au survol)
     --------------------------------------------------------- */
  const advices = Array.from(document.querySelectorAll("[data-advice]"));
  const setAdvice = (advice, open) => {
    advice.classList.toggle("is-open", open);
    const head = advice.querySelector(".advice-head");
    const body = advice.querySelector(".advice-body");
    if (head) head.setAttribute("aria-expanded", String(open));
    if (body) body.inert = !open;
  };

  if (advices.length > 0) {
    advices.forEach((advice, index) => {
      // Initial state: keep collapsed bodies inert for keyboard nav
      setAdvice(advice, advice.classList.contains("is-open"));

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
            const nextHead = next.querySelector(".advice-head");
            if (nextHead) nextHead.focus({ preventScroll: true });
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
  }

  /* ---------------------------------------------------------
     10. COPIE DIRECTE & ASSISTANT DE MESSAGE (contact.html)
     --------------------------------------------------------- */
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.getAttribute("data-copy");
      const label = btn.getAttribute("data-copy-label") || "Élément";
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        showToast(`${label} copié dans le presse-papier.`);
      } catch {
        showToast(`${label} : ${value}`);
      }
    });
  });

  const contactForm = document.getElementById("contact-composer");
  if (contactForm) {
    const nameInput = document.getElementById("contact-name");
    const topicInput = document.getElementById("contact-topic");
    const messageInput = document.getElementById("contact-message");
    const errorSummary = document.getElementById("contact-error-summary");
    const errorList = document.getElementById("contact-error-list");

    const fields = [
      {
        el: nameInput,
        errEl: document.getElementById("contact-name-error"),
        validate: (val) =>
          val.trim().length >= 2
            ? ""
            : "Indiquez votre nom ou prénom (2 caractères minimum).",
      },
      {
        el: messageInput,
        errEl: document.getElementById("contact-message-error"),
        validate: (val) =>
          val.trim().length >= 10
            ? ""
            : "Décrivez brièvement votre besoin (10 caractères minimum).",
      },
    ];

    const validateField = (field) => {
      const msg = field.validate(field.el.value);
      field.el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (field.errEl) field.errEl.textContent = msg;
      return msg;
    };

    fields.forEach((field) => {
      field.el.addEventListener("blur", () => validateField(field));
      field.el.addEventListener("input", () => {
        if (field.el.getAttribute("aria-invalid") === "true") {
          validateField(field);
        }
      });
    });

    const handleCompose = (channel) => {
      const errors = [];
      fields.forEach((field) => {
        const msg = validateField(field);
        if (msg) errors.push({ id: field.el.id, msg });
      });

      if (errors.length > 0) {
        if (errorSummary && errorList) {
          errorList.innerHTML = errors
            .map(
              (err) =>
                `<li><a href="#${err.id}">${err.msg}</a></li>`,
            )
            .join("");
          errorSummary.hidden = false;
          errorSummary.focus();
        }
        return;
      }

      if (errorSummary) errorSummary.hidden = true;

      const name = nameInput.value.trim();
      const topic = topicInput ? topicInput.value : "Projet";
      const message = messageInput.value.trim();
      const bodyText = `Bonjour Prince-Abraham,\n\nJe m'appelle ${name} et je vous contacte au sujet de : ${topic}.\n\n${message}`;

      if (channel === "whatsapp") {
        const waUrl = `https://wa.me/2290198864845?text=${encodeURIComponent(bodyText)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
        showToast("Message préparé pour WhatsApp.");
      } else {
        const subject = `[Prince-Abraham Art] ${topic} — ${name}`;
        const mailUrl = `mailto:princeadjaho20@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
        window.location.href = mailUrl;
        showToast("Message préparé dans votre messagerie.");
      }
    };

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleCompose("whatsapp");
    });

    const mailBtn = document.getElementById("compose-email");
    if (mailBtn) {
      mailBtn.addEventListener("click", () => handleCompose("email"));
    }
  }
})();
