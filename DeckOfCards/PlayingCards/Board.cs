using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace DeckOfCards.PlayingCards
{
    public class Board
    {
        public List<Pile> piles;
        public PlayingCardDeck deck;
        public Pile jokers;
        public List<Hand> hands;
        public Result status;
        public int playerTurn;

        public Board()
        {
            deck = new PlayingCardDeck();
            piles = new List<Pile>();
            jokers = new Pile();
            jokers.jokerPile = true;
            hands = new List<Hand>();
            status = FritsRules.getResult("Goed");
            this.playerTurn = 0;
        }

        public void initialize()
        {
            deck = new PlayingCardDeck(4);
            deck.Shuffle();
        }
        
        public void addPile()
        {
            Pile p = new Pile();
            piles.Add(p);
        }

        public void addPile(PlayingCard card)
        {
            Pile p = new Pile(card);
            piles.Add(p);
        }

        public void addPile(PlayingCardDeck deck)
        {
            Pile p = new Pile();

            PlayingCard card = deck.First();
            p.cards.Add(card);
            deck.Remove(card);

            while (card.Identity.IsJoker)
            {
                card = deck.First();
                p.cards.Add(card);
                deck.Remove(card);
            }

            piles.Add(p);
        }

        public List<PlayingCard> getOpen()
        {
            return piles.Select(p => p.topCard()).ToList();
        }
    }

    public class Pile
    {
        public List<PlayingCard> cards;
        public bool jokerPile;

        public Pile()
        {
            cards = new List<PlayingCard>();
            jokerPile = false;
        }

        public Pile(PlayingCard card) : this()
        {
            cards.Add(card);
        }
        
        public PlayingCard topCard()
        {
            if (cards.Count == 0)
                return PlayingCard.UnknownCard();

            return PlayingCard.fromCode(cards.LastOrDefault().code());   
        }

        public Result fitsOnPile(PlayingCard card, bool frits, Hand hand)
        {
            PlayingCard newCard = PlayingCard.fromCode(card.code());

            return FritsRules.checkCards(newCard,this,frits, hand);
        }
    }
}