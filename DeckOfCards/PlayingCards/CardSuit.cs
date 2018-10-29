using System;

namespace DeckOfCards.PlayingCards
{
    public class CardSuit : IComparable<CardSuit>
    {
        public char Code;
        public string Name;
        public int Order;

        public CardSuit()
        {

        }

        public CardSuit(char code, string name, int order)
        {
            Code = code;
            Name = name;
            Order = order;
        }
        
        public int CompareTo(CardSuit other)
        {
            if (Order > other.Order) return 1;
            if (Order == other.Order) return 0;
            return -1;
        }

        public static CardSuit NoSuit()
        {
            return new CardSuit('N', "None", 100);
        }

        public static CardSuit Joker()
        {
            return new CardSuit('J', "Joker", 100);
        }
    }
}