/* NOTE: only used for images carrying the .zoom-this class; none of the current pages use it. */

/* ===========================================================
   ZOOM HANDLE
=========================================================== */

function zoomHandle(e) {

	if ($('.sj-book').data().zoomIn)

		zoomOut();

	else if (
		e.target &&
		$(e.target).hasClass('zoom-this')
	)

		zoomThis($(e.target));

}


/* ===========================================================
   ZOOM THIS
=========================================================== */

function zoomThis(pic) {

	var position,
		translate,

		tmpContainer = $('<div />', {
			'class': 'zoom-pic'
		}),

		transitionEnd = $.cssTransitionEnd(),

		tmpPic = $('<img />'),

		zCenterX = $('#book-zoom').width() / 2,

		zCenterY = $('#book-zoom').height() / 2,

		bookPos = $('#book-zoom').offset(),

		picPos = {

			left:
				pic.offset().left -
				bookPos.left,

			top:
				pic.offset().top -
				bookPos.top

		},


		completeTransition = function () {

			$('#book-zoom').unbind(
				transitionEnd
			);


			if ($('.sj-book').data().zoomIn) {

				tmpContainer.appendTo(
					$('body')
				);


				$('body').css({
					'overflow': 'hidden'
				});


				tmpPic.css({

					margin:
						position.top +
						'px ' +
						position.left +
						'px'

				})
					.appendTo(tmpContainer)
					.fadeOut(0)
					.fadeIn(500);

			}

		};


	$('.sj-book').data().zoomIn = true;


	$('.sj-book').turn(
		'disable',
		true
	);


	$(window).resize(zoomOut);


	tmpContainer.click(zoomOut);


	tmpPic.load(function () {

		var realWidth = $(this)[0].width,

			realHeight = $(this)[0].height,

			zoomFactor =
				realWidth /
				pic.width(),


			picPosition = {

				top:
					(picPos.top - zCenterY) *
					zoomFactor +
					zCenterY +
					bookPos.top,

				left:
					(picPos.left - zCenterX) *
					zoomFactor +
					zCenterX +
					bookPos.left

			};


		position = {

			top:
				($(window).height() -
					realHeight) / 2,

			left:
				($(window).width() -
					realWidth) / 2

		};


		translate = {

			top:
				position.top -
				picPosition.top,

			left:
				position.left -
				picPosition.left

		};


		$('.samples .bar').css({
			visibility: 'hidden'
		});


		$('#book-zoom').transform(

			'translate(' +
			translate.left +
			'px, ' +
			translate.top +
			'px)' +

			'scale(' +
			zoomFactor +
			', ' +
			zoomFactor +
			')'

		);


		if (transitionEnd)

			$('#book-zoom').bind(
				transitionEnd,
				completeTransition
			);

		else

			setTimeout(
				completeTransition,
				1000
			);

	});


	tmpPic.attr(
		'src',
		pic.attr('src')
	);

}


/* ===========================================================
   ZOOM OUT
=========================================================== */

function zoomOut() {

	var transitionEnd =
		$.cssTransitionEnd(),


		completeTransition = function (e) {

			$('#book-zoom').unbind(
				transitionEnd
			);


			$('.sj-book').turn(
				'disable',
				false
			);


			$('body').css({
				'overflow': 'auto'
			});

		};


	$('.sj-book').data().zoomIn = false;


	$(window).unbind(
		'resize',
		zoomOut
	);


	$('.zoom-pic').remove();


	$('#book-zoom').transform(
		'scale(1, 1)'
	);


	$('.samples .bar').css({
		visibility: 'visible'
	});


	if (transitionEnd)

		$('#book-zoom').bind(
			transitionEnd,
			completeTransition
		);

	else

		setTimeout(
			completeTransition,
			1000
		);

}
