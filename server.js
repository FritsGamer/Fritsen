///// SETUP SERVER

const express = require('express');
const app = express();

app.use(express.static("public"));  // Staticly serve pages, using directory 'public' as root 

const server = app.listen(process.env.PORT || 9999);
const io = require('socket.io')(server);
console.log("Started server on port 9999");

// GLOBAL DATA

var players = {};
var matches = {};

// CONSTANTS
const vuileFritsTime = 8000;
const vuileFritsTimeout = 2000;
const baudetTime = 5000;
const startHand = 5;
const log = false;


// SOCKET CONNECTION FUNCTIONS

io.sockets.on('connection', function (socket) {
	if(log) console.log("connection: " + socket.id);
	players[socket.id] = {
		matchId: false,
		inQueue: false
	};

    // Match Events
    socket.on('disconnect', onDisconnect);
    socket.on('joinQueue', function(name){ joinQueue(socket.id, name); });
    socket.on('startMatch', createMatch);

    // Fritsen Events
    socket.on('playCard', function(cardId, pileId){ playCard(socket.id, cardId, pileId); });
    socket.on('frits', fritsCards);
    socket.on('vuileFrits', vuileFritsCards);
	if(log) console.log("connection handled");
});


// SOCKET HANDLERS

function onDisconnect(){
	if(log) console.log("disconnect: " + this.id);
	var player = players[this.id];
	if(!player) return;

	var matchId = player.matchId;
	if(matchId){
		var match = matches[matchId];
		if(match){
			match.playerIds.forEach(function(id) {
				var p = players[id];
				if(p) p.done = true; 
			});
			player.done = false;
			var rule = getRule("Disconnect");
			var result = new Rule(rule.name, player.name + rule.description, rule.value);
			checkWin(match, player, result);
		}
	} else if (player.inQueue){
		player.inQueue = false;
		var queue = getQueue();
		queue.forEach(function(p) { io.to(p.id).emit('queue', queue); });
	}
		
	
	delete players[this.id];
	if(log) console.log("player deleted");
}


// MATCH HANDLERS

function joinQueue(socketId, name) {
	if(log) console.log("joinQueue: " + socketId + " - " + name);
	var player = players[socketId];
	if(!player) return;

	player.inQueue = true;
	player.matchId = false;
	player.name = name;
	player.done = false;
	player.vuilefrits = 0;
	player.cards = [];
	
	var queue = getQueue();
	queue.forEach(function(p) { io.to(p.id).emit('queue', queue); });
	if(log) console.log("queue join handled");
}

function createMatch() {
	if(log) console.log("createMatch: " + this.id);
	var participants = getQueue();

	if(participants.length == 0)
		return;

	var matchId = createId();
	matches[matchId] = { playerIds: [], state: 0, turnId: false, piles: [], frits: false, lastMove: -1, deck: createDeck(), baudetTimeout: false };
	var match = matches[matchId];

	placeWillemAndFrits(participants);

	participants.forEach( function(p) {
		var player = players[p.id];
		if(player){
			player.matchId = matchId;
			player.inQueue = false;
			getHand(player, match.deck);
			match.playerIds.push(p.id);
		}
	});

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

	match.playerIds.forEach( function(id){ io.to(id).emit("match started", false); });
	updateCards(match, false);

	setTimeout(function(){
		nextPlayer(match);
		updateCards(match, getRule("Goed"));
	}, vuileFritsTime);
	if(log) console.log("match created");
}


// FRITS MOVE HANDLERS

function playCard(socketId, cardId, pileId) {
	if(log) console.log("playCard: " + socketId + " -> (" + cardId + ", " + pileId + ")");
	var match = findMatchBySocketId(socketId);
	var player = players[socketId];
	if(!match || !player) return;

	var hand = player.cards;
	var piles = match.piles;

	if(cardId >= hand.length || pileId >= piles.length)
		return updateCards(match, getRule("Fout"));

	if((match.state != 2 && match.turnId != socketId) || (match.state == 2 && match.turnId == socketId))
		return updateCards(match, getRule("Fout"));

	var result = placeOnPile(cardId, pileId, match, hand);

	//valid move
	if (result.value > 0) {
		//Remove player when he has no cards left
		if(hand.length == 0) {
			player.done = true;

			rule = getRule("Uit");
			result = new Rule(rule.name, player.name + rule.description + result.description, rule.value);

			if(checkWin(match, player, result))
				return;
		}

		if(match.state == 2 && match.baudetTimeout){
			clearTimeout ( match.baudetTimeout );
			match.baudetTimeout = false;
		}
		
		match.state = 1;
		match.lastMove = pileId;
		match.frits = false;

		if (result.name == "Baudet"){
			match.state = 2;

			match.baudetTimeout = setTimeout(function(){
				newHand(hand, match.deck);
				match.state = 1;
				match.baudetTimeout = false;
				nextPlayer(match);
				updateCards(match, getRule("Goed"));
			}, baudetTime);
		} else {
			nextPlayer(match);
		}
	}
	
	return updateCards(match, result);
}

