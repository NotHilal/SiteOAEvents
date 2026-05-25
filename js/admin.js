/* =====================================================
   OA Événementiel — admin.js
   ===================================================== */
"use strict";

var currentFilter  = "all";
var calYear        = new Date().getFullYear();
var calMonth       = new Date().getMonth();
var calView        = "month";   /* "month" | "year" */
var blocYear       = new Date().getFullYear();
var blocMonth      = new Date().getMonth();
var blocView       = "month";   /* "month" | "year" */
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
  loadMessages();
  setupTabs();
  setupFilters();
  setupMsgFilters();
  setupCalendar();
  setupBlocCalendar();
  loadCategories();
  loadMaterials();
  setupCatModal();
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
      if (btn.dataset.tab === "calendrier")  renderCalendar();
      if (btn.dataset.tab === "blocages")    renderBlocCalendar();
      if (btn.dataset.tab === "messagerie")  renderMessages();
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

window.deleteReservation = function(id) {
  showDeleteConfirm("Cette demande de réservation sera définitivement supprimée.", async function() {
    await db.from("reservations").delete().eq("id", id);
    reservationsAll = reservationsAll.filter(function(r) { return r.id !== id; });
    updateBadge();
    renderReservations();
  });
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
  /* .onclick = évite l'accumulation de listeners si initDashboard est rappelé */
  document.getElementById("cal-prev").onclick = function () {
    if (calView === "year") { calYear--; }
    else { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } }
    renderCalendar();
  };
  document.getElementById("cal-next").onclick = function () {
    if (calView === "year") { calYear++; }
    else { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } }
    renderCalendar();
  };
  document.getElementById("cal-today").onclick = function () {
    var now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
    renderCalendar();
  };
  document.getElementById("cal-view-month").onclick = function () {
    calView = "month";
    document.getElementById("cal-view-month").classList.add("active");
    document.getElementById("cal-view-year").classList.remove("active");
    renderCalendar();
  };
  document.getElementById("cal-view-year").onclick = function () {
    calView = "year";
    document.getElementById("cal-view-year").classList.add("active");
    document.getElementById("cal-view-month").classList.remove("active");
    renderCalendar();
  };
  document.getElementById("day-modal-close").onclick = closeDayModal;
  document.getElementById("day-modal").onclick = function (e) {
    if (e.target === this) closeDayModal();
  };
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

/* ── Vue annuelle : 12 mois en grille ─── */
function buildYearGrid(gridEl, labelEl, year, clickFnName) {
  labelEl.textContent = year;

  var today    = new Date().toISOString().split("T")[0];
  var nowYear  = new Date().getFullYear();
  var nowMonth = new Date().getMonth();
  var DAYS_HDR = ["L","M","M","J","V","S","D"];

  /* ── eventMap pour toute l'année ── */
  var yearStart = year + "-01-01";
  var yearEnd   = year + "-12-31";
  var eventMap  = {};
  reservationsAll.forEach(function(r) {
    var rDates = (r.dates && r.dates.length) ? r.dates.slice().sort() : (r.date ? [r.date] : []);
    rDates.filter(function(d) { return d >= yearStart && d <= yearEnd; }).forEach(function(d) {
      if (!eventMap[d]) eventMap[d] = [];
      eventMap[d].push(r);
    });
  });

  var html = '<div class="cal-year-wrap">';

  for (var m = 0; m < 12; m++) {
    var monthName = new Date(year, m, 1).toLocaleDateString("fr-FR", { month:"long" });
    monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    var monthStr    = year + "-" + String(m + 1).padStart(2, "0");
    var daysInMonth = new Date(year, m + 1, 0).getDate();
    var firstDay    = (new Date(year, m, 1).getDay() + 6) % 7;
    var isCurrent   = (year === nowYear && m === nowMonth);

    html += '<div class="cal-mini-month' + (isCurrent ? " cal-mini-current" : "") + '" id="ym-' + year + '-' + m + '">';
    html += '<div class="cal-mini-label">' + monthName + '</div>';
    html += '<div class="cal-mini-grid">';

    DAYS_HDR.forEach(function(d) { html += '<div class="cal-mini-hdr">' + d + '</div>'; });

    for (var i = 0; i < firstDay; i++) html += '<div class="cal-mini-empty"></div>';

    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr   = monthStr + "-" + String(d).padStart(2, "0");
      var isPast    = dateStr < today;
      var isToday   = dateStr === today;
      var isBlocked = blockedDatesSet.has(dateStr);
      var hasHours  = !!(blockedHoursMap[dateStr] && blockedHoursMap[dateStr].length);
      var dayRes    = (eventMap[dateStr] || []).filter(function(r) { return r.status !== "refused"; });
      var hasConf   = dayRes.some(function(r) { return r.status === "confirmed"; });
      var hasPend   = dayRes.some(function(r) { return r.status === "pending"; });

      var cls = "cal-mini-day";
      if (isPast)    cls += " is-past";
      if (isToday)   cls += " is-today";
      if (isBlocked) cls += " is-blocked";
      else if (hasHours) cls += " is-partial";

      var dots = "";
      if (hasConf) dots += '<span class="cal-mini-dot dot-conf"></span>';
      if (hasPend) dots += '<span class="cal-mini-dot dot-pend"></span>';
      if (hasHours && !isBlocked) dots += '<span class="cal-mini-dot dot-part"></span>';
      var dotsHtml = dots ? '<div class="cal-mini-dots">' + dots + '</div>' : '';

      html += '<div class="' + cls + '" onclick="' + clickFnName + '(\'' + dateStr + '\')">' +
        d + dotsHtml + '</div>';
    }

    html += '</div></div>';
  }

  html += '</div>';
  gridEl.innerHTML = html;

  /* Scroll vers le mois courant si on affiche l'année actuelle */
  if (year === nowYear) {
    var el = document.getElementById("ym-" + year + "-" + nowMonth);
    if (el) setTimeout(function() { el.scrollIntoView({ behavior:"smooth", block:"nearest" }); }, 80);
  }
}

