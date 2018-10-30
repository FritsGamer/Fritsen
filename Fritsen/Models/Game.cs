using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using DeckOfCards.PlayingCards;

namespace Fritsen.Models
{
    public class Game
    {
        public SimpleHand hand;
        public SimplePile[] piles;
        public SimplePile jokers;
        public int deck;
        public Result status;

        public Game(Board board)
        {
            this.hand = new SimpleHand(board.hands.ElementAt(board.playerTurn));
            this.piles = board.piles.Select((p, index) => new SimplePile(index + 1, p)).ToArray();
            this.jokers = new SimplePile(0, board.jokers);
            this.deck = (int) Math.Ceiling(0.2 * board.deck.Count);
            this.status = board.status;
        }
    }

    public class SimplePile
    {
        public int id;
        public string[] cards;

        public SimplePile(int id, Pile pile)
        {
            this.id = id;
            this.cards = pile.cards.Select(c => c.imgCode()).ToArray();
        }
    }

    public class SimpleHand
    {
        public string name;
        public string[] cards;

        public SimpleHand(Hand hand)
        {
            this.name = hand.playerName;
            this.cards = hand.cards.Select(c => c.imgCode()).ToArray();
        }
    }
}
