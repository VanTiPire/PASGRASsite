/* ===========================================================
   CREATE IMAGE
=========================================================== */

function createPageImage(image, imageClass, title, imgWidth) {

	if (!image)
		return null;

	var picClass = imageClass || 'center-pic';

	var $pic = $('<p />', {
		'class': picClass
	});

	var $img = $('<img />', {
		src: image,
		alt: title || ''
	}).appendTo($pic);

	if (imgWidth)
		$img.css('max-width', imgWidth);

	return $pic;
}


/* ===========================================================
   CREATE INDEX LIST
   Each entry is a <button> carrying data-page (resolved from the
   page id in `to`); the click handler in init.js turns the book to
   that page. Not an <a href="#">: the site's own anchor/scroll
   handlers would pick that up.
=========================================================== */

function createIndexList(links) {

	if (!links || !links.length)
		return null;

	var $ul = $('<ul />', {
		'class': 'book-index'
	});

	links.forEach(function (item) {

		// subtitle between index entries (not clickable)
		if (item.heading) {
			$('<li />', { 'class': 'book-index__heading' })
				.text(item.heading)
				.appendTo($ul);
			return;
		}

		var pageNum = pageIds[item.to];

		if (!pageNum)
			return;

		var $btn = $('<button />', {
			type: 'button',
			'data-page': pageNum
		});

		$('<span />', { 'class': 'book-index__label' })
			.text(item.label)
			.appendTo($btn);

		$('<span />', { 'class': 'book-index__dots' })
			.appendTo($btn);

		$('<span />', { 'class': 'book-index__num' })
			.text(pageNum)
			.appendTo($btn);

		$('<li />', { 'class': item.sub ? 'book-index__sub' : '' }).append($btn).appendTo($ul);

	});

	return $ul;
}


/* ===========================================================
   BUILD PAGE CONTENT (shared by static + dynamic pages)
=========================================================== */

function buildBookContent(data, pageNum) {

	var classes = ['book-content'];

	if (data) {
		if (data.fs) classes.push('fs-' + data.fs);
		if (data.cls) classes.push(data.cls);
	}

	var $content = $('<div />', {
		'class': classes.join(' ')
	});

	if (!data)
		return $content;


	/* TITLE */

	if (data.title) {

		var $h2 = $('<h2 />', {
			'class': (data.titleSize === 'big' ? '' : 'title-small') +
				(data.titleOneLine ? ' title-oneline' : '') +
				(data.titleTight ? ' title-tight' : '')
		});

		// "\n" in the title = line break
		data.title.split('\n').forEach(function (line, i) {

			if (i)
				$h2.append('<br>');

			$h2.append(document.createTextNode(line));

		});

		$h2.appendTo($content);

	}


	/* IMAGE 1 */

	var $image1 = createPageImage(
		data.image1,
		data.imageClass1,
		data.title,
		data.imgWidth1 || data.imgWidth
	);

	if ($image1)
		$image1.appendTo($content);


	/* TEXT (string, or { t, cls }) */

	if (data.text) {

		data.text.forEach(function (item) {

			var isObj = typeof item === 'object';

			var $p = $('<p />', isObj && item.cls ? { 'class': item.cls } : {});

			if (isObj && item.head)
				$('<span />', { 'class': 'head' }).text(item.head).appendTo($p);

			$p.append(document.createTextNode(isObj ? item.t : item));

			if (isObj && item.link) {

				var linkAttrs = { 'class': 'book-link' };

				if (item.link.href) {
					linkAttrs.href = item.link.href;
					linkAttrs.target = '_blank';
					linkAttrs.rel = 'noopener';
				}

				$(item.link.href ? '<a />' : '<span />', linkAttrs)
					.text(item.link.text)
					.appendTo($p);

			}

			if (isObj && item.foot)
				$('<span />', { 'class': 'foot' }).text(item.foot).appendTo($p);

			$p.appendTo($content);

		});

	}


	/* INDEX LINKS */

	var $index = createIndexList(data.links);

	if ($index)
		$index.appendTo($content);


	/* IMAGE 2 */

	var $image2 = createPageImage(
		data.image2,
		data.imageClass2,
		data.title,
		data.imgWidth2 || data.imgWidth
	);

	if ($image2)
		$image2.appendTo($content);


	/* PAGE NUMBER (absolutely positioned: doesn't take part in the layout) */

	if (pageNum)
		$('<span />', { 'class': 'page-number' }).text(pageNum).appendTo($content);


	return $content;
}


/* ===========================================================
   POPULATE STATIC PAGES
=========================================================== */

function populateStaticPages() {

	var $pages = $('.sj-book').children();

	$.each(pageContent, function (pageNum, data) {

		var $target = $pages.eq(pageNum - 1);


		// Skip if page doesn't exist
		// or already contains content

		if (
			!$target.length ||
			$target.find('.book-content').length
		)
			return;


		$target.append(buildBookContent(data, parseInt(pageNum, 10)));

	});

}


