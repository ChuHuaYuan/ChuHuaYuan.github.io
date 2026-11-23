(function () {
  "use strict";

  const DATA = window.SITE_DATA;
  if (!DATA) return;

  const STORAGE_LANG = "qz_homepage_lang";
  const STORAGE_THEME = "qz_homepage_theme";

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

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      // Ignore storage errors in restricted/private contexts
    }
  }

  function getInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("lang");
    if (fromUrl === "zh" || fromUrl === "en") return fromUrl;
    const saved = safeStorageGet(STORAGE_LANG);
    if (saved === "zh" || saved === "en") return saved;
    return "en";
  }

  function getInitialTheme() {
    const saved = safeStorageGet(STORAGE_THEME);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  const state = {
    lang: getInitialLang(),
    theme: getInitialTheme(),
    filter: "all",
    openBibtexIds: new Set(),
    hasAnimatedOnce: false,
    lastRouteInfo: null,
  };

  let revealObserver = null;
  let routeController = null;
  let telemetryHideTimer = null;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
  }

  function renderAvatar() {
    const avatar = DATA.meta.avatar;
    const img = document.getElementById("avatar-img");
    const btn = document.getElementById("avatar-toggle");
    if (!avatar || !img || !btn) return;
    img.src = avatar.src;
    img.alt = avatar.alt[state.lang];
    btn.title = avatar.pingTooltip[state.lang];
    btn.setAttribute("aria-label", avatar.pingTooltip[state.lang]);
  }

  function renderTelemetryBar() {
    const el = document.getElementById("route-telemetry");
    if (!el || !state.lastRouteInfo) return;
    const info = state.lastRouteInfo;
    const heroT = DATA.i18n[state.lang].hero;
    const originLabel = heroT.routeOrigin;
    const destLabel = info.destLabel[state.lang];
    const pathChain = [originLabel, ...info.satIds, destLabel].join(" → ");

    el.innerHTML = `
      <span class="route-telemetry-pill">
        <span class="route-telemetry-dot" aria-hidden="true"></span>
        <span>${escapeHtml(heroT.routePrefix)}</span>
        <span class="route-telemetry-path">${escapeHtml(pathChain)}</span>
        <span class="route-telemetry-metric">· ${info.hops} ${escapeHtml(heroT.routeHopsUnit)} · ${info.rttMs} ms</span>
      </span>
    `;
  }

  function showTelemetry(routeInfo) {
    const el = document.getElementById("route-telemetry");
    if (!el) return;
    state.lastRouteInfo = routeInfo;
    renderTelemetryBar();
    el.classList.add("is-active");
    if (telemetryHideTimer) clearTimeout(telemetryHideTimer);
    telemetryHideTimer = setTimeout(() => {
      el.classList.remove("is-active");
    }, 5000);
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

    renderTelemetryBar();
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
    const shouldUseReveal = !state.hasAnimatedOnce && !animateFilter;

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

    if (animateFilter) {
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
    const shouldUseReveal = !state.hasAnimatedOnce;
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
    if (!("IntersectionObserver" in window)) {
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
    renderAvatar();
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

  /* ========================================================================
     3D Wireframe Earth + Multi-Shell Rotating LEO Constellation + Live ISL Routing
     ======================================================================== */
  function setupOrbitCanvas() {
    const canvas = document.getElementById("orbit-canvas");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    let width = 0;
    let height = 0;
    let rafId = null;
    let earthSpin = 0.45;
    let destIndex = 0;

    // 3D globe tilt angles (gentle natural axial tilt)
    const TILT_X = 0.34;
    const TILT_Z = -0.16;
    const COS_TX = Math.cos(TILT_X);
    const SIN_TX = Math.sin(TILT_X);
    const COS_TZ = Math.cos(TILT_Z);
    const SIN_TZ = Math.sin(TILT_Z);

    // Three orbital shells surrounding the globe
    const shells = [
      { radiusMult: 1.44, inc: 0.96, asc: 0.25, dash: [3, 5] },
      { radiusMult: 1.66, inc: 0.48, asc: -0.7, dash: [] },
      { radiusMult: 1.88, inc: -0.82, asc: 1.05, dash: [2, 6] },
    ];

    const satellites = [
      { id: "S01", shell: 0, angle: 0.25, speed: 0.00046, r: 2.6 },
      { id: "S02", shell: 0, angle: 2.35, speed: 0.00046, r: 2.5 },
      { id: "S03", shell: 0, angle: 4.45, speed: 0.00046, r: 2.4 },
      { id: "S04", shell: 1, angle: 1.1, speed: -0.00038, r: 2.7 },
      { id: "S05", shell: 1, angle: 4.2, speed: -0.00038, r: 2.5 },
      { id: "S06", shell: 2, angle: 0.85, speed: 0.00031, r: 2.5 },
      { id: "S07", shell: 2, angle: 3.95, speed: 0.00031, r: 2.4 },
    ];

    // Origin ground station (Shanghai) & rotating cross-continental destinations on front hemisphere
    const originStation = {
      code: "SHA",
      label: { en: "SHA", zh: "上海" },
      lat: 0.44,
      lon: -0.68,
    };

    const destStations = [
      { code: "FRA", label: { en: "FRA", zh: "法兰克福" }, lat: 0.48, lon: 0.62 },
      { code: "LDN", label: { en: "LDN", zh: "伦敦" }, lat: 0.62, lon: 0.36 },
      { code: "SFO", label: { en: "SFO", zh: "旧金山" }, lat: -0.22, lon: 0.72 },
      { code: "SIN", label: { en: "SIN", zh: "新加坡" }, lat: -0.45, lon: 0.28 },
    ];

    // Active click-to-route visualization state
    let activeRoute = null;

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
            earthFillInner: "rgba(38, 86, 148, 0.20)",
            earthFillOuter: "rgba(18, 38, 68, 0.09)",
            earthRim: "rgba(124, 182, 244, 0.26)",
            earthGrid: "rgba(124, 182, 244, 0.13)",
            orbitFront: "rgba(124, 182, 244, 0.21)",
            orbitBack: "rgba(124, 182, 244, 0.08)",
            islBase: [124, 182, 244],
            islMaxAlpha: 0.24,
            satFront: "rgba(174, 214, 255, 0.86)",
            satBack: "rgba(124, 182, 244, 0.32)",
            satGlow: "rgba(124, 182, 244, 0.24)",
            routeRgb: [94, 234, 212],
            packetCore: "#e6fffa",
            labelBg: "rgba(13, 18, 26, 0.78)",
            labelText: "#99f6e4",
          }
        : {
            earthFillInner: "rgba(26, 71, 122, 0.09)",
            earthFillOuter: "rgba(26, 71, 122, 0.03)",
            earthRim: "rgba(26, 71, 122, 0.20)",
            earthGrid: "rgba(26, 71, 122, 0.105)",
            orbitFront: "rgba(26, 71, 122, 0.17)",
            orbitBack: "rgba(26, 71, 122, 0.065)",
            islBase: [26, 71, 122],
            islMaxAlpha: 0.2,
            satFront: "rgba(26, 71, 122, 0.68)",
            satBack: "rgba(26, 71, 122, 0.24)",
            satGlow: "rgba(26, 71, 122, 0.16)",
            routeRgb: [14, 116, 144],
            packetCore: "#0891b2",
            labelBg: "rgba(250, 250, 248, 0.88)",
            labelText: "#0e7490",
          };
    }

    function applyGlobeTilt(x, y, z) {
      // Rotate around X axis
      const y1 = y * COS_TX - z * SIN_TX;
      const z1 = y * SIN_TX + z * COS_TX;
      // Rotate around Z axis
      const x2 = x * COS_TZ - y1 * SIN_TZ;
      const y2 = x * SIN_TZ + y1 * COS_TZ;
      return { x: x2, y: y2, z: z1 };
    }

    function spherePoint(lat, lon, R, cx, cy) {
      const cosLat = Math.cos(lat);
      const px = R * cosLat * Math.sin(lon);
      const py = -R * Math.sin(lat);
      const pz = R * cosLat * Math.cos(lon);
      const t = applyGlobeTilt(px, py, pz);
      return { x: cx + t.x, y: cy + t.y, z: t.z };
    }

    function orbitPoint(shell, angle, R, cx, cy) {
      const rad = R * shell.radiusMult;
      // Point in orbital plane
      const x0 = rad * Math.cos(angle);
      const y0 = rad * Math.sin(angle);
      // Inclination around X
      const cosI = Math.cos(shell.inc);
      const sinI = Math.sin(shell.inc);
      const y1 = y0 * cosI;
      const z1 = y0 * sinI;
      // Ascending node rotation around Y
      const cosA = Math.cos(shell.asc);
      const sinA = Math.sin(shell.asc);
      const x2 = x0 * cosA + z1 * sinA;
      const z2 = -x0 * sinA + z1 * cosA;
      // Apply subtle global scene tilt
      const t = applyGlobeTilt(x2, y1, z2);
      return { x: cx + t.x, y: cy + t.y, z: t.z };
    }

    function getSceneMetrics() {
      const cx = width * 0.56;
      const cy = height * 0.5;
      const R = Math.max(36, Math.min(height * 0.28, width * 0.19, 64));
      return { cx, cy, R };
    }

    function drawOrbitLayer(layer, R, cx, cy, palette) {
      const steps = 96;
      shells.forEach((shell) => {
        ctx.save();
        ctx.strokeStyle = layer === "front" ? palette.orbitFront : palette.orbitBack;
        ctx.lineWidth = layer === "front" ? 1.05 : 0.85;
        ctx.setLineDash(shell.dash);
        ctx.beginPath();
        let penDown = false;

        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const pt = orbitPoint(shell, a, R, cx, cy);
          const inLayer = layer === "front" ? pt.z >= 0 : pt.z < 0;
          const hiddenBehindGlobe = pt.z < 0 && Math.hypot(pt.x - cx, pt.y - cy) < R * 0.99;

          if (inLayer && !hiddenBehindGlobe) {
            if (!penDown) {
              ctx.moveTo(pt.x, pt.y);
              penDown = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            penDown = false;
          }
        }
        ctx.stroke();
        ctx.restore();
      });
    }

    function drawEarthSilhouette(R, cx, cy, palette) {
      // Soft spherical silhouette fill (naturally occludes back-side orbits)
      const grad = ctx.createRadialGradient(
        cx - R * 0.3,
        cy - R * 0.3,
        R * 0.1,
        cx,
        cy,
        R
      );
      grad.addColorStop(0, palette.earthFillInner);
      grad.addColorStop(1, palette.earthFillOuter);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle wireframe meridians (slowly spinning)
      ctx.strokeStyle = palette.earthGrid;
      ctx.lineWidth = 0.85;

      const meridianCount = 8;
      for (let m = 0; m < meridianCount; m++) {
        const lon = earthSpin + (m / meridianCount) * Math.PI * 2;
        ctx.beginPath();
        let penDown = false;
        for (let s = -16; s <= 16; s++) {
          const lat = (s / 16) * (Math.PI / 2);
          const pt = spherePoint(lat, lon, R, cx, cy);
          if (pt.z >= -2) {
            if (!penDown) {
              ctx.moveTo(pt.x, pt.y);
              penDown = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            penDown = false;
          }
        }
        ctx.stroke();
      }

      // Subtle latitude parallels (-30°, 0°, +30°)
      const parallels = [-0.52, 0, 0.52];
      parallels.forEach((lat) => {
        ctx.beginPath();
        let penDown = false;
        for (let s = 0; s <= 48; s++) {
          const lon = (s / 48) * Math.PI * 2;
          const pt = spherePoint(lat, lon, R, cx, cy);
          if (pt.z >= -2) {
            if (!penDown) {
              ctx.moveTo(pt.x, pt.y);
              penDown = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            penDown = false;
          }
        }
        ctx.stroke();
      });

      // Crisp outer horizon rim
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = palette.earthRim;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }

    function drawMiniLabel(text, x, y, palette, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '600 9.5px "JetBrains Mono", ui-monospace, monospace';
      const padX = 4;
      const metrics = ctx.measureText(text);
      const boxW = metrics.width + padX * 2;
      const boxH = 14;
      const bx = x - boxW / 2;
      const by = y - boxH - 6;

      ctx.fillStyle = palette.labelBg;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bx, by, boxW, boxH, 3);
      } else {
        ctx.rect(bx, by, boxW, boxH);
      }
      ctx.fill();

      ctx.fillStyle = palette.labelText;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, by + boxH / 2 + 0.5);
      ctx.restore();
    }

    function computeLiveRoute() {
      const { cx, cy, R } = getSceneMetrics();
      const dest = destStations[destIndex % destStations.length];
      destIndex++;

      const srcPt = spherePoint(originStation.lat, originStation.lon, R, cx, cy);
      const dstPt = spherePoint(dest.lat, dest.lon, R, cx, cy);

      const satNodes = satellites.map((sat, idx) => {
        const pt = orbitPoint(shells[sat.shell], sat.angle, R, cx, cy);
        return {
          key: `sat-${idx}`,
          satIndex: idx,
          id: sat.id,
          x: pt.x,
          y: pt.y,
          z: pt.z,
          visible: !(pt.z < 0 && Math.hypot(pt.x - cx, pt.y - cy) < R * 0.96),
        };
      });

      // Prefer satellites on visible hemisphere for clean visual routing
      const pool = satNodes.filter((n) => n.visible);
      const usable = pool.length >= 2 ? pool : satNodes;

      // Build weighted graph: SRC -> nearest 3 sats, sat <-> sat ISLs, nearest 3 sats -> DST
      const nodes = [
        { key: "SRC", x: srcPt.x, y: srcPt.y, z: srcPt.z },
        ...usable,
        { key: "DST", x: dstPt.x, y: dstPt.y, z: dstPt.z },
      ];

      const adj = new Map(nodes.map((n) => [n.key, []]));
      const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.5);

      const nearestToSrc = [...usable]
        .sort((a, b) => dist3(a, nodes[0]) - dist3(b, nodes[0]))
        .slice(0, 3);
      const nearestToDst = [...usable]
        .sort((a, b) => dist3(a, nodes[nodes.length - 1]) - dist3(b, nodes[nodes.length - 1]))
        .slice(0, 3);

      nearestToSrc.forEach((s) => {
        adj.get("SRC").push({ to: s.key, w: dist3(nodes[0], s) });
      });

      // Satellite-to-satellite ISL graph (connect each sat to its 3 closest peers)
      usable.forEach((a) => {
        const peers = usable
          .filter((b) => b.key !== a.key)
          .sort((p, q) => dist3(a, p) - dist3(a, q))
          .slice(0, 3);
        peers.forEach((b) => {
          adj.get(a.key).push({ to: b.key, w: dist3(a, b) });
        });
      });

      nearestToDst.forEach((s) => {
        // Slight penalty if single-sat direct hop so multi-hop ISL routing shines
        const isAlsoNearSrc = nearestToSrc.some((n) => n.key === s.key);
        adj.get(s.key).push({
          to: "DST",
          w: dist3(s, nodes[nodes.length - 1]) + (isAlsoNearSrc ? R * 1.15 : 0),
        });
      });

      // Dijkstra shortest path
      const distMap = new Map(nodes.map((n) => [n.key, Infinity]));
      const prevMap = new Map();
      const visited = new Set();
      distMap.set("SRC", 0);

      while (visited.size < nodes.length) {
        let u = null;
        let best = Infinity;
        for (const [k, d] of distMap.entries()) {
          if (!visited.has(k) && d < best) {
            best = d;
            u = k;
          }
        }
        if (!u || u === "DST") break;
        visited.add(u);
        for (const edge of adj.get(u) || []) {
          const alt = best + edge.w;
          if (alt < distMap.get(edge.to)) {
            distMap.set(edge.to, alt);
            prevMap.set(edge.to, u);
          }
        }
      }

      // Reconstruct path of satellite indices
      const satIndices = [];
      let cur = prevMap.get("DST");
      while (cur && cur !== "SRC") {
        const found = usable.find((n) => n.key === cur);
        if (found) satIndices.unshift(found.satIndex);
        cur = prevMap.get(cur);
      }

      // Fallback if graph happened to disconnect
      if (satIndices.length === 0) {
        satIndices.push(nearestToSrc[0].satIndex);
        if (nearestToDst[0].satIndex !== nearestToSrc[0].satIndex) {
          satIndices.push(nearestToDst[0].satIndex);
        }
      }

      const satIds = satIndices.map((idx) => satellites[idx].id);
      const totalPx = distMap.get("DST");
      const baseRtt = Number.isFinite(totalPx) ? 16 + (totalPx / Math.max(R, 40)) * 4.4 : 24.5;
      const rttMs = Math.min(48.9, Math.max(18.2, baseRtt)).toFixed(1);

      activeRoute = {
        dest,
        satIndices,
        satIds,
        startedAt: performance.now(),
        duration: 4600,
      };

      return {
        destCode: dest.code,
        destLabel: dest.label,
        satIds,
        hops: satIndices.length + 1,
        rttMs,
      };
    }

    let lastTime = performance.now();

    function drawFrame(now) {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);
      if (width < 40 || height < 40) {
        if (!document.hidden) rafId = requestAnimationFrame(drawFrame);
        return;
      }

      const palette = getPalette();
      const { cx, cy, R } = getSceneMetrics();

      // Advance slow globe rotation & satellite orbital motion
      earthSpin += 0.00018 * dt;
      const satPositions = satellites.map((sat) => {
        sat.angle += sat.speed * dt;
        const pt = orbitPoint(shells[sat.shell], sat.angle, R, cx, cy);
        return {
          ...sat,
          x: pt.x,
          y: pt.y,
          z: pt.z,
          behindEarth: pt.z < 0 && Math.hypot(pt.x - cx, pt.y - cy) < R * 0.98,
        };
      });

      // Layer 1: Back-side orbital arcs & visible back-side satellites
      drawOrbitLayer("back", R, cx, cy, palette);
      satPositions.forEach((sat) => {
        if (sat.z < 0 && !sat.behindEarth) {
          ctx.beginPath();
          ctx.arc(sat.x, sat.y, sat.r * 0.85, 0, Math.PI * 2);
          ctx.fillStyle = palette.satBack;
          ctx.fill();
        }
      });

      // Layer 2: Wireframe 3D Earth Silhouette
      drawEarthSilhouette(R, cx, cy, palette);

      // Subtle ground station anchor dot for Shanghai
      const shaPt = spherePoint(originStation.lat, originStation.lon, R, cx, cy);
      ctx.beginPath();
      ctx.arc(shaPt.x, shaPt.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = palette.earthRim;
      ctx.fill();

      // Layer 3: Front-side orbital arcs
      drawOrbitLayer("front", R, cx, cy, palette);

      // Ambient dynamic Inter-Satellite Links between nearby front satellites
      const frontSats = satPositions.filter((s) => !s.behindEarth);
      const islThreshold = R * 1.65;
      for (let i = 0; i < frontSats.length; i++) {
        for (let j = i + 1; j < frontSats.length; j++) {
          const a = frontSats[i];
          const b = frontSats[j];
          if (a.z < -R * 0.25 || b.z < -R * 0.25) continue;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < islThreshold) {
            const alpha = (1 - dist / islThreshold) * palette.islMaxAlpha;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${palette.islBase[0]}, ${palette.islBase[1]}, ${palette.islBase[2]}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.9;
            ctx.setLineDash([2, 4]);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Layer 4: Front-side satellites
      satPositions.forEach((sat) => {
        if (sat.z >= 0) {
          ctx.beginPath();
          ctx.arc(sat.x, sat.y, sat.r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = palette.satGlow;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(sat.x, sat.y, sat.r, 0, Math.PI * 2);
          ctx.fillStyle = palette.satFront;
          ctx.fill();
        }
      });

      // Layer 5: Active Interactive Multi-Hop ISL Route (Avatar Click Easter Egg)
      if (activeRoute) {
        const elapsed = now - activeRoute.startedAt;
        if (elapsed > activeRoute.duration) {
          activeRoute = null;
        } else {
          const fadeIn = Math.min(1, elapsed / 260);
          const fadeOut = Math.min(1, (activeRoute.duration - elapsed) / 780);
          const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

          const dstPt = spherePoint(activeRoute.dest.lat, activeRoute.dest.lon, R, cx, cy);
          const waypoints = [
            { x: shaPt.x, y: shaPt.y, label: originStation.code },
            ...activeRoute.satIndices.map((idx) => ({
              x: satPositions[idx].x,
              y: satPositions[idx].y,
              label: satPositions[idx].id,
            })),
            { x: dstPt.x, y: dstPt.y, label: activeRoute.dest.code },
          ];

          const [rr, rg, rb] = palette.routeRgb;

          // Glow line + crisp animated dashed ISL route
          ctx.save();
          ctx.beginPath();
          waypoints.forEach((wp, i) => {
            if (i === 0) ctx.moveTo(wp.x, wp.y);
            else ctx.lineTo(wp.x, wp.y);
          });
          ctx.strokeStyle = `rgba(${rr}, ${rg}, ${rb}, ${(0.22 * alpha).toFixed(3)})`;
          ctx.lineWidth = 4.2;
          ctx.lineJoin = "round";
          ctx.stroke();

          ctx.strokeStyle = `rgba(${rr}, ${rg}, ${rb}, ${(0.88 * alpha).toFixed(3)})`;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 4]);
          ctx.lineDashOffset = -(elapsed * 0.032);
          ctx.stroke();
          ctx.restore();

          // Highlight selected stations & relay satellites
          waypoints.forEach((wp, i) => {
            const isGround = i === 0 || i === waypoints.length - 1;
            ctx.save();
            ctx.beginPath();
            ctx.arc(wp.x, wp.y, isGround ? 6.2 : 5.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rr}, ${rg}, ${rb}, ${(0.2 * alpha).toFixed(3)})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(wp.x, wp.y, isGround ? 3.2 : 3.0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rr}, ${rg}, ${rb}, ${(0.95 * alpha).toFixed(3)})`;
            ctx.fill();
            ctx.restore();

            drawMiniLabel(wp.label, wp.x, wp.y, palette, alpha * 0.95);
          });

          // Flying packet pulses hopping from SHA -> relays -> DST
          const segCount = waypoints.length - 1;
          if (segCount > 0) {
            const pulses = [0, 0.28, 0.56];
            pulses.forEach((offset) => {
              const p = ((elapsed / 1900) - offset) % 1;
              if (p < 0 || p > 1) return;
              const scaled = p * segCount;
              const segIdx = Math.min(segCount - 1, Math.floor(scaled));
              const localT = scaled - segIdx;
              const from = waypoints[segIdx];
              const to = waypoints[segIdx + 1];
              const px = from.x + (to.x - from.x) * localT;
              const py = from.y + (to.y - from.y) * localT;

              ctx.save();
              ctx.beginPath();
              ctx.arc(px, py, 5.2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${rr}, ${rg}, ${rb}, ${(0.32 * alpha).toFixed(3)})`;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(px, py, 2.5, 0, Math.PI * 2);
              ctx.fillStyle = palette.packetCore;
              ctx.globalAlpha = alpha;
              ctx.fill();
              ctx.restore();
            });
          }
        }
      }

      if (!document.hidden) {
        rafId = requestAnimationFrame(drawFrame);
      }
    }

    function start() {
      if (rafId) cancelAnimationFrame(rafId);
      lastTime = performance.now();
      rafId = requestAnimationFrame(drawFrame);
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        start();
      } else if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });

    window.addEventListener("resize", resize, { passive: true });
    resize();
    start();

    return {
      triggerRoute: computeLiveRoute,
    };
  }

  function triggerAvatarPing() {
    const ring = document.getElementById("avatar-ping-ring");
    if (ring) {
      ring.classList.remove("is-pinging");
      void ring.offsetWidth;
      ring.classList.add("is-pinging");
    }
    if (routeController) {
      const routeInfo = routeController.triggerRoute();
      if (routeInfo) {
        showTelemetry(routeInfo);
      }
    }
  }

  function bindEvents() {
    document.getElementById("lang-toggle").addEventListener("click", () => {
      state.lang = state.lang === "en" ? "zh" : "en";
      safeStorageSet(STORAGE_LANG, state.lang);
      renderAll();
    });

    document.getElementById("theme-toggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      safeStorageSet(STORAGE_THEME, state.theme);
      applyTheme();
    });

    document.getElementById("avatar-toggle").addEventListener("click", () => {
      triggerAvatarPing();
    });
  }

  bindEvents();
  renderAll();
  setupScrollSpy();
  setupScrollProgress();
  routeController = setupOrbitCanvas();
})();
