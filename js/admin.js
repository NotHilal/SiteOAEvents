/* =====================================================
   OA Événementiel — admin.js
   ===================================================== */
"use strict";

var currentFilter  = "all";
var calYear        = new Date().getFullYear();
var calMonth       = new Date().getMonth();
var blocYear       = new Date().getFullYear();
var blocMonth      = new Date().getMonth();
var blockedDatesSet  = new Set();
var blockedDatesMap  = {};
var blockedHoursMap  = {};
var reservationsAll  = [];
var editingMatId     = null;
var editingImageUrl  = null;   // URL de l'image existante lors de l'édition
var HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

/* ===================================================
   AUTH
   =================================================== */
db.auth.onAuthStateChange(function (event, session) {
  var user = session ? session.user : null;
  if (user) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard").style.display    = "flex";
    initDashboard();
  } else {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("dashboard").style.display    = "none";
  }
});

document.getElementById("login-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  var btn = document.getElementById("login-btn");
  var err = document.getElementById("login-error");
  err.style.display = "none";
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Connexion…';
  btn.disabled  = true;

  var { error } = await db.auth.signInWithPassword({
    email:    document.getElementById("adm-email").value.trim(),
    password: document.getElementById("adm-password").value
  });

  if (error) {
    err.textContent   = "Identifiants incorrects. Vérifiez votre email et mot de passe.";
    err.style.display = "block";
    btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Se connecter';
    btn.disabled  = false;
  }
});

document.getElementById("logout-btn").addEventListener("click", function () {
  db.auth.signOut();
});

/* ===================================================
   INIT DASHBOARD
   =================================================== */
function initDashboard() {
  loadReservations();
  setupTabs();
  setupFilters();
  setupCalendar();
  setupBlocCalendar();
  loadMaterials();
}

/* ===================================================
   ONGLETS
   =================================================== */
function setupTabs() {
  document.querySelectorAll(".sidebar-btn[data-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".sidebar-btn").forEach(function (b) { b.classList.remove("active"); });
      document.querySelectorAll(".tab-content").forEach(function (t) { t.classList.remove("active"); });
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "calendrier") renderCalendar();
      if (btn.dataset.tab === "blocages")   renderBlocCalendar();
    });
  });
}

/* ===================================================
   RÉSERVATIONS
   =================================================== */
async function loadReservations() {
  var { data, error } = await db
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });

  reservationsAll = data || [];
  updateBadge();
  renderReservations();
}

function updateBadge() {
  var pending = reservationsAll.filter(function (r) { return r.status === "pending"; }).length;
  document.getElementById("badge-pending").textContent = pending || "";
  document.getElementById("badge-pending").style.display = pending ? "inline-block" : "none";
}

function setupFilters() {
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderReservations();
    });
  });
}

function renderReservations() {
  var list = document.getElementById("reservations-list");
  var filtered = currentFilter === "all"
    ? reservationsAll
    : reservationsAll.filter(function (r) { return r.status === currentFilter; });

  if (!filtered.length) {
    list.innerHTML = '<div class="adm-empty"><i class="fas fa-inbox"></i><p>Aucune demande' + (currentFilter !== "all" ? " dans cette catégorie" : "") + '.</p></div>';
    return;
  }

  list.innerHTML = filtered.map(function (r) {
    var mats = (r.materials || []).map(function (m) { return m.name + ' × ' + m.quantity; }).join(", ");
    var rDates = (r.dates && r.dates.length) ? r.dates.slice().sort() : (r.date ? [r.date] : []);
    var date;
    if (rDates.length <= 1) {
      date = new Date((rDates[0] || r.date) + "T12:00:00").toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });
    } else {
      var d1 = new Date(rDates[0] + "T12:00:00").toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
      var d2 = new Date(rDates[rDates.length-1] + "T12:00:00").toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
      date = d1 + " → " + d2 + " (" + rDates.length + " j)";
    }
    var created = new Date(r.created_at).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });

    var statusLabel = { pending: "En attente", confirmed: "Confirmée", refused: "Refusée" }[r.status] || r.status;
    var statusClass = { pending: "badge-pending", confirmed: "badge-confirmed", refused: "badge-refused" }[r.status] || "";

    return '<div class="resa-card" data-id="' + r.id + '">' +
      '<div class="resa-card-head">' +
        '<div>' +
          '<span class="resa-card-email"><i class="fas fa-envelope"></i> ' + escHtml(r.email) + '</span>' +
          (r.phone ? '<span class="resa-card-phone"><i class="fas fa-phone"></i> ' + escHtml(r.phone) + '</span>' : '') +
        '</div>' +
        '<span class="status-badge ' + statusClass + '">' + statusLabel + '</span>' +
      '</div>' +
      '<div class="resa-card-body">' +
        '<div class="resa-meta">' +
          '<span><i class="fas fa-calendar"></i> ' + date + '</span>' +
          '<span><i class="fas fa-tag"></i> ' + escHtml(r.event_type) + '</span>' +
          (r.nb_persons ? '<span><i class="fas fa-users"></i> ' + r.nb_persons + ' pers.</span>' : '') +
        '</div>' +
        (mats ? '<p class="resa-mats"><i class="fas fa-boxes"></i> ' + escHtml(mats) + '</p>' : '') +
        (r.message ? '<p class="resa-msg"><i class="fas fa-comment"></i> ' + escHtml(r.message) + '</p>' : '') +
        '<p class="resa-created">Reçue le ' + created + '</p>' +
      '</div>' +
      '<div class="resa-card-actions">' +
        (r.status !== "confirmed" ? '<button class="adm-btn-success" onclick="updateStatus(\'' + r.id + '\',\'confirmed\')"><i class="fas fa-check mr-1"></i>Confirmer</button>' : '') +
        (r.status !== "refused"   ? '<button class="adm-btn-danger"  onclick="updateStatus(\'' + r.id + '\',\'refused\')"><i class="fas fa-times mr-1"></i>Refuser</button>'   : '') +
        '<button class="adm-btn-ghost" onclick="openContact(\'' + r.id + '\')"><i class="fas fa-envelope mr-1"></i>Contacter</button>' +
        '<button class="adm-btn-delete" onclick="deleteReservation(\'' + r.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</div>' +
    '</div>';
  }).join("");
}

