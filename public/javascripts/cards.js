var cardImagesUrl = '../images/cards/fr/';

function showDeck(nrCards){
	var deck = $("#deck");
	deck.empty();

	nrCards /= 3;

	for (i = 0; i < nrCards; i++) { 
		card = "<img class='card' style=\"margin-top:" + (i*0.4) + "%\" src='"+cardImagesUrl+"CR.png'/>";
		deck.append(card);
	}
}

function showPiles(piles, frits, lastmove){
	var pilesDiv = $("#piles");
	pilesDiv.empty();

	for (i = 0; i < piles.length; i++) { 
		var pile = piles[i];
		var div = "<div id='pile" + i + "' class='cardblock pile'></div>";
		var p = $(div);
		
		if(pile.length > 0 || frits || i == 0) p.addClass("open");
		if(i == 0){ 
			p.addClass("joker");
		}else{
			var num = i - 1;
			var mtop = (num%3) * 20;
			var mleft = Math.floor(num/3) * 15;
			p.css("margin-top", mtop + "%");
			p.css("margin-left", mleft + "%");
		}
		if(i == lastmove) p.addClass("lastmove");
		if(pile.length == 0) p.addClass("empty");
	
		for (j = 0; j < pile.length; j++) { 
			var c = pile[j];
			var img = "<img class='card' src='"+cardImagesUrl + c + ".png' style=\"margin-top:" + (j*0.4) + "%\"/>";
			p.append(img);
		}
		p.click(function() {
			 placeCard($(this));
		});
		pilesDiv.append(p);
	}
}

function showHand(cards){
	var hand = $("#hand");
	hand.empty();

	var singleRow = cards.length < 14;
	var firstRow = singleRow ? cards.length : Math.ceil(cards.length / 2);
	var firstRowTop = singleRow ? 0 : -8;
	var secondRowTop = 5;

	for (i = 0; i < cards.length; i++) { 
		c = cards[i];
		var topMargin, leftMargin;
		if(i < firstRow){
			topMargin = firstRowTop;
			leftMargin = -4 * firstRow + 8 * i;
		} else {
			topMargin = secondRowTop;
			leftMargin = -4 * (cards.length - firstRow) + 8 * (i - firstRow);
		}

		elem = "<img id='card" + i + "' class='cardblock' style='margin-top:" + topMargin + "%; margin-left:" + leftMargin + "%' src='"+ cardImagesUrl + c + ".png' onclick='select(this)' />";
		hand.append(elem);
	}
}

function select(card) {
	var selected = $(card);
	if (selected.hasClass('active')) {
		selected.removeClass('active');
		$('.open').removeClass('active');
	} else {
		$('img').removeClass('active');
		selected.addClass('active');
		$('.open').addClass('active');
	}
}

function placeCard(pile) {
	if (!pile.hasClass('open'))
	  return;

	var selected = $('#hand .active');	
	if (selected.length != 1)
	  return;

	var selectedCard = selected[0];
	var selectedPile = pile[0];

	playCard(selectedCard.id, selectedPile.id)
}