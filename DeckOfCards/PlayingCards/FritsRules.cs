using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;

namespace DeckOfCards.PlayingCards
{
    public class FritsRules
    {
        private static readonly List<Result> _results = new List<Result>{
                                                            new Result("Fout", "Fritsje des: Zet is niet mogelijk, neem 1 fritsje", 0),
                                                            new Result("Goed", "Normale zet", 2),
                                                            new Result("Soepel", "Soepele Frits", 1),
                                                            new Result("Stroef", "Stroeve Frits", 1),
                                                            new Result("Offer", "Offerfrits: Neem 1 fritsje", 1),
                                                            new Result("Joker", "Joker: Alle anderen nemen 1 fritsje", 1),
                                                            new Result("Kim", "Kim: Alle anderen nemen 1 fritsje", 1),
                                                            new Result("VierdeKim", "Vier Kimmen: Alle anderen nemen 2 fritsjes", 1),
                                                            new Result("Joris", "Jorisje: Alle anderen nemen 1 fritsje", 1),
                                                            new Result("Lisa", "Lisa: Alle anderen nemen 1 fritsje", 1),
                                                            new Result("Baudet", "Baudet: Ruil je hand met de pot en neem 2 fritsjes", 1),
                                                           // new Result("Klaver", "Klaver: Voorkom dat Thierry aan de macht komt. De speler met Baudet mag niet ruilen", 1),
                                                            new Result("DubbelNegen", "Iedereen dubbel Frits: Alle anderen nemen 2 fritsjes", 1),
                                                            //new Result("AasKoning", "Nice! Aas en Koning op Kim", 1),
                                                           // new Result("AasKoningWait", "Wil je hier de Aas ook bij leggen?", 0),
                                                            new Result("Frits", "Fritsen: Pak 2 kaarten en neem 1 fritsje, je mag hierna een nieuwe stapel beginnen", 1),
                                                            new Result("JokerUit", "Je mag niet uitkomen met een Joker: neem 1 fritsje", 0),
                                                            new Result("JokerFout", "Jokers mogen alleen op de jokerstapel: neem 1 fritsje", 0),
                                                            new Result("Uit", " is uitgefritsd, neem 1 fritsje of 2 als je hebt verloren", 1),
                                                        };

        //Rules - Possible placement:
        //1. Only if card is Joker on Joker pile (Joker)
        //2. Card is a 9
        //3. Queen on a Queen (Kim)
        //4. Jack of clubs on Red Queen or vice versa (Joris)
        //5. King on Ace of Hearts or vice versa (Lisa)
        //6. 6 on a Queen (Baudet)
        //7. 3 of Clubs on a 6 (Klaver)
        //8. Same suit with higher value
        //9. Same suit with 1 lower value (Offer)
        //10. Same suit with 2 on Ace
        //11. All same suit: King + Ace on Queen (Optional)

        public static Result checkCards(PlayingCard card, Pile pile, bool frits, Hand hand)
        {
            PlayingCard top = pile.topCard();

            CardIdentity cid = card.Identity;
            CardIdentity pid = top.Identity;

            int cardsLeft = hand.cards.Count;

            //1. Only if card is Joker on Joker pile (Joker)
            if (cid.IsJoker || pid.IsJoker)
            {
                if (cid.IsJoker && cardsLeft == 1)
                    return getResult("JokerUit", hand);

                if ((cid.IsJoker && pid.IsJoker) || (pid.Code == 'N' && pile.jokerPile))
                    return getResult("Joker", hand);
                else
                    return getResult("JokerFout", hand);
            }

            if (frits && pid.Code == 'N' && !pile.jokerPile)
                return getResult("Goed", hand);

            //2. Card is a 9
            if (cid.Code == '9' && !pile.jokerPile)
            {
                if(pid.Code == '9')
                    return getResult("DubbelNegen", hand);
                else
                    return getResult("Goed", hand);
            }

            //3. Queen on a Queen (Kim)
            if (pid.Code == 'Q')
            {
                if(cid.Code == 'Q')
                {
                    int counter = 0;
                    foreach(var c in pile.cards)
                    {
                        PlayingCard pc = PlayingCard.fromCode(c.code());

                        if (pc.Identity.Code == 'Q')
                            counter++;
                        else
                            counter = 0;
                    }

                    if(counter == 3)
                        return getResult("VierdeKim", hand);
                    else
                        return getResult("Kim", hand);
                }
                    

                //4. Jack of clubs on Red Queen or vice versa (Joris)
                if (cid.Code == 'J' && card.Suit.Code == 'C' && (top.Suit.Code == 'H' || top.Suit.Code == 'D'))
                    return getResult("Joris", hand);

                //6. 6 on a Queen (Baudet)
                if (cid.Code == '6')
                    return getResult("Baudet", hand);

                if(cid.Code == 'K' && top.Suit.Code == card.Suit.Code)
                {
                    string aceCode = "A" + top.Suit.Code;
                    foreach( PlayingCard c in hand.cards)
                    {
                        if(c.code() == aceCode)
                            return getResult("Goed", hand);
                    }
                }
            }

            if (pid.Code == 'J' && top.Suit.Code == 'C')
            {
                if (cid.Code == 'Q' && (card.Suit.Code == 'H' || card.Suit.Code == 'D'))
                    return getResult("Joris", hand);
            }

            //5. King on Ace of Hearts or vice versa (Lisa)
            if((cid.Code == 'A' && card.Suit.Code == 'H') || (pid.Code == 'A' && top.Suit.Code == 'H'))
            {
                if (cid.Code == 'K' || pid.Code == 'K')
                    return getResult("Lisa", hand);
            }
            
            
            //7. 3 of Clubs on a 6 after a Queen (Klaver)
            /*if(pid.Code == '6' && cid.Code == '3' && card.Suit.Code == 'C')
            {
                int size = pile.cards.Count;
                if(size > 1) { 
                    PlayingCard pc = PlayingCard.fromCode(pile.cards.ElementAt(size - 2).code());
                    
                    if(pc.Identity.Code == 'Q')
                        return getResult("Klaver");
                }
            }*/

            if(card.Suit.Code == top.Suit.Code)
            {
                //8. Same suit with higher value
                if (cid.Order > pid.Order)
                {
                    if(cid.Order == pid.Order +1)
                        return getResult("Soepel", hand);
                    if (cid.Order > pid.Order + 8)
                        return getResult("Stroef", hand);

                    return getResult("Goed", hand);
                }

                //9. Same suit with 1 lower value (Offer)
                if (cid.Order == pid.Order - 1)
                    return getResult("Offer", hand);

                //10. Same suit with 2 on Ace
                if (cid.Code == '2' && pid.Code == 'A')
                    return getResult("Goed", hand);
            }
            //11. All same suit: King + Ace on Queen (Optional)

            return getResult("Fout", hand);
        }

        public static Result getResult(string name)
        {
            Result res = _results.Find(r => r.name == name);

            return new Result(res.name, res.description, res.value);
        }

        public static Result getResult(string name, Hand hand)
        {
            Result res = _results.Find(r => r.name == name);

            if(hand.cards.Count == 1 && res.value > 0)
            {
                res = _results.Find(r => r.name == "Uit");
                return new Result(res.name, hand.playerName + res.description, res.value);
            }

            return new Result(res.name,res.description,res.value);
        }
    }

    public class Result
    {
        public string name;
        public string description;
        public int value;

        public Result( string name, string desc, int value)
        {
            this.name = name;
            this.description = desc;
            this.value = value;
        }
    }
}
