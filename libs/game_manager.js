// This file handles all socket.io connections and manages the serverside game logic.

var socketio = require("socket.io");

//Player( id, name, matchId)
//Match ( id, players, leaderId, state, turnId )

var players = [];
var matches = [];
var participants = [];

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
				console.log("Player " + findPlayerById(socket.id).name + " disconnected");
				participants.splice(id, 1);
			}

			console.log("playerId " + playerId);
			if(Number.isInteger(playerId)){
				var player = players[playerId];
				console.log("matchId " + player.matchId);
				if(player.matchId){
					var match = findMatchBySocketId(socket.id);
					match.players.forEach(function(p) { p.done = true; });
					player.done = false;
					checkWin(match);
				}
				
				players.splice(playerId, 1);
			}
		});

		socket.on("join queue", function(name) {
			var player = findPlayerById(socket.id);
			player.name = name;
			player.done = false;
			console.log(player.name + " joined the queue");
			if(!Number.isInteger(findIdBySocketId(socket.id))){
				participants.push(player);
			}
			showQueue();
		});

		socket.on("start match", function() {
			var match = findMatchBySocketId(socket.id);
			if(!match){
				console.log("match started");
				createMatch();
				updateCards(socket.id);
			}
		});

		socket.on("play card", function(cardNum, pileNum) {
			var result = playCard(socket.id, cardNum, pileNum);
			updateResult(socket.id, result);
			if(result.value > 0) updateCards(socket.id);
		});

		socket.on("frits", function() {
			frits(socket.id);
			updateCards(socket.id);
		});

		socket.on("vuile frits", function() {
			var match = findMatchBySocketId(socket.id);
			if(match && match.state == 0){
				var player = findPlayerById(socket.id);
				var hand = player.cards;
				newHand(hand, match.deck);
				updateCards(socket.id);
				var rule = Rules.find(function(r) { return r.name == "VuileFrits"; });
				var result = new Rule(rule.name, rule.description + player.name, rule.value);
				updateResult(socket.id, result);
			}
		});	
	});
	return io;
};

//////////  Match functions 
function findPlayerIdBySocketId(socketId) {
	for (var i = 0; i < players.length; i++) {
		if (players[i].socket.id === socketId) {
			return i;
		}
	}
	return false;
}

function findIdBySocketId(socketId) {
	for (var i = 0; i < participants.length; i++) {
		if (participants[i].socket.id === socketId) {
			return i;
		}
	}
	return false;
}

function findPlayerById(socketId) {
	for (var i = 0; i < players.length; i++) {
		if (players[i].socket.id === socketId) {
			return players[i];
		}
	}
	return false;
}

function findTurnById(socketId, match) {
	for (var i = 0; i < match.players.length; i++) {
		if (match.players[i].socket.id === socketId) {
			return i;
		}
	}
	return false;
}

