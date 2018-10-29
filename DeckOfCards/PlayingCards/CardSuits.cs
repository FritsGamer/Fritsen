using System.Collections.Generic;

namespace DeckOfCards.PlayingCards
{
    public class CardSuits : List<CardSuit>
    {
        private static readonly CardSuits _default = new CardSuits
                                                         {
                                                             new CardSuit('C', "Clubs", 1),
                                                             new CardSuit('D', "Diamonds", 2),
                                                             new CardSuit('H', "Hearts", 3),
                                                             new CardSuit('S', "Spades", 4)
                                                         };

        public static CardSuits Default()
        {
            return _default;
        }

        public static CardSuit getCard(char code)
        {
            return _default.Find(c => c.Code == code);
        }
    }
}