/* ── Helper partagé : construit la grille calendrier (1 mois) ─── */
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

    var dayHours = blockedHoursMap[dateStr] || [];
    var hasHours = dayHours.length > 0;

    var cls = "cal-day";
    if (isPast)         cls += " cal-past";
    if (isToday)        cls += " cal-today";
    if (isBlocked)      cls += " cal-blocked";
    else if (hasHours)  cls += " cal-partial";

    var BARS_MAX = 3;
    var barsHtml = dayEvents.slice(0, BARS_MAX).map(function(ev) {
      var r = ev.r;
      var barCls = "cal-ev-bar ev-" + ev.spanType + (r.status === "confirmed" ? " ev-conf" : " ev-pend");
      var name = r.email.split("@")[0]; if (name.length > 12) name = name.slice(0, 12) + "…";
      return '<div class="' + barCls + '" title="' + escHtml(r.email) + '">' +
        '<span class="ev-bar-label">' + escHtml(name) + '</span></div>';
    }).join("");
    if (dayEvents.length > BARS_MAX) barsHtml += '<div class="cal-ev-more">+' + (dayEvents.length - BARS_MAX) + '</div>';

    /* Affichage du blocage */
    var blockHtml = "";
    if (isBlocked) {
      var reason = blockedDatesMap[dateStr] && blockedDatesMap[dateStr].reason;
      blockHtml = '<div class="cal-block-full">' +
        '<i class="fas fa-ban"></i>' +
        (reason ? ' ' + escHtml(reason) : ' Journée bloquée') +
      '</div>';
    } else if (hasHours) {
      var sortedH = dayHours.slice().sort();
      var HOURS_MAX = 4;
      var tagsHtml = sortedH.slice(0, HOURS_MAX).map(function(h) {
        return '<span class="cal-hour-tag">' + h.replace(":00","h") + '</span>';
      }).join("");
      if (sortedH.length > HOURS_MAX) tagsHtml += '<span class="cal-hour-more">+' + (sortedH.length - HOURS_MAX) + '</span>';
      blockHtml = '<div class="cal-hour-tags">' + tagsHtml + '</div>';
    }

    html += '<div class="' + cls + '" onclick="' + clickFnName + '(\'' + dateStr + '\')">' +
      '<div class="cal-day-top">' +
        '<span class="cal-day-num">' + d + (isToday ? '<span class="today-dot"></span>' : '') + '</span>' +
      '</div>' +
      (barsHtml  ? '<div class="cal-ev-bars">' + barsHtml + '</div>' : '') +
      blockHtml +
    '</div>';
  }
  html += '</div>';
  gridEl.innerHTML = html;
}

