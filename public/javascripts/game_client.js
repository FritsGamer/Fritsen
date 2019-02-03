// This file manages the games client's logic. It's here that Socket.io connections are handled
// and functions from canvas.js are used to manage the game's visual appearance.

var socket = io();
var canPlayCard = false;
var started = false;

function Rule(name, description, value) {
  this.name = name;
  this.description = description;
  this.value = value;
}

socket.on("update cards", function(cards, deck, piles, frits, lastmove, turnPlayer) {
	showDeck(deck);
	showHand(cards);
	showPiles(piles, frits, lastmove);
	setTurn(turnPlayer);
});

socket.on("result", function(result) {
	if(result.value < 2){
		setMessage(result.description);
	}

	if(result.value > 0){
		canPlayCard = false;
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

socket.on("match started", function() {
	var canPlayCard = false;
	var started = true;
	startGame();
});


socket.on("game over", function(name) {
	setMessage("Game is over\n" + name + " lost the game");
	$("#hand").empty();
	$("#deck").empty();
	$("#piles").empty();
	var started = false;
	setTimeout(function(){ joinQueue(); }, 5000);
});

//////////  Functions
function enterQueue(name){
	socket.emit("join queue", name);
}

function frits() {
	socket.emit("frits");
}

function vuileFrits() {
	if(!started){
		socket.emit("vuile frits");
	}
}

function startMatch() {
	socket.emit("start match");
}

function setMessage(msg){
	var message = $('#status');
	message.text(msg);
	message.fadeIn().delay(3000).fadeOut();
}

function setTurn(player){
	if(socket.id === player.id){
		canPlayCard = true;
	}
	var turnField = $('#turn');
	turnField.text(player.name + "'s turn");
}

function playCard(card, pile) {	
	var cardNum = parseInt(card.replace(/\D/g,''));
	var pileNum = parseInt(pile.replace(/\D/g,''));
	if (canPlayCard && Number.isInteger(cardNum) && Number.isInteger(pileNum)) {
		socket.emit("play card", cardNum, pileNum);
	}
}
