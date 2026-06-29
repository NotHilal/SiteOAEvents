/* =====================================================
   OA Événementiel — app.js
   ===================================================== */

jQuery(document).ready(function ($) {
  "use strict";

  /* ===== JS-LOADED CLASS (enables image animations) ===== */
  $("body").addClass("js-loaded");

  /* ===== PRELOADER ===== */
  function hidePreloader() {
    $("#overlayer, .loader").fadeOut("slow");
    AOS.refresh();
  }

  // Fallback : masque le preloader après 2.5s max (images lentes ou bloquées)
  var preloaderTimeout = setTimeout(hidePreloader, 2500);

  $(window).on("load", function () {
    clearTimeout(preloaderTimeout);
    setTimeout(hidePreloader, 300);
  });

  /* ===== MOBILE MENU — clone desktop nav ===== */
  $(".js-clone-nav").each(function () {
    $(this).clone().attr("class", "site-nav-wrap").appendTo(".site-mobile-menu-body");
  });

  /* Open / Close mobile menu */
  $("body").on("click", ".js-menu-toggle", function (e) {
    e.preventDefault();
    if ($("body").hasClass("offcanvas-menu")) {
      $("body").removeClass("offcanvas-menu");
    } else {
      $("body").addClass("offcanvas-menu");
    }
  });

  /* Close on backdrop click */
  $(document).on("mouseup", function (e) {
    var menu = $(".site-mobile-menu");
    if (!menu.is(e.target) && menu.has(e.target).length === 0) {
      $("body").removeClass("offcanvas-menu");
    }
  });

  /* ===== STICKY NAVBAR ===== */
  $(window).on("scroll", function () {
    if ($(this).scrollTop() > 80) {
      $(".js-site-navbar").addClass("scrolled");
    } else {
      $(".js-site-navbar").removeClass("scrolled");
    }
  });

  /* ===== HERO SLIDER ===== */
  if ($(".hero-slider").length) {
    $(".hero-slider").owlCarousel({
      items: 1,
      loop: true,
      autoplay: true,
      autoplayTimeout: 5000,
      autoplayHoverPause: false,
      smartSpeed: 1300,
      animateOut: "fadeOut",
      animateIn: "fadeIn",
      nav: false,
      dots: true,
      mouseDrag: false,
      touchDrag: false,
      pullDrag: false,
    });

    // Réinitialise le timer après un clic sur une flèche
    $("#heroPrev").on("click", function () {
      $(".hero-slider").trigger("prev.owl.carousel");
      var owl = $(".hero-slider").data("owl.carousel");
      owl.stop(); owl.play();
    });
    $("#heroNext").on("click", function () {
      $(".hero-slider").trigger("next.owl.carousel");
      var owl = $(".hero-slider").data("owl.carousel");
      owl.stop(); owl.play();
    });
  }

  /* ===== TESTIMONIALS CAROUSEL ===== */
  if ($(".testimonials-carousel").length) {
    $(".testimonials-carousel").owlCarousel({
      items: 1,
      loop: true,
      autoplay: true,
      autoplayTimeout: 5500,
      smartSpeed: 850,
      margin: 28,
      nav: true,
      dots: true,
      navText: [
        '<i class="fas fa-chevron-left"></i>',
        '<i class="fas fa-chevron-right"></i>',
      ],
      responsive: {
        768: { items: 2 },
      },
    });
  }

  /* ===== MAGNIFIC POPUP GALLERY ===== */
  if ($(".gallery-link").length) {
    $(".gallery-grid, .gallery-full-grid").magnificPopup({
      delegate: ".gallery-link",
      type: "image",
      gallery: {
        enabled: true,
        navigateByImgClick: true,
        preload: [0, 1],
      },
      image: {
        titleSrc: function (item) {
          return item.el.find(".gallery-overlay span, .gallery-caption").text();
        },
      },
    });
  }

  /* ===== GALLERY FILTER (galerie.html) ===== */
  // Les items doivent être display:block AVANT AOS.init
  // sinon AOS ne les détecte pas (ils sont display:none par défaut)
  if ($(".gallery-filter").length) {
    $(".gallery-full-item").addClass("show");
  }

  /* ===== AOS INIT ===== */
  AOS.init({
    duration: 820,
    easing: "ease-in-out",
    once: true,
    offset: 55,
  });

  /* ===== STATS COUNTER ===== */
  var counted = false;

  function runCounters() {
    $(".counter").each(function () {
      var $el = $(this);
      var target = parseInt($el.data("target")) || 0;
      $({ n: 0 }).animate(
        { n: target },
        {
          duration: 2600,
          easing: "swing",
          step: function () {
            $el.text(Math.ceil(this.n));
          },
          complete: function () {
            $el.text(target);
          },
        }
      );
    });
  }

  $(window).on("scroll.counter", function () {
    var $stats = $(".section-stats");
    if (!$stats.length || counted) return;

    if ($(window).scrollTop() + $(window).height() > $stats.offset().top + 60) {
      counted = true;
      runCounters();
      $(window).off("scroll.counter");
    }
  });

  /* ===== GALLERY FILTER — boutons (galerie.html) ===== */
  if ($(".gallery-filter").length) {
    $(".gallery-filter button").on("click", function () {
      $(".gallery-filter button").removeClass("active");
      $(this).addClass("active");

      var filter = $(this).data("filter");

      if (filter === "all") {
        $(".gallery-full-item").fadeIn(300).addClass("show");
      } else {
        $(".gallery-full-item").hide().removeClass("show");
        $(".gallery-full-item[data-cat='" + filter + "']")
          .fadeIn(300)
          .addClass("show");
      }
    });
  }

  /* ===== CONTACT FORM ===== */
  $("#contact-form").on("submit", function (e) {
    e.preventDefault();
    var $form = $(this);
    var $btn  = $form.find('[type="submit"]');

    // --- Validation des champs requis ---
    var isValid = true;
    $form.find("[required]").each(function () {
      if (!$(this).val().trim()) {
        isValid = false;
        $(this).css("border-color", "#e53e3e");
      } else {
        $(this).css("border-color", "");
      }
    });
    if (!isValid) {
      $btn.html('<i class="fas fa-exclamation-circle mr-2"></i>Veuillez remplir les champs obligatoires');
      setTimeout(function () {
        $btn.html('<i class="fas fa-paper-plane mr-2"></i>Envoyer ma demande').prop("disabled", false);
      }, 2500);
      return;
    }

    $btn.html('<i class="fas fa-circle-notch fa-spin mr-2"></i>Envoi en cours…').prop("disabled", true);

    // --- Envoi vers Web3Forms ---
    var payload = {
      access_key        : "380ad0e4-4abc-4a00-81d1-d81067d54129",
      subject           : "🌹 Nouvelle demande de devis — OA Événementiel",
      from_name         : "OA Événementiel - Site Web",
      "Prénom"          : $("#prenom").val(),
      "Nom"             : $("#nom").val(),
      "Email"           : $("#email").val(),
      "Téléphone"       : $("#telephone").val(),
      "Type d'événement": $("#type-evenement").val(),
      "Message"         : $("#message").val()
    };

    fetch("https://api.web3forms.com/submit", {
      method  : "POST",
      headers : { "Content-Type": "application/json", "Accept": "application/json" },
      body    : JSON.stringify(payload)
    })
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (result.success === true) {
        /* ── Sauvegarde dans Supabase (capture AVANT reset) ── */
        var contactData = {
          prenom        : $("#prenom").val().trim(),
          nom           : $("#nom").val().trim(),
          email         : $("#email").val().trim(),
          telephone     : $("#telephone").val().trim() || null,
          type_evenement: $("#type-evenement").val() || null,
          message       : $("#message").val().trim(),
          read          : false
        };
        if (typeof db !== "undefined") {
          db.from("contacts").insert(contactData).then(function(res) {
            if (res.error) console.error("[OA] Supabase contacts insert error:", res.error);
            else           console.log("[OA] Contact sauvegardé en DB.");
          });
        } else {
          console.warn("[OA] db non défini — supabase-config.js chargé ?");
        }
        $btn
          .html('<i class="fas fa-check mr-2"></i>Message envoyé !')
          .css({ "background": "#4caf50", "border-color": "#4caf50" });
        $form[0].reset();
      } else {
        throw new Error("Échec Web3Forms");
      }
    })
    .catch(function () {
      $btn
        .html('<i class="fas fa-exclamation-triangle mr-2"></i>Erreur — réessayez')
        .css({ "background": "#e53e3e", "border-color": "#e53e3e" })
        .prop("disabled", false);
    });
  });

  /* ===== SMOOTH SCROLL (ancres) ===== */
  $("a[href^='#']").on("click", function (e) {
    var target = $(this.getAttribute("href"));
    if (target.length) {
      e.preventDefault();
      $("html, body").animate({ scrollTop: target.offset().top - 80 }, 620);
    }
  });
});