async function renderCalendar() {
  await loadBlockedForCalendar();
  var gridEl  = document.getElementById("calendar-grid");
  var labelEl = document.getElementById("cal-label");
  if (calView === "year") {
    buildYearGrid(gridEl, labelEl, calYear, "openDayModal");
  } else {
    buildCalGrid(gridEl, labelEl, calYear, calMonth, "openDayModal");
  }
}

async function renderBlocCalendar() {
  await loadBlockedForCalendar();
  var gridEl  = document.getElementById("bloc-calendar-grid");
  var labelEl = document.getElementById("bloc-cal-label");
  if (blocView === "year") {
    buildYearGrid(gridEl, labelEl, blocYear, "openBlocModal");
  } else {
    buildCalGrid(gridEl, labelEl, blocYear, blocMonth, "openBlocModal");
  }
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

window.deleteFromDetail = function(id, backDate) {
  showDeleteConfirm("Cette demande de réservation sera définitivement supprimée.", async function() {
    await db.from("reservations").delete().eq("id", id);
    reservationsAll = reservationsAll.filter(function(r) { return r.id !== id; });
    updateBadge(); renderReservations(); renderCalendar();
    openDayModal(backDate, true);
  });
};


/* ===================================================
   BLOCAGES — navigation calendrier
   =================================================== */
function setupBlocCalendar() {
  document.getElementById("bloc-cal-prev").onclick = function () {
    if (blocView === "year") { blocYear--; }
    else { blocMonth--; if (blocMonth < 0) { blocMonth = 11; blocYear--; } }
    renderBlocCalendar();
  };
  document.getElementById("bloc-cal-next").onclick = function () {
    if (blocView === "year") { blocYear++; }
    else { blocMonth++; if (blocMonth > 11) { blocMonth = 0; blocYear++; } }
    renderBlocCalendar();
  };
  document.getElementById("bloc-cal-today").onclick = function () {
    var now = new Date();
    blocYear  = now.getFullYear();
    blocMonth = now.getMonth();
    renderBlocCalendar();
  };
  document.getElementById("bloc-view-month").onclick = function () {
    blocView = "month";
    document.getElementById("bloc-view-month").classList.add("active");
    document.getElementById("bloc-view-year").classList.remove("active");
    renderBlocCalendar();
  };
  document.getElementById("bloc-view-year").onclick = function () {
    blocView = "year";
    document.getElementById("bloc-view-year").classList.add("active");
    document.getElementById("bloc-view-month").classList.remove("active");
    renderBlocCalendar();
  };
}

/* ===================================================
   CATÉGORIES
   =================================================== */
var categoriesAll  = [];
var catPage        = 0;
var CAT_PAGE_SIZE  = 10;

async function loadCategories() {
  var { data } = await db.from("categories").select("*").order("name");
  categoriesAll = data || [];
  renderCategorySelect();
}

function renderCategorySelect() {
  var sel     = document.getElementById("mf-cat");
  var current = sel ? sel.value : "";
  var opts    = '<option value="">— Sans catégorie —</option>';
  categoriesAll.forEach(function(c) {
    opts += '<option value="' + escHtml(c.name) + '"' + (c.name === current ? " selected" : "") + '>' + escHtml(c.name) + '</option>';
  });
  if (sel) sel.innerHTML = opts;
}

function renderCatList(page) {
  var wrap = document.getElementById("cat-list");
  if (!wrap) return;

  if (page !== undefined) catPage = page;

  if (!categoriesAll.length) {
    wrap.innerHTML = '<p style="color:var(--gray);font-size:.85rem;text-align:center;padding:12px 0;">Aucune catégorie.</p>';
    return;
  }

  var totalPages = Math.ceil(categoriesAll.length / CAT_PAGE_SIZE);
  if (catPage >= totalPages) catPage = totalPages - 1;
  if (catPage < 0)           catPage = 0;

  var start = catPage * CAT_PAGE_SIZE;
  var slice = categoriesAll.slice(start, start + CAT_PAGE_SIZE);

  var html = slice.map(function(c) {
    return '<div class="cat-list-item">' +
      '<span class="cat-list-name">' + escHtml(c.name) + '</span>' +
      '<button class="adm-btn-delete btn-sm" onclick="deleteCategory(\'' + c.id + '\',\'' + escHtml(c.name) + '\')"><i class="fas fa-trash"></i></button>' +
    '</div>';
  }).join("");

  if (totalPages > 1) {
    html += '<div class="cat-pagination">' +
      '<button class="cat-pg-btn" onclick="renderCatList(' + (catPage - 1) + ')"' + (catPage === 0 ? ' disabled' : '') + '>' +
        '<i class="fas fa-chevron-left"></i>' +
      '</button>' +
      '<span class="cat-pg-info">' + (catPage + 1) + ' / ' + totalPages + '</span>' +
      '<button class="cat-pg-btn" onclick="renderCatList(' + (catPage + 1) + ')"' + (catPage >= totalPages - 1 ? ' disabled' : '') + '>' +
        '<i class="fas fa-chevron-right"></i>' +
      '</button>' +
    '</div>';
  }

  wrap.innerHTML = html;
}

function setupCatModal() {
  var modal   = document.getElementById("cat-modal");
  var close   = document.getElementById("cat-modal-close");
  var input   = document.getElementById("cat-input");
  var saveBtn = document.getElementById("cat-save-btn");
  var openBtn = document.getElementById("add-cat-btn");

  /* .onclick évite l'accumulation de listeners si setupCatModal est rappelé */
  openBtn.onclick = function() {
    catPage = 0;
    renderCatList();
    modal.style.display = "flex";
    input.value = "";
    hideCatError();
    input.focus();
  };
  close.onclick = function() { modal.style.display = "none"; };
  modal.onclick = function(e) { if (e.target === this) this.style.display = "none"; };

  saveBtn.onclick = saveCategory;
  input.onkeydown = function(e) { if (e.key === "Enter") saveCategory(); };
}

var _catErrTimer = null;

function showCatError(msg) {
  clearTimeout(_catErrTimer);
  var err = document.getElementById("cat-error");
  document.getElementById("cat-error-text").textContent = msg;
  err.style.display = "block";
  _catErrTimer = setTimeout(function() { err.style.display = "none"; }, 3500);
}

function hideCatError() {
  clearTimeout(_catErrTimer);
  document.getElementById("cat-error").style.display = "none";
}

async function saveCategory() {
  var input = document.getElementById("cat-input");
  var name  = input.value.trim().toUpperCase();
  if (!name) { input.style.borderColor = "var(--danger)"; return; }
  input.style.borderColor = "";
  hideCatError();

  var { data, error } = await db.from("categories").insert({ name: name }).select().single();
  if (error) {
    if (error.code === "23505") showCatError('La catégorie "' + name + '" existe déjà.');
    else showCatError("Erreur : " + error.message);
    return;
  }
  categoriesAll.push(data);
  categoriesAll.sort(function(a, b) { return a.name.localeCompare(b.name); });
  input.value = "";
  renderCategorySelect();
  renderCatList();
}

window.deleteCategory = function(id, name) {
  showDeleteConfirm('La catégorie "' + name + '" sera supprimée.', async function() {
    await db.from("categories").delete().eq("id", id);
    categoriesAll = categoriesAll.filter(function(c) { return c.id !== id; });
    renderCategorySelect();
    renderCatList();
  });
};

/* ===================================================
   MATÉRIAUX
   =================================================== */
var materialsAll  = [];
var matPage       = 0;
var MAT_PAGE_SIZE = 8;

async function loadMaterials() {
  var { data } = await db.from("materials").select("*").order("category").order("name");
  materialsAll = data || [];
  renderMaterialsTable();
}

function renderMaterialsTable(page) {
  if (page !== undefined) matPage = page;
  var wrap = document.getElementById("materials-table-wrap");

  if (!materialsAll.length) {
    wrap.innerHTML = '<div class="adm-empty"><i class="fas fa-boxes"></i><p>Aucun article. Cliquez sur "Ajouter un article".</p></div>';
    return;
  }

  var totalPages = Math.ceil(materialsAll.length / MAT_PAGE_SIZE);
  if (matPage >= totalPages) matPage = totalPages - 1;
  if (matPage < 0)           matPage = 0;

  var start = matPage * MAT_PAGE_SIZE;
  var slice = materialsAll.slice(start, start + MAT_PAGE_SIZE);

  var html = '<table class="adm-table"><thead><tr>' +
    '<th style="width:56px;">Photo</th>' +
    '<th style="text-align:center;">Nom</th>' +
    '<th style="text-align:center;">Catégorie</th>' +
    '<th style="text-align:center;">Description</th>' +
    '<th style="text-align:center;">Qté max</th>' +
    '<th style="text-align:center;">Dispo</th>' +
    '<th style="text-align:center;">Actions</th>' +
    '</tr></thead><tbody>';

  slice.forEach(function (m) {
    var thumb = m.image_url
      ? '<img src="' + escHtml(m.image_url) + '" alt="" class="mat-thumb">'
      : '<div class="mat-thumb-empty"><i class="fas fa-image"></i></div>';
    html += '<tr>' +
      '<td>' + thumb + '</td>' +
      '<td style="text-align:center;"><strong>' + escHtml(m.name) + '</strong></td>' +
      '<td style="text-align:center;">' + escHtml(m.category || "—") + '</td>' +
      '<td style="text-align:center;">' + escHtml(m.description || "—") + '</td>' +
      '<td style="text-align:center;">' + m.max_quantity + '</td>' +
      '<td style="text-align:center;">' +
        '<button class="toggle-avail ' + (m.available ? "avail-on" : "avail-off") + '" onclick="toggleAvail(\'' + m.id + '\',' + m.available + ')">' +
          (m.available ? "Oui" : "Non") +
        '</button>' +
      '</td>' +
      '<td style="text-align:center;">' +
        '<div class="adm-table-actions">' +
          '<button class="adm-btn-ghost btn-sm" onclick="editMaterial(\'' + m.id + '\')"><i class="fas fa-pen"></i></button>' +
          '<button class="adm-btn-delete btn-sm" onclick="deleteMaterial(\'' + m.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table>';

  if (totalPages > 1) {
    html += '<div class="mat-pagination">' +
      '<button class="cat-pg-btn" onclick="renderMaterialsTable(' + (matPage - 1) + ')"' + (matPage === 0 ? ' disabled' : '') + '>' +
        '<i class="fas fa-chevron-left"></i>' +
      '</button>' +
      '<span class="cat-pg-info">' + (matPage + 1) + ' / ' + totalPages +
        ' <span class="mat-pg-total">(' + materialsAll.length + ' articles)</span>' +
      '</span>' +
      '<button class="cat-pg-btn" onclick="renderMaterialsTable(' + (matPage + 1) + ')"' + (matPage >= totalPages - 1 ? ' disabled' : '') + '>' +
        '<i class="fas fa-chevron-right"></i>' +
      '</button>' +
    '</div>';
  }

  wrap.innerHTML = html;
}

document.getElementById("add-mat-btn").addEventListener("click", function () {
  editingMatId    = null;
  editingImageUrl = null;
  document.getElementById("mat-form-title").textContent = "Nouvel article";
  document.getElementById("mf-name").value  = "";
  renderCategorySelect();
  document.getElementById("mf-cat").value   = "";
  document.getElementById("mf-desc").value  = "";
  document.getElementById("mf-qty").value   = 1;
  document.getElementById("mf-id").value    = "";
  resetImageField();
  document.getElementById("mat-form-wrap").style.display = "block";
  document.getElementById("mf-name").focus();
});

document.getElementById("mf-qty").addEventListener("input", function() {
  this.style.borderColor = "";
  document.getElementById("qty-error").style.display = "none";
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
  var btn     = this;
  var nameEl  = document.getElementById("mf-name");
  var qtyEl   = document.getElementById("mf-qty");
  var name    = nameEl.value.trim();
  var qtyRaw  = qtyEl.value.trim();
  var qty     = parseInt(qtyRaw, 10);

  var valid = true;
  nameEl.style.borderColor = "";
  qtyEl.style.borderColor  = "";
  document.getElementById("qty-error").style.display = "none";

  if (!name) { nameEl.style.borderColor = "#e53e3e"; valid = false; }
  if (!qtyRaw || isNaN(qty) || qty < 1 || !/^\d+$/.test(qtyRaw)) {
    qtyEl.style.borderColor = "#e53e3e";
    document.getElementById("qty-error").style.display = "block";
    valid = false;
  }
  if (!valid) return;

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
      category:     document.getElementById("mf-cat").value || null,
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
  renderCategorySelect();
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

window.deleteMaterial = function(id) {
  showDeleteConfirm("Cet article et son image seront définitivement supprimés.", async function() {
    var items = await db.from("materials").select("image_url").eq("id", id).single();
    if (items.data && items.data.image_url) await removeStorageImage(items.data.image_url);
    await db.from("materials").delete().eq("id", id);
    loadMaterials();
  });
};

/* ===================================================
   MESSAGERIE
   =================================================== */
var messagesAll  = [];
var msgFilter    = "all";   // "all" | "unread" | "read"

var TYPE_LABELS = {
  "mariage"       : "Mariage",
  "anniversaire"  : "Anniversaire",
  "evenement-pro" : "Événement professionnel",
  "location-deco" : "Location de décoration",
  "autre"         : "Autre"
};

async function loadMessages() {
  var { data, error } = await db
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  messagesAll = data || [];
  updateMsgBadge();
  renderMessages();

  /* Écoute temps réel — nouveaux messages */
  db.channel("contacts-channel")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "contacts" }, function(payload) {
      messagesAll.unshift(payload.new);
      updateMsgBadge();
      renderMessages();
    })
    .subscribe();
}

function updateMsgBadge() {
  var unread = messagesAll.filter(function(m) { return !m.read; }).length;
  var badge  = document.getElementById("badge-messages");
  if (!badge) return;
  badge.textContent    = unread;
  badge.style.display  = unread ? "inline-block" : "none";
  /* blink seulement si non lus */
  if (unread) badge.classList.add("badge-blink");
  else        badge.classList.remove("badge-blink");
}

function setupMsgFilters() {
  document.querySelectorAll(".filter-btn[data-msg-filter]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".filter-btn[data-msg-filter]").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      msgFilter = btn.dataset.msgFilter;
      renderMessages();
    });
  });
}