function fritsCards(){
	if(log) console.log("fritsCards: " + this.id);
	var match = findMatchBySocketId(this.id);
	if(match && !match.frits && match.state != 2 && match.turnId == this.id){
		var player = players[this.id];
		if(player){
			match.state = 1;
			drawCards(player.cards, match.deck, 2);
			match.frits = true;	

			//add new pile if no pile is empty
			if (match.piles[match.piles.length - 1].cards.length > 0)
				addPile(match);

			var rule = getRule("Frits");
			var result = new Rule(rule.name, player.name + rule.description, rule.value);
			updateCards(match, result);
		}
	}
	if(log) console.log("fritsCards handled");
}

function vuileFritsCards() {
	if(log) console.log("vuileFritsCards: " + this.id);
	var match = findMatchBySocketId(this.id);
	if(match && match.state == 0){
		var player = players[this.id];
		if(player && Date.now() > player.vuilefrits){
			var hand = player.cards;
			newHand(hand, match.deck);
			var rule = getRule("VuileFrits");
			var result = new Rule(rule.name, rule.description + player.name, rule.value);
			updateCards(match, result);
			player.vuilefrits = Date.now() + vuileFritsTimeout;
		}
	}
	if(log) console.log("vuileFritsCards handled");
}


// FRITS GAME HELPER FUNCTIONS

function getQueue(){
	var queue = [];
	for(playerId in players){
		var p = players[playerId];
		if(p && p.inQueue) 
			queue.push({name: p.name, id: playerId});
	}
	return queue;
}

function updateCards(match, result) {
	var piles = [];
	for (var i = 0; i < match.piles.length; i++) {
		var asStrings = match.piles[i].cards.map(c => Identities[c.identity] + Suits[c.suit]);
		piles.push(asStrings);
	}

	var turn = getTurnPlayer(match);

	for (var i = 0; i < match.playerIds.length; i++) {
		var playerId = match.playerIds[i];
		var player = players[playerId];
		if(player){
			var cardStrings = player.cards.map(c => Identities[c.identity] + Suits[c.suit]);
			io.to(playerId).emit("update cards", cardStrings, match.deck.length, piles, match.frits, match.lastMove, turn, result);
		}
	}
	if(log) console.log("updated cards");	
}

function getTurnPlayer(match){
	var player = players[match.turnId];
	if(!player)	return false;
	
	return {name: player.name, id: match.turnId, cards: player.cards.length};
}


function nextPlayer(match){
	var index = match.playerIds.indexOf(match.turnId);
	if(index < 0) {		
		match.turnId = match.playerIds[0];
		return;
	}

	var next = (index + 1) % match.playerIds.length;
	match.turnId = match.playerIds[next];

	var p = players[match.turnId];
	if(p && p.done)
		nextPlayer(match);
}

function checkWin(match, player, result){
	var inGame = 0;
	var loserName = player.name;
	match.playerIds.forEach(function(id) {
		var p = players[id];
		if(p && !p.done){
			inGame++; 
			loserName = p.name;
		}
	});

	if(inGame <= 1){
		updateCards(match, result);
		match.playerIds.forEach( function(id){ io.to(id).emit("game over", loserName); });
		removeMatch(player.matchId);
		return true;
	}
	return false;
}


// ID FUNCTIONS

