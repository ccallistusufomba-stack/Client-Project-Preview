/**
 * BARGAINPOWER & TECHNOLOGY - Admin Dashboard Logic
 * Features:
 * 1. Storage Pipeline for Public Form Inquiries with Security Badge & Direct Email Reply Trigger
 * 2. Real-Time Chatbot Handover Queue & Instant Chatbot Reply Mechanism
 * 3. Visitor Tracking Records & Counter
 * 4. Control Center CMS (WhatsApp, Email, Brand Details)
 * 5. Data Sanitizer for Front-End Security
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

document.addEventListener('DOMContentLoaded', () => {
  loadMetricsAndQueues();
  initChatReplyHandler();
  initCmsSettingsForm();

  // Listen for storage events (e.g. when visitor submits new inquiry or chat)
  window.addEventListener('storage', () => {
    loadMetricsAndQueues();
  });
});

function loadMetricsAndQueues() {
  // 1. Inquiries
  let inquiries = [];
  try {
    inquiries = JSON.parse(localStorage.getItem('bp_inquiries') || '[]');
  } catch (e) {
    inquiries = [];
  }

  const statInq = document.getElementById('stat-total-inquiries');
  if (statInq) statInq.textContent = `${inquiries.length} Inbound`;

  renderInquiriesList(inquiries);

  // 2. Chat messages & handovers
  let chatMsgs = [];
  try {
    chatMsgs = JSON.parse(localStorage.getItem('bp_chat_messages') || '[]');
  } catch (e) {
    chatMsgs = [];
  }

  const handovers = chatMsgs.filter(m => m.status === 'Escalated to Team');
  const statHand = document.getElementById('stat-urgent-handovers');
  if (statHand) statHand.textContent = `${handovers.length} Urgent`;

  renderHandoversList(handovers);

  // 3. Visitor logs
  let visitors = [];
  try {
    visitors = JSON.parse(localStorage.getItem('bp_visitor_logs') || '[]');
  } catch (e) {
    visitors = [];
  }

  const statVis = document.getElementById('stat-total-visitors');
  if (statVis) statVis.textContent = `${visitors.length} Logged`;

  renderVisitorsTable(visitors);

  // 4. CMS Settings populate
  try {
    const settings = JSON.parse(localStorage.getItem('bp_site_settings') || '{}');
    if (settings.whatsappNumber) {
      const waInput = document.getElementById('cms-whatsapp-input');
      if (waInput) waInput.value = settings.whatsappNumber;
    }
    if (settings.helpEmail) {
      const emInput = document.getElementById('cms-email-input');
      if (emInput) emInput.value = settings.helpEmail;
    }
    if (settings.companyName) {
      const compInput = document.getElementById('cms-company-input');
      if (compInput) compInput.value = settings.companyName;
    }
    if (settings.topAnnouncement) {
      const annInput = document.getElementById('cms-announcement-input');
      if (annInput) annInput.value = settings.topAnnouncement;
    }
  } catch (e) {}
}

function renderInquiriesList(inquiries) {
  const container = document.getElementById('admin-inquiries-list');
  if (!container) return;

  if (inquiries.length === 0) {
    container.innerHTML = '<div style="padding: 1rem; color: #64748B; font-size: 0.8125rem;">No client inquiries in queue.</div>';
    return;
  }

  container.innerHTML = inquiries.map(inq => `
    <div style="background-color: #050D1A; border: 1px solid #1E293B; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <div>
          <strong style="color: #FFFFFF; font-size: 0.875rem;">${inq.name}</strong>
          <span class="badge-verified" style="margin-left: 0.5rem;">✓ Security: Robot Check Passed</span>
        </div>
        <span style="font-size: 0.6875rem; color: #64748B; font-family: monospace;">${inq.timestamp}</span>
      </div>

      <div style="font-size: 0.75rem; color: #94A3B8; margin-bottom: 0.5rem;">
        Email: <a href="mailto:${inq.email}" style="color: #38BDF8;">${inq.email}</a> | 
        WhatsApp: <a href="https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}" target="_blank" style="color: #2DD4BF;">${inq.phone}</a>
      </div>

      <div style="font-size: 0.75rem; color: #E2E8F0; background-color: #0B192E; padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem;">
        <strong>Service: ${inq.serviceInterested}</strong><br>
        "${inq.message}"
      </div>

      <!-- Action Buttons: Reply to Visitor's Email -->
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
        <button onclick="replyToVisitorEmail('${inq.id}', '${inq.email}', '${encodeURIComponent(inq.name)}')" class="btn-action">
          ✉ Reply Directly to Email
        </button>
      </div>
    </div>
  `).join('');
}

// Reply directly to visitor's email
window.replyToVisitorEmail = function(id, email, encodedName) {
  const name = decodeURIComponent(encodedName);
  const replyMessage = prompt(`Compose email reply to ${name} (${email}):`, `Dear ${name},\n\nThank you for reaching out to BARGAINPOWER & TECHNOLOGY. Regarding your inquiry, our team has reviewed your requirements...`);
  if (!replyMessage) return;

  const sanitized = sanitizeInput(replyMessage);

  // Update in localStorage
  try {
    const inqs = JSON.parse(localStorage.getItem('bp_inquiries') || '[]');
    const updated = inqs.map(i => {
      if (i.id === id) {
        return {
          ...i,
          status: 'Replied',
          replies: [
            ...(i.replies || []),
            {
              id: `rep-${Date.now()}`,
              text: sanitized,
              sentAt: new Date().toLocaleString(),
              author: 'BARGAINPOWER Support Desk'
            }
          ]
        };
      }
      return i;
    });
    localStorage.setItem('bp_inquiries', JSON.stringify(updated));
    loadMetricsAndQueues();
  } catch (e) {
    console.error(e);
  }

  // Open default mail client
  const subject = encodeURIComponent('RE: Your Inquiry to BARGAINPOWER & TECHNOLOGY');
  const body = encodeURIComponent(sanitized);
  window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
};

function renderHandoversList(handovers) {
  const container = document.getElementById('admin-handovers-list');
  if (!container) return;

  if (handovers.length === 0) {
    container.innerHTML = '<div style="padding: 1rem; color: #64748B; font-size: 0.8125rem;">No active chat triage escalations.</div>';
    return;
  }

  container.innerHTML = handovers.map(h => `
    <div style="background-color: #050D1A; border: 1px solid #831843; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
        <span class="badge-urgent">URGENT TRIAGE</span>
        <span style="font-size: 0.6875rem; color: #94A3B8;">${h.timestamp}</span>
      </div>
      <p style="font-size: 0.75rem; color: #F1F5F9; margin: 0.25rem 0;">${h.text}</p>
      ${h.userContact ? `
        <div style="font-size: 0.6875rem; color: #2DD4BF; margin-top: 0.25rem;">
          Contact: ${h.userContact.name} | Phone: ${h.userContact.phone} | Email: ${h.userContact.email}
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderVisitorsTable(visitors) {
  const tbody = document.getElementById('admin-visitors-table');
  if (!tbody) return;

  if (visitors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748B;">No recorded visitors yet.</td></tr>';
    return;
  }

  tbody.innerHTML = visitors.slice(0, 15).map(v => `
    <tr>
      <td style="color: #2DD4BF; font-family: monospace;">${v.ip}</td>
      <td>${v.device}</td>
      <td style="color: #94A3B8;">${v.browser}</td>
      <td style="color: #FFFFFF;">${v.pageVisited}</td>
      <td style="color: #64748B; font-family: monospace;">${v.timestamp}</td>
    </tr>
  `).join('');
}

/**
 * Chatbot Reply Button: Sends direct reply to the visitor's live chat window
 */