window.updateStatus = async function (id, status) {
  await db.from("reservations").update({ status: status }).eq("id", id);
  var idx = reservationsAll.findIndex(function (r) { return r.id === id; });
  if (idx !== -1) reservationsAll[idx].status = status;
  updateBadge();
  renderReservations();
  if (status === "confirmed" || status === "refused") renderCalendar();
};

window.deleteReservation = async function (id) {
  if (!confirm("Supprimer cette demande ?")) return;
  await db.from("reservations").delete().eq("id", id);
  reservationsAll = reservationsAll.filter(function (r) { return r.id !== id; });
  updateBadge();
  renderReservations();
};

window.openContact = function (id) {
  var r = reservationsAll.find(function (r) { return r.id === id; });
  if (!r) return;
  var body = document.getElementById("modal-body");
  var mailto = "mailto:" + r.email +
    "?subject=" + encodeURIComponent("Votre réservation OA Événementiel — " + new Date(r.date).toLocaleDateString("fr-FR")) +
    "&body=" + encodeURIComponent("Bonjour,\n\nConcernant votre demande de réservation pour le " + new Date(r.date).toLocaleDateString("fr-FR") + ".\n\n");
  body.innerHTML =
    '<p class="contact-detail"><i class="fas fa-envelope"></i> <a href="' + mailto + '">' + escHtml(r.email) + '</a></p>' +
    (r.phone ? '<p class="contact-detail"><i class="fas fa-phone"></i> <a href="tel:' + r.phone + '">' + escHtml(r.phone) + '</a></p>' : '') +
    '<a href="' + mailto + '" class="adm-btn-primary" style="display:inline-block;margin-top:16px;"><i class="fas fa-envelope mr-2"></i>Ouvrir dans la messagerie</a>';
  document.getElementById("contact-modal").style.display = "flex";
};

document.getElementById("modal-close-btn").addEventListener("click", function () {
  document.getElementById("contact-modal").style.display = "none";
});
document.getElementById("contact-modal").addEventListener("click", function (e) {
  if (e.target === this) this.style.display = "none";
});

/* ===================================================
   CALENDRIER
   =================================================== */
