/* ============================================================
   calculators.js — Calcak Multi-Calculator Registry + Router
   ============================================================ */

'use strict';

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n, decimals = 2) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// ── Calculator Registry ───────────────────────────────────────
const CALC_REGISTRY = {

  standard: {
    id: 'standard',
    label: 'Standard Calculator',
    icon: '🔢',
    fields: null, // uses existing Calculator class
  },

  mortgage: {
    id: 'mortgage',
    label: 'Mortgage Calculator',
    icon: '🏠',
    fields: [
      { id: 'home_price',    label: 'Home Price ($)',          type: 'number', placeholder: '400000', min: 1000 },
      { id: 'down_payment',  label: 'Down Payment ($)',         type: 'number', placeholder: '80000',  min: 0 },
      { id: 'loan_term',     label: 'Loan Term (years)',        type: 'select', options: [10, 15, 20, 30] },
      { id: 'interest_rate', label: 'Annual Interest Rate (%)', type: 'number', placeholder: '6.8', step: '0.01', min: 0.01 },
    ],
    compute(inputs) {
      const P = inputs.home_price - inputs.down_payment;
      if (P <= 0) return { error: 'Down payment must be less than home price.' };
      const r = inputs.interest_rate / 100 / 12;
      const n = inputs.loan_term * 12;
      const M = r === 0 ? P / n : P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const downPct = inputs.down_payment / inputs.home_price;
      const pmi = downPct < 0.20;
      // First 12 months amortization
      let balance = P, yr1Principal = 0, yr1Interest = 0;
      for (let i = 0; i < 12; i++) {
        const intPmt = balance * r;
        const prinPmt = M - intPmt;
        yr1Interest += intPmt;
        yr1Principal += prinPmt;
        balance -= prinPmt;
      }
      return { monthly: M, total: M * n, totalInterest: M * n - P, principal: P, pmi, yr1Principal, yr1Interest, balanceAfterYr1: balance };
    },
    renderResult(r) {
      const pmiNote = r.pmi
        ? `<p class="result-note" style="color:#B45309;">⚠ Down payment is under 20% — PMI will likely apply, adding $50–$200/month.</p>`
        : '';
      return `
        <div class="result-grid">
          <div class="result-item"><span class="result-label">Monthly Payment</span><span class="result-value">$${fmt(r.monthly)}</span></div>
          <div class="result-item"><span class="result-label">Total Payment</span><span class="result-value">$${fmt(r.total)}</span></div>
          <div class="result-item"><span class="result-label">Total Interest</span><span class="result-value">$${fmt(r.totalInterest)}</span></div>
          <div class="result-item"><span class="result-label">Loan Amount</span><span class="result-value">$${fmt(r.principal)}</span></div>
        </div>
        ${pmiNote}
        <details class="amort-summary">
          <summary>Year 1 Breakdown</summary>
          <div class="result-grid" style="margin-top:0.75rem;">
            <div class="result-item"><span class="result-label">Principal Paid</span><span class="result-value">$${fmt(r.yr1Principal)}</span></div>
            <div class="result-item"><span class="result-label">Interest Paid</span><span class="result-value">$${fmt(r.yr1Interest)}</span></div>
            <div class="result-item"><span class="result-label">Remaining Balance</span><span class="result-value">$${fmt(r.balanceAfterYr1)}</span></div>
          </div>
        </details>`;
    },
  },

  bmi: {
    id: 'bmi',
    label: 'BMI Calculator',
    icon: '⚖️',
    fields: [
      { id: 'unit',      label: 'Unit System',     type: 'radio',  options: ['Imperial', 'Metric'], default: 'Imperial' },
      { id: 'weight',    label: 'Weight',           type: 'number', placeholder: '160', min: 1 },
      { id: 'height_ft', label: 'Height (ft)',      type: 'number', placeholder: '5',   min: 1, showIf: { field: 'unit', value: 'Imperial' } },
      { id: 'height_in', label: 'Height (in)',      type: 'number', placeholder: '10',  min: 0, max: 11, showIf: { field: 'unit', value: 'Imperial' } },
      { id: 'height_cm', label: 'Height (cm)',      type: 'number', placeholder: '178', min: 50, showIf: { field: 'unit', value: 'Metric' } },
    ],
    compute(inputs) {
      let weightKg = inputs.unit === 'Imperial' ? inputs.weight * 0.453592 : inputs.weight;
      let heightM  = inputs.unit === 'Imperial'
        ? ((inputs.height_ft || 0) * 12 + (inputs.height_in || 0)) * 0.0254
        : (inputs.height_cm || 0) / 100;
      if (heightM <= 0) return { error: 'Please enter a valid height.' };
      const bmi = weightKg / (heightM * heightM);
      const category =
        bmi < 18.5 ? 'Underweight' :
        bmi < 25   ? 'Normal weight' :
        bmi < 30   ? 'Overweight' : 'Obese';
      const categoryClass =
        bmi < 18.5 ? 'bmi-under' :
        bmi < 25   ? 'bmi-normal' :
        bmi < 30   ? 'bmi-over' : 'bmi-obese';
      // Clamp position on scale 10–40
      const scaleMin = 10, scaleMax = 40;
      const pct = Math.min(100, Math.max(0, (bmi - scaleMin) / (scaleMax - scaleMin) * 100));
      return { bmi: bmi.toFixed(1), category, categoryClass, scalePct: pct.toFixed(1) };
    },
    renderResult(r) {
      return `
        <div class="result-grid">
          <div class="result-item"><span class="result-label">Your BMI</span><span class="result-value result-bmi ${r.categoryClass}">${r.bmi}</span></div>
          <div class="result-item"><span class="result-label">Category</span><span class="result-value">${r.category}</span></div>
        </div>
        <div class="bmi-scale" aria-label="BMI scale">
          <div class="bmi-scale-bar">
            <span class="bmi-scale-seg bmi-under-bg" style="width:23.3%"></span>
            <span class="bmi-scale-seg bmi-normal-bg" style="width:21.7%"></span>
            <span class="bmi-scale-seg bmi-over-bg"   style="width:16.7%"></span>
            <span class="bmi-scale-seg bmi-obese-bg"  style="width:38.3%"></span>
            <span class="bmi-scale-marker" style="left:${r.scalePct}%" aria-hidden="true"></span>
          </div>
          <div class="bmi-scale-labels">
            <span>10</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
          </div>
          <div class="bmi-scale-cats">
            <span style="width:23.3%">Under</span>
            <span style="width:21.7%">Normal</span>
            <span style="width:16.7%">Over</span>
            <span style="width:38.3%">Obese</span>
          </div>
        </div>
        <p class="result-note">Based on CDC guidelines. BMI is a screening tool, not a diagnostic measure.</p>`;
    },
  },

  tax: {
    id: 'tax',
    label: 'Tax Calculator',
    icon: '🧾',
    fields: [
      { id: 'income',        label: 'Annual Gross Income ($)', type: 'number', placeholder: '75000', min: 0 },
      { id: 'filing_status', label: 'Filing Status',           type: 'select', options: ['Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household'] },
      { id: 'deductions',    label: 'Deductions ($)',           type: 'number', placeholder: '15000', min: 0,
        hint: '2025 standard deduction: Single $15,000 · MFJ $30,000 · HoH $22,500' },
    ],
    compute(inputs) {
      const brackets = {
        'Single':                    [[11925,0.10],[48475,0.12],[103350,0.22],[197300,0.24],[250525,0.32],[626350,0.35],[Infinity,0.37]],
        'Married Filing Jointly':    [[23850,0.10],[96950,0.12],[206700,0.22],[394600,0.24],[501050,0.32],[751600,0.35],[Infinity,0.37]],
        'Married Filing Separately': [[11925,0.10],[48475,0.12],[103350,0.22],[197300,0.24],[250525,0.32],[375800,0.35],[Infinity,0.37]],
        'Head of Household':         [[17000,0.10],[64850,0.12],[103350,0.22],[197300,0.24],[250500,0.32],[626350,0.35],[Infinity,0.37]],
      };
      const taxable = Math.max(0, inputs.income - inputs.deductions);
      let tax = 0, prev = 0, marginalRate = 0;
      for (const [limit, rate] of brackets[inputs.filing_status]) {
        if (taxable <= prev) break;
        tax += (Math.min(taxable, limit) - prev) * rate;
        marginalRate = rate;
        prev = limit;
      }
      const effectiveRate = inputs.income > 0 ? (tax / inputs.income * 100) : 0;
      return { tax, effectiveRate: effectiveRate.toFixed(2), marginalRate: (marginalRate * 100).toFixed(0), taxable, afterTax: inputs.income - tax };
    },
    renderResult(r) {
      return `
        <div class="result-grid">
          <div class="result-item"><span class="result-label">Est. Federal Tax</span><span class="result-value">$${fmt(r.tax)}</span></div>
          <div class="result-item"><span class="result-label">Effective Rate</span><span class="result-value">${r.effectiveRate}%</span></div>
          <div class="result-item"><span class="result-label">Marginal Rate</span><span class="result-value">${r.marginalRate}%</span></div>
          <div class="result-item"><span class="result-label">After-Tax Income</span><span class="result-value">$${fmt(r.afterTax)}</span></div>
        </div>
        <p class="result-note">Estimate only. Based on 2025 IRS federal brackets. Does not include state tax, FICA, or credits.</p>`;
    },
  },

  tip: {
    id: 'tip',
    label: 'Tip Calculator',
    icon: '🍽️',
    fields: [
      { id: 'bill',    label: 'Bill Amount ($)',  type: 'number', placeholder: '85.00', min: 0, step: '0.01' },
      { id: 'tip_pct', label: 'Tip Percentage',   type: 'range',  min: 0, max: 30, step: 1, default: 18 },
      { id: 'people',  label: 'Split Between',    type: 'number', placeholder: '2', min: 1, step: 1 },
    ],
    compute(inputs) {
      const tip = inputs.bill * inputs.tip_pct / 100;
      const total = inputs.bill + tip;
      const people = Math.max(1, inputs.people);
      return { bill: inputs.bill, tip, total, perPerson: total / people, tipPerPerson: tip / people };
    },
    renderResult(r) {
      const quickRef = [15, 18, 20, 25].map(pct => {
        const t = r.bill * pct / 100;
        return `<span class="tip-quick-item"><strong>${pct}%</strong> $${fmt(t)}</span>`;
      }).join('');
      return `
        <div class="result-grid">
          <div class="result-item"><span class="result-label">Tip Amount</span><span class="result-value">$${fmt(r.tip)}</span></div>
          <div class="result-item"><span class="result-label">Total Bill</span><span class="result-value">$${fmt(r.total)}</span></div>
          <div class="result-item"><span class="result-label">Per Person</span><span class="result-value">$${fmt(r.perPerson)}</span></div>
          <div class="result-item"><span class="result-label">Tip Per Person</span><span class="result-value">$${fmt(r.tipPerPerson)}</span></div>
        </div>
        <div class="tip-quick-ref">
          <span class="tip-quick-label">Quick ref:</span>${quickRef}
        </div>`;
    },
  },

  loan: {
    id: 'loan',
    label: 'Loan Calculator',
    icon: '💳',
    fields: [
      { id: 'principal', label: 'Loan Amount ($)',  type: 'number', placeholder: '20000', min: 1 },
      { id: 'apr',       label: 'APR (%)',           type: 'number', placeholder: '7.5', step: '0.01', min: 0 },
      { id: 'term',      label: 'Term (months)',     type: 'select', options: [12,24,36,48,60,72,84,120] },
    ],
    compute(inputs) {
      const r = inputs.apr / 100 / 12;
      const n = inputs.term;
      const M = r === 0 ? inputs.principal / n
        : inputs.principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      let balance = inputs.principal, yr1Principal = 0, yr1Interest = 0;
      for (let i = 0; i < Math.min(12, n); i++) {
        const intPmt = balance * r;
        const prinPmt = M - intPmt;
        yr1Interest += intPmt;
        yr1Principal += prinPmt;
        balance -= prinPmt;
      }
      return { monthly: M, total: M * n, totalInterest: M * n - inputs.principal, yr1Principal, yr1Interest };
    },
    renderResult(r) {
      return `
        <div class="result-grid">
          <div class="result-item"><span class="result-label">Monthly Payment</span><span class="result-value">$${fmt(r.monthly)}</span></div>
          <div class="result-item"><span class="result-label">Total Payment</span><span class="result-value">$${fmt(r.total)}</span></div>
          <div class="result-item"><span class="result-label">Total Interest</span><span class="result-value">$${fmt(r.totalInterest)}</span></div>
        </div>
        <details class="amort-summary">
          <summary>Year 1 Breakdown</summary>
          <div class="result-grid" style="margin-top:0.75rem;">
            <div class="result-item"><span class="result-label">Principal Paid</span><span class="result-value">$${fmt(r.yr1Principal)}</span></div>
            <div class="result-item"><span class="result-label">Interest Paid</span><span class="result-value">$${fmt(r.yr1Interest)}</span></div>
          </div>
        </details>`;
    },
  },

  percentage: {
    id: 'percentage',
    label: 'Percentage Calculator',
    icon: '%',
    fields: [
      { id: 'mode',  label: 'Calculate',     type: 'select', options: ['X% of Y', 'X is what % of Y', '% change from X to Y'] },
      { id: 'val_a', label: 'Value A (X)',    type: 'number', placeholder: '25', hint: 'e.g. percentage or starting value' },
      { id: 'val_b', label: 'Value B (Y)',    type: 'number', placeholder: '200', hint: 'e.g. total or ending value' },
    ],
    compute(inputs) {
      const a = inputs.val_a, b = inputs.val_b;
      if (inputs.mode === 'X% of Y') {
        return { result: (a / 100) * b, label: `${a}% of ${b}` };
      } else if (inputs.mode === 'X is what % of Y') {
        if (b === 0) return { error: 'Value B cannot be zero.' };
        return { result: (a / b) * 100, label: `${a} is what % of ${b}`, suffix: '%' };
      } else {
        if (a === 0) return { error: 'Value A (starting value) cannot be zero.' };
        const pct = ((b - a) / a) * 100;
        return { result: pct, label: `% change from ${a} to ${b}`, suffix: '%', direction: pct >= 0 ? 'increase' : 'decrease' };
      }
    },
    renderResult(r) {
      const display = r.suffix === '%'
        ? `${Number(r.result).toFixed(4)}%`
        : Number(r.result).toLocaleString('en-US', { maximumFractionDigits: 6 });
      const dirNote = r.direction
        ? `<p class="result-note">${Math.abs(Number(r.result)).toFixed(2)}% ${r.direction}</p>`
        : '';
      return `
        <div class="result-grid result-grid-single">
          <div class="result-item"><span class="result-label">${r.label}</span><span class="result-value result-large">${display}</span></div>
        </div>${dirNote}`;
    },
  },

  age: {
    id: 'age',
    label: 'Age Calculator',
    icon: '🎂',
    fields: [
      { id: 'dob',    label: 'Date of Birth', type: 'date' },
      { id: 'target', label: 'Age as of',     type: 'date', default: 'today', noMax: true },
    ],
    compute(inputs) {
      const birth  = new Date(inputs.dob);
      const target = inputs.target ? new Date(inputs.target) : new Date();
      if (isNaN(birth.getTime())) return { error: 'Please enter a valid date of birth.' };
      if (target < birth) return { error: 'Target date must be after date of birth.' };
      let years  = target.getFullYear() - birth.getFullYear();
      let months = target.getMonth()    - birth.getMonth();
      let days   = target.getDate()     - birth.getDate();
      if (days < 0) {
        months--;
        days += new Date(target.getFullYear(), target.getMonth(), 0).getDate();
      }
      if (months < 0) { years--; months += 12; }
      const totalDays = Math.floor((target - birth) / 86400000);
      const nextBirthday = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBirthday <= target) nextBirthday.setFullYear(target.getFullYear() + 1);
      const daysToNext = Math.ceil((nextBirthday - target) / 86400000);
      return { years, months, days, totalDays, daysToNext, totalWeeks: Math.floor(totalDays / 7), totalHours: totalDays * 24 };
    },
    renderResult(r) {
      return `
        <div class="result-grid">
          <div class="result-item"><span class="result-label">Age</span><span class="result-value">${r.years} yrs, ${r.months} mo, ${r.days} days</span></div>
          <div class="result-item"><span class="result-label">Next Birthday In</span><span class="result-value">${r.daysToNext} days</span></div>
          <div class="result-item"><span class="result-label">Total Days Lived</span><span class="result-value">${r.totalDays.toLocaleString()}</span></div>
          <div class="result-item"><span class="result-label">Total Weeks</span><span class="result-value">${r.totalWeeks.toLocaleString()}</span></div>
          <div class="result-item"><span class="result-label">Total Hours</span><span class="result-value">${r.totalHours.toLocaleString()}</span></div>
        </div>`;
    },
  },

}; // end CALC_REGISTRY