function renderMessages() {
  var list = document.getElementById("messages-list");
  if (!list) return;

  var filtered = messagesAll;
  if (msgFilter === "unread") filtered = messagesAll.filter(function(m) { return !m.read; });
  if (msgFilter === "read")   filtered = messagesAll.filter(function(m) { return  m.read; });

  if (!filtered.length) {
    list.innerHTML = '<div class="adm-empty"><i class="fas fa-envelope-open"></i><p>' +
      (msgFilter === "unread" ? "Aucun message non lu." : msgFilter === "read" ? "Aucun message lu." : "Aucun message reçu.") +
      '</p></div>';
    return;
  }

  list.innerHTML = filtered.map(function(m) { return renderMsgCard(m); }).join("");
}

function renderMsgCard(m) {
  var isUnread  = !m.read;
  var fullName  = [m.prenom, m.nom].filter(Boolean).join(" ") || m.email;
  var created   = new Date(m.created_at).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });
  var typeLabel = TYPE_LABELS[m.type_evenement] || m.type_evenement || "";
  /* Aperçu tronqué du message */
  var preview   = (m.message || "").replace(/\n/g, " ");
  if (preview.length > 90) preview = preview.slice(0, 90) + "…";

  return '<div class="msg-card' + (isUnread ? " msg-unread" : "") + '" onclick="openMessage(\'' + m.id + '\')">' +
    '<div class="msg-card-head">' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
        '<span class="msg-name"><i class="fas fa-user mr-1" style="color:var(--rose-gold);"></i>' + escHtml(fullName) + '</span>' +
        (isUnread ? '<span class="msg-badge-new">Nouveau</span>' : '') +
      '</div>' +
      '<span class="msg-date"><i class="fas fa-clock" style="margin-right:4px;"></i>' + escHtml(created) + '</span>' +
    '</div>' +
    '<div class="msg-body">' +
      '<div class="msg-meta">' +
        '<span><i class="fas fa-envelope"></i>' + escHtml(m.email) + '</span>' +
        (m.telephone ? '<span><i class="fas fa-phone"></i>' + escHtml(m.telephone) + '</span>' : '') +
        (typeLabel   ? '<span><i class="fas fa-tag"></i>' + escHtml(typeLabel) + '</span>' : '') +
      '</div>' +
      '<p class="msg-preview">' + escHtml(preview) + '</p>' +
    '</div>' +
    '<div class="msg-actions">' +
      '<span class="msg-read-lbl">' + (isUnread
        ? '<i class="fas fa-circle" style="color:var(--rose-gold);font-size:.55rem;"></i> Non lu'
        : '<i class="fas fa-check-double"></i> Lu') + '</span>' +
      '<button class="adm-btn-delete btn-sm" onclick="deleteMessage(event,\'' + m.id + '\')"><i class="fas fa-trash"></i></button>' +
    '</div>' +
  '</div>';
}

