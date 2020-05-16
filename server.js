///// SETUP SERVER
const express = require("express");
const socket = require("socket.io");

//App Setup
const app = express();
const server = app.listen(process.env.PORT || 9999, function() {
	console.log("App listening on Port " + 9999);
});

// Static files
app.use("/images", express.static("public/images", {
	maxAge: "1d",
}));
app.use("/sounds", express.static("public/sounds", {
	maxAge: "1d",
}));
app.use(express.static("public"));

//Socket setup
const io = socket(server);

// GLOBAL DATA

var players = {};
var matches = {};
var queueNumber = 1;

// CONSTANTS
const vuileFritsTime = 9000;
const vuileFritsTimeout = 2000;
const baudetTime = 10000;
const disconnectTimeout = 20000;
const turnTime = 99000;
const startHand = 5;
const maxParticipants = 6;

// SOCKET CONNECTION FUNCTIONS

io.sockets.on("connection", function (socket) {
	console.log("connection: " + socket.id);
	players[socket.id] = {
		matchId: false,
		inQueue: false
	};

	// Match Events
	socket.on("disconnect", onDisconnect);
	socket.on("joinQueue", function(name) {
		joinQueue(socket.id, name);
	});
	socket.on("startMatch", createMatches);

	// Fritsen Events
	socket.on("playCard", function(cardId, pileId) {
		playCard(socket.id, cardId, pileId);
	});
	socket.on("frits", fritsCards);
	socket.on("vuileFrits", vuileFritsCards);
	socket.on("getPlayerNames", playersInMatch);
	console.log("connection handled");
});


// SOCKET HANDLERS

function onDisconnect() {
	console.log("onDisconnect: disconnect: " + this.id);
	var player = players[this.id];
	if (!player) {
		return;
	}

	var matchId = player.matchId;
	if (matchId) {
		var match = matches[matchId];
		var result = getRule("Disconnect", player.name);
		if (match && !checkWin(match, player, result)) {
			match.state = "disconnect";
			player.disconnect = true;
			var timeout = disconnectTimeout;

			setTimeout(function() {
				console.log("onDisconnect: timeout expired ", match);
				if (match.state === "disconnect") {
					match.playerIds.forEach(function(id) {
						var p = players[id];
						if (p) {
							p.done = true;
						}
					});
					checkWin(match, player, result);
				}
			}, disconnectTimeout);

			return updateCards(match, result, timeout);
		}
	} else if (player.inQueue) {
		player.inQueue = false;
		var queue = getQueue();
		queue.forEach(function(p) {
			io.to(p.id).emit("queue", queue);
		});
		delete players[this.id];
		console.log("onDisconnect: player deleted");
	}
}


// MATCH HANDLERS

function joinQueue(socketId, name) {
	console.log("joinQueue: joinQueue: " + socketId + " - " + name);
	var player = players[socketId];
	if (!player) {
		return;
	}

	if (tryReconnectPlayer(player, socketId, name)) {
		return;
	}

	player.inQueue = queueNumber;
	queueNumber++;

	player.id = socketId;
	player.matchId = false;
	player.name = name;
	player.done = false;
	player.vuilefrits = 0;
	player.turnCount = 0;
	player.cards = [];

	var queue = getQueue();
	queue.forEach(function(p) {
		io.to(p.id).emit("queue", queue);
	});
	console.log("joinQueue: join handled");
}

function tryReconnectPlayer(player, socketId, name) {
	for (var matchId in matches) {
		var match = matches[matchId];
		var disconnectId = "";

		if (match.state === "disconnect") {
			for (var playerId in players) {
				var p = players[playerId];

				if (p.disconnect) {
					players[socketId] = p;
					match.state = "playing";
					var index = match.playerIds.indexOf(playerId);

					delete match.playerIds[index];
					match.playerIds.splice(index, 0, socketId);

					match.playerIds = match.playerIds.filter(function (el) {
						return el != null;
					});

					if (match.turnId === playerId) {
						match.turnId = socketId;
					}

					players[socketId].id = socketId;
					players[socketId].name = p.name;
					disconnectId = playerId;
					break;
				}
			}

			if (disconnectId !== "") {
				delete players[disconnectId];
				updateCards(match, getRule("Reconnected", name));
				return true;
			}
		}
	}

	return false;
}