// ── Field Renderer ────────────────────────────────────────────
function renderField(f) {
  const id = `field_${f.id}`;
  const showIfAttr = f.showIf
    ? ` data-show-if-field="${f.showIf.field}" data-show-if-value="${f.showIf.value}"`
    : '';

  let input = '';
  switch (f.type) {
    case 'number':
      input = `<input type="number" id="${id}" name="${f.id}"
        placeholder="${f.placeholder || ''}"
        ${f.min !== undefined ? `min="${f.min}"` : ''}
        ${f.max !== undefined ? `max="${f.max}"` : ''}
        ${f.step !== undefined ? `step="${f.step}"` : ''}
        class="calc-input" autocomplete="off" inputmode="decimal" />`;
      break;
    case 'select': {
      const opts = f.options.map(o =>
        typeof o === 'object'
          ? `<option value="${o.value}">${o.label}</option>`
          : `<option value="${o}">${o}</option>`
      ).join('');
      input = `<select id="${id}" name="${f.id}" class="calc-input">${opts}</select>`;
      break;
    }
    case 'radio':
      input = `<div class="radio-group" role="radiogroup" aria-labelledby="label_${f.id}">` +
        f.options.map(o => {
          const val = typeof o === 'object' ? o.value : o;
          const lbl = typeof o === 'object' ? o.label : o;
          const def = f.default || (typeof f.options[0] === 'object' ? f.options[0].value : f.options[0]);
          const checked = val === def ? ' checked' : '';
          return `<label class="radio-label"><input type="radio" name="${f.id}" value="${val}"${checked} />${lbl}</label>`;
        }).join('') + `</div>`;
      break;
    case 'range': {
      const def = f.default ?? Math.round((f.min + f.max) / 2);
      input = `<div class="range-wrapper">
        <input type="range" id="${id}" name="${f.id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${def}" class="calc-range" />
        <output class="range-output" for="${id}">${def}%</output>
      </div>`;
      break;
    }
    case 'date': {
      const today = new Date().toISOString().split('T')[0];
      const dateVal = f.default === 'today' ? ` value="${today}"` : '';
      const maxAttr = f.noMax ? '' : ` max="${today}"`;
      input = `<input type="date" id="${id}" name="${f.id}" class="calc-input"${dateVal}${maxAttr} />`;
      break;
    }
  }

  const hint = f.hint ? `<p class="field-hint">${f.hint}</p>` : '';
  return `
    <div class="form-field"${showIfAttr}>
      <label for="${id}" id="label_${f.id}" class="field-label">${f.label}</label>
      ${input}${hint}
    </div>`;
}

