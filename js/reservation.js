/* =====================================================
   OA Événementiel — reservation.js  (multi-jours à cocher)
   ===================================================== */

(function () {
  "use strict";

  /* ============================================================
     ÉTAT GLOBAL
     ============================================================ */
  var blockedDatesSet = new Set();
  var blockedHoursMap = {};
  var busyDatesSet    = new Set();   // jours avec résa confirmée/en attente
  var materialsData   = [];
  var stockUsedMap    = {};

  var selectedDates   = [];   // tableau de "YYYY-MM-DD" triés
  var selectedTimeType = 'full';
  var selectedHours    = [];

  var currentStep = 1;
  var TOTAL_STEPS = 4;
  var calYear, calMonth;

  var HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00',
               '14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

  var MONTHS_FR    = ['Janvier','Février','Mars','Avril','Mai','Juin',
                      'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  var MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin',
                      'juil.','août','sept.','oct.','nov.','déc.'];
  var DAYS_SHORT   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  var DAYS_FR      = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

  var EVENT_LABELS = {
    'mariage':'Mariage','anniversaire':'Anniversaire',
    'evenement-pro':'Événement professionnel',
    'location-deco':'Location décoration','autre':'Autre'
  };

  /* ============================================================
     INIT
     ============================================================ */
  var now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();

  /* ============================================================
     DONNÉES BLOQUÉES
     ============================================================ */
  async function loadBlockedData() {
    try {
      var results = await Promise.all([
        db.from('blocked_dates').select('date'),
        db.from('blocked_hours').select('date, hour'),
        db.from('reservations').select('date, dates').in('status', ['confirmed', 'pending'])
      ]);
      (results[0].data || []).forEach(function (r) { blockedDatesSet.add(r.date); });
      (results[1].data || []).forEach(function (r) {
        if (!blockedHoursMap[r.date]) blockedHoursMap[r.date] = [];
        blockedHoursMap[r.date].push(r.hour);
      });
      busyDatesSet = new Set();
      (results[2].data || []).forEach(function (r) {
        var rDates = r.dates || [r.date];
        rDates.forEach(function (d) { busyDatesSet.add(d); });
      });
    } catch (e) { /* silent */ }
    renderCalendar();
  }

  /* ── Jour bloqué pour une résa multi-jours ? ─────────────── */
  /* Seules les réservations confirmées/en attente bloquent l'extension.
     Les blocked_dates sont déjà désactivés visuellement (rcd-disabled). */
  function isBlockedForMultiDay(dateStr) {
    return busyDatesSet.has(dateStr);
  }

  /* ── Décalage d'une date YYYY-MM-DD de n jours ───────────── */
  function addDays(dateStr, n) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return fmtDate(d);
  }

  /* ── Message d'erreur inline sous le calendrier ─────────── */
  function showCalError(msg) {
    var el = document.getElementById('res-cal-error');
    el.querySelector('span').textContent = msg;
    el.style.display = 'flex';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () { el.style.display = 'none'; }, 4000);
  }

  /* ============================================================
     STOCK POUR UN ENSEMBLE DE JOURS
     ============================================================ */
  async function loadStockForDates(dates) {
    stockUsedMap = {};
    if (!dates.length) return;
    var minDate = dates[0], maxDate = dates[dates.length - 1];
    try {
      var res = await db.from('reservations')
        .select('materials, date, dates')
        .in('status', ['confirmed', 'pending'])
        .lte('date', maxDate);

      (res.data || []).forEach(function (r) {
        /* vérifie si la résa chevauche l'un de nos jours sélectionnés */
        var rDates = r.dates || [r.date];
        var overlaps = dates.some(function (d) { return rDates.indexOf(d) !== -1; });
        if (!overlaps) return;
        (r.materials || []).forEach(function (m) {
          var key = String(m.id);
          stockUsedMap[key] = Math.max(stockUsedMap[key] || 0, parseInt(m.quantity) || 0);
        });
      });
    } catch (e) { /* silent */ }
  }

  function getAvailable(m) {
    return Math.max(0, m.max_quantity - (stockUsedMap[String(m.id)] || 0));
  }

  /* ============================================================
     RENDU DU CALENDRIER
     ============================================================ */
  function renderCalendar() {
    document.getElementById('res-cal-label').textContent =
      MONTHS_FR[calMonth] + ' ' + calYear;

    var today = new Date(); today.setHours(0,0,0,0);
    var firstDay    = new Date(calYear, calMonth, 1).getDay();
    firstDay        = (firstDay === 0) ? 6 : firstDay - 1;
    var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    var totalCells  = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    var html = ''; var dayCount = 1;

    for (var i = 0; i < totalCells; i++) {
      if (i < firstDay || dayCount > daysInMonth) {
        html += '<div class="rcd rcd-empty"></div>';
      } else {
        var d       = new Date(calYear, calMonth, dayCount);
        var dateStr = fmtDate(d);
        var isPast  = d <= today;
        var isBlk   = blockedDatesSet.has(dateStr);
        var blkH    = blockedHoursMap[dateStr] || [];
        var allBlk  = blkH.length >= HOURS.length;
        var isWkend = (d.getDay() === 0 || d.getDay() === 6);
        var partial  = !isPast && !isBlk && !allBlk && blkH.length > 0;
        var isBusy   = !isPast && !isBlk && !allBlk && !partial && busyDatesSet.has(dateStr);
        var isSel    = selectedDates.indexOf(dateStr) !== -1;
        var disabled = isPast || isBlk || allBlk;

        /* Jour adjacent à la sélection courante (guidage visuel) */
        var isAdj = false;
        if (!disabled && !isSel && selectedDates.length > 0 && selectedDates.length < 3) {
          isAdj = (dateStr === addDays(selectedDates[0], -1) ||
                   dateStr === addDays(selectedDates[selectedDates.length - 1], 1));
        }

        var cls = 'rcd';
        if (disabled)           cls += ' rcd-disabled';
        else                    cls += ' rcd-avail';
        if (!disabled && isWkend) cls += ' rcd-weekend';
        if (partial)            cls += ' rcd-partial';
        if (isBusy)             cls += ' rcd-booked';
        if (isSel)              cls += ' rcd-selected';
        if (isAdj)              cls += ' rcd-adjacent';

        html += '<div class="' + cls + '"' +
                (disabled ? '' : ' data-date="' + dateStr + '"') + '>' +
                '<span>' + dayCount + '</span>' +
                (isSel ? '<i class="fas fa-check rcd-check"></i>' : '') +
                '</div>';
        dayCount++;
      }
    }

    document.getElementById('res-cal-grid').innerHTML = html;

    document.querySelectorAll('#res-cal-grid .rcd-avail').forEach(function (cell) {
      cell.addEventListener('click', function () { toggleDate(this.dataset.date); });
    });

    /* hint */
    var hint = document.getElementById('res-cal-hint-text');
    if (!selectedDates.length) {
      hint.textContent = 'Cliquez sur le jour de départ (3 jours consécutifs maximum)';
    } else if (selectedDates.length >= 3) {
      hint.textContent = 'Maximum atteint — retirez un jour ou effacez tout pour recommencer';
    } else {
      hint.textContent = selectedDates.length + ' jour sélectionné — cliquez sur un jour adjacent pour l\'ajouter (max 3)';
    }
    /* cache l'erreur si on re-rend */
    document.getElementById('res-cal-error').style.display = 'none';

    /* prev button */
    var prevBtn  = document.getElementById('res-cal-prev');
    var curFirst = new Date(now.getFullYear(), now.getMonth(), 1);
    prevBtn.disabled      = new Date(calYear, calMonth, 1) <= curFirst;
    prevBtn.style.opacity = prevBtn.disabled ? '.3' : '1';
  }

  /* ============================================================
     TOGGLE D'UN JOUR
     ============================================================ */
  function toggleDate(dateStr) {
    var idx = selectedDates.indexOf(dateStr);

    /* ── DÉSÉLECTION ───────────────────────────────────────── */
    if (idx !== -1) {
      var isEdge = (idx === 0 || idx === selectedDates.length - 1);
      if (!isEdge) {
        /* Jour du milieu : on ne peut pas le retirer seul */
        showCalError('Pour retirer un jour intermédiaire, commencez par les extrémités de votre sélection, ou effacez tout.');
        return;
      }
      selectedDates.splice(idx, 1);

      if (!selectedDates.length) {
        document.getElementById('res-time-section').style.display = 'none';
        selectedTimeType = 'full';
        selectedHours    = [];
        stockUsedMap     = {};
      } else {
        updateTimeSection();
        loadStockForDates(selectedDates);
      }
      document.getElementById('r-date').value = selectedDates[0] || '';
      document.getElementById('resa-date-error').style.display = 'none';
      renderCalendar();
      return;
    }

    /* ── SÉLECTION ─────────────────────────────────────────── */
    if (selectedDates.length === 0) {
      /* Premier jour : toujours autorisé */
      selectedDates = [dateStr];

    } else if (selectedDates.length >= 3) {
      showCalError('Maximum 3 jours consécutifs atteint. Effacez la sélection pour recommencer.');
      return;

    } else {
      var minDate = selectedDates[0];
      var maxDate = selectedDates[selectedDates.length - 1];
      var prevDay = addDays(minDate, -1);
      var nextDay = addDays(maxDate,  1);

      if (dateStr === prevDay || dateStr === nextDay) {
        /* Jour adjacent — vérifier qu'il n'y a pas de réservation existante */
        if (isBlockedForMultiDay(dateStr)) {
          showCalError('Ce jour est déjà réservé — impossible de l\'inclure dans une plage multi-jours.');
          return;
        }
        selectedDates.push(dateStr);
        selectedDates.sort();

      } else {
        /* Jour non adjacent → nouvelle sélection depuis zéro */
        selectedDates    = [dateStr];
        selectedTimeType = 'full';
        selectedHours    = [];
      }
    }

    updateTimeSection();
    loadStockForDates(selectedDates);
    document.getElementById('r-date').value = selectedDates[0] || '';
    document.getElementById('resa-date-error').style.display = 'none';
    renderCalendar();
  }

  function updateTimeSection() {
    var isMulti = selectedDates.length > 1;

    /* compteur */
    document.getElementById('res-dates-count').textContent =
      selectedDates.length + ' jour' + (selectedDates.length > 1 ? 's' : '') + ' sélectionné' + (selectedDates.length > 1 ? 's' : '');

    /* pills */
    var pillsEl = document.getElementById('res-dates-pills');
    pillsEl.innerHTML = selectedDates.map(function (d) {
      var dt = new Date(d + 'T00:00:00');
      var label = DAYS_SHORT[dt.getDay()] + ' ' + dt.getDate() + ' ' + MONTHS_SHORT[dt.getMonth()];
      return '<span class="date-pill">' + label +
             '<button type="button" class="date-pill-rm" data-date="' + d + '" title="Retirer ce jour">' +
             '<i class="fas fa-times"></i></button></span>';
    }).join('');

    /* boutons × dans les pills */
    pillsEl.querySelectorAll('.date-pill-rm').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDate(this.dataset.date);
      });
    });

    /* multi-jours : forcer journée entière */
    var hoursTab     = document.getElementById('res-tab-hours');
    var multidayNote = document.getElementById('res-multiday-note');
    if (isMulti) {
      if (selectedTimeType === 'hours') {
        selectedTimeType = 'full';
        selectedHours    = [];
        document.getElementById('res-tab-full').classList.add('active');
        hoursTab.classList.remove('active');
        document.getElementById('res-hours-section').style.display = 'none';
      }
      hoursTab.style.display     = 'none';
      multidayNote.style.display = 'block';
    } else {
      hoursTab.style.display     = '';
      multidayNote.style.display = 'none';
    }

    document.getElementById('res-hours-error').style.display = 'none';

    /* révéler */
    var ts = document.getElementById('res-time-section');
    if (ts.style.display === 'none') {
      ts.style.display = 'block';
      setTimeout(function () {
        ts.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }

  function clearAllDates() {
    selectedDates    = [];
    selectedTimeType = 'full';
    selectedHours    = [];
    stockUsedMap     = {};
    document.getElementById('r-date').value = '';
    document.getElementById('res-time-section').style.display = 'none';
    renderCalendar();
  }

  document.getElementById('res-change-date').addEventListener('click', clearAllDates);

  /* ============================================================
     CRÉNEAUX HORAIRES
     ============================================================ */
  function renderHourSlots() {
    var blocked = blockedHoursMap[selectedDates[0]] || [];
    var html = '';
    HOURS.forEach(function (h) {
      var isBlocked = blocked.indexOf(h) !== -1;
      var isActive  = selectedHours.indexOf(h) !== -1;
      var cls = 'res-hour-pill' + (isBlocked ? ' res-hour-blocked' : '') + (isActive ? ' res-hour-active' : '');
      html += '<button type="button" class="' + cls + '"' +
              (isBlocked ? ' disabled' : ' data-hour="' + h + '"') + '>' + h + '</button>';
    });
    document.getElementById('res-hours-grid').innerHTML = html;
    document.querySelectorAll('.res-hour-pill:not(.res-hour-blocked)').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var h = this.dataset.hour, idx = selectedHours.indexOf(h);
        if (idx === -1) { selectedHours.push(h); this.classList.add('res-hour-active'); }
        else            { selectedHours.splice(idx, 1); this.classList.remove('res-hour-active'); }
        document.getElementById('res-hours-error').style.display = 'none';
      });
    });
  }

  document.getElementById('res-tab-full').addEventListener('click', function () {
    selectedTimeType = 'full'; selectedHours = [];
    this.classList.add('active');
    document.getElementById('res-tab-hours').classList.remove('active');
    document.getElementById('res-hours-section').style.display = 'none';
    document.getElementById('res-hours-error').style.display   = 'none';
  });

  document.getElementById('res-tab-hours').addEventListener('click', function () {
    selectedTimeType = 'hours';
    this.classList.add('active');
    document.getElementById('res-tab-full').classList.remove('active');
    document.getElementById('res-hours-section').style.display = 'block';
    renderHourSlots();
  });

  /* ============================================================
     NAVIGATION MOIS
     ============================================================ */
  document.getElementById('res-cal-prev').addEventListener('click', function () {
    if (this.disabled) return;
    if (--calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  document.getElementById('res-cal-next').addEventListener('click', function () {
    if (++calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  /* ============================================================
     WIZARD — NAVIGATION
     ============================================================ */
  function goToStep(n) {
    document.getElementById('spanel-' + currentStep).style.display = 'none';
    var next = document.getElementById('spanel-' + n);
    next.style.animation = 'none';
    next.style.display   = 'block';
    next.offsetHeight;
    next.style.animation = '';

    for (var i = 1; i <= TOTAL_STEPS; i++) {
      var dot = document.getElementById('sdot-' + i);
      var numEl = dot.querySelector('.step-num');
      var chkEl = dot.querySelector('.step-check');
      dot.classList.remove('active','done');
      if (i < n) {
        dot.classList.add('done'); numEl.style.display = 'none'; chkEl.style.display = 'inline';
      } else {
        numEl.style.display = 'inline'; chkEl.style.display = 'none';
        if (i === n) dot.classList.add('active');
      }
    }
    for (var j = 1; j < TOTAL_STEPS; j++) {
      var line = document.getElementById('sline-' + j);
      if (j < n) line.classList.add('done'); else line.classList.remove('done');
    }

    var prevBtn = document.getElementById('step-prev');
    var nextBtn = document.getElementById('step-next');
    prevBtn.style.visibility = n === 1 ? 'hidden' : 'visible';
    nextBtn.innerHTML = n === TOTAL_STEPS
      ? 'Envoyer ma demande&nbsp;<i class="fas fa-paper-plane"></i>'
      : 'Continuer&nbsp;<i class="fas fa-arrow-right"></i>';
    nextBtn.disabled = false;

    currentStep = n;
    if (n === 3 && materialsData.length) renderMaterials();
    if (n === 4) buildRecap();

    document.getElementById('resa-wizard').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  /* ============================================================
     VALIDATION
     ============================================================ */
  function validateStep(n) {
    if (n === 1) {
      if (!selectedDates.length) {
        document.getElementById('resa-date-error').style.display = 'flex';
        return false;
      }
      if (selectedTimeType === 'hours' && !selectedHours.length) {
        document.getElementById('res-hours-error').style.display = 'block';
        document.getElementById('res-hours-section').scrollIntoView({ behavior:'smooth', block:'nearest' });
        return false;
      }
      return true;
    }
    if (n === 2) {
      var email = document.getElementById('r-email').value.trim();
      var type  = document.getElementById('r-type').value;
      var nb    = document.getElementById('r-nb').value;
      ['r-email','r-type','r-nb'].forEach(function (id) {
        document.getElementById(id).style.borderColor = '';
      });
      var ok = true;
      if (!email || !email.includes('@')) { document.getElementById('r-email').style.borderColor = '#e53e3e'; ok = false; }
      if (!type)                           { document.getElementById('r-type').style.borderColor  = '#e53e3e'; ok = false; }
      if (!nb || parseInt(nb) < 1)         { document.getElementById('r-nb').style.borderColor    = '#e53e3e'; ok = false; }
      document.getElementById('step2-error').style.display = ok ? 'none' : 'flex';
      return ok;
    }
    return true;
  }

  document.getElementById('step-next').addEventListener('click', function () {
    if (!validateStep(currentStep)) return;
    if (currentStep === TOTAL_STEPS) submitForm();
    else goToStep(currentStep + 1);
  });

  document.getElementById('step-prev').addEventListener('click', function () {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  ['r-email','r-type','r-nb'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () {
      this.style.borderColor = '';
      document.getElementById('step2-error').style.display = 'none';
    });
  });

  /* ============================================================
     RÉCAPITULATIF
     ============================================================ */
  function buildRecap() {
    /* Dates */
    var dateDisplay;
    if (selectedDates.length === 1) {
      var d = new Date(selectedDates[0] + 'T00:00:00');
      dateDisplay = capitalise(DAYS_FR[d.getDay()]) + ' ' + d.getDate() + ' ' +
                   MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    } else {
      dateDisplay = selectedDates.map(function (ds) {
        var d = new Date(ds + 'T00:00:00');
        return DAYS_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
      }).join('  ·  ') + '  (' + selectedDates.length + ' jours)';
    }
    document.getElementById('recap-date').textContent = dateDisplay;

    /* Créneau */
    document.getElementById('recap-creneau').textContent = selectedTimeType === 'full'
      ? 'Toute la journée'
      : selectedHours.slice().sort().join(' — ');

    document.getElementById('recap-email').textContent =
      document.getElementById('r-email').value.trim();

    var phone = document.getElementById('r-phone').value.trim();
    var phoneRow = document.getElementById('recap-phone-row');
    if (phone) { document.getElementById('recap-phone').textContent = phone; phoneRow.style.display = 'flex'; }
    else phoneRow.style.display = 'none';

    document.getElementById('recap-type').textContent =
      EVENT_LABELS[document.getElementById('r-type').value] || '-';
    document.getElementById('recap-nb').textContent =
      document.getElementById('r-nb').value + ' personne(s)';

    var checked = document.querySelectorAll('.mat-checkbox:checked');
    document.getElementById('recap-mat').textContent = checked.length
      ? Array.from(checked).map(function (cb) {
          return cb.dataset.name + ' × ' + document.getElementById('qty-' + cb.dataset.id).textContent;
        }).join(', ')
      : 'Aucun matériel sélectionné';
  }

  /* ============================================================
     SOUMISSION
     ============================================================ */
  async function submitForm() {
    var btn = document.getElementById('step-next');

    var rawMsg  = document.getElementById('r-message').value.trim();
    var message = rawMsg;
    if (selectedTimeType === 'hours' && selectedHours.length) {
      var hoursLine = 'Créneaux demandés : ' + selectedHours.slice().sort().join(', ');
      message = rawMsg ? hoursLine + '\n\n' + rawMsg : hoursLine;
    }

    var mats = [];
    document.querySelectorAll('.mat-checkbox:checked').forEach(function (cb) {
      mats.push({ id: cb.dataset.id, name: cb.dataset.name,
                  quantity: parseInt(document.getElementById('qty-' + cb.dataset.id).textContent) });
    });

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>&nbsp;Envoi en cours…';
    btn.disabled  = true;
    document.getElementById('step4-error').style.display = 'none';

    try {
      var ins = await db.from('reservations').insert({
        email:      document.getElementById('r-email').value.trim(),
        phone:      document.getElementById('r-phone').value.trim() || null,
        date:       selectedDates[0],
        dates:      selectedDates,               // tableau complet
        event_type: document.getElementById('r-type').value,
        nb_persons: parseInt(document.getElementById('r-nb').value),
        materials:  mats,
        message:    message || null,
        status:     'pending'
      });
      if (ins.error) throw ins.error;

      document.getElementById('resa-wizard').style.display  = 'none';
      document.getElementById('resa-success').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      btn.innerHTML = 'Envoyer ma demande&nbsp;<i class="fas fa-paper-plane"></i>';
      btn.disabled  = false;
      document.getElementById('step4-error').style.display = 'flex';
      console.error(err);
    }
  }

  /* ============================================================
     MATÉRIAUX
     ============================================================ */
  async function loadMaterials() {
    var grid   = document.getElementById('materials-grid');
    var loader = document.getElementById('materials-loader');
    try {
      var res = await db.from('materials').select('*').eq('available', true).order('category');
      materialsData = res.data || [];
    } catch (e) { materialsData = []; }
    loader.style.display = 'none';
    if (!materialsData.length) {
      grid.innerHTML = '<p class="no-mat-msg"><i class="fas fa-info-circle mr-2"></i>Aucun matériel disponible.</p>';
      return;
    }
    renderMaterials();
  }

  function renderMaterials() {
    var grid = document.getElementById('materials-grid');
    var cats = {};
    materialsData.forEach(function (m) {
      var cat = m.category || 'Autre';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(m);
    });

    var html = '';
    Object.keys(cats).forEach(function (cat) {
      html += '<div class="mat-category"><h6 class="mat-cat-label">' + cat + '</h6><div class="mat-grid">';
      cats[cat].forEach(function (m) {
        var avail   = getAvailable(m);
        var unavail = avail <= 0;
        html +=
          '<div class="mat-card' + (unavail ? ' mat-card-unavail' : '') + '" id="mat-wrap-' + m.id + '">' +
            (m.image_url
              ? '<div class="mat-card-img"><img src="' + escHtml(m.image_url) + '" alt="' + escHtml(m.name) + '">' +
                (unavail ? '<div class="mat-unavail-overlay"><i class="fas fa-ban"></i> Indisponible</div>' : '') +
                '</div>'
              : '<div class="mat-card-img mat-card-img-empty">' +
                (unavail ? '<div class="mat-unavail-overlay"><i class="fas fa-ban"></i> Indisponible</div>' : '<i class="fas fa-image"></i>') +
                '</div>') +
            '<div class="mat-card-body">' +
              '<label class="mat-check-label' + (unavail ? ' mat-check-disabled' : '') + '">' +
                '<input type="checkbox" class="mat-checkbox"' +
                ' data-id="' + m.id + '" data-name="' + escHtml(m.name) + '" data-max="' + avail + '"' +
                (unavail ? ' disabled' : '') + '>' +
                '<div><span class="mat-name">' + escHtml(m.name) + '</span>' +
                (m.description ? '<span class="mat-desc">' + escHtml(m.description) + '</span>' : '') + '</div>' +
              '</label>' +
              '<div class="mat-stock-row">' +
                (unavail
                  ? '<span class="mat-stock-badge mat-stock-out"><i class="fas fa-times-circle"></i> Épuisé pour ces jours</span>'
                  : '<span class="mat-stock-badge mat-stock-ok"><i class="fas fa-check-circle"></i> ' + avail + ' disponible' + (avail > 1 ? 's' : '') + '</span>') +
              '</div>' +
              '<div class="mat-qty-wrap" id="qty-wrap-' + m.id + '" style="display:none;">' +
                '<button type="button" class="qty-btn" data-action="minus" data-id="' + m.id + '">−</button>' +
                '<span class="qty-val" id="qty-' + m.id + '">1</span>' +
                '<button type="button" class="qty-btn" data-action="plus" data-id="' + m.id + '" data-max="' + avail + '">+</button>' +
                '<span class="qty-max">/ ' + avail + '</span>' +
              '</div>' +
            '</div>' +
          '</div>';
      });
      html += '</div></div>';
    });
    grid.innerHTML = html;

    grid.querySelectorAll('.mat-checkbox').forEach(function (cb) {
      cb.addEventListener('change', function () {
        document.getElementById('qty-wrap-' + this.dataset.id).style.display = this.checked ? 'flex' : 'none';
        document.getElementById('mat-wrap-' + this.dataset.id).classList.toggle('mat-card-checked', this.checked);
      });
    });
    grid.querySelectorAll('.qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.dataset.id, el = document.getElementById('qty-' + id);
        var val = parseInt(el.textContent), max = parseInt(this.dataset.max || 999);
        if (this.dataset.action === 'plus'  && val < max) el.textContent = val + 1;
        if (this.dataset.action === 'minus' && val > 1)   el.textContent = val - 1;
      });
    });
  }

  /* ============================================================
     HELPERS
     ============================================================ */
  function fmtDate(d) {
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2,'0') + '-' +
           String(d.getDate()).padStart(2,'0');
  }
  function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ============================================================
     INIT
     ============================================================ */
  loadBlockedData();
  loadMaterials();

})();
