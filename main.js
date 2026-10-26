/**
 * BARGAINPOWER & TECHNOLOGY - Main Client Script
 * Features:
 * 1. 7-Slide Auto-Playing Vanilla JS Carousel Engine
 * 2. Mobile 3-Line Dropdown Hamburger Navigation Toggle
 * 3. Chatbot Triage & Escalation Engine with LocalStorage Handover Pipeline
 * 4. Front-End Security Sanitizer (sanitizeInput)
 * 5. Dynamic WhatsApp wa.me Integration
 */

// Global Configuration
window.BP_CONFIG = {
  companyName: "BARGAINPOWER & TECHNOLOGY",
  whatsappNumber: "+2348037704936",
  helpEmail: "biockhelpdesk@gmail.com",
  socialUrls: {
    facebook: "https://facebook.com/bargainpowertech",
    twitter: "https://x.com/bargainpowertech",
    linkedin: "https://linkedin.com/company/bargainpower-technology",
    youtube: "https://youtube.com/@bargainpowertech"
  }
};

/**
 * Robust Data Sanitizer Function
 * Filters HTML tags, brackets, and script markers to block Cross-Site Scripting (XSS).
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/onload/gi, '')
    .replace(/onerror/gi, '')
    .replace(/onclick/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * 7 Structural Hero Slides Definition
 */
const HERO_SLIDES = [
  {
    id: 1,
    title: "16-Channel WiFi Relay Module",
    subtitle: "Industrial Multi-Load Smart Controller",
    badge: "Hardware Flagship",
    desc: "Optocoupler isolated relays capable of 10A 250VAC switching with ESP32/Tuya firmware integration.",
    image: "/src/assets/images/relay_16ch_wifi_1790998673524.jpg"
  },
  {
    id: 2,
    title: "Tuya WiFi 12-Channel Control Board",
    subtitle: "Cloud & Local MQTT Smart Automation",
    badge: "Smart Living",
    desc: "Multi-gang switching with timer scheduling, scene interlocking, and mobile app voice synchronization.",
    image: "/src/assets/images/smart_switches_tuya_1790998685408.jpg"
  },
  {
    id: 3,
    title: "Smart Touch Wall Switches",
    subtitle: "Capacitive Glass Panels & Ambient Lighting",
    badge: "Interior Tech",
    desc: "Ultra-responsive touch tempered glass panels with dual-way wiring and illuminated indicators.",
    image: "/src/assets/images/smart_switches_tuya_1790998685408.jpg"
  },
  {
    id: 4,
    title: "3-Pole Industrial Circuit Breakers",
    subtitle: "Certified Overload & Short-Circuit Protection",
    badge: "Power Distribution",
    desc: "10kA breaking capacity 3P DIN-rail miniature circuit breakers for balanced power safety.",
    image: "/src/assets/images/breakers_3pole_industrial_1790998696308.jpg"
  },
  {
    id: 5,
    title: "3-Pole AC/DC Heavy-Duty Contactors",
    subtitle: "Induction Motor & Borehole Pump Switching",
    badge: "Industrial Automation",
    desc: "Robust 220V/380V AC coils and high-voltage DC contactors with silver alloy contacts and auxiliary feedback.",
    image: "/src/assets/images/contactors_3pole_ac_dc_1790998707179.jpg"
  },
  {
    id: 6,
    title: "Custom High-Performance Electric Bikes",
    subtitle: "Precision Engineered Urban & Off-Road Mobility",
    badge: "Electric Mobility",
    desc: "Custom lithium-ion battery integration, high-torque brushless hub/mid-drive motors, and digital telemetry.",
    image: "/src/assets/images/electric_bike_custom_1790998717436.jpg"
  },
  {
    id: 7,
    title: "Electric Vehicle Conversions & Prototypes",
    subtitle: "Gasoline-to-Electric Drivetrain Engineering",
    badge: "Clean Energy Vehicles",
    desc: "Complete powertrain overhaul: DC-DC converters, high-voltage battery enclosures, smart BMS, and torque inverters.",
    image: "/src/assets/images/electric_vehicle_conversion_1790998727320.jpg"
  }
];

let currentSlideIdx = 0;
let slideIntervalTimer = null;