// ── Form Calculator Renderer ──────────────────────────────────
function renderFormCalc(def) {
  return `
    <div class="calc-card calc-form-card">
      <div class="calc-form-header">
        <span class="calc-form-icon" aria-hidden="true">${def.icon}</span>
        <h1 class="calc-title">${def.label}</h1>
        <button type="button" class="btn-share" aria-label="Share this calculator">Share</button>
      </div>
      <form class="calc-form" id="calc-form-${def.id}" novalidate autocomplete="off">
        ${def.fields.map(f => renderField(f)).join('')}
        <button type="submit" class="btn btn-calculate">Calculate</button>
      </form>
      <div class="calc-form-result" id="form-result-${def.id}" aria-live="polite" hidden>
        <button type="button" class="btn-copy-result" aria-label="Copy result">Copy</button>
      </div>
      <p class="calc-disclaimer">
        Results are for <strong>estimation purposes only</strong> and do not constitute professional advice.
        <a href="disclaimer.html">Full Disclaimer</a>
      </p>
    </div>`;
}

// ── Standard Calculator HTML ──────────────────────────────────
function renderStandardCalc() {
  return `
    <div class="calc-card" id="calc-standard">
      <div class="calc-display" aria-live="polite" aria-atomic="true">
        <div class="calc-expression" id="calc-expression" aria-label="Expression"></div>
        <div class="calc-result"     id="calc-result"     aria-label="Result">0</div>
      </div>
      <div class="calc-keypad" role="group" aria-label="Calculator keys">
        <button class="btn btn-fn"  data-action="clear"   aria-label="Clear">AC</button>
        <button class="btn btn-fn"  data-action="sign"    aria-label="Toggle sign">+/−</button>
        <button class="btn btn-fn"  data-action="percent" aria-label="Percent">%</button>
        <button class="btn btn-op"  data-op="/"           aria-label="Divide">÷</button>
        <button class="btn btn-num" data-digit="7">7</button>
        <button class="btn btn-num" data-digit="8">8</button>
        <button class="btn btn-num" data-digit="9">9</button>
        <button class="btn btn-op"  data-op="*"           aria-label="Multiply">×</button>
        <button class="btn btn-num" data-digit="4">4</button>
        <button class="btn btn-num" data-digit="5">5</button>
        <button class="btn btn-num" data-digit="6">6</button>
        <button class="btn btn-op"  data-op="-"           aria-label="Subtract">−</button>
        <button class="btn btn-num" data-digit="1">1</button>
        <button class="btn btn-num" data-digit="2">2</button>
        <button class="btn btn-num" data-digit="3">3</button>
        <button class="btn btn-op"  data-op="+"           aria-label="Add">+</button>
        <button class="btn btn-num btn-zero" data-digit="0">0</button>
        <button class="btn btn-num" data-digit=".">.</button>
        <button class="btn btn-eq"  data-action="equals"  aria-label="Equals">=</button>
      </div>
      <div class="calc-history">
        <h3>History <button class="btn-clear-history" id="btn-clear-history" aria-label="Clear history">Clear</button></h3>
        <ul class="history-list" id="history-list" aria-label="Calculation history" aria-live="polite"></ul>
      </div>
      <p class="calc-disclaimer">
        Results are for <strong>estimation purposes only</strong>.
        <a href="disclaimer.html">Full Disclaimer</a>
      </p>
    </div>`;
}

