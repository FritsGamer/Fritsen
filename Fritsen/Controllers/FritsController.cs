using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;
using DeckOfCards.PlayingCards;
using Fritsen.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Session;
using Newtonsoft.Json;

namespace Fritsen.Controllers
{
    [Route("api/[controller]")]
    public class FritsController : Controller
    {
        public const string SessionKeyNameBoard = "_Board";
        public Board board;

        public void store()
        {
            var boardStr = JsonConvert.SerializeObject(board);
            HttpContext.Session.SetString(SessionKeyNameBoard, boardStr);

        }

        public void load()
        {
            if (board == null)
            {
                var boardStr = HttpContext.Session.GetString(SessionKeyNameBoard);
                board = JsonConvert.DeserializeObject<Board>(boardStr);
            }
        }

        [HttpGet("[action]")]
        public Game newGame()
        {
            board = new Board();
            board.initialize();

            Hand willem = new Hand("Willem");
            Hand frits = new Hand("Frits");

            willem.addCards(board.deck,5);
            board.hands.Add(willem);
            frits.addCards(board.deck, 5);
            board.hands.Add(frits);

            board.addPile(board.deck);
            board.addPile();

            store();
            return new Game(board);
        }

        [HttpGet("[action]")]
        public Game playCard(string card, string pile, bool frits)
        {
            load();

            int cardPos, pilePos;

            try
            {
                cardPos = int.Parse(card.Split("card").LastOrDefault());
                pilePos = int.Parse(pile.Split("pile").LastOrDefault());
            }
            catch
            {
                board.status = FritsRules.getResult("Fout");
                return new Game(board);
            }

            Hand hand = board.hands.ElementAt(board.playerTurn);
            Pile p = pilePos == 0 ? board.jokers : board.piles.ElementAt(pilePos-1);
            PlayingCard pc = hand.cards.ElementAt(cardPos);
            
            board.status = hand.placeOnPile(pc, p, frits);
            if (board.status.value > 0 && p.cards.Count == 1 && !p.jokerPile)
                board.addPile();
            else if (board.status.name == "Baudet")
                newHand(hand);

            if (board.status.value > 0)
                nextPlayer();

            store();
            return new Game(board);
        }

        public void newHand(Hand hand)
        {
            int draws = hand.cards.Count;
            hand.bottomOfDeck(board.deck);

            hand.addCards(board.deck, draws);
        }
        
        public void nextPlayer()
        {
            board.playerTurn = (board.playerTurn + 1) % board.hands.Count;
        }

        [HttpGet("[action]")]
        public Game loadNextPlayer()
        {
            load();

            nextPlayer();

            store();
            return new Game(board);
        }

        [HttpGet("[action]")]
        public Game vuileFrits()
        {
            load();

            Hand hand = board.hands.ElementAt(board.playerTurn);

            if (hand != null && hand.cards.Count != 5)
                return new Game(board);

            newHand(hand);

            store();
            return new Game(board);
        }

        [HttpGet("[action]")]
        public Game frits(string card, string pile)
        {
            load();

            Hand hand = board.hands.ElementAt(board.playerTurn);
            hand.addCards(board.deck, 2);
            board.status = FritsRules.getResult("Frits");

            store();
            return new Game(board);
        }
    }
}
