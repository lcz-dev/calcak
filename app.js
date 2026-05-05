// =============================================
// Calcak – Calculator Logic & UI
// =============================================

class Calculator {
  constructor() {
    this.currentValue = '0';
    this.expression = '';
    this.operator = null;
    this.prevValue = null;
    this.shouldResetDisplay = false;
    this.history = [];

    this.resultEl = document.getElementById('calc-result');
    this.expressionEl = document.getElementById('calc-expression');
    this.historyList = document.getElementById('history-list');

    this.bindKeys();
    this.bindKeyboard();
    this.loadHistory();
    this.initDailyTip();
  }

  // ---- Display ----
  updateDisplay() {
    this.resultEl.textContent = this.formatNumber(this.currentValue);
    this.expressionEl.textContent = this.expression;
  }

  formatNumber(val) {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (Math.abs(num) >= 1e15) return num.toExponential(6);
    return num.toLocaleString('en-US', { maximumFractionDigits: 10 });
  }

  // ---- Input Handlers ----
  inputDigit(digit) {
    if (this.shouldResetDisplay) {
      this.currentValue = digit === '.' ? '0.' : digit;
      this.shouldResetDisplay = false;
    } else {
      if (digit === '.' && this.currentValue.includes('.')) return;
      if (this.currentValue === '0' && digit !== '.') {
        this.currentValue = digit;
      } else {
        if (this.currentValue.replace('-', '').replace('.', '').length >= 15) return;
        this.currentValue += digit;
      }
    }
    this.updateDisplay();
  }

  inputOperator(op) {
    const opSymbols = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
    const opFns = {
      add: (a, b) => a + b,
      subtract: (a, b) => a - b,
      multiply: (a, b) => a * b,
      divide: (a, b) => b === 0 ? 'Error' : a / b,
    };

    if (this.operator && !this.shouldResetDisplay) this.calculate();

    this.prevValue = parseFloat(this.currentValue);
    this.operator = op;
    this.opFn = opFns[op];
    this.expression = `${this.formatNumber(this.currentValue)} ${opSymbols[op]}`;
    this.shouldResetDisplay = true;
    this.updateDisplay();
  }

  // Maps raw symbols (+, -, *, /) to named operators
  inputOperatorBySymbol(sym) {
    const map = { '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide' };
    const op = map[sym];
    if (op) this.inputOperator(op);
  }

  calculate() {
    if (!this.operator || this.prevValue === null) return;

    const current = parseFloat(this.currentValue);
    const opSymbols = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
    const fullExpr = `${this.expression} ${this.formatNumber(this.currentValue)} =`;
    const result = this.opFn(this.prevValue, current);

    if (result === 'Error') {
      this.currentValue = 'Error';
      this.expression = '';
    } else {
      const resultStr = String(parseFloat(result.toFixed(10)));
      this.addHistory(`${fullExpr} ${this.formatNumber(resultStr)}`);
      this.currentValue = resultStr;
      this.expression = '';
    }

    this.operator = null;
    this.prevValue = null;
    this.shouldResetDisplay = true;
    this.updateDisplay();

    // GA4: track calculation
    if (typeof gtag === 'function') {
      gtag('event', 'calculation', { calculator_id: 'standard' });
    }
  }

  clear() {
    this.currentValue = '0';
    this.expression = '';
    this.operator = null;
    this.prevValue = null;
    this.shouldResetDisplay = false;
    this.updateDisplay();
  }

  toggleSign() {
    if (this.currentValue === '0' || this.currentValue === 'Error') return;
    this.currentValue = this.currentValue.startsWith('-')
      ? this.currentValue.slice(1)
      : '-' + this.currentValue;
    this.updateDisplay();
  }

  percent() {
    const val = parseFloat(this.currentValue);
    if (isNaN(val)) return;
    this.currentValue = String(val / 100);
    this.updateDisplay();
  }

