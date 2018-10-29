using System;

namespace DeckOfCards.PlayingCards
{
    public class CardIdentity : IComparable<CardIdentity>
    {
        public char Code;
        public string Name;
        public int Value;
        public int Order;
        public bool IsFaceCard;
        public bool IsJoker;

        public CardIdentity(){}

        public CardIdentity(char code, string name, int value, int order, bool isFaceCard, bool isJoker)
        {
            Code = code;
            Name = name;
            Value = value;
            Order = order;
            IsFaceCard = isFaceCard;
            IsJoker = isJoker;
        }

        public CardIdentity(char code, string name, int value, int order, bool isFaceCard)
        {
            Code = code;
            Name = name;
            Value = value;
            Order = order;
            IsFaceCard = isFaceCard;
            IsJoker = false;
        }
      
        public int CompareTo(CardIdentity other)
        {
            if (Order > other.Order) return 1;
            if (Order == other.Order) return 0;
            return -1;
        }

        public static CardIdentity Joker(int value)
        {
            return new CardIdentity(Char.Parse(value.ToString()), "Joker", value, 100, true, true);
        }

        public static CardIdentity Unknown()
        {
            return new CardIdentity('N', "None", -1, 100, false, false);
        }
    }
}