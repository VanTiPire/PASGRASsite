/* ===========================================================
   CREATE IMAGE
=========================================================== */

function createPageImage(image, imageClass, title) {

	if (!image)
		return null;

	var picClass = imageClass || 'center-pic';

	var $pic = $('<p />', {
		'class': picClass
	});

	$('<img />', {
		src: image,
		alt: title || ''
	}).appendTo($pic);

	return $pic;
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


		var $content = $('<div />', {
			'class': 'book-content'
		});


		/* -------------------------
		   TITLE
		------------------------- */

		if (data.title) {

			$('<h2 />')
				.text(data.title)
				.appendTo($content);

		}


		/* -------------------------
		   IMAGE 1
		------------------------- */

		var $image1 = createPageImage(
			data.image1,
			data.imageClass1,
			data.title
		);

		if ($image1)
			$image1.appendTo($content);


		/* -------------------------
		   TEXT
		------------------------- */

		if (data.text) {

			data.text.forEach(function (text) {

				$('<p />')
					.text(text)
					.appendTo($content);

			});

		}


		/* -------------------------
		   IMAGE 2
		------------------------- */

		var $image2 = createPageImage(
			data.image2,
			data.imageClass2,
			data.title
		);

		if ($image2)
			$image2.appendTo($content);


		/* -------------------------
		   ADD CONTENT
		------------------------- */

		$target.append($content);

	});

}


/* ===========================================================
   BUILD PAGE ELEMENT
=========================================================== */

function buildPageElement(page) {

	var data = pageContent[page];

	var $content = $('<div />', {
		'class': 'book-content'
	});


	/* -------------------------
	   EMPTY PAGE
	------------------------- */

	if (!data) {

		return $('<div />', {
			'class': 'own-size'
		}).append($content);

	}


	/* -------------------------
	   TITLE
	------------------------- */

	if (data.title) {

		$('<h2 />')
			.text(data.title)
			.appendTo($content);

	}


	/* -------------------------
	   IMAGE 1
	------------------------- */

	var $image1 = createPageImage(
		data.image1,
		data.imageClass1,
		data.title
	);

	if ($image1)
		$image1.appendTo($content);


	/* -------------------------
	   TEXT
	------------------------- */

	if (data.text) {

		data.text.forEach(function (text) {

			$('<p />')
				.text(text)
				.appendTo($content);

		});

	}


	/* -------------------------
	   IMAGE 2
	------------------------- */

	var $image2 = createPageImage(
		data.image2,
		data.imageClass2,
		data.title
	);

	if ($image2)
		$image2.appendTo($content);


	/* -------------------------
	   RETURN PAGE
	------------------------- */

	return $('<div />', {
		'class': 'own-size'
	}).append($content);

}


/* ===========================================================
   ADD PAGE
=========================================================== */

function addPage(page, book) {

	var pages = book.turn('pages');

	if (!book.turn('hasPage', page)) {

		var element = buildPageElement(page);

		book.turn('addPage', element, page);

	}

}