function initChatReplyHandler() {
  const replyBtn = document.getElementById('admin-chat-reply-btn');
  const inputEl = document.getElementById('admin-chat-reply-input');
  const statusEl = document.getElementById('admin-chat-status');

  if (!replyBtn || !inputEl) return;

  replyBtn.addEventListener('click', () => {
    const rawVal = inputEl.value;
    const sanitizedVal = sanitizeInput(rawVal);
    if (!sanitizedVal) return;

    try {
      const existing = JSON.parse(localStorage.getItem('bp_chat_messages') || '[]');
      existing.push({
        id: `team-${Date.now()}`,
        sender: 'team',
        text: sanitizedVal,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Resolved'
      });
      localStorage.setItem('bp_chat_messages', JSON.stringify(existing));

      inputEl.value = '';
      if (statusEl) {
        statusEl.style.display = 'block';
        setTimeout(() => { statusEl.style.display = 'none'; }, 2500);
      }
      loadMetricsAndQueues();
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * CMS Settings Form Handler
 */
function initCmsSettingsForm() {
  const form = document.getElementById('admin-cms-form');
  const statusEl = document.getElementById('cms-save-status');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const wa = sanitizeInput(document.getElementById('cms-whatsapp-input')?.value || '');
    const email = sanitizeInput(document.getElementById('cms-email-input')?.value || '');
    const comp = sanitizeInput(document.getElementById('cms-company-input')?.value || '');
    const ann = sanitizeInput(document.getElementById('cms-announcement-input')?.value || '');

    try {
      const existing = JSON.parse(localStorage.getItem('bp_site_settings') || '{}');
      const updated = {
        ...existing,
        whatsappNumber: wa,
        helpEmail: email,
        companyName: comp,
        topAnnouncement: ann
      };
      localStorage.setItem('bp_site_settings', JSON.stringify(updated));

      if (statusEl) {
        statusEl.style.display = 'inline';
        setTimeout(() => { statusEl.style.display = 'none'; }, 2500);
      }
    } catch (err) {
      console.error(err);
    }
  });
}
