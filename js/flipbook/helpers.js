/* ===========================================================
   UPDATE BOOK DEPTH
=========================================================== */

function updateDepth(book, newPage) {

	var page = book.turn('page'),
		pages = book.turn('pages'),
		depthWidth = 16 * Math.min(1, page * 2 / pages);

	newPage = newPage || page;

	if (newPage > 3)

		$('.sj-book .p2 .depth').css({
			width: depthWidth,
			left: 20 - depthWidth
		});

	else

		$('.sj-book .p2 .depth').css({
			width: 0
		});


	depthWidth = 16 * Math.min(1, (pages - page) * 2 / pages);


	if (newPage < pages - 3)

		$('.sj-book .p23 .depth').css({
			width: depthWidth,
			right: 20 - depthWidth
		});

	else

		$('.sj-book .p23 .depth').css({
			width: 0
		});

}



/* ===========================================================
   CHROME DETECTION
=========================================================== */

function isChrome() {

	// Chrome's unsolved bug
	// http://code.google.com/p/chromium/issues/detail?id=128488

	return navigator.userAgent.indexOf('Chrome') != -1;

}