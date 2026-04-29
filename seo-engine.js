// seo-engine.js — dynamic SEO: seasonal overrides, A/B testing, logging, rollback

const SEOEngine = (() => {
  const STORAGE_KEY = 'calcak_seo_state';
  const SCHEMA_VERSION = 2;
  let _config = null;
  let _state = null;

  // ── Config ──────────────────────────────────────────────────
  async function _loadConfig() {
    if (_config) return _config;
    try {
      const res = await fetch('seo-config.json');
      _config = await res.json();
    } catch {
      _config = { calculators: {}, seasonal_overrides: [], update_thresholds: {} };
    }
    return _config;
  }

  // ── State ───────────────────────────────────────────────────
  function _loadState() {
    if (_state) return _state;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion === SCHEMA_VERSION) {
          _state = parsed;
          return _state;
        }
      }
    } catch {}
    _state = {
      schemaVersion: SCHEMA_VERSION,
      current: {},
      history: [],
      abTests: {},
      meta: { totalUpdates: 0, todayUpdateCount: 0, todayDate: '' },
    };
    return _state;
  }

  function _saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch {}
  }

  // ── Throttle ────────────────────────────────────────────────
  function _canUpdate() {
    const s = _loadState();
    const thresholds = (_config && _config.update_thresholds) || {};
    const maxPerDay = thresholds.max_updates_per_day || 3;
    const cooldownHours = thresholds.cooldown_hours || 6;

    const today = new Date().toISOString().split('T')[0];
    if (s.meta.todayDate !== today) {
      s.meta.todayDate = today;
      s.meta.todayUpdateCount = 0;
    }
    if (s.meta.todayUpdateCount >= maxPerDay) return false;
    if (s.history.length > 0) {
      const hoursSince = (Date.now() - s.history[0].timestamp) / 3600000;
      if (hoursSince < cooldownHours) return false;
    }
    return true;
  }

  // ── Seasonal overrides ──────────────────────────────────────
  function _applySeasonalOverrides(calcId, baseCfg) {
    if (!_config || !_config.seasonal_overrides) return { cfg: baseCfg, trigger: 'default' };
    const month = new Date().getMonth() + 1;
    for (const rule of _config.seasonal_overrides) {
      if (rule.active_months.includes(month) && rule.targets && rule.targets[calcId]) {
        return { cfg: Object.assign({}, baseCfg, rule.targets[calcId]), trigger: rule.name };
      }
    }
    return { cfg: baseCfg, trigger: 'default' };
  }

  // ── DOM updates ─────────────────────────────────────────────
  function _applyMetaToDom(cfg, calcId) {
    if (!cfg) return;
    if (cfg.title) document.title = cfg.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && cfg.description) metaDesc.setAttribute('content', cfg.description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && cfg.title) ogTitle.setAttribute('content', cfg.title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && cfg.description) ogDesc.setAttribute('content', cfg.description);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && calcId) ogUrl.setAttribute('content', `https://www.calcak.com/#${calcId}`);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && calcId) canonical.setAttribute('href', `https://www.calcak.com/#${calcId}`);
  }

  function _renderTrending(calcId) {
    const list = document.getElementById('trending-list');
    if (!list) return;
    const items = (typeof TRENDING_DATA !== 'undefined' && TRENDING_DATA[calcId])
      || (typeof TRENDING_DATA !== 'undefined' && TRENDING_DATA.global)
      || [];
    list.innerHTML = items.map(t => `
      <li class="trending-item">
        <a href="#${t.calc}" data-calc="${t.calc}">${t.text}</a>
        <span class="trending-tag">${t.tag}</span>
      </li>`).join('');
    list.querySelectorAll('a[data-calc]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        if (typeof CalcRouter !== 'undefined') CalcRouter.switchTo(a.dataset.calc);
      });
    });
  }

  function _renderSEOBlock(cfg) {
    const block = document.querySelector('.seo-content-block');
    if (!block || !cfg) return;
    const links = (cfg.links || [])
      .map(l => `<a href="#${l.calc}" data-calc="${l.calc}">${l.text}</a>`)
      .join(', ');
    block.innerHTML = `
      <h2>${cfg.h2 || ''}</h2>
      <p>${cfg.body || ''}</p>
      ${links ? `<p>Also try our ${links}.</p>` : ''}`;
    block.querySelectorAll('a[data-calc]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        if (typeof CalcRouter !== 'undefined') CalcRouter.switchTo(a.dataset.calc);
      });
    });
  }

  // ── Logging ─────────────────────────────────────────────────
  function _logUpdate(calcId, trigger, changes, abVariant) {
    const s = _loadState();
    const entry = {
      id: Date.now(),
      timestamp: Date.now(),
      version: (_config && _config.version) || '1.0.0',
      calcId,
      trigger,
      changes,
      abVariant: abVariant || null,
    };
    s.history.unshift(entry);
    if (s.history.length > 50) s.history.pop();
    s.current[calcId] = Object.assign({}, changes, { updatedAt: Date.now(), trigger });
    s.meta.totalUpdates++;
    s.meta.todayUpdateCount = (s.meta.todayUpdateCount || 0) + 1;
    _saveState();
  }

  // ── Rollback ────────────────────────────────────────────────
  function rollback(calcId) {
    const s = _loadState();
    const entries = s.history.filter(e => e.calcId === calcId);
    if (entries.length < 2) return false;
    const prev = entries[1];
    _applyMetaToDom(prev.changes, calcId);
    _renderSEOBlock(prev.changes);
    s.current[calcId] = Object.assign({}, prev.changes, { updatedAt: Date.now(), trigger: 'rollback' });
    _saveState();
    return true;
  }

  // ── A/B Testing ─────────────────────────────────────────────
  function createABTest(calcId, variantA, variantB, durationDays) {
    const s = _loadState();
    s.abTests[calcId] = {
      variantA: Object.assign({}, variantA, { impressions: 0 }),
      variantB: Object.assign({}, variantB, { impressions: 0 }),
      activeUntil: Date.now() + durationDays * 86400000,
    };
    _saveState();
  }

  function _getABVariant(calcId) {
    const s = _loadState();
    const test = s.abTests[calcId];
    if (!test || Date.now() > test.activeUntil) return null;
    // Stable per-session assignment
    let group = sessionStorage.getItem(`ab_${calcId}`);
    if (!group) {
      group = Math.random() < 0.5 ? 'A' : 'B';
      sessionStorage.setItem(`ab_${calcId}`, group);
    }
    const variant = group === 'A' ? test.variantA : test.variantB;
    variant.impressions = (variant.impressions || 0) + 1;
    _saveState();
    return { group, variant };
  }

  // ── Main switch handler ──────────────────────────────────────
  async function onCalcSwitch(calcId) {
    const config = await _loadConfig();
    const baseCfg = config.calculators && config.calculators[calcId];
    if (!baseCfg) {
      _renderTrending(calcId);
      return;
    }

    // Check A/B test first
    const ab = _getABVariant(calcId);
    let finalCfg, trigger, abVariant = null;

    if (ab) {
      finalCfg = Object.assign({}, baseCfg, ab.variant);
      trigger = `ab_test_${ab.group}`;
      abVariant = ab.group;
    } else {
      const seasonal = _applySeasonalOverrides(calcId, baseCfg);
      finalCfg = seasonal.cfg;
      trigger = seasonal.trigger;
    }

    _applyMetaToDom(finalCfg, calcId);
    _renderSEOBlock(finalCfg);
    _renderTrending(calcId);

    if (_canUpdate()) {
      _logUpdate(calcId, trigger, { title: finalCfg.title, description: finalCfg.description }, abVariant);
    }
  }

  // ── Init ────────────────────────────────────────────────────
  function init() {
    _loadState();
    const run = () => _loadConfig().catch(() => {});
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 200);
    }
  }

  return { onCalcSwitch, init, rollback, createABTest };
})();
