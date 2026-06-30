/* ===========================================================
   MAIN PAGE SCRIPT
=========================================================== */

const WHATSAPP_NUMBER = "918529419240"; // Avira Solar — change here if number changes

// ---------- Animated stat counters ----------
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 60));
    const tick = () => {
      current += step;
      if (current >= target) { el.textContent = target.toLocaleString('en-IN'); return; }
      el.textContent = current.toLocaleString('en-IN');
      requestAnimationFrame(tick);
    };
    tick();
  });
}
window.addEventListener('load', animateCounters);

// ---------- Scroll reveal ----------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 4) * 0.08 + 's';
  revealObserver.observe(el);
});

// Failsafe: force everything visible after 2.5s no matter what,
// so a slow/blocked observer can never leave content permanently hidden.
setTimeout(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}, 2500);

// ---------- Calculator ----------
let lastResult = null;

function runCalculator() {
  const bill = parseFloat(document.getElementById('bill').value) || 0;
  const rate = parseFloat(document.getElementById('rate').value) || 8;
  const propType = document.getElementById('propType').value;
  const roofArea = parseFloat(document.getElementById('roofArea').value) || 0;

  if (bill <= 0) {
    alert('Please enter your monthly electricity bill.');
    return;
  }

  const r = calculateSolar({ bill, rate, propType, roofArea });
  lastResult = r;

  document.getElementById('resultsEmpty').classList.add('results-hidden');
  document.getElementById('resultsContent').classList.remove('results-hidden');

  document.getElementById('dial').style.setProperty('--pct', r.billReductionPct);
  document.getElementById('pctReduction').textContent = r.billReductionPct + '%';
  document.getElementById('rCapacity').textContent = r.recommendedKw + ' kW';
  document.getElementById('rPanels').textContent = r.panelsRequired;
  document.getElementById('rCost').textContent = formatINR(r.estimatedCost);
  document.getElementById('rSubsidy').textContent = formatINR(r.subsidy);
  document.getElementById('rCostAfter').textContent = formatINR(r.costAfterSubsidy);
  document.getElementById('rPayback').textContent = r.paybackYears + ' yrs';
  document.getElementById('rAnnual').textContent = formatINR(r.annualSavings);
  document.getElementById('r25yr').textContent = formatINR(r.lifetimeSavings);

  updateWhatsAppLink(bill);

  // auto-open lead capture popup after results appear
  setTimeout(openModal, 800);

  document.getElementById('resultsContent').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------- WhatsApp pre-filled link ----------
function updateWhatsAppLink(bill) {
  const msg = `Hello, my monthly electricity bill is ₹${bill} and I would like a solar quotation.`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  document.getElementById('waFloat').href = url;
}
updateWhatsAppLink(5000);

// ---------- Lead modal ----------
function openModal() {
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}
function submitLead(e) {
  e.preventDefault();
  const name = document.getElementById('leadName').value;
  const phone = document.getElementById('leadPhone').value;

  // TODO: replace with real API call to backend, e.g.
  // fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'},
  //   body: JSON.stringify({ name, phone, source:'calculator', result:lastResult }) });

  const msg = lastResult
    ? `Hello, I'm ${name}. My estimated solar capacity is ${lastResult.recommendedKw} kW with savings of ₹${lastResult.annualSavings}/year. Please send me a detailed quotation.`
    : `Hello, I'm ${name}, I'd like a solar quotation.`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  closeModal();
  alert('Thanks ' + name + '! Our team will reach out to ' + phone + ' shortly.');
}

// ---------- Service tabs ----------
function showTab(type, button) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (button) button.classList.add('active');
  document.getElementById('residential-grid').classList.toggle('hide', type !== 'residential');
  document.getElementById('commercial-grid').classList.toggle('hide', type !== 'commercial');
}