function createMatches() {
	var participants = getQueue();

	if (participants.length === 0 || this.id !== participants[0]["id"]) {
		return;
	}

	// while number of players is in abundance keep creating matches of max size
	while (participants.length > 2 * maxParticipants) {
		createMatch(participants.splice(0, maxParticipants));
	}

	// if larger than maximum number split in two groups else all in one group
	if (participants.length > maxParticipants) {
		var playerNum = participants.length / 2;
		createMatch(participants.splice(0, playerNum));
	}

	createMatch(participants);
}

function createMatch(participants) {
	console.log("createMatch: participants.length=",participants.length);

	var matchId = createId();
	matches[matchId] = { playerIds: [], state: "vuileFrits", turnId: false, piles: [], frits: false, lastMove: -1, deck: createDeck(), baudetTimeout: false };
	var match = matches[matchId];

	placeWillemAndFrits(participants);

	participants.forEach( function(p) {
		var player = players[p.id];
		if (player) {
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
	while (match.deck.length > 0 && (pcs.length === 0 || pcs[pcs.length - 1].identity === "Joker" )) {
		drawCards(firstPile.cards, match.deck, 1);
	}

	match.playerIds.forEach( function(id) {
		io.to(id).emit("match started");
	});
	updateCards(match, getRule("Update", false), vuileFritsTime);

	setTimeout(function() {
		if (match.state === "vuileFrits") {
			match.state = "playing";
		}
		match.turnId = -1;
		nextPlayer(match);
		updateCards(match, getRule("Start", false));
	}, vuileFritsTime);
	console.log("createMatch: match created");
}


// FRITS MOVE HANDLERS

function playCard(socketId, cardId, pileId) {
	console.log("playCard: " + socketId + " -> (" + cardId + ", " + pileId + ")");

	var match = findMatchBySocketId(socketId);
	var player = players[socketId];
	if (!match || !player) {
		return;
	}

	if (match.state === "timeout") {
		return updateCards(match, getRule("DesPauze", player.name));
	}

	if (match.state === "disconnect") {
		return updateCards(match, getRule("DesBeurt", player.name));
	}

	if (match.state === "vuileFrits") {
		return updateCards(match, getRule("DesVuil", player.name));
	}

	var hand = player.cards;
	var piles = match.piles;

	if (cardId >= hand.length || pileId >= piles.length) {
		return updateCards(match, getRule("Fout", player.name));
	}

	if ((match.state === "playing" && match.turnId !== socketId)) {
		return updateCards(match, getRule("DesBeurt", player.name));
	}

	var result = placeOnPile(cardId, pileId, match, hand, socketId, player);
	var timeout = 0;
	//valid move
	if (result.value > 0) {
		match.lastMove = pileId;

		//Remove player when he has no cards left
		if (hand.length === 0) {
			player.done = true;

			result = getRule("Uit", player.name);

			if (checkWin(match, player, result)) {
				return;
			}
		}

		if (match.state === "baudet" && match.baudetTimeout) {
			clearTimeout ( match.baudetTimeout );
			match.baudetTimeout = false;
		}

		match.state = "playing";
		var achievements = getAchievements(match, result);

		if (result.name === "Baudet") {
			match.state = "baudet";
			timeout = baudetTime;

			match.baudetTimeout = setTimeout(function() {
				newHand(hand, match.deck);
				if (match.state === "baudet") {
					match.state = "playing";
				}
				match.baudetTimeout = false;
				nextPlayer(match);
				updateCards(match, getRule("Update", false));
			}, baudetTime);
		} else {
			nextPlayer(match);
		}
	}

	return updateCards(match, result, timeout, achievements);
}

function fritsCards() {
	console.log("fritsCards: " + this.id);
	var match = findMatchBySocketId(this.id);
	var player = players[this.id];

	if (!match || !player || match.state === "timeout" || match.state === "disconnect") {
		return;
	}

	if (match.state === "vuileFrits") {
		return updateCards(match, getRule("DesVuil", player.name));
	}

	if (!match.frits && match.state === "playing" && match.turnId === this.id) {
		drawCards(player.cards, match.deck, 2);
		match.frits = true;

		//add new pile if no pile is empty
		if (match.piles[match.piles.length - 1].cards.length > 0) {
			addPile(match);
		}

		var result = getRule("Frits", player.name);

		updateCards(match, result);
	} else {
		if (match.turnId !== this.id && match.state !== "baudet") {
			return updateCards(match, getRule("DesBeurt", player.name));
		} else if (match.turnId === this.id && match.frits) {
			return updateCards(match, getRule("AlGefritst", player.name));
		} else {
			return updateCards(match, getRule("Fout", player.name));
		}
	}
	console.log("fritsCards: handled");
}

function vuileFritsCards() {
	console.log("vuileFritsCards: " + this.id);
	var match = findMatchBySocketId(this.id);
	if (match && match.state === "vuileFrits") {
		var player = players[this.id];
		if (player && Date.now() > player.vuilefrits) {
			var hand = player.cards;
			newHand(hand, match.deck);
			var result = getRule("VuileFrits", player.name);
			updateCards(match, result);
			player.vuilefrits = Date.now() + vuileFritsTimeout;
		}
	}
	console.log("vuileFritsCards: handled");
}

function playersInMatch() {
	console.log("playersInMatch: " + this.id);
	var match = findMatchBySocketId(this.id);
	var player = players[this.id];

	if (!match || !player) {
		return;
	}


	var playerNames = [];

	match.playerIds.forEach(function(id) {
		var p = players[id];
		if (p) {
			playerNames.push(p.name);
		}
	});


	io.to(this.id).emit("playerNames", playerNames);
}

// FRITS GAME HELPER FUNCTIONS

function getQueue() {
	var queue = [];
	for (var playerId in players) {
		var p = players[playerId];
		if (p && p.inQueue) {
			queue.push({name: p.name, id: playerId, num: p.inQueue});
		}
	}
	queue.sort(function(a, b) {
		return a.num - b.num;
	});

	var willemIndex = minHammingDistanceIndex(queue, "Willem");
	if (willemIndex >= 0) {
		queue.unshift(queue.splice(willemIndex, 1)[0]);
	}

	return queue;
}

function updateCards(match, result, timeout, achievements) {
	if (!match || !match.piles) {
		return;
	}
	var piles = [];
	for (let i = 0; i < match.piles.length; i++) {
		var asStrings = match.piles[i].cards.map(c => Identities[c.identity] + Suits[c.suit]);
		piles.push(asStrings);
	}

	for (let i = 0; i < match.playerIds.length; i++) {
		var playerId = match.playerIds[i];
		var player = players[playerId];
		if (player) {
			if (!player.done && player.cards.length === 0) {
				player.done = true;
				checkWin(match, player, getRule("Uit", player.name));
			}
			var cardStrings = player.cards.map(c => Identities[c.identity] + Suits[c.suit]);
			io.to(playerId).emit("update cards", cardStrings, match.deck.length, piles, match.frits, match.lastMove, result, timeout, achievements);
		}
	}

	if (result && result.fritsPauzeTime > 0) {
		match.state = "timeout";
		timeout = result.fritsPauzeTime;

		setTimeout(function() {
			if (match.state === "timeout") {
				match.state = "playing";
			}
		}, result.fritsPauzeTime);
	}
	console.log("updateCards: cards updated");
}

function getAchievements(match, result) {
	if (!match || !match.piles) {
		return;
	}

	var piles = match.piles;
	var newAchievements = [];

	if (!match.lastMove || match.lastMove < 0) {
		return [];
	}

	var currentPile = piles[match.lastMove];

	// Uitfrits achievements
	var player = players[match.turnId];
	if (player) {
		if (player.cards.length === 0) {
			if (player.turnCount <= 2) {
				newAchievements.push({ by: player.name,	text: "Eiken Frits"	});
			} else if (player.turnCount <= 3) {
				newAchievements.push({ by: player.name, text: "Platina Frits" });
			} else if (player.turnCount <= 4) {
				newAchievements.push({ by: player.name, text: "Diamanten Frits" });
			} else if (player.turnCount <= 5) {
				newAchievements.push({ by: player.name, text: "Gouden Frits" });
			} else if (player.turnCount <= 7) {
				newAchievements.push({ by: player.name, text: "Zilveren Frits" });
			} else if (player.turnCount <= 9) {
				newAchievements.push({ by: player.name, text: "Bronzen Frits" });
			}
		}
	}

	var ids = currentPile.cards.map((pile) => pile.identity);
	var suits = currentPile.cards.map((pile) => pile.suit);
	var size = ids.length;

	if (size < 1) {
		return newAchievements;
	}

	if (ids[size - 1] === 12) {
		var counterKim = 0;
		piles.forEach((pile) => {
			pile.cards.forEach((card) => {
				if (card.identity === 12) {
					counterKim++;
				}
			});
		});

		if (counterKim === 1) {
			newAchievements.push({
				by: player.name,
				text: "Eerste Kim"
			});
		}
	}

	if (size < 2) {
		return newAchievements;
	}

	var isStart = piles.length === 2 && size === 2;
	var diff = ids[size - 1] - ids[size - 2];

	if (diff > 9 && suits[size - 2] === suits[size - 1]) {
		const achievementText = isStart ? "Tactical Start" : "Tactical Frits";
		newAchievements.push({
			by: player.name,
			text: achievementText
		});
	} else if (diff === 1 && suits[size - 2] === suits[size - 1]) {
		const achievementText = isStart ? "Soepele Start" : "Soepele Frits";
		newAchievements.push({
			by: player.name,
			text: achievementText
		});
	} else if (isStart && result.name === "Offer") {
		newAchievements.push({
			by: player.name,
			text: "Offer Start"
		});
	}

	if (ids[size - 2] !== 12 &&
		ids[size - 1] === 6
	) {
		newAchievements.push({
			by: player.name,
			text: "Lavendelfrits"
		});
	}

	if (size >= 4 &&
		ids[size - 1] === 12 &&
		ids[size - 2] === 12 &&
		ids[size - 3] === 12 &&
		ids[size - 4] === 12
	) {
		newAchievements.push({
			by: player.name,
			text: "Vierde Kim",
		});
	}

	return newAchievements;
}

function nextPlayer(match) {
	if (!match || !match.playerIds) {
		return;
	}

	var index = match.playerIds.indexOf(match.turnId);

	var next = (index + 1) % match.playerIds.length;
	match.turnId = match.playerIds[next];

	var p = players[match.turnId];

	if (p.done) {
		nextPlayer(match);
	} else {
		match.frits = false;
		p.turnCount++;
		if (match.turnTimer) {
			clearTimeout(match.turnTimer);
		}

		match.turnTimer = setTimeout(function() {
			skipTurn(match, p);
		}, turnTime);
	}
}

function checkWin(match, player, result) {
	if (!match || !match.playerIds) {
		return;
	}

	console.log("checkWin: match=",match);
	var inGame = 0;
	var loserName = player.name;
	match.playerIds.forEach(function(id) {
		var p = players[id];
		if (p && !p.done) {
			inGame++;
			loserName = p.name;
		}
	});

	if (inGame <= 1) {
		var achievements = getAchievements(match, result);
		updateCards(match, result, 0, achievements);

		match.playerIds.forEach( function(id) {
			io.to(id).emit("game over", loserName);
		});
		removeMatch(player.matchId);

		console.log("checkWin: removed match=" , match);
		return true;
	}
	return false;
}

function skipTurn(match, player) {
	if (!match || !match.playerIds || match.playerIds.length < 2) {
		return;
	}

	if (!match.frits) {
		drawCards(player.cards, match.deck, 2);
	}

	nextPlayer(match);
	updateCards(match, getRule("BeurtOver", player.name));
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
	if (player && player.matchId) {
		return matches[player.matchId];
	}
	return false;
}

function removeMatch(matchId) {
	var match = matches[matchId];
	for (var key in match) {
		delete match[key];
	}

	delete matches[matchId];
}

//Card Games
var Suits = Object.freeze({"Clubs":"C", "Hearts":"H", "Spades":"S", "Diamonds":"D", "Red": "R", "Black":"B"});
var Identities = Object.freeze({"Joker":"X", 2:"2", 3:"3", 4:"4", 5:"5", 6:"6", 7:"7", 8:"8", 9:"9", 10:"T", 11:"J", 12:"Q", 13:"K", 14:"A"});

function Card(identity, suit) {
	this.identity = identity;
	this.suit = suit;
}

function createDeck() {
	var numJokers = 3;
	var deck = [];
	var suits = ["Clubs", "Hearts", "Spades", "Diamonds"];
	suits.forEach(function(suit) {
		for (var i = 2; i <= 14; i++) {
			deck.push(new Card(i, suit));
		}
	});

	var colors = ["Red", "Black"];
	for (var i = 0; i < numJokers; i++) {
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

function getHand(player, deck) {
	player.cards = [];
	drawCards(player.cards, deck, startHand);
}

function drawCards(cards, deck, numCards) {
	numCards = Math.min(numCards, deck.length);
	for (var i = 0; i < numCards; i++) {
		cards.push(deck.pop());
	}
}

function newHand(hand, deck) {
	var numCards = hand.length;
	for (var i = 0; i < numCards; i++) {
		deck.unshift(hand.pop());
	}
	drawCards(hand, deck, numCards);
}


// Fritsen Rules

function Pile(cards) {
	this.cards = cards;
}

function addPile(match) {
	var pile = new Pile([]);
	match.piles.push(pile);
	return pile;
}

function Rule(name, description, value, fritsPauzeTime) {
	this.name = name;
	this.description = description;
	this.value = value;
	this.fritsPauzeTime = fritsPauzeTime;
}

var Rules = [
	new Rule("DesPauze", "Fritsje des: het is fritspauze", 0, 2500),
	new Rule("DesBeurt", "Fritsje des: je bent niet aan de beurt", 0, 2500),
	new Rule("DesVuil", "Fritsje des: je mag geen zet doen tijdens het vuil fritsen", 0, 0),
	new Rule("Fout", "Fritsje des: deze zet bestaat niet", 0, 2500),
	new Rule("Goed", "heeft een kaart opgelegd", 2, 0),
	new Rule("Update", "", 0, 0),
	new Rule("Start", "", 2, 0),
	new Rule("BeurtOver", "Fritsje des en beurt voorbij: je hebt maar " + (turnTime/1000) + " seconden", 2, 2500),
	new Rule("Offer", "Offerfrits: neem een Fritsje", 1, 2500),
	new Rule("Joker", "Joker: andere spelers nemen een Fritsje", 1, 9000),
	new Rule("Kim", "Kim: andere spelers nemen een Kimmetje", 1, 9000),
	new Rule("VierdeKim", "Vierde Kim: andere spelers nemen een dubbele Kim", 1, 9000),
	new Rule("Joris", "Joris: andere spelers nemen een Jorisje", 1, 9000),
	new Rule("Lisa", "Lisa: andere spelers nemen een Lisaatje", 1, 9000),
	new Rule("Baudet", "Thierry'tje: je wilt je kaarten inwisselen", 1, 0),
	new Rule("BaudetFout", "Fritsje des: je mag niet uitfrisen met een 6 op een vrouw", 0, 2500),
	new Rule("Klaver", "heeft het inruilen voorkomen", 1, 5000),
	new Rule("Erik", "Erikje: je hebt zichzelf geklaverd! ", 1, 2500),
	new Rule("KlaverFout", "Fritsje des: deze zet bestaat niet", 0, 2500),
	new Rule("DubbelNegen", "Dubbele Frits: 9 op 9!", 1, 9000),
	//new Rule("AasKoning", "Nice! Aas en Koning op Kim", 1, 0),
	new Rule("Frits", "heeft gefritst", 1, 1000),
	new Rule("AlGefritst", "Fritsje des: je hebt al gefritst", 0, 2500),
	new Rule("JokerUit", "Fritsje des: je mag niet uitfritsen met een joker", 0, 2500),
	new Rule("JokerFout", "Fritsje des: jokers mogen alleen op de jokerstapel", 0, 2500),
	new Rule("Uit", "Uittreefritsje: je hebt geen kaarten meer!", 1, 0),
	new Rule("VuileFrits", "Dubbele frits: je hebt een vuile Frits gedaan", 0, 0),
	new Rule("Disconnect", "heeft het spel verlaten", 0, 0),
	new Rule("Reconnected", "is opnieuw verbonden", 0, 0),
];

function getRule(name, playerName) {
	console.log("getRule: name=", name, "playerName=", playerName);
	var rule = Rules.find(function(r) {
		return r.name === name;
	});

	if (playerName) {
		rule = JSON.parse(JSON.stringify(rule));
		rule.by = playerName;
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
//7. 3 of Clubs on a 6 after move Baudet (Klaver)
//8. Same suit with higher value
//9. Same suit with 1 lower value (Offer)
//10. Same suit with 2 on Ace
//11. All same suit: King + Ace on Queen - Not implemented


function checkCards(card, pileId, match, hand, socketId, player) {
	//7. 3 of Clubs on the last 6, when baudet is executed (Klaver)
	//   first check as all other moves should be rejected during the baudetTimeout
	if (match.state === "baudet") {
		if (card.identity === 3 && card.suit === "Clubs" && match.lastMove === pileId) {
			if (match.turnId === socketId) {
				return getRule("Erik", player.name);
			} else {
				return getRule("Klaver", player.name);
			}
		} else {
			return getRule("KlaverFout", player.name);
		}
	}


	var pile = match.piles[pileId];

	//1. Only if card is Joker on Joker pile (Joker)
	if (card.identity === "Joker" || pile.jokerPile) {
		if (card.identity === "Joker" && hand.length === 1) {
			return getRule("JokerUit", player.name);
		} else if (card.identity === "Joker" && pile.jokerPile) {
			return getRule("Joker", player.name);
		} else {
			return getRule("JokerFout", player.name);
		}
	}

	if (pile.cards.length === 0) {
		if (match.frits) {
			return getRule("Goed", player.name);
		} else {
			return getRule("Fout", player.name);
		}
	}

	var top = pile.cards[pile.cards.length - 1];

	var cardId = Identities[card.identity];
	var pileIdentity = Identities[top.identity];
	var cardSuit = Suits[card.suit];
	var pileSuit = Suits[top.suit];

	//2. Card is a 9
	if (cardId === "9") {
		if (pileIdentity === "9") {
			return getRule("DubbelNegen", player.name);
		} else {
			return getRule("Goed", player.name);
		}
	}

	//3. Queen on a Queen (Kim)
	if (pileIdentity === "Q") {
		if (cardId === "Q") {
			for (var i = pile.cards.length - 1; i >= 0; i--) {
				var c = Identities[pile.cards[i].identity];
				if (c !== "Q") {
					break;
				}

				if (i <= pile.cards.length - 3) {
					return getRule("VierdeKim", player.name);
				}
			}
			return getRule("Kim", player.name);
		}

		//4. Jack of clubs on Red Queen or vice versa (Joris)
		if (cardId === "J" && cardSuit === "C" && (pileSuit === "H" || pileSuit === "D")) {
			return getRule("Joris", player.name);
		}

		//6. 6 on a Queen (Baudet)
		if (cardId === "6") {
			if (hand.length > 1) {
				return getRule("Baudet", player.name);
			} else {
				return getRule("BaudetFout", player.name);
			}
		}
	}

	//4. Joris Reverse
	if (pileIdentity === "J" && pileSuit === "C") {
		if (cardId === "Q" && (cardSuit === "H" || cardSuit === "D")) {
			return getRule("Joris", player.name);
		}
	}

	//5. King on Ace of Hearts or vice versa (Lisa)
	if ((cardId === "A" && cardSuit === "H") || (pileIdentity === "A" && pileSuit === "H")) {
		if (cardId === "K" || pileIdentity === "K") {
			return getRule("Lisa", player.name);
		}
	}

	if (cardSuit === pileSuit) {
		var cid = card.identity;
		var pid = top.identity;

		//8. Same suit with higher value
		if (cid > pid) {
			return getRule("Goed", player.name);
		}

		//9. Same suit with 1 lower value (Offer)
		if (cid === pid - 1) {
			return getRule("Offer", player.name);
		}

		//10. Same suit with 2 on Ace
		if (cardId === "2" && pileIdentity === "A") {
			return getRule("Goed", player.name);
		}

	}

	return getRule("Fout", player.name);
}

function placeOnPile(cardId, pileId, match, hand, socketId, player) {
	var card = hand[cardId];
	var result = checkCards(card, pileId, match, hand, socketId, player);

	if (result.value > 0) {
		var pile = match.piles[pileId];

		pile.cards.push(card);
		hand.splice(cardId, 1);
	}

	return result;
}


// Helper Functions

// Hamming function for different size strings: find smallest match between strings.
function HammingDistance(a, b) {
	// make sure a is smallest
	a = a.toLowerCase();
	b = b.toLowerCase();
	if (a.length > b.length) {
		var c = b;
		b = a;
		a = c;
	}
	var diff = b.length - a.length;
	var minDist = b.length;
	for (var i = 0; i <= diff; i++) {
		var dist = diff;
		for (var j = 0; j < a.length; j++) {
			if (a[j] !== b[(j+i)]) {
				dist++;
			}
		}
		if (dist < minDist) {
			minDist = dist;
		}
	}
	return minDist;
}

// return closest player closest to name, maximum 3 difference
function minHammingDistanceIndex(participants, name) {
	var names = participants.map(p => p.name);

	var index = -1;
	var minDist = 4;

	for (var i = 0; i < names.length; i++) {
		var dist = HammingDistance(names[i], name);
		if (dist < minDist) {
			minDist = dist;
			index = i;
		}
	}
	return index;
}

// player most like willem is first and most like frits is last
function placeWillemAndFrits(participants) {
	if (participants.length >= 2) {
		var fritsIndex = minHammingDistanceIndex(participants, "Frits");
		if (fritsIndex >= 0) {
			participants.push(participants.splice(fritsIndex, 1)[0]);
		}

		var willemIndex = minHammingDistanceIndex(participants, "Willem");
		if (willemIndex >= 0) {
			participants.unshift(participants.splice(willemIndex, 1)[0]);
		}
	}
}
