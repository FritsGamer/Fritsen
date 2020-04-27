
var socket = io();
var canVuileFrits = true;
var started = false;
var timeOutId = false;

socket.on("update cards", function(cards, deck, piles, frits, lastmove, result) {
	showDeck(deck);
	showHand(cards);
	showPiles(piles, frits, lastmove);
	
	if(result){
		setMessage(result.description);
		
		if(result.value !== 0){
			$("#vuilefrits").hide();

			if(result.name === "Baudet"){
				$('#turn').text("Baudet");
			} else {				
				$('#turn').text("");
			}
		}

		// Vibrate when a card is played
		if (window && window.navigator && typeof window.navigator.vibrate === 'function') {
			window.navigator.vibrate(100);
		}
	}
});

socket.on("queue", function(players) {
	var queue = $("#players");
	queue.empty();
	for(var i = 0; i < players.length; i++){
		var player = players[i];


		var p = $("<div>").text('> '+player.name);
		if(player.id == socket.id){
			p.addClass('ownname');
			
			if(i == 0)
				$('#newgame').show();
			else
				$('#newgame').hide();
				
		}
		queue.append(p);
	}
});

socket.on("match started", function() {
	canVuileFrits = true;
	startGame();
});


socket.on("game over", function(name) {
	$("#turn").text(name + " heeft verloren en moet 2 fritsjes nemen");
	// setMessage("Game is over\n" + name + " lost the game");
	setTimeout(function(){ resetGame(); }, 5000);
});

function resetGame(){
	$("#hand").empty();
	$("#deck").empty();
	$("#piles").empty();
	joinQueue();
}

//////////  Functions
function enterQueue(name){
	socket.emit("joinQueue", name);
}

function frits() {
	socket.emit("frits");
}

function vuileFrits() {
	if(canVuileFrits){
		socket.emit("vuileFrits");
		$('#vuilefrits').addClass('wait');
		canVuileFrits = false;
		setTimeout(function(){ 
			$('#vuilefrits').removeClass('wait'); 
			canVuileFrits = true;
		}, 2000);
	}
}

function startMatch() {
	socket.emit("startMatch");
}

function setMessage(msg){
	var message = $('#status');
	message.text(msg);
	
	if(timeOutId){
		clearTimeout ( timeOutId );
	}else{
		message.fadeIn();
	}
	timeOutId = setTimeout(function(){
		message.fadeOut();
		timeOutId = false;
	}, 10000);
}

function playCard(card, pile) {	
	var cardNum = parseInt(card.replace(/\D/g,''));
	var pileNum = parseInt(pile.replace(/\D/g,''));
	if (Number.isInteger(cardNum) && Number.isInteger(pileNum)) {
		socket.emit("playCard", cardNum, pileNum);
	}
}