function setupCalendar() {
  document.getElementById("cal-prev").addEventListener("click", function () {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  document.getElementById("cal-next").addEventListener("click", function () {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });
  document.getElementById("day-modal-close").addEventListener("click", closeDayModal);
  document.getElementById("day-modal").addEventListener("click", function(e) {
    if (e.target === this) closeDayModal();
  });
}

async function loadBlockedForCalendar() {
  var { data: bd } = await db.from("blocked_dates").select("date,reason");
  blockedDatesSet = new Set(); blockedDatesMap = {};
  (bd || []).forEach(function(r) { blockedDatesSet.add(r.date); blockedDatesMap[r.date] = r; });

  try {
    var { data: bh } = await db.from("blocked_hours").select("date,hour");
    blockedHoursMap = {};
    (bh || []).forEach(function(r) {
      if (!blockedHoursMap[r.date]) blockedHoursMap[r.date] = [];
      blockedHoursMap[r.date].push(r.hour);
    });
  } catch(e) { blockedHoursMap = {}; }
}

/* ── Helper partagé : construit la grille calendrier ─── */
function buildCalGrid(gridEl, labelEl, year, month, clickFnName) {
  var monthName = new Date(year, month, 1).toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
  labelEl.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  var firstDay    = (new Date(year, month, 1).getDay() + 6) % 7;
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var monthStr    = year + "-" + String(month + 1).padStart(2, "0");
  var monthStart  = monthStr + "-01";
  var monthEnd    = monthStr + "-" + String(daysInMonth).padStart(2, "0");
  var today       = new Date().toISOString().split("T")[0];

  var eventMap = {};
  reservationsAll.forEach(function(r) {
    var rDates = (r.dates && r.dates.length) ? r.dates.slice().sort() : (r.date ? [r.date] : []);
    if (!rDates.length) return;
    var visible = rDates.filter(function(d) { return d >= monthStart && d <= monthEnd; });
    if (!visible.length) return;
    visible.forEach(function(d) {
      if (!eventMap[d]) eventMap[d] = [];
      var isFirst = (d === rDates[0]), isLast = (d === rDates[rDates.length - 1]);
      var spanType = rDates.length === 1 ? "single" : isFirst ? "start" : isLast ? "end" : "mid";
      eventMap[d].push({ r: r, spanType: spanType });
    });
  });

  var html = '<div class="cal-grid">' +
    ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(function(d) {
      return '<div class="cal-day-header">' + d + '</div>';
    }).join("");

  for (var i = 0; i < firstDay; i++) html += '<div class="cal-day-empty"></div>';

  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr   = monthStr + "-" + String(d).padStart(2, "0");
    var isPast    = dateStr < today;
    var isToday   = dateStr === today;
    var isBlocked = blockedDatesSet.has(dateStr);
    var dayEvents = (eventMap[dateStr] || []).filter(function(e) { return e.r.status !== "refused"; });

    var cls = "cal-day";
    if (isPast)    cls += " cal-past";
    if (isToday)   cls += " cal-today";
    if (isBlocked) cls += " cal-blocked";

    var BARS_MAX = 3;
    var barsHtml = dayEvents.slice(0, BARS_MAX).map(function(ev) {
      var r = ev.r;
      var barCls = "cal-ev-bar ev-" + ev.spanType + (r.status === "confirmed" ? " ev-conf" : " ev-pend");
      var name = r.email.split("@")[0]; if (name.length > 12) name = name.slice(0, 12) + "…";
      return '<div class="' + barCls + '" title="' + escHtml(r.email) + '">' +
        '<span class="ev-bar-label">' + escHtml(name) + '</span></div>';
    }).join("");
    if (dayEvents.length > BARS_MAX) barsHtml += '<div class="cal-ev-more">+' + (dayEvents.length - BARS_MAX) + '</div>';

    html += '<div class="' + cls + '" onclick="' + clickFnName + '(\'' + dateStr + '\')">' +
      '<div class="cal-day-top">' +
        '<span class="cal-day-num">' + d + (isToday ? '<span class="today-dot"></span>' : '') + '</span>' +
        (isBlocked ? '<span class="cal-badge badge-blocked"><i class="fas fa-ban"></i></span>' : '') +
      '</div>' +
      (barsHtml ? '<div class="cal-ev-bars">' + barsHtml + '</div>' : '') +
    '</div>';
  }
  html += '</div>';
  gridEl.innerHTML = html;
}

async function renderCalendar() {
  await loadBlockedForCalendar();
  buildCalGrid(
    document.getElementById("calendar-grid"),
    document.getElementById("cal-label"),
    calYear, calMonth,
    "openDayModal"
  );
}

async function renderBlocCalendar() {
  await loadBlockedForCalendar();
  buildCalGrid(
    document.getElementById("bloc-calendar-grid"),
    document.getElementById("bloc-cal-label"),
    blocYear, blocMonth,
    "openBlocModal"
  );
}

/* ===== MODAL BLOCAGE ===== */
window.openBlocModal = function(dateStr) {
  var modal = document.getElementById("day-modal");
  var body  = document.getElementById("day-modal-body");

  var dt = new Date(dateStr + "T12:00:00");
  var dateTitle = dt.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  dateTitle = dateTitle.charAt(0).toUpperCase() + dateTitle.slice(1);

  var isBlocked  = blockedDatesSet.has(dateStr);
  var hourBlocks = (blockedHoursMap[dateStr] || []).slice().sort();
  var dayResas   = reservationsAll.filter(function(r) {
    var rd = (r.dates && r.dates.length) ? r.dates : (r.date ? [r.date] : []);
    return rd.indexOf(dateStr) !== -1;
  });
  var confirmed = dayResas.filter(function(r) { return r.status === "confirmed"; });
  var pending   = dayResas.filter(function(r) { return r.status === "pending"; });

  var html = '<h3 class="day-modal-title">' + dateTitle + '</h3>';

  /* Avertissement résas existantes */
  if (confirmed.length || pending.length) {
    var parts = [];
    if (confirmed.length) parts.push(confirmed.length + ' réservation(s) confirmée(s)');
    if (pending.length)   parts.push(pending.length + ' en attente');
    html += '<div class="day-banner day-banner-lock" style="background:#fffbeb;color:#92400e;border-color:#fcd34d;">' +
      '<i class="fas fa-exclamation-triangle"></i> ' + parts.join(' et ') +
      ' ce jour — elles ne seront pas annulées.</div>';
  }

  if (isBlocked) {
    var info = blockedDatesMap[dateStr];
    html += '<div class="day-banner day-banner-blocked"><i class="fas fa-ban"></i> Journée entièrement bloquée' +
      (info && info.reason ? ' — ' + escHtml(info.reason) : '') + '</div>';
    html += '<button class="adm-btn-ghost" style="margin-top:4px;" onclick="unblockFullDay(\'' + dateStr + '\')"><i class="fas fa-unlock mr-2"></i>Débloquer cette journée</button>';
  }

  if (hourBlocks.length) {
    html += '<div class="day-banner day-banner-partial"><i class="fas fa-clock"></i> Créneaux bloqués : ' + hourBlocks.join(", ") + '</div>';
  }

  /* Formulaire blocage */
  html += '<div class="block-section' + (isBlocked ? ' block-section-muted' : '') + '">';
  html += '<h4 class="block-section-title"><i class="fas fa-lock mr-2"></i>' + (isBlocked ? 'Modifier le blocage' : 'Bloquer ce jour') + '</h4>';
  html += '<div class="block-tabs">' +
    '<button class="block-tab active" data-type="full"  onclick="switchBlockTab(\'full\')">Journée entière</button>' +
    '<button class="block-tab"        data-type="hours" onclick="switchBlockTab(\'hours\')">Heures spécifiques</button>' +
  '</div>';
  html += '<div id="block-panel-full" class="block-panel">' +
    '<div class="adm-form-group"><label>Raison <span style="font-weight:400;color:#999;">(optionnel)</span></label>' +
    '<input type="text" id="block-reason" class="adm-input" placeholder="Ex : Congés, événement privé…"' +
    (isBlocked && blockedDatesMap[dateStr] && blockedDatesMap[dateStr].reason ? ' value="' + escHtml(blockedDatesMap[dateStr].reason) + '"' : '') + '></div>' +
    '<button class="adm-btn-danger" onclick="saveFullDayBlock(\'' + dateStr + '\')"><i class="fas fa-ban mr-2"></i>Bloquer la journée entière</button></div>';
  html += '<div id="block-panel-hours" class="block-panel" style="display:none;">';
  html += '<p class="hours-hint">Sélectionnez les créneaux à bloquer :</p><div class="hours-grid">';
  HOURS.forEach(function(h) {
    var isChecked = hourBlocks.indexOf(h) !== -1;
    html += '<label class="hour-label' + (isChecked ? " hour-checked" : "") + '">' +
      '<input type="checkbox" class="hour-cb" value="' + h + '"' + (isChecked ? " checked" : "") + '>' + h + '</label>';
  });
  html += '</div><div class="hours-actions">' +
    '<button class="adm-btn-primary" onclick="saveHourBlocks(\'' + dateStr + '\')"><i class="fas fa-save mr-2"></i>Enregistrer</button>';
  if (hourBlocks.length) html += '<button class="adm-btn-ghost" onclick="clearHourBlocks(\'' + dateStr + '\')"><i class="fas fa-times mr-1"></i>Tout débloquer</button>';
  html += '</div></div></div>';

  body.innerHTML = html;
  body.querySelectorAll(".hour-cb").forEach(function(cb) {
    cb.addEventListener("change", function() { this.closest(".hour-label").classList.toggle("hour-checked", this.checked); });
  });
  modal.style.display = "flex";
};

window.switchBlockTab = function(type) {
  document.querySelectorAll(".block-tab").forEach(function(b) { b.classList.toggle("active", b.dataset.type === type); });
  document.getElementById("block-panel-full").style.display  = type === "full"  ? "block" : "none";
  document.getElementById("block-panel-hours").style.display = type === "hours" ? "block" : "none";
};

window.saveFullDayBlock = async function(dateStr) {
  var reason = document.getElementById("block-reason").value.trim() || null;
  await db.from("blocked_dates").upsert({ date: dateStr, reason: reason }, { onConflict: "date" });
  blockedDatesSet.add(dateStr); blockedDatesMap[dateStr] = { date: dateStr, reason: reason };
  closeDayModal(); renderCalendar(); renderBlocCalendar();
};

window.unblockFullDay = async function(dateStr) {
  await db.from("blocked_dates").delete().eq("date", dateStr);
  blockedDatesSet.delete(dateStr); delete blockedDatesMap[dateStr];
  closeDayModal(); renderCalendar(); renderBlocCalendar();
};

window.saveHourBlocks = async function(dateStr) {
  var checked = Array.from(document.querySelectorAll(".hour-cb:checked")).map(function(cb) { return cb.value; });
  await db.from("blocked_hours").delete().eq("date", dateStr);
  if (checked.length) await db.from("blocked_hours").insert(checked.map(function(h) { return { date: dateStr, hour: h }; }));
  blockedHoursMap[dateStr] = checked;
  closeDayModal(); renderCalendar(); renderBlocCalendar();
};

window.clearHourBlocks = async function(dateStr) {
  await db.from("blocked_hours").delete().eq("date", dateStr);
  blockedHoursMap[dateStr] = [];
  closeDayModal(); renderCalendar(); renderBlocCalendar();
};

var DAY_PAGE_SIZE = 4;

/* ===== MODAL JOUR ===== */
window.openDayModal = function(dateStr, noRedirect, page) {
  var modal = document.getElementById("day-modal");
  var body  = document.getElementById("day-modal-body");

  var dt = new Date(dateStr + "T12:00:00");
  var dateTitle = dt.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  dateTitle = dateTitle.charAt(0).toUpperCase() + dateTitle.slice(1);

  var isBlocked    = blockedDatesSet.has(dateStr);
  var hourBlocks   = (blockedHoursMap[dateStr] || []).slice().sort();
  /* filtrer toutes les résas qui incluent ce jour via le tableau dates[] */
  var dayResas     = reservationsAll.filter(function(r) {
    var rd = (r.dates && r.dates.length) ? r.dates : (r.date ? [r.date] : []);
    return rd.indexOf(dateStr) !== -1;
  });
  var hasConfirmed = dayResas.some(function(r) { return r.status === "confirmed"; });
  var today        = new Date().toISOString().split("T")[0];
  var isPast       = dateStr < today;


  var currentPage  = parseInt(page) || 0;
  var totalPages   = Math.ceil(dayResas.length / DAY_PAGE_SIZE);
  var pageResas    = dayResas.slice(currentPage * DAY_PAGE_SIZE, (currentPage + 1) * DAY_PAGE_SIZE);

  /* ── Zone scrollable (titre + liste) ── */
  var scrollHtml = '<h3 class="day-modal-title">' + dateTitle +
    (dayResas.length > 1 ? '<span class="day-title-count">' + dayResas.length + ' événements</span>' : '') +
    '</h3>';

  if (dayResas.length) {
    scrollHtml += '<div class="day-resas">';
    pageResas.forEach(function(r) { scrollHtml += renderDayResaCard(r, dateStr); });
    scrollHtml += '</div>';
  } else if (!isBlocked && !isPast) {
    scrollHtml += '<div class="day-no-event"><i class="fas fa-calendar-check"></i> Aucun événement ce jour</div>';
  }

  /* ── Footer fixe (pagination + blocage) ── */
  var footerHtml = '';

  /* Pagination */
  if (totalPages > 1) {
    footerHtml += '<div class="day-pagination">';
    footerHtml += '<button class="day-page-btn" ' +
      (currentPage === 0 ? 'disabled' : 'onclick="openDayModal(\'' + dateStr + '\', true, ' + (currentPage - 1) + ')"') +
      '><i class="fas fa-chevron-left"></i></button>';
    footerHtml += '<span class="day-page-info">' + (currentPage + 1) + ' / ' + totalPages + '</span>';
    footerHtml += '<button class="day-page-btn" ' +
      (currentPage >= totalPages - 1 ? 'disabled' : 'onclick="openDayModal(\'' + dateStr + '\', true, ' + (currentPage + 1) + ')"') +
      '><i class="fas fa-chevron-right"></i></button>';
    footerHtml += '</div>';
  }

  /* Statut blocage (lecture seule — gestion sur l'onglet Blocages) */
  if (isBlocked) {
    var info = blockedDatesMap[dateStr];
    footerHtml += '<div class="day-banner day-banner-blocked"><i class="fas fa-ban"></i> Journée bloquée' +
      (info && info.reason ? ' — ' + escHtml(info.reason) : '') + '</div>';
  } else if (hourBlocks.length) {
    footerHtml += '<div class="day-banner day-banner-partial"><i class="fas fa-clock"></i> Créneaux bloqués : ' + hourBlocks.join(", ") + '</div>';
  } else if (!dayResas.length && isPast) {
    footerHtml += '<div class="day-banner day-banner-past"><i class="fas fa-history"></i> Jour passé — aucune réservation</div>';
  }

  var html = scrollHtml + footerHtml;

  body.innerHTML = html;
  modal.style.display = "flex";
};

function closeDayModal() {
  document.getElementById("day-modal").style.display = "none";
}

function renderDayResaCard(r, dateStr) {
  var label  = { pending:"En attente", confirmed:"Confirmée", refused:"Refusée" }[r.status] || r.status;
  var cls    = { pending:"badge-pending", confirmed:"badge-confirmed", refused:"badge-refused" }[r.status] || "";
  var rDates = (r.dates && r.dates.length) ? r.dates.slice().sort() : (r.date ? [r.date] : []);
  var dateLabel;
  if (rDates.length <= 1) {
    dateLabel = new Date((rDates[0] || r.date) + "T12:00:00").toLocaleDateString("fr-FR", { day:"2-digit", month:"long" });
  } else {
    var d1 = new Date(rDates[0] + "T12:00:00").toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
    var d2 = new Date(rDates[rDates.length-1] + "T12:00:00").toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
    dateLabel = d1 + " → " + d2 + " (" + rDates.length + " j)";
  }
  var matsHtml = (r.materials && r.materials.length)
    ? '<div class="day-resa-mats">' +
        r.materials.map(function(m) {
          return '<span class="day-mat-chip"><i class="fas fa-box"></i> ' + escHtml(m.name) + ' × ' + m.quantity + '</span>';
        }).join("") +
      '</div>'
    : "";
  return '<div class="day-resa-card day-resa-clickable" onclick="openResaDetail(\'' + r.id + '\',\'' + (dateStr || '') + '\')">' +
    '<div class="day-resa-head">' +
      '<span class="day-resa-email"><i class="fas fa-envelope"></i> ' + escHtml(r.email) + '</span>' +
      '<span class="status-badge ' + cls + '">' + label + '</span>' +
    '</div>' +
    '<div class="day-resa-details">' +
      '<span><i class="fas fa-calendar"></i> ' + dateLabel + '</span>' +
      (r.event_type ? '<span><i class="fas fa-tag"></i> ' + escHtml(r.event_type) + '</span>' : '') +
      (r.nb_persons ? '<span><i class="fas fa-users"></i> ' + r.nb_persons + ' pers.</span>' : '') +
    '</div>' +
    matsHtml +
    '<div class="day-resa-cta"><span>Voir les détails</span><i class="fas fa-chevron-right"></i></div>' +
  '</div>';
}

/* ===== DÉTAIL D'UNE RÉSERVATION ===== */
window.openResaDetail = function(id, clickedDate) {
  var r = reservationsAll.find(function(x) { return x.id === id; });
  if (!r) return;
  document.getElementById("day-modal").style.display = "flex";
  var body   = document.getElementById("day-modal-body");
  var rDates = (r.dates && r.dates.length) ? r.dates.slice().sort() : (r.date ? [r.date] : []);
  /* utiliser le jour cliqué comme point de retour, sinon la 1re date de la résa */
  var backDate = clickedDate || rDates[0] || r.date;

  /* Affichage des dates */
  var dateDisplay;
  if (rDates.length <= 1) {
    var d0 = new Date((rDates[0] || r.date) + "T12:00:00");
    dateDisplay = d0.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
    dateDisplay = dateDisplay.charAt(0).toUpperCase() + dateDisplay.slice(1);
  } else {
    var dFirst = new Date(rDates[0] + "T12:00:00").toLocaleDateString("fr-FR", { day:"numeric", month:"long" });
    var dLast  = new Date(rDates[rDates.length-1] + "T12:00:00").toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });
    dateDisplay = dFirst + " → " + dLast + "  ·  " + rDates.length + " jour" + (rDates.length > 1 ? "s" : "");
  }

  var label   = { pending:"En attente", confirmed:"Confirmée", refused:"Refusée" }[r.status] || r.status;
  var cls     = { pending:"badge-pending", confirmed:"badge-confirmed", refused:"badge-refused" }[r.status] || "";
  var created = new Date(r.created_at).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });

  /* Matériaux */
  var matsRows = (r.materials && r.materials.length)
    ? r.materials.map(function(m) {
        return '<div class="detail-mat-row">' +
          '<span class="detail-mat-name"><i class="fas fa-box mr-2"></i>' + escHtml(m.name) + '</span>' +
          '<span class="detail-mat-qty">× ' + m.quantity + '</span>' +
        '</div>';
      }).join("")
    : '<p class="detail-empty-mat">Aucun matériel sélectionné</p>';

  /* Message */
  var msgBlock = r.message
    ? '<div class="detail-block"><h4 class="detail-block-title"><i class="fas fa-comment mr-2"></i>Message / Créneau</h4>' +
      '<p class="detail-message">' + escHtml(r.message) + '</p></div>'
    : "";

  /* Actions */
  var actHtml = '<div class="detail-actions">';
  if (r.status !== "confirmed") actHtml += '<button class="adm-btn-success" onclick="updateStatusFromDetail(\'' + r.id + '\',\'confirmed\',\'' + backDate + '\')"><i class="fas fa-check mr-1"></i>Confirmer</button>';
  if (r.status !== "refused")   actHtml += '<button class="adm-btn-danger"  onclick="updateStatusFromDetail(\'' + r.id + '\',\'refused\',\'' + backDate + '\')"><i class="fas fa-times mr-1"></i>Refuser</button>';
  actHtml += '<button class="adm-btn-ghost" onclick="openContact(\'' + r.id + '\')"><i class="fas fa-envelope mr-1"></i>Contacter</button>';
  actHtml += '<button class="adm-btn-delete" onclick="deleteFromDetail(\'' + r.id + '\',\'' + backDate + '\')"><i class="fas fa-trash"></i></button>';
  actHtml += '</div>';

  body.innerHTML =
    '<button class="detail-back" onclick="openDayModal(\'' + backDate + '\', true)"><i class="fas fa-arrow-left mr-2"></i>Retour au ' +
      new Date(backDate + "T12:00:00").toLocaleDateString("fr-FR", { day:"numeric", month:"long" }) + '</button>' +
    '<div class="detail-head">' +
      '<div>' +
        '<div class="detail-email"><i class="fas fa-envelope"></i> ' + escHtml(r.email) + '</div>' +
        (r.phone ? '<div class="detail-phone"><i class="fas fa-phone"></i> ' + escHtml(r.phone) + '</div>' : '') +
      '</div>' +
      '<span class="status-badge ' + cls + ' badge-lg">' + label + '</span>' +
    '</div>' +
    '<div class="detail-info-grid">' +
      '<div class="detail-info-item"><i class="fas fa-calendar"></i><div><small>Date(s)</small><strong>' + dateDisplay + '</strong></div></div>' +
      '<div class="detail-info-item"><i class="fas fa-tag"></i><div><small>Événement</small><strong>' + escHtml(r.event_type || "—") + '</strong></div></div>' +
      (r.nb_persons ? '<div class="detail-info-item"><i class="fas fa-users"></i><div><small>Personnes</small><strong>' + r.nb_persons + '</strong></div></div>' : '') +
      '<div class="detail-info-item"><i class="fas fa-clock"></i><div><small>Reçue le</small><strong>' + created + '</strong></div></div>' +
    '</div>' +
    '<div class="detail-block"><h4 class="detail-block-title"><i class="fas fa-boxes mr-2"></i>Matériel demandé</h4>' +
    '<div class="detail-mats">' + matsRows + '</div></div>' +
    msgBlock +
    actHtml;
};