window.openMessage = async function(id) {
  var m = messagesAll.find(function(x) { return x.id === id; });
  if (!m) return;

  /* Marquer comme lu si pas encore fait */
  if (!m.read) {
    await db.from("contacts").update({ read: true }).eq("id", id);
    m.read = true;
    updateMsgBadge();
    renderMessages();
  }

  /* Ouvrir le popup de détail */
  var modal = document.getElementById("day-modal");
  var body  = document.getElementById("day-modal-body");

  var fullName  = [m.prenom, m.nom].filter(Boolean).join(" ") || "—";
  var created   = new Date(m.created_at).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });
  created = created.charAt(0).toUpperCase() + created.slice(1);
  var typeLabel = TYPE_LABELS[m.type_evenement] || m.type_evenement || "—";

  body.innerHTML =
    '<div class="msg-detail-head">' +
      '<div class="msg-detail-avatar"><i class="fas fa-user"></i></div>' +
      '<div>' +
        '<div class="msg-detail-name">' + escHtml(fullName) + '</div>' +
        '<div class="msg-detail-date">' + escHtml(created) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="detail-info-grid" style="margin:18px 0;">' +
      '<div class="detail-info-item"><i class="fas fa-envelope"></i><div><small>Email</small><strong>' + escHtml(m.email) + '</strong></div></div>' +
      (m.telephone ? '<div class="detail-info-item"><i class="fas fa-phone"></i><div><small>Téléphone</small><strong>' + escHtml(m.telephone) + '</strong></div></div>' : '') +
      '<div class="detail-info-item"><i class="fas fa-tag"></i><div><small>Type d\'événement</small><strong>' + escHtml(typeLabel) + '</strong></div></div>' +
    '</div>' +
    '<div class="detail-block">' +
      '<h4 class="detail-block-title"><i class="fas fa-comment mr-2"></i>Message</h4>' +
      '<div class="msg-detail-text">' + escHtml(m.message || "") + '</div>' +
    '</div>' +
    '<div class="detail-actions">' +
      '<a href="mailto:' + escHtml(m.email) + '?subject=' + encodeURIComponent("Réponse à votre demande — OA Événementiel") + '" class="adm-btn-primary">' +
        '<i class="fas fa-reply mr-2"></i>Répondre par email</a>' +
      '<button class="adm-btn-delete" onclick="deleteMessage(event,\'' + m.id + '\');closeDayModal();"><i class="fas fa-trash mr-1"></i>Supprimer</button>' +
    '</div>';

  modal.style.display = "flex";
};

