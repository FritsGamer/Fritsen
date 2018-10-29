using System;
using System.Collections.Generic;

namespace DeckOfCards.PlayingCards
{
    public class Hand
    {
        public List<PlayingCard> cards;
        
        public Hand()
        {
            cards = new List<PlayingCard>();
        }

        public void addCards(PlayingCardDeck deck, int numberOfCards)
        {
            int numberToTake = Math.Min(numberOfCards, deck.Count);

            List<PlayingCard> assign = deck.GetRange(0,numberToTake);
            foreach (var card in assign)
            {
                cards.Add(card);
                deck.Remove(card);
            }
        }
        public Result placeOnPile(PlayingCard card, Pile pile, bool frits)
        {
            Result res = pile.fitsOnPile(card, frits, cards.Count);

            if (res.value > 0)
            {
                cards.Remove(card);
                pile.cards.Add(card);
            }

            return res;
        }

        public void bottomOfDeck(PlayingCardDeck deck)
        {
            List<PlayingCard> assign = cards.GetRange(0, cards.Count);
            foreach (var card in assign)
            {
                deck.Add(card);
                cards.Remove(card);
            }
        }
    }
}