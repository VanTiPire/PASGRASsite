/* Flipbook (turn.js) setup: arrows, keyboard, turn events, loading turn.js itself. */
function loadApp() {

  var flipbook = $('.sj-book');

  // Check if the CSS was already loaded
  if (flipbook.width() == 0 || flipbook.height() == 0) {
    setTimeout(loadApp, 10);
    return;
  }

  populateStaticPages();

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
    pages: 8,
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
          $('.sj-book .p9').addClass('fixed');
        else
          $('.sj-book .p9').removeClass('fixed');

      },

      turned: function (e, page, view) {

        var book = $(this);

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