window.updateStatusFromDetail = async function(id, status, clickedDate) {
  await db.from("reservations").update({ status: status }).eq("id", id);
  var idx = reservationsAll.findIndex(function(r) { return r.id === id; });
  if (idx !== -1) reservationsAll[idx].status = status;
  updateBadge(); renderReservations(); renderCalendar();
  openResaDetail(id, clickedDate);
};

window.deleteFromDetail = async function(id, backDate) {
  if (!confirm("Supprimer cette demande ?")) return;
  await db.from("reservations").delete().eq("id", id);
  reservationsAll = reservationsAll.filter(function(r) { return r.id !== id; });
  updateBadge(); renderReservations(); renderCalendar();
  openDayModal(backDate, true);
};


/* ===================================================
   BLOCAGES — navigation calendrier
   =================================================== */
function setupBlocCalendar() {
  document.getElementById("bloc-cal-prev").addEventListener("click", function () {
    blocMonth--; if (blocMonth < 0) { blocMonth = 11; blocYear--; }
    renderBlocCalendar();
  });
  document.getElementById("bloc-cal-next").addEventListener("click", function () {
    blocMonth++; if (blocMonth > 11) { blocMonth = 0; blocYear++; }
    renderBlocCalendar();
  });
}

/* ===================================================
   MATÉRIAUX
   =================================================== */
