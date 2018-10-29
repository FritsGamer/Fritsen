using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;

namespace DeckOfCards.PlayingCards
{
    public class PlayingCardDeck : List<PlayingCard>
    {
        private CardIdentities _cardIdentities;
        private CardSuits _cardSuits;

        public PlayingCardDeck()
        {
            //this = new List<PlayingCard>();
        }

        public PlayingCardDeck(int numberOfJokers)
        {
            Initialize(CardSuits.Default(), CardIdentities.AceLow(), numberOfJokers);
        }

        public PlayingCardDeck(CardSuits cardSuits, CardIdentities cardIdentities, int numberOfJokers)
        {
            Initialize(cardSuits, cardIdentities, numberOfJokers);
        }

        public ReadOnlyCollection<CardSuit> getSuits()
        {
            return new ReadOnlyCollection<CardSuit>(_cardSuits);
        }

        public ReadOnlyCollection<CardIdentity> getNumbers()
        {
            return new ReadOnlyCollection<CardIdentity>(_cardIdentities);
        }

        /// <summary>
        ///     Initializes the deck, creates cards, adds jokers etc.
        /// </summary>
        /// <param name = "suits">The suits.</param>
        /// <param name = "identities">The numbers.</param>
        /// <param name = "numberOfJokers">The number of jokers.</param>
        private void Initialize(CardSuits suits, CardIdentities identities, int numberOfJokers)
        {
            _cardSuits = suits;
            _cardIdentities = identities;

            foreach (var cardSuit in suits)
                foreach (var cardNumber in identities)
                    Add(new PlayingCard(cardSuit, cardNumber));

            for (var i = 0; i < numberOfJokers; i++)
                Add(PlayingCard.Joker(i));
        }


        /// <summary>
        ///     Gets a card by suit and number.
        /// </summary>
        /// <param name = "number">The number.</param>
        /// <param name = "suit">The suit.</param>
        /// <returns></returns>
        public PlayingCard Card(int number, CardSuit suit)
        {
            return this.FirstOrDefault(x => x.Identity.Order == number && x.Suit == suit);
        }

        /// <summary>
        ///     Gets all cards from a specified suit
        /// </summary>
        /// <param name = "suit">The suit.</param>
        /// <returns></returns>
        public List<PlayingCard> SuitCards(CardSuit suit)
        {
            return Enumerable.Range(1, 12).Select(x => Card(x, suit)).ToList();
        }


        public void Shuffle()
        {
            // Note: this is a better way
            // this.OrderBy(a => Guid.NewGuid());

            var rand = new Random();
            for (var i = Count - 1; i > 0; i--)
            {
                var n = rand.Next(i + 1);
                var temp = this[i];
                this[i] = this[n];
                this[n] = temp;
            }
        }

    }
}