window.deleteMessage = function(e, id) {
  e.stopPropagation();
  showDeleteConfirm("Ce message sera définitivement supprimé.", async function() {
    await db.from("contacts").delete().eq("id", id);
    messagesAll = messagesAll.filter(function(m) { return m.id !== id; });
    updateMsgBadge();
    renderMessages();
  });
};

/* ===================================================
   MODAL SUPPRESSION
   =================================================== */
var _delCallback = null;

(function setupDeleteModal() {
  var modal   = document.getElementById("delete-modal");
  var confirm = document.getElementById("del-modal-confirm");
  var cancel  = document.getElementById("del-modal-cancel");

  cancel.addEventListener("click", closeDeleteModal);
  modal.addEventListener("click", function(e) { if (e.target === this) closeDeleteModal(); });
  confirm.addEventListener("click", function() {
    if (typeof _delCallback === "function") _delCallback();
    closeDeleteModal();
  });
})();

function showDeleteConfirm(subtitle, callback) {
  _delCallback = callback;
  document.getElementById("del-modal-sub").textContent = subtitle || "Cette action est irréversible.";
  document.getElementById("delete-modal").style.display = "flex";
}

function closeDeleteModal() {
  document.getElementById("delete-modal").style.display = "none";
  _delCallback = null;
}

/* ===== HELPER ===== */
function escHtml(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