async function loadMaterials() {
  var { data } = await db.from("materials").select("*").order("category").order("name");
  renderMaterialsTable(data || []);
}

function renderMaterialsTable(items) {
  var wrap = document.getElementById("materials-table-wrap");
  if (!items.length) {
    wrap.innerHTML = '<div class="adm-empty"><i class="fas fa-boxes"></i><p>Aucun article. Cliquez sur "Ajouter un article".</p></div>';
    return;
  }
  var html = '<table class="adm-table"><thead><tr>' +
    '<th style="width:56px;">Photo</th><th>Nom</th><th>Catégorie</th><th>Description</th><th>Qté max</th><th>Dispo</th><th>Actions</th>' +
    '</tr></thead><tbody>';
  items.forEach(function (m) {
    var thumb = m.image_url
      ? '<img src="' + escHtml(m.image_url) + '" alt="" class="mat-thumb">'
      : '<div class="mat-thumb-empty"><i class="fas fa-image"></i></div>';
    html += '<tr>' +
      '<td>' + thumb + '</td>' +
      '<td><strong>' + escHtml(m.name) + '</strong></td>' +
      '<td>' + escHtml(m.category || "—") + '</td>' +
      '<td>' + escHtml(m.description || "—") + '</td>' +
      '<td style="text-align:center;">' + m.max_quantity + '</td>' +
      '<td style="text-align:center;">' +
        '<button class="toggle-avail ' + (m.available ? "avail-on" : "avail-off") + '" onclick="toggleAvail(\'' + m.id + '\',' + m.available + ')">' +
          (m.available ? "Oui" : "Non") +
        '</button>' +
      '</td>' +
      '<td class="adm-table-actions">' +
        '<button class="adm-btn-ghost btn-sm" onclick="editMaterial(\'' + m.id + '\')"><i class="fas fa-pen"></i></button>' +
        '<button class="adm-btn-delete btn-sm" onclick="deleteMaterial(\'' + m.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

document.getElementById("add-mat-btn").addEventListener("click", function () {
  editingMatId    = null;
  editingImageUrl = null;
  document.getElementById("mat-form-title").textContent = "Nouvel article";
  document.getElementById("mf-name").value  = "";
  document.getElementById("mf-cat").value   = "";
  document.getElementById("mf-desc").value  = "";
  document.getElementById("mf-qty").value   = 1;
  document.getElementById("mf-id").value    = "";
  resetImageField();
  document.getElementById("mat-form-wrap").style.display = "block";
  document.getElementById("mf-name").focus();
});

/* ── upload widget ── */
document.getElementById("mf-img-btn").addEventListener("click", function () {
  document.getElementById("mf-image").click();
});

document.getElementById("mf-image").addEventListener("change", function () {
  var file = this.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("Image trop lourde (max 5 Mo).");
    this.value = "";
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) { showImagePreview(e.target.result); };
  reader.readAsDataURL(file);
});

document.getElementById("mf-img-remove").addEventListener("click", function () {
  document.getElementById("mf-image").value = "";
  document.getElementById("mf-img-url").value = "";
  showImagePreview(null);
});

function showImagePreview(src) {
  var preview     = document.getElementById("mf-img-preview");
  var placeholder = document.getElementById("img-placeholder");
  var removeBtn   = document.getElementById("mf-img-remove");
  if (src) {
    preview.src              = src;
    preview.style.display    = "block";
    placeholder.style.display = "none";
    removeBtn.style.display  = "inline-flex";
  } else {
    preview.src              = "";
    preview.style.display    = "none";
    placeholder.style.display = "flex";
    removeBtn.style.display  = "none";
  }
}

function resetImageField() {
  document.getElementById("mf-image").value    = "";
  document.getElementById("mf-img-url").value  = "";
  showImagePreview(null);
}

document.getElementById("mat-cancel-btn").addEventListener("click", function () {
  document.getElementById("mat-form-wrap").style.display = "none";
});

document.getElementById("mat-save-btn").addEventListener("click", async function () {
  var btn  = this;
  var name = document.getElementById("mf-name").value.trim();
  var qty  = parseInt(document.getElementById("mf-qty").value) || 1;
  if (!name) { document.getElementById("mf-name").style.borderColor = "#e53e3e"; return; }

  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Enregistrement…';
  btn.disabled  = true;

  /* ── gestion de l'image ── */
  var imageUrl = document.getElementById("mf-img-url").value || null;
  var file     = document.getElementById("mf-image").files[0];

  try {
    if (file) {
      /* supprimer l'ancienne image si remplacement */
      if (editingImageUrl) await removeStorageImage(editingImageUrl);

      var ext      = file.name.split(".").pop().toLowerCase();
      var path     = Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
      var { error: upErr } = await db.storage.from("materials").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      var { data: urlData } = db.storage.from("materials").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    } else if (!imageUrl && editingImageUrl) {
      /* l'utilisateur a cliqué "Retirer" */
      await removeStorageImage(editingImageUrl);
      imageUrl = null;
    }

    var payload = {
      name:         name,
      category:     document.getElementById("mf-cat").value.trim()  || null,
      description:  document.getElementById("mf-desc").value.trim() || null,
      max_quantity: qty,
      image_url:    imageUrl,
      available:    true
    };

    if (editingMatId) {
      await db.from("materials").update(payload).eq("id", editingMatId);
    } else {
      await db.from("materials").insert(payload);
    }

    document.getElementById("mat-form-wrap").style.display = "none";
    loadMaterials();

  } catch (err) {
    alert("Erreur lors de l'enregistrement : " + (err.message || err));
    console.error(err);
  } finally {
    btn.innerHTML = '<i class="fas fa-save mr-2"></i>Enregistrer';
    btn.disabled  = false;
  }
});

async function removeStorageImage(url) {
  try {
    var marker = "/object/public/materials/";
    var idx    = url.indexOf(marker);
    if (idx === -1) return;
    var path = url.slice(idx + marker.length);
    await db.storage.from("materials").remove([path]);
  } catch (e) { /* silent */ }
}

window.editMaterial = async function (id) {
  var { data } = await db.from("materials").select("*").eq("id", id).single();
  if (!data) return;
  editingMatId    = id;
  editingImageUrl = data.image_url || null;
  document.getElementById("mat-form-title").textContent = "Modifier l'article";
  document.getElementById("mf-name").value = data.name;
  document.getElementById("mf-cat").value  = data.category   || "";
  document.getElementById("mf-desc").value = data.description || "";
  document.getElementById("mf-qty").value  = data.max_quantity;
  document.getElementById("mf-id").value   = id;
  /* charger l'image existante */
  resetImageField();
  if (data.image_url) {
    document.getElementById("mf-img-url").value = data.image_url;
    showImagePreview(data.image_url);
  }
  document.getElementById("mat-form-wrap").style.display = "block";
  document.getElementById("mf-name").focus();
};

window.toggleAvail = async function (id, current) {
  await db.from("materials").update({ available: !current }).eq("id", id);
  loadMaterials();
};

window.deleteMaterial = async function (id) {
  if (!confirm("Supprimer cet article ?")) return;
  /* supprimer l'image du storage si elle existe */
  var items = await db.from("materials").select("image_url").eq("id", id).single();
  if (items.data && items.data.image_url) await removeStorageImage(items.data.image_url);
  await db.from("materials").delete().eq("id", id);
  loadMaterials();
};

/* ===== HELPER ===== */
function escHtml(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
