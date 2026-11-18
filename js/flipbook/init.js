/* Flipbook (turn.js) setup: arrows, keyboard, turn events, loading turn.js itself. */
function loadApp() {

  var flipbook = $('.sj-book');

  // Check if the CSS was already loaded
  if (flipbook.width() == 0 || flipbook.height() == 0) {
    setTimeout(loadApp, 10);
    return;
  }

  populateStaticPages();
  fitSpecialPages();
  checkPagesOverflow();

  // Prev / Next buttons
  // Scoped to .flipbook-wrap: the Módulos carousel's own prev/next
  // buttons reuse the .flip-nav--prev/--next classes for styling
  // (see the note in style.css) but must stay untouched by this
  // script. An unscoped $('.flip-nav--prev'/'--next') selector
  // matches both pairs, so updateNavButtons() below was disabling
  // the module's "next" button too as soon as the flipbook reached
  // its last page — the button stayed disabled from then on, even
  // while browsing module cards, since nothing about the module
  // carousel would ever re-enable it.
  var $prevBtn = $('.flipbook-wrap .flip-nav--prev'),
    $nextBtn = $('.flipbook-wrap .flip-nav--next');

  // `targetPage` is optional: the 'turning' event passes the page the
  // book is ABOUT to turn to, so the arrows react the instant the
  // turn starts instead of waiting for the flip animation to end
  // ('turned'). Without it, the book's current page is used.
  function updateNavButtons(targetPage) {

    var page = targetPage || flipbook.turn('page'),
      pages = flipbook.turn('pages'),
      view = flipbook.turn('view', page);

    // The back cover (last page) is reachable: once the spread that
    // contains it is showing there's nothing left to turn to.
    var locked = !!window.flipbookLocked;
    $prevBtn.prop('disabled', locked || page <= 1);
    $nextBtn.prop('disabled', locked || Math.max.apply(null, view) >= pages);

  }

  // Re-enable the arrows once the hands have finished translating.
  document.addEventListener('flipbook:unlocked', function () {
    updateNavButtons();
  });

  $prevBtn.on('click', function () {
    if (window.flipbookLocked) return;
    flipbook.turn('previous');
  });

  $nextBtn.on('click', function () {
    if (window.flipbookLocked) return;
    flipbook.turn('next');
  });

  // Arrows
  $(document).keydown(function (e) {

    var previous = 37, next = 39;

    if (window.flipbookLocked) return;

    switch (e.keyCode) {
      case previous:
        $('.sj-book').turn('previous');
        break;
      case next:
        $('.sj-book').turn('next');
        break;
    }

  });

  // ---- Index ----------------------------------------------------------
  // The index entries only work while THEIR page is one of the pages being
  // shown. turn.js keeps the other pages stacked underneath the visible ones,
  // and document.elementsFromPoint() returns those hidden elements too, so we
  // always check the page of the entry against the current view.

  // number of the book page an element belongs to (turn.js gives every page a "pN" class)
  function pageOf(el) {

    while (el && el !== flipbook[0]) {

      var cls = typeof el.className === 'string' ? el.className : '',
        m = /(?:^|\s)p(\d+)(?:\s|$)/.exec(cls);

      if (m)
        return parseInt(m[1], 10);

      el = el.parentNode;

    }

    return 0;
  }

  function pageIsShown(btn) {

    var view;

    try {
      view = flipbook.turn('view');
    } catch (err) {
      return false;
    }

    return view.indexOf(pageOf(btn)) !== -1;
  }

  // index entry under the pointer (even if another layer is on top of it),
  // but only an entry that is on a page currently shown
  function indexButtonAt(x, y) {

    if (!document.elementsFromPoint)
      return null;

    var stack = document.elementsFromPoint(x, y);

    for (var i = 0; i < stack.length; i++) {

      var btn = stack[i].closest ? stack[i].closest('.book-index button') : null;

      if (btn && flipbook[0].contains(btn) && pageIsShown(btn))
        return btn;

    }

    return null;
  }

  function goToIndexPage(btn) {

    var target = parseInt(btn.getAttribute('data-page'), 10);

    if (target && target !== flipbook.turn('page'))
      flipbook.turn('page', target);

  }

  // stopPropagation so turn.js doesn't treat the click as a page-turn gesture
  flipbook.on('mousedown touchstart touchend', '.book-index button', function (e) {
    e.stopPropagation();
  });

  // normal case: the click lands on the button itself
  flipbook.on('click', '.book-index button', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (window.flipbookLocked || !pageIsShown(this)) return;
    goToIndexPage(this);
  });

  // fallback: on the hard page (2) a turn.js layer can sit on top of the entries
  // and swallow the click (capture phase, before anything else)
  document.addEventListener('click', function (e) {

    if (window.flipbookLocked)
      return;

    // the click landed on the button itself: handled above
    if (e.target.closest && e.target.closest('.book-index button'))
      return;

    var btn = indexButtonAt(e.clientX, e.clientY);

    if (!btn)
      return;

    e.preventDefault();
    e.stopPropagation();
    goToIndexPage(btn);

  }, true);

  // hover effect + mouse cursor, same idea: find the entry under the pointer,
  // give it `is-hover` and switch the cursor through `.index-hover` on the book
  var hoverBtn = null, hoverRaf = 0, hoverX = 0, hoverY = 0;

  function updateIndexHover() {

    hoverRaf = 0;

    var btn = window.flipbookLocked ? null : indexButtonAt(hoverX, hoverY);

    if (btn !== hoverBtn) {
      if (hoverBtn) hoverBtn.classList.remove('is-hover');
      if (btn) btn.classList.add('is-hover');
      hoverBtn = btn;
      flipbook.toggleClass('index-hover', !!btn);
    }

  }

  document.addEventListener('mousemove', function (e) {
    hoverX = e.clientX;
    hoverY = e.clientY;
    if (!hoverRaf) hoverRaf = requestAnimationFrame(updateIndexHover);
  }, true);

  // Links externos dentro das páginas: abrem normalmente, sem virar a página.
  flipbook.on('click mousedown touchstart touchend', 'a.book-link', function (e) {
    e.stopPropagation();
  });

  // If the pointer leaves the browser window while a corner is curled, no
  // more mousemove events arrive and the curl would stay open: close it.
  document.documentElement.addEventListener('mouseleave', function () {

    var pages = flipbook.data().pages || {};

    $.each(pages, function (n, p) {

      var d = p.data().f;

      if (d && d.status == 'hover') {
        d.status = '';
        p.flip('hideFoldedPage', true);
      }

    });

  });

  // Flipbook
  flipbook.bind(($.isTouch) ? 'touchend' : 'click', zoomHandle);

  flipbook.turn({
    width: 1420,
    height: 520,
    elevation: 50,
    acceleration: !isChrome(),
    autoCenter: true,
    gradients: true,
    duration: 1000,
    pages: TOTAL_PAGES,
    when: {
      turning: function (e, page, view) {

        // Hands still translating: block every kind of turn.
        if (window.flipbookLocked) {
          e.preventDefault();
          return;
        }

        // Update the arrows immediately, as the turn starts.
        updateNavButtons(page);

        var book = $(this),
          currentPage = book.turn('page'),
          pages = book.turn('pages');

        if (currentPage > 3 && currentPage < pages - 3) {

          if (page == 1) {
            book.turn('page', 2).turn('stop').turn('page', page);
            e.preventDefault();
            return;
          } else if (page == pages) {
            book.turn('page', pages - 1).turn('stop').turn('page', page);
            e.preventDefault();
            return;
          }
        } else if (page > 3 && page < pages - 3) {
          if (currentPage == 1) {
            book.turn('page', 2).turn('stop').turn('page', page);
            e.preventDefault();
            return;
          } else if (currentPage == pages) {
            book.turn('page', pages - 1).turn('stop').turn('page', page);
            e.preventDefault();
            return;
          }
        }

        updateDepth(book, page);

        if (page >= 2)
          $('.sj-book .p2').addClass('fixed');
        else
          $('.sj-book .p2').removeClass('fixed');

        if (page < book.turn('pages'))
          $('.sj-book .p23').addClass('fixed');
        else
          $('.sj-book .p23').removeClass('fixed');

      },

      turned: function (e, page, view) {

        var book = $(this);

        // the pointer may now be over a different page: refresh the index hover
        updateIndexHover();

        if (page == 2 || page == 3) {
          book.turn('peel', 'br');
        }

        updateDepth(book);

        book.turn('center');

        updateNavButtons();

      },

      start: function (e, pageObj, corner) {

        // Hands still translating: no dragging / peeling either.
        if (window.flipbookLocked) {
          e.preventDefault();
          return;
        }

      },

      end: function (e, pageObj) {

        var book = $(this);

        updateDepth(book);

      },

      missing: function (e, pages) {

        for (var i = 0; i < pages.length; i++) {
          addPage(pages[i], $(this));
        }

      }
    }
  });

  flipbook.addClass('animated');

  updateNavButtons();

  // Show canvas
  $('#canvas').css({ visibility: '' });
}

// Hide canvas
$('#canvas').css({ visibility: 'hidden' });

// Load turn.js
yepnope({
  test: Modernizr.csstransforms,
  yep: ['lib/turn.min.js'],
  nope: ['lib/turn.html4.min.js', 'css/flip-html4.css'],
  both: ['css/flip.css'],
  complete: loadApp
});