function createId() {
	var id = "";
	var charset = "ABCDEFGHIJKLMNOPQRSTUCWXYZabcdefghijklmnopqrtsuvwxyz1234567890";
	for (var i = 0; i < 16; i++) {
		id += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return id;
}

function findMatchBySocketId(socketId) {
	var player = players[socketId];
	if(player && player.matchId){
		return matches[player.matchId];
	}
	return false;
}

function removeMatch(matchId) {
	delete matches[matchId];
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
	drawCards(player.cards, deck, startHand);
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
	new Rule("Goed", "", 2),
	new Rule("Soepel", "Soepele Frits", 1),
	new Rule("Stroef", "Stroeve Frits", 1),
	new Rule("Offer", "Offerfrits: Neem 1 fritsje", 1),
	new Rule("Joker", "Joker: Alle anderen nemen 1 fritsje", 1),
	new Rule("Kim", "Kim: Alle anderen nemen 1 fritsje", 1),
	new Rule("VierdeKim", "Vierde Kim: Alle anderen nemen 2 fritsjes", 1),
	new Rule("Joris", "Jorisje: Alle anderen nemen 1 fritsje", 1),
	new Rule("Lisa", "Lisa: Alle anderen nemen 1 fritsje", 1),
	new Rule("Baudet", "Baudet: Ruil je hand met de stapel en neem 2 fritsjes", 1),
	new Rule("BaudetFout", "Je kunt niet uitkomen met Baudet, neem 1 fritsje", 0),
	new Rule("Klaver", "Klaver! Je voorkomt dat Thierry aan de macht komt. De speler met Baudet mag niet ruilen", 1),
	new Rule("KlaverFout", "Je kunt nu alleen de klaveren 3 op de laatste 6 leggen", 0),
	new Rule("DubbelNegen", "Iedereen Dubbelfrits! Alle anderen nemen 2 fritsjes", 1),
	//new Rule("AasKoning", "Nice! Aas en Koning op Kim", 1),
	new Rule("Frits", " heeft gefritsd", 1),
	new Rule("JokerUit", "Je mag niet uitkomen met een Joker, neem 1 fritsje", 0),
	new Rule("JokerFout", "Jokers mogen alleen op de jokerstapel, neem 1 fritsje", 0),
	new Rule("Uit", " is uitgefritsd. ", 1),
	new Rule("VuileFrits", "Vuile Frits voor ", 0),
	new Rule("Disconnect", " heeft het spel verlaten", 0)
];

function getRule(name) {
	return Rules.find(function(r) { return r.name == name; });
}

//Rules - Possible placement:
//1. Only if card is Joker on Joker pile (Joker)
//2. Card is a 9
//3. Queen on a Queen (Kim)
//4. Jack of clubs on Red Queen or vice versa (Joris)
//5. King on Ace of Hearts or vice versa (Lisa)
//6. 6 on a Queen (Baudet)
//7. 3 of Clubs on a 6 after move Baudet (Klaver)
//8. Same suit with higher value
//9. Same suit with 1 lower value (Offer)
//10. Same suit with 2 on Ace
//11. All same suit: King + Ace on Queen - Not implemented


function checkCards(card, pileId, match, hand)
{	
    //7. 3 of Clubs on the last 6, when baudet is executed (Klaver) 
	//   first check as all other moves should be rejected during the baudetTimeout
	if(match.state == 2){
		if(card.identity == 3 && card.suit == "Clubs" && match.lastMove == pileId)
			return getRule("Klaver");
		else
			return getRule("KlaverFout");
	}


	var pile = match.piles[pileId];

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
			for(var i = pile.cards.length - 1; i >= 0; i--){
				var c = Identities[pile.cards[i].identity];
				if (c != 'Q')
					break;
				
				if(i <= pile.cards.length - 3)
					return getRule("VierdeKim");					
			}
			return getRule("Kim");
		}

		//4. Jack of clubs on Red Queen or vice versa (Joris)
		if (cardId == 'J' && cardSuit == 'C' && (pileSuit == 'H' || pileSuit == 'D'))
			return getRule("Joris");

		//6. 6 on a Queen (Baudet)
		if (cardId == '6'){
			if(hand.length > 1)
				return getRule("Baudet");
			else
				return getRule("BaudetFout");
		} 
	}

	//4. Joris Reverse
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
	var card = hand[cardId];
	var res = checkCards(card, pileId, match, hand);

	if (res.value > 0)
	{
		var pile = match.piles[pileId];

		pile.cards.push(card);
		hand.splice(cardId, 1);
	}

	return res;
}


// Helper Functions

// Hamming function for different size strings: find smallest match between strings.
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

// return closest participant closest to name, maximum 3 difference
function minHammingDistanceIndex(participants, name){
	var names = participants.map(p => p.name);

	var index = -1;
	var minDist = 4;

	for (var i = 0; i < names.length; i++){
		var dist = HammingDistance(names[i], name);
		if(dist < minDist){
			minDist = dist;
			index = i;
		}
	}
	return index;
}

// player most like willem is first and most like frits is last
function placeWillemAndFrits(participants){
	var fritsIndex = minHammingDistanceIndex(participants, "Frits");
	if(fritsIndex >= 0)
		participants.push(participants.splice(fritsIndex, 1)[0]);

	var willemIndex = minHammingDistanceIndex(participants, "Willem");
	if(willemIndex >= 0)
		participants.unshift(participants.splice(willemIndex, 1)[0]);
}