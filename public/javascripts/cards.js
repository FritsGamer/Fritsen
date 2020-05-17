// eslint-disable-next-line no-unused-vars
function showDeck(nrCards) {
	var deck = $("#deck");
	deck.empty();

	nrCards /= 3;

	for (var i = 0; i < nrCards; i++) {
		var card = "<img class='card' style=\"margin-top:" + (i*0.4) + "%\" src='" + getCardsUrl() + "CR.svg'/>";
		deck.append(card);
	}
}

// eslint-disable-next-line no-unused-vars
function showPiles(piles, frits, lastmove) {
	var pilesDiv = $("#piles");
	pilesDiv.empty();

	for (let i = 0; i < piles.length; i++) {
		var pile = piles[i];
		var div = "<div id='pile" + i + "' class='cardblock pile'></div>";
		const p = $(div);

		if (pile.length > 0 || frits || i === 0) {
			p.addClass("open");
		}
		if (i == 0) {
			p.addClass("joker");
		} else {
			var num = i - 1;
			var mtop = (num%3) * 20;
			var mleft = Math.floor(num/3) * 15;
			p.css("margin-top", mtop + "%");
			p.css("margin-left", mleft + "%");
		}
		if (i == lastmove) {
			p.addClass("lastmove");
		}
		if (pile.length == 0) {
			p.addClass("empty");
		}

		for (var j = 0; j < pile.length; j++) {
			var c = pile[j];
			var img = "<img class='card' src='" + getCardsUrl() + c + ".svg' style=\"margin-top:" + (j*0.4) + "%\"/>";
			p.append(img);
		}
		p.click(function() {
			placeCard($(this));
		});
		pilesDiv.append(p);
	}
}


var useTouch = false;
// eslint-disable-next-line no-unused-vars
function showHand(cards) {
	var hand = $("#hand");
	hand.empty();

	var singleRow = cards.length < 14;
	var firstRow = singleRow ? cards.length : Math.ceil(cards.length / 2);
	var firstRowTop = singleRow ? 0 : -8;
	var secondRowTop = 5;

	for (let i = 0; i < cards.length; i++) {
		const card = cards[i];
		var topMargin, leftMargin;
		if (i < firstRow) {
			topMargin = firstRowTop;
			leftMargin = -4 * firstRow + 8 * i;
		} else {
			topMargin = secondRowTop;
			leftMargin = -4 * (cards.length - firstRow) + 8 * (i - firstRow);
		}

		const elem = $("<img>")
			.attr("id", "card"+i)
			.attr("src", getCardsUrl() + card + ".svg")
			.addClass("cardblock")
			.css("margin-top", topMargin+"%")
			.css("margin-left", leftMargin+"%")
			.click(function () {
				select(this);
			});

		// Add drag and drop handling
		let touchStartX, touchStartY, cardStartX, cardStartY;
		let startAt;
		let activeAtStart = false;
		elem.on("touchstart", function (e) {
			e.preventDefault();
			e.stopPropagation();

			useTouch = true;
			startAt = (new Date()).getTime();
			// Reset transition from previous drag
			elem.css("transition", "");

			// Save start touch location
			const touch = e.originalEvent.changedTouches[0];
			touchStartX = touch.pageX;
			touchStartY = touch.pageY;

			// Save starting position of the card
			const rect = e.target.getBoundingClientRect();
			cardStartX = rect.left;
			cardStartY = rect.top;

			// Highlight open piles
			activeAtStart = elem.hasClass("active");
			$("#piles .pile.open").addClass("active");
			$("#hand .cardblock").removeClass("active"); // Deselect other cards
			elem.addClass("active");
		});
		elem.on("touchmove", function (e) {
			const touch = e.originalEvent.changedTouches[0];
			if (!touch) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();

			const x = touch.pageX - touchStartX;
			const y = touch.pageY - touchStartY;
			elem.css("transform", "translate("+x+"px, "+y+"px)");
		});

		const reset = function () {
			// Animate back to the original location
			elem.css("transition", "transform 300ms ease-in-out");
			elem.css("transform", "translate(0, 0)");

			// Remove highlights of open piles
			const now = (new Date()).getTime();
			if (now-startAt < 200) {
				// Assume this is a cancelled drag, and not a tap
				if (activeAtStart) {
					elem.removeClass("active");
					$(".open").removeClass("active");
				} else {
					elem.addClass("active");
					$(".open").addClass("active");
				}
			}
		};
		elem.on("touchend", function (e) {
			const touch = e.originalEvent.changedTouches[0];
			const targetX = touch.pageX;
			const targetY = touch.pageY;

			// Search for a target pile
			let found = false;
			$(".pile").each(function() {
				const pile = $(this);
				if (!pile.hasClass("open")) {
					return;
				}
				const rect = this.getBoundingClientRect();

				// Continue when outside bounding box
				if (targetX < rect.left || targetX > rect.right || targetY < rect.top || targetY > rect.bottom) {
					return;
				}

				found = true;

				// Animate to the pile
				elem.css("transition", "transform 100ms ease-in-out");
				elem.css("transform", "translate("+(rect.left - cardStartX)+"px, "+(rect.top - cardStartY)+"px)");

				// Place the card after the animation
				setTimeout(function () {
					placeCard(pile);
				}, 300);
			});

			// No pile found, reset to deck
			if (!found) {
				reset();
			}
		});
		// Cancelled, reset to deck (dragged outside screen or something)
		elem.on("touchcancel", reset);

		hand.append(elem);
	}
}

// When a touch event has not been handled by the card deck,
// and has bubbled to the root, cancel it to prevent overscroll
document.addEventListener("touchmove", (e) => {
	e.preventDefault();
	e.stopPropagation();
}, { passive: false });

function select(card) {
	if (useTouch) {
		return;
	}

	var selected = $(card);
	if (selected.hasClass("active")) {
		selected.removeClass("active");
		$(".open").removeClass("active");
	} else {
		$("img").removeClass("active");
		selected.addClass("active");
		$(".open").addClass("active");
	}
}

function placeCard(pile) {
	var selected = $("#hand .active");
	if (selected.length != 1) {
		return;
	}

	var selectedCard = selected[0];
	var selectedPile = pile[0];

	// eslint-disable-next-line no-undef
	playCard(selectedCard.id, selectedPile.id);
}

function getCardsUrl() {
	if ($("#lang-flag").hasClass("fr")) {
		return "../images/cards/fr/";
	}

	return "../images/cards/en/";
}
