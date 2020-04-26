
var socket = io();
var canPlayCard = false;
var canVuileFrits = true;
var started = false;
var timeOutId = false;
var localAchievements = [];
var showingAchievements = false;

socket.on("update cards", function(cards, deck, piles, frits, lastmove, turnPlayer, result, achievements) {
	showDeck(deck);
	showHand(cards);
	showPiles(piles, frits, lastmove);
	
	if (achievements && achievements.length > 0) {
		achievements.forEach((achievement) => {
			localAchievements.push(achievement);
		})

		showAchievement();
	}

	if(result){
		if(result.value < 2) setMessage(result.description);
		
		if(result.value > 0){
			$("#vuilefrits").hide();
			canVuileFrits = false;

			if(result.name == "Baudet"){
				setTurn(turnPlayer, true);
				$('#turn').text("Baudet");
			}else
				setTurn(turnPlayer, false);
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

socket.on("match started", function(turnPlayer) {
	canPlayCard = false;
	canVuileFrits = true;
	startGame();
	setTurn(turnPlayer, false);
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
	if (canPlayCard){
		socket.emit("frits");
	}
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
	}, 3000);
}

function setTurn(player, baudet){
	var turnField = $('#turn');
	if(!player){
		turnField.text("Iedereen mag nu vuile fritsen");
		return;
	}

	if(baudet)
		canPlayCard = true;
	else
		canPlayCard = socket.id === player.id;
	

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

function showAchievement() {
	if (!showingAchievements && localAchievements.length > 0) {
		var achievement = localAchievements.shift();

		$('#achievement-by').text(achievement.by);
		$('#achievement-text').text(achievement.text);
		$('#achievement-container').fadeIn();

		setTimeout(function(){ 
			$('#achievement-container').fadeOut(500, () => {
				showingAchievements = false;
				showAchievement()
			})
		}, 2500);
	} 
}