function initHeroSlider() {
  const titleEl = document.getElementById('hero-slide-title');
  const subtitleEl = document.getElementById('hero-slide-subtitle');
  const descEl = document.getElementById('hero-slide-desc');
  const badgeEl = document.getElementById('hero-slide-badge');
  const imgEl = document.getElementById('hero-active-img');

  if (!titleEl || !imgEl) return;

  function renderSlide(index) {
    const slide = HERO_SLIDES[index];
    titleEl.textContent = slide.title;
    if (subtitleEl) subtitleEl.textContent = slide.subtitle;
    if (descEl) descEl.textContent = slide.desc;
    if (badgeEl) badgeEl.textContent = slide.badge;
    imgEl.src = slide.image;
    imgEl.alt = slide.title;
  }

  function nextSlide() {
    currentSlideIdx = (currentSlideIdx + 1) % HERO_SLIDES.length;
    renderSlide(currentSlideIdx);
  }

  renderSlide(currentSlideIdx);
  slideIntervalTimer = setInterval(nextSlide, 5500);

  const prevBtn = document.getElementById('slider-prev-btn');
  const nextBtn = document.getElementById('slider-next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      clearInterval(slideIntervalTimer);
      currentSlideIdx = (currentSlideIdx - 1 + HERO_SLIDES.length) % HERO_SLIDES.length;
      renderSlide(currentSlideIdx);
      slideIntervalTimer = setInterval(nextSlide, 5500);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      clearInterval(slideIntervalTimer);
      nextSlide();
      slideIntervalTimer = setInterval(nextSlide, 5500);
    });
  }
}

/**
 * Mobile 3-Line Dropdown Hamburger Menu
 */
function initMobileMenu() {
  const burgerBtn = document.getElementById('mobile-hamburger-btn');
  const mobileMenu = document.getElementById('mobile-dropdown-menu');

  if (burgerBtn && mobileMenu) {
    burgerBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
  }
}

/**
 * Chatbot Triage & Escalation Engine
 */
function initChatbotTriage() {
  const chatInput = document.getElementById('chatbot-input-field');
  const chatForm = document.getElementById('chatbot-form');
  const chatLogs = document.getElementById('chatbot-messages-container');

  if (!chatForm || !chatInput || !chatLogs) return;

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawVal = chatInput.value;
    const sanitizedVal = sanitizeInput(rawVal);
    if (!sanitizedVal) return;

    appendChatMessage('user', sanitizedVal);
    chatInput.value = '';

    const lower = sanitizedVal.toLowerCase();
    const escalationKeywords = ['agent', 'team', 'live person', 'pricing', 'human', 'quote'];
    const isEscalation = escalationKeywords.some(k => lower.includes(k));

    if (isEscalation) {
      setTimeout(() => {
        appendChatMessage('bot', 'Escalation Triggered! Our duty engineers have been notified. Please confirm your Name, Phone and Email so our team can respond immediately.');
        promptForContactInfo();
      }, 500);
    } else {
      setTimeout(() => {
        appendChatMessage('bot', 'Thank you for reaching out! You can explore our dedicated tabs for Sensors, Microcontrollers, Contactors, and Breakers. Type "agent" anytime for live support.');
      }, 600);
    }
  });

  // Listen for team replies sent from admin panel in real-time
  window.addEventListener('storage', (e) => {
    if (e.key === 'bp_chat_messages' && e.newValue) {
      try {
        const msgs = JSON.parse(e.newValue);
        const latest = msgs[msgs.length - 1];
        if (latest && latest.sender === 'team') {
          appendChatMessage('team', latest.text);
        }
      } catch (err) {
        console.error(err);
      }
    }
  });
}

function appendChatMessage(sender, text) {
  const chatLogs = document.getElementById('chatbot-messages-container');
  if (!chatLogs) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-bubble chat-${sender}`;
  msgDiv.textContent = text;
  chatLogs.appendChild(msgDiv);
  chatLogs.scrollTop = chatLogs.scrollHeight;
}

function promptForContactInfo() {
  const name = prompt("Please enter your Full Name:");
  if (!name) return;
  const phone = prompt("Please enter your WhatsApp / Phone number:");
  if (!phone) return;
  const email = prompt("Please enter your Email address:");

  const handoverPayload = {
    id: `handover-${Date.now()}`,
    text: `User requested live escalation: ${name} (${phone} / ${email})`,
    timestamp: new Date().toLocaleTimeString(),
    status: 'Escalated to Team',
    userContact: {
      name: sanitizeInput(name),
      phone: sanitizeInput(phone),
      email: sanitizeInput(email || '')
    }
  };

  // Push to localStorage
  try {
    const existing = JSON.parse(localStorage.getItem('bp_chat_messages') || '[]');
    existing.push(handoverPayload);
    localStorage.setItem('bp_chat_messages', JSON.stringify(existing));
    appendChatMessage('bot', `Thank you ${name}! Your request is marked [Escalated to Team]. An engineer is notified.`);
  } catch (e) {
    console.error(e);
  }
}

/**
 * WhatsApp Dynamic API Launcher
 */
function launchWhatsApp(customText) {
  const number = (window.BP_CONFIG.whatsappNumber || '+2348037704936').replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(customText || 'Hello BARGAINPOWER & TECHNOLOGY, I would like to inquire about your engineering solutions.');
  window.open(`https://wa.me/${number}?text=${encoded}`, '_blank');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initHeroSlider();
  initMobileMenu();
  initChatbotTriage();
});
