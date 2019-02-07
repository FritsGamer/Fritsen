
var socketio = require("socket.io");

//Match state
// 0: begin
// 1: after first move is made
// 2: baudet

var players = [];
var matches = [];
var participants = [];
var baudetTimeout = false;
var log = false;

module.exports.listen = function(app) {
	io = socketio.listen(app);
	io.on("connection", function(socket) {
		players.push({
			socket: socket
		});

		socket.on("disconnect", function() {
			var id = findIdBySocketId(socket.id);
			var playerId = findPlayerIdBySocketId(socket.id);

			if(Number.isInteger(id)){
				if(log) console.log("Player " + findPlayerById(socket.id).name + " disconnected");
				participants.splice(id, 1);
				showQueue();
			}

			if(log) console.log("playerId " + playerId);
			if(Number.isInteger(playerId)){
				var player = players[playerId];
				if(log) console.log("matchId " + player.matchId);
				if(player.matchId){
					var match = findMatchBySocketId(socket.id);
					if(match){
						match.players.forEach(function(p) { p.done = true; });
						player.done = false;
						var rule = getRule("Disconnect");
						var result = new Rule(rule.name, player.name + rule.description, rule.value);
						checkWin(match, player, result);
					}
				}
				
				players.splice(playerId, 1);
			}
			if(log) console.log("return disconnect");
		});

		socket.on("join queue", function(name) {
			var player = findPlayerById(socket.id);
			player.matchId = false;
			player.name = name;
			player.done = false;
			player.vuilefrits = 0;
			if(log) console.log(player.name + " joined the queue");
			if(!Number.isInteger(findIdBySocketId(socket.id))){
				participants.push(player);
			}
			showQueue();
			if(log) console.log("return join queue");
		});

		socket.on("start match", function() {
			var match = findMatchBySocketId(socket.id);
			if(!match){
				createMatch();
				updateCards(socket.id, false);
			}
			if(log) console.log("return start match");
		});

		socket.on("play card", function(cardNum, pileNum) {
			var result = playCard(socket.id, cardNum, pileNum);
			updateCards(socket.id, result);
			if(log) console.log("return play card");
		});

		socket.on("frits", function() {
			fritsCards(socket.id);
			if(log) console.log("return frits");
		});

		socket.on("vuile frits", function() {
			var match = findMatchBySocketId(socket.id);
			if(match && match.state == 0){
				var player = findPlayerById(socket.id);
				if(Date.now() > player.vuilefrits){
					var hand = player.cards;
					newHand(hand, match.deck);
					var rule = getRule("VuileFrits");
					var result = new Rule(rule.name, rule.description + player.name, rule.value);
					updateCards(socket.id, result);
					player.vuilefrits = Date.now() + 4000;
				}
			}
			if(log) console.log("return vuile frits");
		});	
		if(log) console.log("return connection");
	});
	return io;
};

//////////  Match functions 
function findPlayerIdBySocketId(socketId) {
	if(log) console.log("findPlayerIdBySocketId");
	for (var i = 0; i < players.length; i++) {
		if (players[i].socket.id === socketId) {
			return i;
		}
	}
	return false;
}

function findIdBySocketId(socketId) {
	if(log) console.log("findIdBySocketId");
	for (var i = 0; i < participants.length; i++) {
		if (participants[i].socket.id === socketId) {
			return i;
		}
	}
	return false;
}

function findPlayerById(socketId) {
	if(log) console.log("findPlayerById");
	for (var i = 0; i < players.length; i++) {
		if (players[i].socket.id === socketId) {
			return players[i];
		}
	}
	return false;
}

function findTurnById(socketId, match) {
	if(log) console.log("findTurnById");
	for (var i = 0; i < match.players.length; i++) {
		if (match.players[i].socket.id === socketId) {
			return i;
		}
	}
	return false;
}

function showQueue(){
	if(log) console.log("showQueue");
	var queue = [];
	for (var i = 0; i < participants.length; i++) {
		var player = participants[i];
		if(player.matchId)
			continue;
		
		queue.push({name: player.name, id: player.socket.id});
	}
	for (var i = 0; i < participants.length; i++) {
		var player = participants[i];
		if(player.matchId)
			continue;
		
		player.socket.emit("queue", queue);
	}
}

