// This file manages the games client's logic. It's here that Socket.io connections are handled
// and functions from canvas.js are used to manage the game's visual appearance.

var socket = io();
var canPlayCard = false;
var started = false;
var timeOutId = false;

function Rule(name, description, value) {
  this.name = name;
  this.description = description;
  this.value = value;
}

socket.on("update cards", function(cards, deck, piles, frits, lastmove, turnPlayer, result) {
	showDeck(deck);
	showHand(cards);
	showPiles(piles, frits, lastmove);
	
	if(result){
		if(result.value < 2) setMessage(result.description);
		
		if(result.value > 0){
			$("#vuilefrits").hide();
			if(result.name == "Baudet"){
				next = false;
				setTurn(turnPlayer, false);
				$('#turn').text("Baudet");
			}else
				setTurn(turnPlayer, true);
		}
	}
});

socket.on("queue", function(players) {
	var queue = $("#players");
	queue.empty();
	for(var i = 0; i < players.length; i++){
		var player = players[i];
		var line = "<div>&gt; " + player.name + "</div>";
		var p = $(line);
		if(player.id == socket.id){		
			p.addClass('ownname');
		}
		queue.append(p);
	}
});

socket.on("match started", function(turnPlayer) {
	var canPlayCard = false;
	var started = true;
	startGame();
	setTurn(turnPlayer, true);
});


socket.on("game over", function(name) {
	$("#turn").text(name + " heeft verloren en moet 2 fritsjes nemen");
	var started = false;
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
	if (canPlayCard){
		socket.emit("frits");
	}
}

function vuileFrits() {
	if(!started){
		socket.emit("vuileFrits");
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
	}, 3000);
}

function setTurn(player, next){
	var turnField = $('#turn');
	if(!player){
		turnField.text("Iedereen mag nu vuile fritsen");
		return;
	}

	if(socket.id === player.id)
		canPlayCard = next;
	else
		canPlayCard = !next;
	

	if(canPlayCard){
		turnField.text("Het is jouw beurt!");
	}else{
		var numCards = player.cards == 1 ? "laatste frits!" :  ("nog " + player.cards + " kaarten");
		turnField.text(player.name + " is aan de beurt en heeft " + numCards);
	}
}

function playCard(card, pile) {	
	var cardNum = parseInt(card.replace(/\D/g,''));
	var pileNum = parseInt(pile.replace(/\D/g,''));
	if (canPlayCard && Number.isInteger(cardNum) && Number.isInteger(pileNum)) {
		socket.emit("playCard", cardNum, pileNum);
	}
}
