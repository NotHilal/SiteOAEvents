/* =====================================================
   OA Événementiel — app.js
   ===================================================== */

jQuery(document).ready(function ($) {
  "use strict";

  /* ===== PRELOADER ===== */
  $(window).on("load", function () {
    setTimeout(function () {
      $("#overlayer, .loader").fadeOut("slow");
    }, 700);
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
      autoplayTimeout: 6500,
      autoplayHoverPause: false,
      smartSpeed: 1300,
      animateOut: "fadeOut",
      animateIn: "fadeIn",
      nav: false,
      dots: true,
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

  /* ===== GALLERY FILTER (galerie.html) ===== */
  if ($(".gallery-filter").length) {
    // Show all on load
    $(".gallery-full-item").addClass("show");

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
    var $btn = $(this).find('[type="submit"]');
    var origText = $btn.text();
    $btn.text("Envoi en cours…").prop("disabled", true);

    // Placeholder — à connecter au backend
    setTimeout(function () {
      $btn
        .text("✓ Message envoyé !")
        .addClass("btn-success")
        .css("background", "#4caf50");
    }, 1500);
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