/* ===========================================================
   BUILD PAGE ELEMENT
=========================================================== */

function buildPageElement(page) {

	return $('<div />', {
		'class': 'own-size'
	}).append(buildBookContent(pageContent[page], page));

}


/* ===========================================================
   ADD PAGE
=========================================================== */

function addPage(page, book) {

	if (!book.turn('hasPage', page)) {

		var element = buildPageElement(page);

		book.turn('addPage', element, page);

	}

}


/* ===========================================================
   OVERFLOW CHECK
   Pages have a fixed size and hide whatever doesn't fit. This does NOT
   change any font size: it measures every text page in an off-screen
   copy of the book and lists in the browser console the pages whose
   text is cut off (and by how many pixels). Pages with images are
   skipped (their height can't be measured before the images load).
=========================================================== */

var FIT_PAGE_HEIGHT = 462;

function contentHeight(el) {

	var last = el.lastElementChild;

	// the page number is positioned absolutely: it isn't content
	while (last && last.classList.contains('page-number'))
		last = last.previousElementSibling;

	if (!last)
		return 0;

	var top = el.getBoundingClientRect().top,
		bottom = last.getBoundingClientRect().bottom +
			(parseFloat(getComputedStyle(last).marginBottom) || 0),
		padBottom = parseFloat(getComputedStyle(el).paddingBottom) || 0;

	return bottom - top + padBottom;
}

function checkPagesOverflow() {

	var run = function () {

		var total = TOTAL_PAGES,
			overflowing = [];

		var $stage = $('<div />', { 'class': 'sj-book fit-stage' }).css({
			position: 'absolute',
			left: '-20000px',
			top: 0,
			visibility: 'hidden',
			filter: 'none'
		}).appendTo('body');

		$.each(pageContent, function (key, data) {

			var n = parseInt(key, 10);

			if (data.image1 || data.image2)
				return;

			var hard = (n === 2 || n === total - 1);

			var $page = $('<div />', {
				'class': (hard ? 'hard ' : 'own-size ') + (n % 2 ? 'odd' : 'even') + ' p' + n
			}).css({ position: 'relative' }).appendTo($stage);

			var el = buildBookContent(data).appendTo($page)[0],
				extra = Math.round(contentHeight(el) - FIT_PAGE_HEIGHT);

			if (extra > 0)
				overflowing.push('página ' + n + ' (' + data.id + '): cortada em ~' + extra + 'px');

		});

		$stage.remove();

		if (window.console)
			console[overflowing.length ? 'warn' : 'log'](
				overflowing.length
					? 'Texto que não cabe na página:\n' + overflowing.join('\n')
					: 'Todas as páginas de texto cabem.'
			);

	};

	if (document.fonts && document.fonts.load)
		document.fonts.load('22px "Daruma Drop One"').then(run, run);
	else
		run();

}


/* ===========================================================
   ONE-LINE TITLES
   Pages flagged `titleOneLine` keep their title on a single line:
   the title is measured in an off-screen copy of the page and its
   font shrinks (from the original 45px) just enough to fit the
   width. The result is stored as one CSS rule per page.
=========================================================== */

function fitSpecialPages() {

	var titlePages = [];

	$.each(pageContent, function (key, data) {

		if (data.title && data.titleOneLine)
			titlePages.push(parseInt(key, 10));

	});

	if (!titlePages.length)
		return;

	var run = function () {

		var $stage = $('<div />', { 'class': 'sj-book fit-stage' }).css({
			position: 'absolute',
			left: '-20000px',
			top: 0,
			visibility: 'hidden',
			filter: 'none'
		}).appendTo('body');

		var rules = [];

		titlePages.forEach(function (n) {

			var hard = (n === 2 || n === TOTAL_PAGES - 1);

			var $page = $('<div />', {
				'class': (hard ? 'hard ' : 'own-size ') + (n % 2 ? 'odd' : 'even') + ' p' + n
			}).css({ position: 'relative' }).appendTo($stage);

			var h2 = buildBookContent(pageContent[n]).appendTo($page).find('h2')[0],
				size = parseFloat(getComputedStyle(h2).fontSize),
				start = size;

			while (h2.scrollWidth > h2.clientWidth && size > 12) {
				size -= 1;
				h2.style.fontSize = size + 'px';
			}

			if (size !== start)
				rules.push('.sj-book .p' + n + ' .book-content h2{font-size:' + size + 'px}');

		});

		$stage.remove();

		if (rules.length)
			$('<style />', { id: 'fit-titles' }).text(rules.join('\n')).appendTo('head');

	};

	if (document.fonts && document.fonts.load)
		document.fonts.load('45px "Daruma Drop One"').then(run, run);
	else
		run();

}