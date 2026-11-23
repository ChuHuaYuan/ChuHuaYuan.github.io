(function () {
  "use strict";

  const DATA = window.SITE_DATA;
  if (!DATA) return;

  const STORAGE_LANG = "qz_homepage_lang";
  const STORAGE_THEME = "qz_homepage_theme";
  const STORAGE_AVATAR = "qz_homepage_avatar";
  const REDUCED_MOTION =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ICONS = {
    scholar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M6 11.5V17c0 1.66 2.69 3 6 3s6-1.34 6-3v-5.5"/></svg>`,
    orcid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="9" y1="10" x2="9" y2="16"/><circle cx="9" cy="7.5" r="0.6" fill="currentColor"/><path d="M12.5 16v-6h2.2a3 3 0 0 1 0 6h-2.2z"/></svg>`,
    researchgate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8.5 16V8h3a2.2 2.2 0 0 1 0 4.4h-3"/><path d="M11.3 12.4L14.8 16"/></svg>`,
    github: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>`,
    lab: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-24 12 12)"/><circle cx="17.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>`,
  };

  function getInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("lang");
    if (fromUrl === "zh" || fromUrl === "en") return fromUrl;
    const saved = localStorage.getItem(STORAGE_LANG);
    if (saved === "zh" || saved === "en") return saved;
    return "en";
  }

  function getInitialTheme() {
    const saved = localStorage.getItem(STORAGE_THEME);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function getInitialAvatarIndex() {
    const saved = localStorage.getItem(STORAGE_AVATAR);
    const idx = DATA.meta.avatars.findIndex((a) => a.id === saved);
    return idx >= 0 ? idx : 0;
  }

  const state = {
    lang: getInitialLang(),
    theme: getInitialTheme(),
    avatarIdx: getInitialAvatarIndex(),
    filter: "all",
    openBibtexIds: new Set(),
    hasAnimatedOnce: false,
  };

  let revealObserver = null;
  let redrawOrbitStatic = null;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.innerHTML = state.theme === "dark" ? ICONS.sun : ICONS.moon;
    }
    if (typeof redrawOrbitStatic === "function") {
      redrawOrbitStatic();
    }
  }

  function renderAvatar(animate) {
    const avatar = DATA.meta.avatars[state.avatarIdx];
    const img = document.getElementById("avatar-img");
    const btn = document.getElementById("avatar-toggle");
    if (!avatar || !img || !btn) return;

    btn.title = avatar.label[state.lang];
    btn.setAttribute("aria-label", avatar.label[state.lang]);

    if (animate && !REDUCED_MOTION) {
      img.classList.add("is-swapping");
      setTimeout(() => {
        img.src = avatar.src;
        img.alt = avatar.alt[state.lang];
        requestAnimationFrame(() => img.classList.remove("is-swapping"));
      }, 130);
    } else {
      img.src = avatar.src;
      img.alt = avatar.alt[state.lang];
    }
  }

  function renderHeaderAndHero(t) {
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    document.title = t.pageTitle;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute("content", t.pageDescription);

    document.getElementById("brand-name").textContent = t.brandName;
    document.getElementById("nav-about").textContent = t.nav.about;
    document.getElementById("nav-publications").textContent = t.nav.publications;
    document.getElementById("nav-education").textContent = t.nav.education;

    const langBtn = document.getElementById("lang-toggle");
    langBtn.textContent = t.langSwitch;
    langBtn.setAttribute("aria-label", t.langSwitchAria);

    const themeBtn = document.getElementById("theme-toggle");
    themeBtn.setAttribute("aria-label", t.themeSwitchAria);

    document.getElementById("hero-primary-name").textContent = t.hero.primaryName;
    document.getElementById("hero-secondary-name").textContent = t.hero.secondaryName;
    document.getElementById("hero-role").textContent = t.hero.role;

    const affEl = document.getElementById("hero-affiliation");
    affEl.innerHTML = `${escapeHtml(t.hero.affiliationPrefix)} <a href="${t.hero.labUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.hero.labName)}</a> ${escapeHtml(t.hero.labSuffix)}`;

    const linksContainer = document.getElementById("hero-links");
    const emailHtml = `
      <span class="email-group">
        <a class="email-link" href="mailto:${DATA.meta.email}">
          ${ICONS.mail}
          <span>${escapeHtml(DATA.meta.email)}</span>
        </a>
        <button type="button" class="email-copy-btn" id="copy-email-btn">${escapeHtml(t.hero.copyEmail)}</button>
      </span>
    `;
    const pillsHtml = DATA.links
      .map(
        (item) => `
      <a class="link-pill" href="${item.url}" target="_blank" rel="noopener noreferrer">
        ${ICONS[item.id] || ""}
        <span>${escapeHtml(item.label[state.lang])}</span>
      </a>`
      )
      .join("");
    linksContainer.innerHTML = emailHtml + pillsHtml;

    const copyBtn = document.getElementById("copy-email-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await copyText(DATA.meta.email);
          copyBtn.textContent = t.hero.copiedEmail;
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.textContent = DATA.i18n[state.lang].hero.copyEmail;
            copyBtn.classList.remove("copied");
          }, 1800);
        } catch (_) {
          // Ignore clipboard errors gracefully
        }
      });
    }
  }

  function renderAbout(t) {
    document.getElementById("title-about").textContent = t.sections.about;
    document.getElementById("about-body").innerHTML = t.aboutParagraphs
      .map((p) => `<p>${p}</p>`)
      .join("");
  }

  function formatAuthors(authors) {
    return authors
      .map((name) => {
        const safe = escapeHtml(name);
        return name === DATA.meta.selfAuthorName
          ? `<span class="author-self">${safe}</span>`
          : safe;
      })
      .join(", ");
  }

  function matchesFilter(pub, filter) {
    if (filter === "all") return true;
    if (filter === "first") return Boolean(pub.firstAuthor);
    return pub.type === filter;
  }

  function renderPublications(t, animateFilter) {
    document.getElementById("title-publications").textContent = t.sections.publications;

    const scholarLink = DATA.links.find((l) => l.id === "scholar");
    const pubMeta = document.getElementById("publications-meta");
    if (scholarLink && pubMeta) {
      pubMeta.innerHTML = `${escapeHtml(t.publicationsUi.scholarNote)} <a href="${scholarLink.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.publicationsUi.scholarLinkText)} ↗</a>`;
    }

    const pubs = DATA.publications;
    const counts = {
      all: pubs.length,
      first: pubs.filter((p) => p.firstAuthor).length,
      journal: pubs.filter((p) => p.type === "journal").length,
      conference: pubs.filter((p) => p.type === "conference").length,
    };

    const filterOrder = ["all", "first", "journal", "conference"];
    const filtersEl = document.getElementById("pub-filters");
    filtersEl.innerHTML = filterOrder
      .map(
        (key) => `
      <button type="button" class="filter-btn${state.filter === key ? " active" : ""}" data-filter="${key}">
        <span>${escapeHtml(t.publicationsUi.filters[key])}</span>
        <span class="filter-count">${counts[key]}</span>
      </button>`
      )
      .join("");

    filtersEl.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextFilter = btn.getAttribute("data-filter");
        if (nextFilter === state.filter) return;
        state.filter = nextFilter;
        renderPublications(DATA.i18n[state.lang], true);
      });
    });

    const filtered = pubs.filter((p) => matchesFilter(p, state.filter));
    const listEl = document.getElementById("pub-list");

    if (filtered.length === 0) {
      listEl.innerHTML = `<p class="pub-empty">${escapeHtml(t.publicationsUi.emptyState)}</p>`;
      return;
    }

    const groupsMap = new Map();
    filtered.forEach((pub) => {
      if (!groupsMap.has(pub.year)) groupsMap.set(pub.year, []);
      groupsMap.get(pub.year).push(pub);
    });

    const years = Array.from(groupsMap.keys()).sort((a, b) => b - a);
    const shouldUseReveal = !state.hasAnimatedOnce && !animateFilter && !REDUCED_MOTION;

    listEl.innerHTML = years
      .map((year) => {
        const itemsHtml = groupsMap
          .get(year)
          .map((pub) => {
            const doiUrl = pub.doi ? `https://doi.org/${pub.doi}` : null;
            const rankClass =
              pub.rank === "CCF-A"
                ? "badge--ccf-a"
                : pub.rank === "CCF-B"
                ? "badge--ccf-b"
                : "";
            const isOpen = state.openBibtexIds.has(pub.id);

            return `
            <article class="pub-item" data-pub-id="${escapeHtml(pub.id)}">
              <div class="pub-badges">
                <span class="badge badge--venue">${escapeHtml(pub.venueShort)}</span>
                ${pub.rank ? `<span class="badge ${rankClass}">${escapeHtml(pub.rank)}</span>` : ""}
                ${pub.firstAuthor ? `<span class="badge badge--first">${escapeHtml(t.publicationsUi.firstAuthorBadge)}</span>` : ""}
                ${pub.highlight ? `<span class="badge badge--highlight">${escapeHtml(pub.highlight[state.lang] || pub.highlight)}</span>` : ""}
              </div>
              <h3 class="pub-title">
                ${
                  doiUrl
                    ? `<a href="${doiUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(pub.title)}</a>`
                    : escapeHtml(pub.title)
                }
              </h3>
              <p class="pub-authors">${formatAuthors(pub.authors)}</p>
              <p class="pub-venue">${escapeHtml(pub.venueFull)}</p>
              <div class="pub-actions">
                ${
                  doiUrl
                    ? `<a class="pub-action" href="${doiUrl}" target="_blank" rel="noopener noreferrer">DOI ↗</a>`
                    : ""
                }
                ${
                  pub.arxiv
                    ? `<a class="pub-action" href="${pub.arxiv}" target="_blank" rel="noopener noreferrer">arXiv ↗</a>`
                    : ""
                }
                <button type="button" class="pub-action js-bibtex-toggle" data-id="${escapeHtml(pub.id)}" aria-expanded="${isOpen ? "true" : "false"}">
                  BibTeX
                </button>
              </div>
              <div class="bibtex-collapse${isOpen ? " is-open" : ""}" id="bib-${escapeHtml(pub.id)}" aria-hidden="${isOpen ? "false" : "true"}">
                <div class="bibtex-collapse-inner">
                  <div class="bibtex-box">
                    <div class="bibtex-toolbar">
                      <span>BibTeX</span>
                      <button type="button" class="bibtex-copy-btn js-bibtex-copy" data-id="${escapeHtml(pub.id)}">${escapeHtml(t.publicationsUi.copyBibtex)}</button>
                    </div>
                    <pre class="bibtex-code"><code>${escapeHtml(pub.bibtex)}</code></pre>
                  </div>
                </div>
              </div>
            </article>`;
          })
          .join("");

        return `
        <div class="pub-year-group${shouldUseReveal ? " reveal" : ""}">
          <div class="pub-year-label">${year}</div>
          <div class="pub-year-items">${itemsHtml}</div>
        </div>`;
      })
      .join("");

    if (animateFilter && !REDUCED_MOTION) {
      listEl.classList.remove("pub-list-fade");
      void listEl.offsetWidth;
      listEl.classList.add("pub-list-fade");
    }

    listEl.querySelectorAll(".js-bibtex-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const drawer = document.getElementById(`bib-${id}`);
        if (!drawer) return;
        const willOpen = !drawer.classList.contains("is-open");
        drawer.classList.toggle("is-open", willOpen);
        drawer.setAttribute("aria-hidden", willOpen ? "false" : "true");
        btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
        if (willOpen) {
          state.openBibtexIds.add(id);
        } else {
          state.openBibtexIds.delete(id);
        }
      });
    });

    listEl.querySelectorAll(".js-bibtex-copy").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const pub = DATA.publications.find((p) => p.id === id);
        if (!pub) return;
        try {
          await copyText(pub.bibtex);
          const ui = DATA.i18n[state.lang].publicationsUi;
          btn.textContent = ui.copiedBibtex;
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = DATA.i18n[state.lang].publicationsUi.copyBibtex;
            btn.classList.remove("copied");
          }, 1800);
        } catch (_) {
          // Ignore clipboard errors gracefully
        }
      });
    });

    if (shouldUseReveal) {
      observeRevealElements(listEl);
    }
  }

  function renderEducation(t) {
    document.getElementById("title-education").textContent = t.sections.education;
    const shouldUseReveal = !state.hasAnimatedOnce && !REDUCED_MOTION;
    const eduList = document.getElementById("edu-list");
    eduList.innerHTML = DATA.education
      .map(
        (item) => `
      <div class="edu-item${shouldUseReveal ? " reveal" : ""}">
        <div class="edu-period">${escapeHtml(item.period[state.lang])}</div>
        <div class="edu-body">
          <div class="edu-head">
            <span class="edu-school">${escapeHtml(item.institution[state.lang])}</span>
            <span class="edu-location">${escapeHtml(item.location[state.lang])}</span>
          </div>
          <p class="edu-degree">${escapeHtml(item.degree[state.lang])}</p>
          <p class="edu-dept">${escapeHtml(item.department[state.lang])}</p>
        </div>
      </div>`
      )
      .join("");

    if (shouldUseReveal) {
      observeRevealElements(eduList);
    }
  }

  function renderFooter(t) {
    document.getElementById("footer-copyright").textContent = t.footer.copyright;
    document.getElementById("footer-updated").textContent = DATA.meta.lastUpdated[state.lang];
    document.getElementById("footer-top").textContent = `${t.footer.backToTop} ↑`;
  }

  function observeRevealElements(root) {
    const targets = root.querySelectorAll(".reveal");
    if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
      );
    }
    targets.forEach((el) => revealObserver.observe(el));
  }

  function renderAll() {
    const t = DATA.i18n[state.lang];
    applyTheme();
    renderAvatar(false);
    renderHeaderAndHero(t);
    renderAbout(t);
    renderPublications(t, false);
    renderEducation(t);
    renderFooter(t);
    state.hasAnimatedOnce = true;
  }

  /* Subtle Hair-Line Scroll Progress Bar */
  function setupScrollProgress() {
    const bar = document.getElementById("scroll-progress");
    if (!bar) return;
    let ticking = false;

    function update() {
      ticking = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  /* Navigation Active Section Spy */
  function setupScrollSpy() {
    const sections = ["about", "publications", "education"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const navMap = new Map(
      sections.map((sec) => [sec.id, document.getElementById(`nav-${sec.id}`)])
    );

    if (!("IntersectionObserver" in window) || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navMap.forEach((link) => link && link.classList.remove("active"));
            const activeLink = navMap.get(entry.target.id);
            if (activeLink) activeLink.classList.add("active");
          }
        });
      },
      { rootMargin: "-20% 0px -62% 0px", threshold: 0 }
    );

    sections.forEach((sec) => observer.observe(sec));
  }

  /* Ultra-Restrained Multi-Shell LEO Constellation Micro-Animation */
  function setupOrbitCanvas() {
    const canvas = document.getElementById("orbit-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hero = canvas.closest(".hero-section");
    let width = 0;
    let height = 0;
    let rafId = null;
    let pointer = { x: -999, y: -999, active: false };

    const shells = [
      { rxRatio: 0.44, ryRatio: 0.3, rot: -0.28, dash: [4, 6] },
      { rxRatio: 0.31, ryRatio: 0.21, rot: -0.22, dash: [] },
      { rxRatio: 0.54, ryRatio: 0.37, rot: -0.34, dash: [2, 7] },
    ];

    const satellites = [
      { shell: 0, angle: 0.4, speed: 0.00032, radius: 2.6 },
      { shell: 0, angle: 3.55, speed: 0.00032, radius: 2.3 },
      { shell: 1, angle: 1.65, speed: -0.00042, radius: 2.2 },
      { shell: 1, angle: 4.8, speed: -0.00042, radius: 2.5 },
      { shell: 2, angle: 2.4, speed: 0.00024, radius: 2.1 },
    ];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getPalette() {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      return dark
        ? {
            orbit: "rgba(124, 182, 244, 0.16)",
            linkBase: [124, 182, 244],
            linkMaxAlpha: 0.34,
            satFill: "rgba(153, 200, 247, 0.72)",
            satGlow: "rgba(124, 182, 244, 0.24)",
          }
        : {
            orbit: "rgba(26, 71, 122, 0.13)",
            linkBase: [26, 71, 122],
            linkMaxAlpha: 0.28,
            satFill: "rgba(26, 71, 122, 0.54)",
            satGlow: "rgba(26, 71, 122, 0.15)",
          };
    }

    function computePoint(cx, cy, shell, angle) {
      const rx = width * shell.rxRatio;
      const ry = Math.max(46, height * shell.ryRatio);
      const lx = Math.cos(angle) * rx;
      const ly = Math.sin(angle) * ry;
      const cosR = Math.cos(shell.rot);
      const sinR = Math.sin(shell.rot);
      return {
        x: cx + lx * cosR - ly * sinR,
        y: cy + lx * sinR + ly * cosR,
      };
    }

    let lastTime = performance.now();

    function drawFrame(now) {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);
      if (width < 40 || height < 40) return;

      const palette = getPalette();
      const cx = width * 0.72;
      const cy = height * 0.52;

      // Draw subtle tilted orbital shells
      shells.forEach((shell) => {
        const rx = width * shell.rxRatio;
        const ry = Math.max(46, height * shell.ryRatio);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(shell.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = palette.orbit;
        ctx.lineWidth = 1;
        ctx.setLineDash(shell.dash);
        ctx.stroke();
        ctx.restore();
      });

      // Advance satellites quietly and compute positions
      const coords = satellites.map((sat) => {
        if (!REDUCED_MOTION) {
          sat.angle += sat.speed * dt;
        }
        const pt = computePoint(cx, cy, shells[sat.shell], sat.angle);
        return { x: pt.x, y: pt.y, radius: sat.radius };
      });

      // Draw delicate dynamic Inter-Satellite Links (ISLs) when nodes pass nearby
      const linkDist = Math.min(185, width * 0.42);
      for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
          const dx = coords[i].x - coords[j].x;
          const dy = coords[i].y - coords[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < linkDist) {
            const alpha = (1 - dist / linkDist) * palette.linkMaxAlpha;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(coords[i].x, coords[i].y);
            ctx.lineTo(coords[j].x, coords[j].y);
            ctx.strokeStyle = `rgba(${palette.linkBase[0]}, ${palette.linkBase[1]}, ${palette.linkBase[2]}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Subtle telemetry tether if pointer drifts across right side of hero
      if (pointer.active && !REDUCED_MOTION) {
        coords.forEach((pt) => {
          const dist = Math.hypot(pt.x - pointer.x, pt.y - pointer.y);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * (palette.linkMaxAlpha * 0.75);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = `rgba(${palette.linkBase[0]}, ${palette.linkBase[1]}, ${palette.linkBase[2]}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
            ctx.restore();
          }
        });
      }

      // Draw crisp miniature satellite nodes with soft halo
      coords.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = palette.satGlow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fillStyle = palette.satFill;
        ctx.fill();
      });

      if (!REDUCED_MOTION && !document.hidden) {
        rafId = requestAnimationFrame(drawFrame);
      }
    }

    function start() {
      if (rafId) cancelAnimationFrame(rafId);
      lastTime = performance.now();
      rafId = requestAnimationFrame(drawFrame);
    }

    redrawOrbitStatic = () => {
      if (REDUCED_MOTION) {
        drawFrame(performance.now());
      }
    };

    if (hero) {
      hero.addEventListener(
        "mousemove",
        (e) => {
          const rect = canvas.getBoundingClientRect();
          pointer.x = e.clientX - rect.left;
          pointer.y = e.clientY - rect.top;
          pointer.active = pointer.x >= 0 && pointer.x <= rect.width && pointer.y >= 0 && pointer.y <= rect.height;
        },
        { passive: true }
      );
      hero.addEventListener(
        "mouseleave",
        () => {
          pointer.active = false;
        },
        { passive: true }
      );
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !REDUCED_MOTION) {
        start();
      } else if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });

    window.addEventListener(
      "resize",
      () => {
        resize();
        if (REDUCED_MOTION) drawFrame(performance.now());
      },
      { passive: true }
    );

    resize();
    if (REDUCED_MOTION) {
      drawFrame(performance.now());
    } else {
      start();
    }
  }

  function bindEvents() {
    document.getElementById("lang-toggle").addEventListener("click", () => {
      state.lang = state.lang === "en" ? "zh" : "en";
      localStorage.setItem(STORAGE_LANG, state.lang);
      renderAll();
    });

    document.getElementById("theme-toggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_THEME, state.theme);
      applyTheme();
    });

    document.getElementById("avatar-toggle").addEventListener("click", () => {
      state.avatarIdx = (state.avatarIdx + 1) % DATA.meta.avatars.length;
      localStorage.setItem(STORAGE_AVATAR, DATA.meta.avatars[state.avatarIdx].id);
      renderAvatar(true);
    });
  }

  bindEvents();
  renderAll();
  setupScrollSpy();
  setupScrollProgress();
  setupOrbitCanvas();
})();
