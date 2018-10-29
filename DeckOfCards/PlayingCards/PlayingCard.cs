using System;

namespace DeckOfCards.PlayingCards
{
    public class PlayingCard
    {
        public CardSuit Suit;
        public CardIdentity Identity;

        public PlayingCard()
        {}

        public PlayingCard(CardSuit cardSuit, CardIdentity cardIdentity)
        {
            Suit = cardSuit;
            Identity = cardIdentity;
        }

        

        #region ICard Members
        
        public string description()
        {
            return Identity.Name + " of " + Suit.Name;
        }

        /// <summary>
        ///     Gets the card code.
        /// </summary>
        /// <value>The card code.</value>
        public string code()
        {
            return string.Concat(Identity.Code, Suit.Code);
        }

        public string imgCode()
        {
            if(!Identity.IsJoker)
                return string.Concat(Identity.Code, Suit.Code);

            char c = Identity.Value % 2 == 0 ? 'B' : 'R';
            return string.Concat(c, Suit.Code);
        }

        #endregion


        /// <summary>
        ///     Gets the specified card from a deck.
        /// </summary>
        /// <param name = "id"></param>
        /// <param name = "deckId">The deck id.</param>
        /// <returns></returns>
        /// <summary>
        ///     Determines whether the specified <see cref = "System.Object" /> is equal to this instance.
        /// </summary>
        /// <param name = "obj">The <see cref = "System.Object" /> to compare with this instance.</param>
        /// <returns>
        ///     <c>true</c> if the specified <see cref = "System.Object" /> is equal to this instance; otherwise, <c>false</c>.
        /// </returns>
        /// <exception cref = "T:System.NullReferenceException">
        ///     The <paramref name = "obj" /> parameter is null.
        /// </exception>
        public override bool Equals(object obj)
        {
            return obj is PlayingCard ? ((PlayingCard) obj).code() == code() : false;
        }

        /// <summary>
        ///     Returns a hash code for this instance.
        /// </summary>
        /// <returns>
        ///     A hash code for this instance, suitable for use in hashing algorithms and data structures like a hash table. 
        /// </returns>
        public override int GetHashCode()
        {
            return code().GetHashCode();
        }

        /// <summary>
        ///     Generates a card from the specified code.
        /// </summary>
        /// <param name = "id">The id.</param>
        /// <returns></returns>
        /// <summary>
        ///     Returns a <see cref = "System.String" /> that represents this instance.
        /// </summary>
        /// <returns>
        ///     A <see cref = "System.String" /> that represents this instance.
        /// </returns>
        public override string ToString()
        {
            var result = description();
            return result;
        }

        public string toSimpleString()
        {
            return code();
        }

        public static PlayingCard UnknownCard()
        {
            return new PlayingCard(CardSuit.NoSuit(), CardIdentity.Unknown());
        }

        public static PlayingCard Joker(int number)
        {
            return new PlayingCard(CardSuit.Joker(), CardIdentity.Joker(number));
        }
        public static PlayingCard fromCode(string code)
        {
            if (code == null || code.Length != 2)
                return UnknownCard();

            char val = code[0];
            char suit = code[1];

            CardSuit cs;
            CardIdentity ci;                                  

            switch (suit)
            {
                case 'C':
                case 'D':
                case 'H':
                case 'S':
                    cs = CardSuits.getCard(suit);
                    break;
                default:
                    cs = CardSuit.Joker();
                    break;                    
            }

            if (cs.Code.Equals('J'))
                ci = CardIdentity.Joker(0);
            else
                ci = CardIdentities.getCard(val);

            return new PlayingCard(cs, ci);
        }
    }
}