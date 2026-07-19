/* ===========================================================
  MAIN PAGE SCRIPT
=========================================================== */

const WHATSAPP_NUMBER = "918529419240"; 
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxzo-3vfpQiO9dDbZJpYSnIfUuLaRwaZ014g6jUmBjR47wq5YixKQa1-RAUzPWSVeit/exec";

// ---------- Animated stat counters ----------
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const isDecimal = el.hasAttribute('data-decimal');
    const target = parseFloat(el.getAttribute('data-count'));
    const hasPlus = el.getAttribute('data-count').endsWith('+');
    let current = 0;
    const steps = 40;
    const increment = target / steps;
    let frame = 0;
    const tick = () => {
      frame++;
      current += increment;
      if (frame >= steps) {
        el.textContent = (isDecimal ? target.toFixed(1) : Math.round(target).toLocaleString('en-IN')) + (hasPlus ? '+' : '');
        return;
      }
      el.textContent = isDecimal ? current.toFixed(1) : Math.round(current).toLocaleString('en-IN');
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
  const rate = parseFloat(document.getElementById('rate').value) || 0;
  const propType = document.getElementById('propType').value;
  const roofArea = parseFloat(document.getElementById('roofArea').value) || 0;
  const state = document.getElementById('state').value || "";
  const roofType = document.getElementById('roofType').value || "";

  if (bill <= 0) {
    alert('Please enter your monthly electricity bill.');
    return;
  }

  if (rate <= 0) {
    alert('Please enter your electricity rate (₹/unit).');
    return;
  }

  if (roofArea <= 0) {
    alert('Please enter your available roof area in square feet.');
    return;
  }

  lastResult = null;

  const r = calculateSolar({ bill, rate, propType, roofArea });
  lastResult = {
    bill,
    rate,
    propType,
    roofArea,
    state,
    roofType,
    ...r
  };

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

  if (propType == 'residential' && r.recommendedKw > 5) {
    document.getElementById('solar-calculation-note').textContent = "Note : We recommend a commercial system for your property, as it exceeds 5 kW.";
  } else {
    document.getElementById('solar-calculation-note').textContent = "";
  }

  document.getElementById('resultsContent').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function defaultWhatsAppMessage() {
  const msg = `Hello, I'm interested in solar energy solutions. Please provide me with more information.`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  document.getElementById('waFloat').href = url;
}

defaultWhatsAppMessage();

// ---------- Submit Lead to Sheet ----------

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

async function commonSubmitHandler(e, data) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('[type="submit"]');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = "Submitting...";
  }

  try {
    await submitLeadToSheet(data);
    alert(`Thanks ${data.name}! Our team will contact you shortly.`);
    e.target.reset();
  } catch (error) {
    alert("Unable to submit your request. Please try again later.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText;
    }
  }
}

async function submitLeadToSheet(data, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result;
      }

      throw new ValidationError(result.error || "Submission failed.");

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);

      const isLastAttempt = attempt === maxRetries;
      const isValidationError = error instanceof ValidationError;

      if (isLastAttempt || isValidationError) {
        throw error;
      }

      const delay = 1000 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ---------- Lead modal ----------
function openModal() {
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

async function submitLead(e) {
  const name = document.getElementById('leadName').value;
  const phone = document.getElementById('leadPhone').value;

  let data = {
    "sheet_name": lastResult ? "Solar Calculator Form" : "General Inquiry Form",
    name,
    phone
  }

  if (lastResult) {
    data = { 
      ...data,
      property_type: lastResult.propType,
      roof_area: lastResult.roofArea,
      roof_type: lastResult.roofType,
      monthly_bill: lastResult.bill,
      rate: lastResult.rate,
      state: lastResult.state,
      recommended_kw: lastResult.recommendedKw,
      panels_required: lastResult.panelsRequired
    };
  }

  await commonSubmitHandler(e, data);
  closeModal();
}

// ---------- Service tabs ----------
function showTab(type) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
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
async function submitContact(e) {

  let data = {
    "sheet_name": "Contact Form",
    "name": document.getElementById('get-in-touch-name').value,
    "email": document.getElementById('get-in-touch-email').value,
    "phone": document.getElementById('get-in-touch-phone').value,
    "city": document.getElementById('get-in-touch-city').value,
    "monthly_bill": document.getElementById('get-in-touch-monthly-bill').value,
    "property_type": document.getElementById('get-in-touch-property-type').value,
    "message": document.getElementById('get-in-touch-message').value
  };

  await commonSubmitHandler(e, data);
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
   RESIDENTIAL TYPES — On-Grid / Off-Grid / Hybrid
=========================================================== */

function closeTypeModal() {
  document.getElementById('typeModalOverlay').classList.remove('show');
}

function openCommercialInfo() {
  document.getElementById('typeModalBody').innerHTML = `
    <button class="close" onclick="closeTypeModal()">×</button>
    <div class="type-hero">
      <img src="https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=1200&auto=format&fit=crop" alt="Commercial Solar">
      <div class="tag">For Businesses</div>
    </div>
    <div class="type-body">
      <h3>Commercial Solar Installation</h3>
      <p>Avira Solar Energy designs and installs commercial-scale rooftop solar systems for factories, offices, schools, hospitals, and warehouses — sized to your actual load and roof area, with full subsidy and net metering support where applicable.</p>
      <ul>
        <li>Custom system sizing based on your monthly electricity consumption</li>
        <li>Higher ROI than residential due to higher daytime usage</li>
        <li>Reduced operating costs for years of business operation</li>
        <li>Site survey, structural design, and installation handled end-to-end</li>
      </ul>
      <div class="type-lead">
        <h4>Want a quote for your business?</h4>
        <form onsubmit="submitTypeLead(event, 'Commercial Solar')">
          <div class="field"><label>Name</label><input required id="typeLeadName" type="text" minlength="3" maxlength="50" placeholder="Your name"></div>
          <div class="field"><label>Mobile Number</label><input required id="typeLeadPhone" type="tel" inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" title="Enter a valid 10-digit Indian mobile number" placeholder="Mobile number"></div>
          <div class="field"><label>Address</label><input required id="typeLeadAddress" type="text" minlength="2" maxlength="150" placeholder="Business address / city"></div>
          <button class="calc-submit" type="submit">Send My Details →</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('typeModalOverlay').classList.add('show');
}

async function submitTypeLead(e, typeName) {
  const name = document.getElementById('typeLeadName').value;
  const phone = document.getElementById('typeLeadPhone').value;
  const address = document.getElementById('typeLeadAddress').value;

  let data = {
    "sheet_name": "General Inquiry Form",
    "name": name,
    "phone": phone,
    "interest": typeName,
    "address": address,
  };

  await commonSubmitHandler(e, data);
  closeTypeModal();
}

function closeBlogModal() {
  document.getElementById('blogModalOverlay').classList.remove('show');
}

