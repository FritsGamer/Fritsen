import { Component, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as $ from 'jquery';

@Component({
    selector: 'app-frits',
    templateUrl: './frits.component.html',
    styleUrls: ['./frits.component.css']
})
/** frits component*/
export class FritsComponent {

  public Math: any;
  public numbers: number[];
  public game: Game;
  public start: boolean;
  public selectedCard: string;
  public lastmove: string = "";
  public showOpen: boolean = false;
  public status: Result;
  public baseUrl: string
  public hand: Hand;
  public swapTurn: boolean = false;

  constructor(private http: HttpClient, @Inject('BASE_URL') baseUrl: string) {
    this.baseUrl = baseUrl;
    this.Math = Math;
    this.newGame();
  }

  table: string = './assets/img/Table.png';
  board: string = './assets/img/Snijplank.png';
  card: string = './assets/img/cards/RF.png';
  cardloc: string = './assets/img/cards/';
  refresh: string = './assets/img/refresh.png';
  doek: string = './assets/img/doek.png';

  public newGame() {
    this.http.get<Game>(this.baseUrl + 'api/Frits/newGame').subscribe(result => {
      this.game = result;
      this.setStatus(result.status);
      this.numbers = Array(result.deck).fill(this.numbers).map((x, i) => i);
      this.showOpen = false;
      this.start = true;
      this.hand = result.hand;
    }, error => console.error(error));
  }

  public vuilefrits() {
    if (!this.start)
      return;

    this.http.get<Game>(this.baseUrl + 'api/Frits/vuileFrits').subscribe(result => {
      this.game = result;
      this.hand = result.hand;
    }, error => console.error(error));
  }


  public frits() {
    if (this.showOpen)
      return;

    this.http.get<Game>(this.baseUrl + 'api/Frits/frits').subscribe(result => {
      this.game = result;
      this.numbers = Array(result.deck).fill(this.numbers).map((x, i) => i);
      this.showOpen = true;
      this.start = false;
      this.hand = result.hand;
      this.setStatus(result.status);
    }, error => console.error(error));
  }
  
  public select(event) {
    var target = event.target || event.srcElement || event.currentTarget;
    var idAttr = target.id;
    if (idAttr != "") {
      $('.pile').removeClass('lastmove');
      if (this.selectedCard == null || this.selectedCard != idAttr) {
        this.selectedCard = idAttr;
        $('.handcard').removeClass('active');
        target.classList.add('active');//.addClass('active');
      } else {
        this.selectedCard = null;
        target.classList.remove('active');//.removeClass('active');
      }
    }
  }

  public placeCard(event) {
    if (this.selectedCard == null)
      return;
    var target = event.target || event.srcElement || event.currentTarget;
    
    if (target.id == "")
      target = target.parentElement;
    else if (!this.showOpen && target.id != "pile0")
      return;

    if (target.id != "") {
      var url = this.baseUrl + 'api/Frits/playCard?card=' + this.selectedCard + '&pile=' + target.id + '&frits=' + this.showOpen;

      this.http.get<Game>(url).subscribe(result => {
        this.game = result;
        this.start = false;
        this.setStatus(result.status);
        //this.numbers = Array(result.deck).fill(this.numbers).map((x, i) => i);
        if (result.status.value > 0) {
          this.lastmove = '#' + target.id;
          this.showOpen = false;
          this.nextPlayer();
        }
      }, error => console.error(error));
    }
  }

  public setStatus(status) {
    this.status = status;
    $('#message').fadeIn().delay(3000).fadeOut();
  }

  public nextPlayer() {
    this.swapTurn = true;
    setTimeout(function () {
      this.selectedCard = null;
      $('.handcard').removeClass('active');
      this.hand = this.game.hand;
      this.swapTurn = false;
      if(this.lastmove != "")
        $(this.lastmove).addClass('lastmove');
      this.setStatus(this.status);
    }.bind(this), 4000);
  }

  public loadNextPlayer() {
    this.http.get<Game>(this.baseUrl + 'api/Frits/loadNextPlayer').subscribe(result => {
      this.game = result;
      this.nextPlayer();
    }, error => console.error(error));
  }
}

interface Game {
  hand: Hand;
  piles: Pile[];
  jokers: Pile;
  deck: number;
  status: Result;
}

interface Pile {
  id: number;
  cards: string[];
}

interface Hand {
  id: number;
  cards: string[];
}

interface Result {
  name: string;
  description: string;
  value: number;
}