  // ---- History ----
  addHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > 20) this.history.pop();
    this.saveHistory();
    this.renderHistory();
  }

  renderHistory() {
    if (!this.historyList) return;
    if (this.history.length === 0) {
      this.historyList.innerHTML = '<li class="history-empty">No calculations yet</li>';
      return;
    }
    this.historyList.innerHTML = this.history
      .slice(0, 8)
      .map(h => `<li tabindex="0" aria-label="${h}">${h}</li>`)
      .join('');
  }

  saveHistory() {
    try { localStorage.setItem('calcak_history', JSON.stringify(this.history)); } catch {}
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('calcak_history');
      if (saved) this.history = JSON.parse(saved);
    } catch {}
    this.renderHistory();
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.renderHistory();
  }

  // ---- Event Binding ----
  bindKeys() {
    // Delegate to calc-keys container (rendered by CalcRouter)
    const container = document.getElementById('calc-container');
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action],[data-digit],[data-op]');
      if (!btn) return;
      const action = btn.dataset.action;
      const digit  = btn.dataset.digit;
      const op     = btn.dataset.op;

      if (digit !== undefined) {
        this.inputDigit(digit);
      } else if (action) {
        switch (action) {
          case 'clear':   this.clear(); break;
          case 'sign':    this.toggleSign(); break;
          case 'percent': this.percent(); break;
          case 'equals':  this.calculate(); break;
        }
      } else if (op) {
        this.inputOperatorBySymbol(op);
      }
    });

    container.addEventListener('click', (e) => {
      if (e.target.id === 'btn-clear-history') this.clearHistory();
    });
  }

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const map = {
        '0':'0','1':'1','2':'2','3':'3','4':'4',
        '5':'5','6':'6','7':'7','8':'8','9':'9',
        '.':'.', ',':'.',
        '+':'add', '-':'subtract', '*':'multiply', '/':'divide',
        'Enter':'equals', '=':'equals',
        'Backspace':'backspace', 'Escape':'clear', '%':'percent',
      };
      const action = map[e.key];
      if (!action) return;
      e.preventDefault();

      if ('0123456789.'.includes(action)) {
        this.inputDigit(action);
      } else if (action === 'backspace') {
        if (this.currentValue.length > 1) {
          this.currentValue = this.currentValue.slice(0, -1);
        } else {
          this.currentValue = '0';
        }
        this.updateDisplay();
      } else if (['add','subtract','multiply','divide'].includes(action)) {
        this.inputOperator(action);
      } else if (action === 'equals') {
        this.calculate();
      } else if (action === 'clear') {
        this.clear();
      } else if (action === 'percent') {
        this.percent();
      }
    });
  }

  // ---- Daily Tip (dynamic slot simulation) ----
  initDailyTip() {
    const tips = [
      'Paying an extra $100/month on a $300k mortgage can save you over $30,000 in interest.',
      'The standard US tip is 18–20%. Use our tip calculator to split the bill instantly.',
      'A 1% increase in your 401(k) contribution today can add $50k+ to your retirement.',
      'Refinancing at a 0.5% lower rate on a $400k mortgage saves ~$100/month.',
      'A BMI between 18.5 and 24.9 is considered healthy by CDC guidelines.',
      'The 2026 standard deduction is $15,000 for single filers — check your tax estimate.',
      'Paying off a $20k car loan 12 months early can save $800+ in interest.',
      'Use the percentage calculator to quickly find discounts while shopping.',
    ];
    const el = document.getElementById('daily-tip');
    if (el) {
      const idx = new Date().getDate() % tips.length;
      el.textContent = tips[idx];
    }
  }
}

// ---- Mobile Nav Toggle ----
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('nav-open');
  });
}

// ---- Category Switcher ----
function initCategoryNav() {
  // Left sidebar cat-items
  document.querySelectorAll('.cat-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const calcId = item.dataset.calc;
      if (calcId && typeof CalcRouter !== 'undefined') {
        CalcRouter.switchTo(calcId);
      }
    });
  });

  // Main nav .nav-calc links (top header + footer)
  document.querySelectorAll('.nav-calc').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const calcId = link.dataset.calc;
      if (calcId && typeof CalcRouter !== 'undefined') {
        CalcRouter.switchTo(calcId);
        document.getElementById('calc-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Close any open dropdown
      document.querySelectorAll('.has-dropdown.open').forEach(d => d.classList.remove('open'));
    });
  });

  // Dropdown toggle (click for touch/keyboard, hover handled by CSS)
  document.querySelectorAll('.has-dropdown > a').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const li = trigger.closest('.has-dropdown');
      const isOpen = li.classList.contains('open');
      document.querySelectorAll('.has-dropdown.open').forEach(d => d.classList.remove('open'));
      if (!isOpen) {
        li.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.has-dropdown')) {
      document.querySelectorAll('.has-dropdown.open').forEach(d => {
        d.classList.remove('open');
        d.querySelector('[aria-expanded]')?.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

// ---- Footer SEO Keywords (dynamic slot) ----
function initFooterKeywords() {
  // DYNAMIC-SLOT: inject trending search terms from SEO API
  const keywords = [
    { text: 'mortgage calculator 2026', href: '#' },
    { text: 'tax refund estimator', href: '#' },
    { text: 'BMI calculator adults', href: '#' },
    { text: 'tip calculator split', href: '#' },
    { text: 'compound interest calculator', href: '#' },
    { text: 'student loan payoff', href: '#' },
  ];
  const el = document.getElementById('footer-keywords');
  if (!el) return;
  el.innerHTML = keywords.map(k => `<li><a href="${k.href}">${k.text}</a></li>`).join('');
}

// ---- Popular Cards ----
function initPopularCards() {
  document.querySelectorAll('.popular-card[data-calc]').forEach(card => {
    card.addEventListener('click', e => {
      e.preventDefault();
      const calcId = card.dataset.calc;
      if (calcId && typeof CalcRouter !== 'undefined') {
        CalcRouter.switchTo(calcId);
        // Scroll to the calculator
        document.getElementById('calc-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ---- Back to Top ----
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.hidden = window.scrollY < 400;
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---- Ad Lazy Loading ----
function initAdLazyLoad() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const slot = entry.target;
      // Replace placeholder with real ad tag when entering viewport
      // DYNAMIC-SLOT: swap innerHTML with actual AdSense tag
      slot.classList.remove('ad-placeholder');
      slot.setAttribute('data-ad-loaded', 'true');
      observer.unobserve(slot);
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('.ad-placeholder').forEach(el => observer.observe(el));
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  if (typeof CalcRouter !== 'undefined') {
    CalcRouter.init();
  } else {
    new Calculator();
  }
  if (typeof SEOEngine !== 'undefined') SEOEngine.init();
  initMobileNav();
  initCategoryNav();
  initPopularCards();
  initFooterKeywords();
  initBackToTop();
  initAdLazyLoad();
});