function createMatch() {
	if(log) console.log("createMatch");
	if(participants.length == 0)
		return;

	var id = createId();
	var match = {
		matchId: id,
		players: [],
		state: 0,
		turnId: -1,
		piles: [],
		frits: false,
		lastmove: -1,
		deck: createDeck()
	};

	for (var i = 0; i < participants.length; i++) {
		var player = participants[i];
		if(player.matchId)
			continue;

		player.matchId = id;
		getHand(player, match.deck);
		match.players.push(player); 
	}

	placeWillemAndFrits(match.players);

	//jokerPile
	var jokerPile = addPile(match);
	jokerPile.jokerPile = true;
	var firstPile = addPile(match);
	var pcs = firstPile.cards;
	
	//while no joker
	while(pcs.length == 0 || pcs[pcs.length - 1].identity == "Joker" ){
		drawCards(firstPile.cards, match.deck, 1);
	}
	
	//openPile
	var secondPile = addPile(match);

	matches.push(match);
	for (var i = 0; i < match.players.length; i++) {
		var player = match.players[i];
		player.socket.emit("match started", false);
	}

	setTimeout(function(){
		nextPlayer(match);
		updateCards(match.players[0].socket.id, getRule("Goed"));
	}, 15000);
}

function createId() {
	if(log) console.log("createId");
	var id = "";
	var charset = "ABCDEFGHIJKLMNOPQRSTUCWXYZabcdefghijklmnopqrtsuvwxyz1234567890";
	for (var i = 0; i < 16; i++) {
		id += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return id;
}

function findMatchBySocketId(socketId) {
	if(log) console.log("findMatchBySocketId");
	for (var i = 0; i < matches.length; i++) {
		for (var j = 0; j < matches[i].players.length; j++) {
			if (matches[i].players[j].socket.id === socketId) {
				return matches[i];
			}
		}
	}
	return false;
}

function removeMatch(match) {
	if(log) console.log("removeMatch");
	var index = matches.indexOf(match);
	if (index > -1) {
		matches.splice(index, 1);
	}
}

// Handle Frits Moves
function getTurnPlayer(match){
	if(match.turnId < 0)
		return false;

	var player = match.players[match.turnId];
	return {name: player.name, id: player.socket.id, cards: player.cards.length};
}

function updateCards(socketId, result) {
	if(log) console.log("updateCards");
	var match = findMatchBySocketId(socketId);
	if (match) {
		for (var i = 0; i < match.players.length; i++) {
			var player = match.players[i];
			player.socket.emit("update cards", player.cards, match.deck.length, match.piles, match.frits, match.lastmove, getTurnPlayer(match), result);
		}
	}
}

function updateResult(socketId, result) {
	if(log) console.log("updateResult");
	var match = findMatchBySocketId(socketId);
	if (match) {
		for (var i = 0; i < match.players.length; i++) {
			var player = match.players[i];
			player.socket.emit("result", result);
		}
	}
}

function nextPlayer(match){
	if(log) console.log("nextPlayer");
	match.frits = false;
	baudetTimeout = false;

	match.turnId = (match.turnId + 1) % match.players.length;
	while(match.players[match.turnId].done){
		match.turnId = (match.turnId + 1) % match.players.length;
	}
}

function checkWin(match, player, result){
	if(log) console.log("checkWin");
	var inGame = [];
	for (var i = 0; i < match.players.length; i++) {
		var player = match.players[i];
		if(!player.done) inGame.push(player.name);
	}

	if(inGame.length <= 1){
		updateCards(player.socket.id, result)
		//updateCards(player.socket.id);
		var name;
		if(inGame.length == 0) 
			name = match.players[0].name;
		else
			name = inGame[0];

		for (var i = 0; i < match.players.length; i++) {
			var player = match.players[i];
			player.socket.emit("game over", name);
		}	
		removeMatch(match);
	}
}

function fritsCards(socketId){
	if(log) console.log("frits");
	var match = findMatchBySocketId(socketId);
	if(match && !match.frits && match.players[match.turnId].socket.id == socketId){
		match.state = 1;
		var player = findPlayerById(socketId);
		drawCards(player.cards, match.deck, 2);
		match.frits = true;	
		var rule = getRule("Frits");
		var result = new Rule(rule.name, player.name + rule.description, rule.value);
		updateCards(socketId, result);
	}
}

//Card Games
var Suits = Object.freeze({"Clubs":"C", "Hearts":"H", "Spades":"S", "Diamonds":"D", "Red": "R", "Black":"B"})
var Identities = Object.freeze({"Joker":"X", 2:"2", 3:"3", 4:"4", 5:"5", 6:"6", 7:"7", 8:"8", 9:"9", 10:"T", 11:"J", 12:"Q", 13:"K", 14:"A"})

function Card(identity, suit) {
  this.identity = identity;
  this.suit = suit;
}

function createDeck(){
	if(log) console.log("createDeck");
	var numJokers = 4;
	var deck = [];
	var suits = ["Clubs", "Hearts", "Spades", "Diamonds"]
	suits.forEach(function(suit) {
		for (var i = 2; i <= 14; i++){
			deck.push(new Card(i, suit));
		}
	});

	var colors = ["Red", "Black"]
	for (var i = 0; i < numJokers; i++){
		deck.push(new Card("Joker", colors[i%2]));
	}
	return shuffle(deck);
}

function shuffle(deck) {
	if(log) console.log("shuffle");
	var m = deck.length, t, i;

	// While there remain elements to shuffle…
	while (m) {

		// Pick a remaining element…
		i = Math.floor(Math.random() * m--);

		// And swap it with the current element.
		t = deck[m];
		deck[m] = deck[i];
		deck[i] = t;
	}

	return deck;
}

function getHand(player, deck){
	player.cards = [];
	drawCards(player.cards, deck, 5);
}

function drawCards(cards, deck, numCards){
	if(log) console.log("drawCards");
	numCards = Math.min(numCards, deck.length);
	for (var i = 0; i < numCards; i++){
		cards.push(deck.pop());
	}
}

function newHand(hand, deck){
	if(log) console.log("newHand");
	var numCards = hand.length;
	for (var i = 0; i < numCards; i++){
		deck.unshift(hand.pop());
	}
	drawCards(hand, deck, numCards);
}

// Fritsen Rules
function Pile(cards){
  this.cards = cards;
}

function addPile(match){
	if(log) console.log("addPile");
	var pile = new Pile([]);
	match.piles.push(pile);
	return pile;
}

function Rule(name, description, value) {
  this.name = name;
  this.description = description;
  this.value = value;
}

var Rules = [
	new Rule("Fout", "Fritsje des: Zet is niet mogelijk, neem 1 fritsje", 0),
	new Rule("Goed", "Normale zet", 2),
	new Rule("Soepel", "Soepele Frits", 1),
	new Rule("Stroef", "Stroeve Frits", 1),
	new Rule("Offer", "Offerfrits: Neem 1 fritsje", 1),
	new Rule("Joker", "Joker: Alle anderen nemen 1 fritsje", 1),
	new Rule("Kim", "Kim: Alle anderen nemen 1 fritsje", 1),
	new Rule("VierdeKim", "Vier Kimmen: Alle anderen nemen 2 fritsjes", 1),
	new Rule("Joris", "Jorisje: Alle anderen nemen 1 fritsje", 1),
	new Rule("Lisa", "Lisa: Alle anderen nemen 1 fritsje", 1),
	new Rule("Baudet", "Baudet: Ruil je hand met de stapel en neem 2 fritsjes", 1),
	new Rule("Klaver", "Klaver! Je voorkomt dat Thierry aan de macht komt. De speler met Baudet mag niet ruilen", 1),
	new Rule("DubbelNegen", "Iedereen dubbel Frits: Alle anderen nemen 2 fritsjes", 1),
	//new Rule("AasKoning", "Nice! Aas en Koning op Kim", 1),
	// new Rule("AasKoningWait", "Wil je hier de Aas ook bij leggen?", 0),
	new Rule("Frits", " heeft gefritsd", 1),
	new Rule("JokerUit", "Je mag niet uitkomen met een Joker: neem 1 fritsje", 0),
	new Rule("JokerFout", "Jokers mogen alleen op de jokerstapel: neem 1 fritsje", 0),
	new Rule("Uit", " is uitgefritsd, neem 1 fritsje of 2 als je hebt verloren", 1),
	new Rule("VuileFrits", "Vuile Frits voor ", 0),
	new Rule("Start", "Wil je Vuile Fritsen?", 0),
	new Rule("Disconnect", " heeft het spel verlaten", 0)
];

function getRule(name)
{
	if(log) console.log("getRule");
	return Rules.find(function(r) { return r.name == name; });
}

//Rules - Possible placement:
//1. Only if card is Joker on Joker pile (Joker)
//2. Card is a 9
//3. Queen on a Queen (Kim)
//4. Jack of clubs on Red Queen or vice versa (Joris)
//5. King on Ace of Hearts or vice versa (Lisa)
//6. 6 on a Queen (Baudet)
//7. 3 of Clubs on a 6 (Klaver)
//8. Same suit with higher value
//9. Same suit with 1 lower value (Offer)
//10. Same suit with 2 on Ace
//11. All same suit: King + Ace on Queen - Not implemented

function playCard(socketId, cardId, pileId) {
	if(log) console.log("playCard");
	var match = findMatchBySocketId(socketId);
	if(!match)
		return getRule("Fout");

	var player = findPlayerById(socketId);
	var hand = player.cards;
	var piles = match.piles;
	var turnId = findTurnById(socketId, match);

	if(cardId >= hand.length || pileId >= piles.length)
		return getRule("Fout");

	if((match.state != 2 && match.turnId != turnId) || (match.state == 2 && match.turnId == turnId))
		return getRule("Fout");

	var result = placeOnPile(cardId, pileId, match, hand);

	//valid move
	if (result.value > 0) {
		//Remove player when he has no cards left
		if(hand.length == 0)
		{
			player.done = true;

			rule = getRule("Uit");
			result = new Rule(rule.name, player.name + rule.description, rule.value);
		}
		else
		{
			//add new pile after placement on empty pile
			if (pileId > 0 && match.piles[pileId].cards.length == 1)
				addPile(match);
		}
		checkWin(match, player, result);

		if(match.state == 2 && baudetTimeout){
			clearTimeout ( baudetTimeout );
		}
		
		match.state = 1;
		match.lastmove = pileId;

		if (result.name == "Baudet"){
			match.state = 2;
			frits = true;

			baudetTimeout = setTimeout(function(){
				newHand(hand, match.deck);
				match.state = 1;
				nextPlayer(match);
				updateCards(socketId, getRule("Goed"));
			}, 5000);
		} else {
			nextPlayer(match);
		}
	}
	
	return result;
}

function checkCards(cardId, pileId, match, hand)
{	
	if(log) console.log("checkCards");

	var card = hand[cardId];
	var pile = match.piles[pileId];

    //7. 3 of Clubs on a 6 (Klaver)
	if(match.state == 2 && (card.identity != 3 || card.suit != "Clubs" || match.lastmove != pileId))
		return getRule("Fout");

	//1. Only if card is Joker on Joker pile (Joker)
	if (card.identity == "Joker" || pile.jokerPile)
	{
		if (card.identity == "Joker" && hand.length == 1)
			return getRule("JokerUit");
		else if (card.identity == "Joker" && pile.jokerPile)
			return getRule("Joker");
		else
			return getRule("JokerFout");
	}

	if(pile.cards.length == 0){
		if(match.frits)
			return getRule("Goed");
		else
			return getRule("Fout");
	}

	var top = pile.cards[pile.cards.length - 1];
  
	var cardId = Identities[card.identity];
	var pileId = Identities[top.identity];
	var cardSuit = Suits[card.suit];
	var pileSuit = Suits[top.suit];		

	//7. 3 of Clubs on a 6 (Klaver)
	if(match.state == 2){
		var pc = pile.cards;
		if(pc.length < 2)			
			return getRule("Fout");

		var pileSecondCard = Identities[pc[pc.length - 2].identity];

		if(pileId == '6' && pileSecondCard == 'Q')
			return getRule("Klaver");
		 else
			return getRule("Fout");		
	}

	//2. Card is a 9
	if (cardId == '9')
	{
		if(pileId == '9')
			return getRule("DubbelNegen");
		else
			return getRule("Goed");
	}

	//3. Queen on a Queen (Kim)
	if (pileId == 'Q')
	{
		if(cardId == 'Q')
		{
			var counter = 0;
			pile.cards.forEach(function(c)
			{
				if (Identities[c.identity] == 'Q')
					counter++;
				else
					counter = 0;
			});

			if(counter == 3)
				return getRule("VierdeKim");
			else
				return getRule("Kim");
		}
			

		//4. Jack of clubs on Red Queen or vice versa (Joris)
		if (cardId == 'J' && cardSuit == 'C' && (pileSuit == 'H' || pileSuit == 'D'))
			return getRule("Joris");

		//6. 6 on a Queen (Baudet)
		if (cardId == '6')
			return getRule("Baudet");
	}

	//4. Joris
	if (pileId == 'J' && pileSuit == 'C')
	{
		if (cardId == 'Q' && (cardSuit == 'H' || cardSuit == 'D'))
			return getRule("Joris");
	}

	//5. King on Ace of Hearts or vice versa (Lisa)
	if((cardId == 'A' && cardSuit == 'H') || (pileId == 'A' && pileSuit == 'H'))
	{
		if (cardId == 'K' || pileId == 'K')
			return getRule("Lisa");
	}

	if(cardSuit == pileSuit)
	{
		var cid = card.identity;
		var pid = top.identity;

		//8. Same suit with higher value
		if (cid > pid)
		{
			if(cid == pid + 1)
				return getRule("Soepel");
			if (cid > pid + 8)
				return getRule("Stroef");

			return getRule("Goed");
		}

		//9. Same suit with 1 lower value (Offer)
		if (cid == pid - 1)
			return getRule("Offer");

		//10. Same suit with 2 on Ace
		if (cardId == '2' && pileId == 'A')
			return getRule("Goed");
	}

	return getRule("Fout");
}

function placeOnPile(cardId, pileId, match, hand)
{
	if(log) console.log("placeOnPile");
	var res = checkCards(cardId, pileId, match, hand);

	if (res.value > 0)
	{
		var card = hand[cardId];
		var pile = match.piles[pileId];

		pile.cards.push(card);
		hand.splice(cardId, 1);
	}

	return res;
}





// Helper Functions

function HammingDistance(a, b){
	// make sure a is smallest
	a = a.toLowerCase();
	b = b.toLowerCase();
	if(a.length > b.length){
		var c = b;
		b = a;
		a = c;
	}
	var diff = b.length - a.length;
	var minDist = b.length;
	for (var i = 0; i <= diff; i++){
		var dist = diff;
		for (var j = 0; j < a.length; j++){
			if(a[j] != b[(j+i)])
				dist++;
		}
		if(dist < minDist)
			minDist = dist;
	}
	return minDist;
}

function minHammingDistanceIndex(players, name){
	var names = players.map(p => p.name);

	var index = 0;
	var minDist = HammingDistance(names[0], name);

	for (var i = 1; i < names.length; i++){
		var dist = HammingDistance(names[i], name);
		if(dist < minDist){
			minDist = dist;
			index = i;
		}
	}
	return index;
}

// player most like willem is first and most like frits is last
function placeWillemAndFrits(players){
	if(players.length == 0)
		return -1;	

	players.push(players.splice(minHammingDistanceIndex(players, "Frits"), 1)[0]);
	players.unshift(players.splice(minHammingDistanceIndex(players, "Willem"), 1)[0]);
}