function showQueue(){
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
	var id = createId();
	var match = {
		matchId: id,
		players: [],
		state: 0,
		turnId: 0,
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
	// for(var x in data)data[x].name == "other" ? data.push( data.splice(x,1)[0] ) : 0;
	var data = match.players;
	data.push(data.splice(data.findIndex(v => v.name == "Frits"), 1)[0]);
	data.unshift(data.splice(data.findIndex(v => v.name == "Willem"), 1)[0]);

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
	addPile(match);

	matches.push(match);
	for (var i = 0; i < match.players.length; i++) {
		var player = match.players[i];
		player.socket.emit("match started");
	}
}

function createId() {
	var id = "";
	var charset = "ABCDEFGHIJKLMNOPQRSTUCWXYZabcdefghijklmnopqrtsuvwxyz1234567890";
	for (var i = 0; i < 16; i++) {
		id += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return id;
}

function findMatchBySocketId(socketId) {
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
	var index = matches.indexOf(match);
	if (index > -1) {
		matches.splice(index, 1);
	}
}

// Handle Frits Moves


function updateCards(socketId) {
	var match = findMatchBySocketId(socketId);
	if (match) {
		var turnPlayer = {name: match.players[match.turnId].name, id: match.players[match.turnId].socket.id};
		for (var i = 0; i < match.players.length; i++) {
			var player = match.players[i];
			player.socket.emit("update cards", player.cards, match.deck.length, match.piles, match.frits, match.lastmove, turnPlayer);
		}
	}
}

function updateResult(socketId, result) {
	var match = findMatchBySocketId(socketId);
	if (match) {
		for (var i = 0; i < match.players.length; i++) {
			var player = match.players[i];
			player.socket.emit("result", result);
		}
	}
}

function playCard(socketId, cardId, pileId) {
	var match = findMatchBySocketId(socketId);
	if(!match)
		return getRule("Fout", hand);

	var player = findPlayerById(socketId);
	var hand = player.cards;
	var piles = match.piles;
	var turnId = findTurnById(socketId, match);

	if(match.turnId != turnId || cardId >= hand.length || pileId >= piles.length)
		return getRule("Fout", hand);

	var pile = piles[pileId];

	var result = placeOnPile(cardId, pile, match.frits, hand);

	//valid move
	if (result.value > 0) {
		//Remove player when he has no cards left
		match.state = 1;
		if (result.name == "Uit")
		{
			player.done = true;
		}
		else
		{
			//add new pile after placement on empty pile
			if (pile.cards.length == 1 && pileId > 0)
				addPile(match);
			else if (result.name == "Baudet")
				newHand(hand, match.deck);
		}
		nextPlayer(match);
		match.frits = false;
		match.lastmove = pileId;
	}
	
	return result;
}

function nextPlayer(match){
	checkWin(match, match.players[match.turnId]);
	match.turnId = (match.turnId + 1) % match.players.length;
	while(match.players[match.turnId].done){
		match.turnId = (match.turnId + 1) % match.players.length;
	}
}

function checkWin(match, player){
	var inGame = [];
	for (var i = 0; i < match.players.length; i++) {
		var player = match.players[i];
		if(!player.done) inGame.push(player.name);
	}

	if(inGame.length <= 1){
		var name;
		if(inGame.length == 0) 
			name = match.players[0].name;
		else
			name = inGame[0];

		for (var i = 0; i < match.players.length; i++) {
			var player = match.players[i];
			player.matchId = false;
			player.socket.emit("game over", name);
		}	
		matches.splice(matches.findIndex(m => m.id == match.id), 1);
	}
}

function frits(socketId){
	var match = findMatchBySocketId(socketId);
	if(match && !match.frits){
		var player = findPlayerById(socketId);
		drawCards(player.cards, match.deck, 2);
		match.frits = true;	
		var rule = Rules.find(function(r) { return r.name == "Frits"; });
		var result = new Rule(rule.name, player.name + rule.description, rule.value);
		updateResult(socketId, result);			
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
	numCards = Math.min(numCards, deck.length);
	for (var i = 0; i < numCards; i++){
		cards.push(deck.pop());
	}
}

function newHand(hand, deck){
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
	// new Rule("Klaver", "Klaver: Voorkom dat Thierry aan de macht komt. De speler met Baudet mag niet ruilen", 1),
	new Rule("DubbelNegen", "Iedereen dubbel Frits: Alle anderen nemen 2 fritsjes", 1),
	//new Rule("AasKoning", "Nice! Aas en Koning op Kim", 1),
	// new Rule("AasKoningWait", "Wil je hier de Aas ook bij leggen?", 0),
	new Rule("Frits", " heeft gefritsd", 0),
	new Rule("JokerUit", "Je mag niet uitkomen met een Joker: neem 1 fritsje", 0),
	new Rule("JokerFout", "Jokers mogen alleen op de jokerstapel: neem 1 fritsje", 0),
	new Rule("Uit", " is uitgefritsd, neem 1 fritsje of 2 als je hebt verloren", 1),
	new Rule("VuileFrits", "Vuile Frits voor ", 0),
	new Rule("Start", "Wil je Vuile Fritsen?", 1),
	new Rule("StartPlay", "Begin met spelen", 1)
];

function getRule(name, hand)
{
	var rule = Rules.find(function(r) { return r.name == name; });

	if(hand.length == 1 && rule.value > 0)
	{
		rule = Rules.find(function(r) {
		  return r.name == "Uit";
		});
		return new Rule(rule.name, "Speler" + rule.description, rule.value);
	}

	return rule;
}

//Rules - Possible placement:
//1. Only if card is Joker on Joker pile (Joker)
//2. Card is a 9
//3. Queen on a Queen (Kim)
//4. Jack of clubs on Red Queen or vice versa (Joris)
//5. King on Ace of Hearts or vice versa (Lisa)
//6. 6 on a Queen (Baudet)
//7. 3 of Clubs on a 6 (Klaver) - Not implemented
//8. Same suit with higher value
//9. Same suit with 1 lower value (Offer)
//10. Same suit with 2 on Ace
//11. All same suit: King + Ace on Queen - Not implemented

function checkCards(card, pile, frits, hand)
{	
	//1. Only if card is Joker on Joker pile (Joker)
	if (card.identity == "Joker" || pile.jokerPile)
	{
		if (card.identity == "Joker" && hand.length == 1)
			return getRule("JokerUit", hand);
		else if (card.identity == "Joker" && pile.jokerPile)
			return getRule("Joker", hand);
		else
			return getRule("JokerFout", hand);
	}

	if(pile.cards.length == 0){
		if(frits){
			return getRule("Goed", hand);
		} else{
			return getRule("Fout", hand);
		}
	}

	var top = pile.cards[pile.cards.length - 1];
  
	var cardId = Identities[card.identity];
	var pileId = Identities[top.identity];
	var cardSuit = Suits[card.suit];
	var pileSuit = Suits[top.suit];		

	//2. Card is a 9
	if (cardId == '9')
	{
		if(pileId == '9')
			return getRule("DubbelNegen", hand);
		else
			return getRule("Goed", hand);
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
				return getRule("VierdeKim", hand);
			else
				return getRule("Kim", hand);
		}
			

		//4. Jack of clubs on Red Queen or vice versa (Joris)
		if (cardId == 'J' && cardSuit == 'C' && (pileSuit == 'H' || pileSuit == 'D'))
			return getRule("Joris", hand);

		//6. 6 on a Queen (Baudet)
		if (cardId == '6')
			return getRule("Baudet", hand);
	}

	//4. Joris
	if (pileId == 'J' && pileSuit == 'C')
	{
		if (cardId == 'Q' && (cardSuit == 'H' || cardSuit == 'D'))
			return getRule("Joris", hand);
	}

	//5. King on Ace of Hearts or vice versa (Lisa)
	if((cardId == 'A' && cardSuit == 'H') || (pileId == 'A' && pileSuit == 'H'))
	{
		if (cardId == 'K' || pileId == 'K')
			return getRule("Lisa", hand);
	}

	if(cardSuit == pileSuit)
	{
		var cid = card.identity;
		var pid = top.identity;

		//8. Same suit with higher value
		if (cid > pid)
		{
			if(cid == pid + 1)
				return getRule("Soepel", hand);
			if (cid > pid + 8)
				return getRule("Stroef", hand);

			return getRule("Goed", hand);
		}

		//9. Same suit with 1 lower value (Offer)
		if (cid == pid - 1)
			return getRule("Offer", hand);

		//10. Same suit with 2 on Ace
		if (cardId == '2' && pileId == 'A')
			return getRule("Goed", hand);
	}

	return getRule("Fout", hand);
}

function placeOnPile(cardId, pile, frits, hand)
{
	var card = hand[cardId];
	var res = checkCards(card, pile, frits, hand);

	if (res.value > 0)
	{
		pile.cards.push(card);
		hand.splice(cardId, 1);
	}

	return res;
}