// ---------- FAQ accordion ----------
function toggleFaq(el) {
  const item = el.parentElement;
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

// ---------- Contact form ----------
function submitContact(e) {
  e.preventDefault();
  // TODO: wire to backend /api/contact endpoint
  alert('Thanks! We\'ve received your message and will contact you shortly.');
  e.target.reset();
}

// ---------- Exit intent popup (basic) ----------
let exitShown = false;
document.addEventListener('mouseleave', (e) => {
  if (e.clientY < 10 && !exitShown && !lastResult) {
    exitShown = true;
    setTimeout(() => openModal(), 200);
  }
});
/* ===========================================================
   SOLAR CALCULATOR LOGIC
   All formulas are simplified industry-standard estimates for
   lead-generation purposes — not a substitute for a site survey.
=========================================================== */

const ASSUMPTIONS = {
  unitsPerKwPerDay: 4,       // avg units generated per kW per day (India avg)
  costPerKw: 55000,          // ₹ installed cost per kW before subsidy
  panelWattage: 540,         // watts per panel
  co2PerUnitKg: 0.82,        // kg CO2 offset per unit generated
  subsidy: {
    // simplified central subsidy slabs (residential only, ₹)
    tier1: { maxKw: 2, perKw: 30000 },
    tier2: { maxKw: 3, flat: 60000, extraPerKw: 18000 },
  }
};

function calculateSolar({ bill, rate, propType, roofArea }) {
  rate = rate > 0 ? rate : 8;
  const monthlyUnits = bill / rate;
  const dailyUnits = monthlyUnits / 30;

  // recommended system size (kW), capped by available roof area (1 kW ≈ 100 sq.ft)
  let recommendedKw = dailyUnits / ASSUMPTIONS.unitsPerKwPerDay;
  const maxKwByRoof = roofArea > 0 ? roofArea / 100 : recommendedKw;
  recommendedKw = Math.min(recommendedKw, maxKwByRoof);
  recommendedKw = Math.max(1, Math.round(recommendedKw * 10) / 10);

  const panelsRequired = Math.ceil((recommendedKw * 1000) / ASSUMPTIONS.panelWattage);
  const estimatedCost = Math.round(recommendedKw * ASSUMPTIONS.costPerKw);

  // subsidy — residential only (simplified central scheme)
  let subsidy = 0;
  if (propType === 'residential') {
    if (recommendedKw <= 2) {
      subsidy = recommendedKw * ASSUMPTIONS.subsidy.tier1.perKw;
    } else if (recommendedKw <= 3) {
      subsidy = ASSUMPTIONS.subsidy.tier2.flat;
    } else {
      subsidy = ASSUMPTIONS.subsidy.tier2.flat +
        (Math.min(recommendedKw, 10) - 3) * ASSUMPTIONS.subsidy.tier2.extraPerKw;
    }
  }
  subsidy = Math.round(Math.min(subsidy, estimatedCost * 0.4));
  const costAfterSubsidy = estimatedCost - subsidy;

  const monthlyGeneratedUnits = recommendedKw * ASSUMPTIONS.unitsPerKwPerDay * 30;
  const monthlySavings = Math.round(Math.min(monthlyGeneratedUnits, monthlyUnits) * rate);
  const annualSavings = monthlySavings * 12;
  const lifetimeSavings = annualSavings * 25;

  const paybackYears = monthlySavings > 0 ? (costAfterSubsidy / annualSavings) : 0;
  const roiPercent = costAfterSubsidy > 0 ? Math.round((lifetimeSavings / costAfterSubsidy) * 100) : 0;

  const billReductionPct = Math.min(100, Math.round((monthlySavings / bill) * 100));
  const annualCo2ReductionKg = Math.round(monthlyGeneratedUnits * 12 * ASSUMPTIONS.co2PerUnitKg);

  return {
    monthlyUnits: Math.round(monthlyUnits),
    recommendedKw,
    panelsRequired,
    estimatedCost,
    subsidy,
    costAfterSubsidy,
    monthlySavings,
    annualSavings,
    lifetimeSavings,
    paybackYears: Math.round(paybackYears * 10) / 10,
    roiPercent,
    billReductionPct,
    annualCo2ReductionKg
  };
}

function formatINR(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
