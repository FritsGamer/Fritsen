function showDeck(nrCards){
	var deck = $("#deck");
	deck.empty();

	nrCards /= 3;

	for (i = 0; i < nrCards; i++) { 
		card = "<img class='card' style=\"margin-top:" + (i*0.2) + "%\" src='../images/cards/CR.png'/>";
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
			var img = "<img class='card' src='../images/cards/" + c + ".png' style=\"margin-top:" + (j*0.2) + "%\"/>";
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

	for (i = 0; i < cards.length; i++) { 
		c = cards[i];
		elem = "<img id='card" + i + "' class='cardblock' style=\"margin-left:" + (i*9) + "%\" src='../images/cards/" + c + ".png' onclick='select(this)' />";
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