// ── CalcRouter ────────────────────────────────────────────────
const CalcRouter = {
  currentId: 'standard',
  container: null,

  init() {
    this.container = document.getElementById('calc-container');
    const hash = location.hash.replace('#', '');
    const startId = CALC_REGISTRY[hash] ? hash : 'standard';
    this.switchTo(startId, true);

    window.addEventListener('popstate', e => {
      const id = (e.state && e.state.calcId) || 'standard';
      this.switchTo(id, true);
    });
  },

  switchTo(calcId, skipPushState) {
    if (!CALC_REGISTRY[calcId]) calcId = 'standard';
    const def = CALC_REGISTRY[calcId];
    if (!this.container) return;

    this.container.style.opacity = '0';

    requestAnimationFrame(() => {
      this.container.innerHTML = calcId === 'standard'
        ? renderStandardCalc()
        : renderFormCalc(def);

      if (calcId === 'standard') {
        if (typeof Calculator !== 'undefined') new Calculator();
      } else {
        this._bindFormCalc(calcId);
      }

      this._updateBreadcrumb(def.label);
      this._updateCategoryNav(calcId);

      if (!skipPushState) {
        history.pushState({ calcId }, '', `#${calcId}`);
      }

      if (typeof SEOEngine !== 'undefined') SEOEngine.onCalcSwitch(calcId);

      // GA4: track calculator view
      if (typeof gtag === 'function') {
        gtag('event', 'page_view', {
          page_title: def.label + ' Calculator',
          page_location: location.href,
        });
        gtag('event', 'calculator_view', { calculator_id: calcId });
      }

      this.currentId = calcId;

      requestAnimationFrame(() => { this.container.style.opacity = '1'; });
    });
  },

  _bindFormCalc(calcId) {
    const def = CALC_REGISTRY[calcId];
    const form     = document.getElementById(`calc-form-${calcId}`);
    const resultEl = document.getElementById(`form-result-${calcId}`);
    if (!form || !resultEl) return;

    const getInputs = () => {
      const data = {};
      new FormData(form).forEach((val, key) => {
        const n = parseFloat(val);
        data[key] = isNaN(n) ? val : n;
      });
      form.querySelectorAll('input[type=radio]:checked').forEach(r => {
        data[r.name] = r.value;
      });
      return data;
    };

    const copyBtn = resultEl.querySelector('.btn-copy-result');

    const showResult = () => {
      const result = def.compute(getInputs());
      const contentId = `form-result-content-${calcId}`;
      let contentEl = resultEl.querySelector('.result-content');
      if (!contentEl) {
        contentEl = document.createElement('div');
        contentEl.className = 'result-content';
        resultEl.insertBefore(contentEl, copyBtn);
      }
      if (result.error) {
        contentEl.innerHTML = `<p class="result-error">${result.error}</p>`;
      } else {
        contentEl.innerHTML = def.renderResult(result);
      }
      resultEl.hidden = false;
      if (typeof gtag === 'function') {
        gtag('event', 'calculation', { calculator_id: calcId });
      }
    };

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = resultEl.querySelector('.result-content')?.innerText || '';
        navigator.clipboard?.writeText(text).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });
      });
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      showResult();
    });

    form.querySelectorAll('input[type=range]').forEach(range => {
      const output = form.querySelector(`output[for="${range.id}"]`);
      range.addEventListener('input', () => {
        if (output) output.textContent = `${range.value}%`;
        if (!resultEl.hidden) showResult();
      });
    });

    // Share button
    const shareBtn = form.closest('.calc-card')?.querySelector('.btn-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const url = `${location.origin}${location.pathname}#${calcId}`;
        navigator.clipboard?.writeText(url).then(() => {
          shareBtn.textContent = 'Link Copied!';
          setTimeout(() => { shareBtn.textContent = 'Share'; }, 2000);
        });
      });
    }

    // Inline validation on blur
    form.querySelectorAll('input[type=number]').forEach(input => {
      input.addEventListener('blur', () => {
        const val = parseFloat(input.value);
        const min = input.min !== '' ? parseFloat(input.min) : null;
        const max = input.max !== '' ? parseFloat(input.max) : null;
        let msg = '';
        if (input.value !== '' && isNaN(val)) msg = 'Please enter a valid number.';
        else if (min !== null && val < min) msg = `Minimum value is ${min}.`;
        else if (max !== null && val > max) msg = `Maximum value is ${max}.`;
        let errEl = input.parentElement.querySelector('.field-error');
        if (msg) {
          input.classList.add('input-error');
          if (!errEl) {
            errEl = document.createElement('p');
            errEl.className = 'field-error';
            input.after(errEl);
          }
          errEl.textContent = msg;
        } else {
          input.classList.remove('input-error');
          errEl?.remove();
        }
      });
      input.addEventListener('input', () => {
        input.classList.remove('input-error');
        input.parentElement.querySelector('.field-error')?.remove();
      });
    });

    this._bindShowIf(form);
  },

  _bindShowIf(form) {
    const conditionals = form.querySelectorAll('[data-show-if-field]');
    if (!conditionals.length) return;
    const update = () => {
      conditionals.forEach(field => {
        const watchField = field.dataset.showIfField;
        const watchValue = field.dataset.showIfValue;
        const ctrl = form.querySelector(`[name="${watchField}"]:checked`) ||
                     form.querySelector(`[name="${watchField}"]`);
        const match = ctrl && ctrl.value === watchValue;
        field.style.display = match ? '' : 'none';
        field.querySelectorAll('input, select').forEach(el => { el.disabled = !match; });
      });
    };
    form.addEventListener('change', update);
    update();
  },

  _updateBreadcrumb(label) {
    const el = document.querySelector('.breadcrumb-current');
    if (el) {
      el.textContent = label;
      el.setAttribute('aria-current', 'page');
    }
  },

  _updateCategoryNav(calcId) {
    // Left sidebar
    document.querySelectorAll('.cat-item').forEach(item => {
      const active = item.dataset.calc === calcId;
      item.classList.toggle('active', active);
      item.setAttribute('aria-current', active ? 'page' : 'false');
    });
    // Top main nav .nav-calc links
    document.querySelectorAll('.nav-calc').forEach(a => {
      const active = a.dataset.calc === calcId;
      a.classList.toggle('active', active);
      a.setAttribute('aria-current', active ? 'page' : 'false');
    });
  },
};
