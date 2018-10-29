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
  public selectedCard: string;
  public showOpen: boolean = false;
  public status: Result;
  public baseUrl: string

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

  public newGame() {
    this.http.get<Game>(this.baseUrl + 'api/Frits/newGame').subscribe(result => {
      this.game = result;
      this.setStatus(result.status);
      this.numbers = Array(result.deck).fill(this.numbers).map((x, i) => i);
      this.showOpen = false;
    }, error => console.error(error));
  }

  public frits() {
    if (this.showOpen)
      return;

    this.http.get<Game>(this.baseUrl + 'api/Frits/frits').subscribe(result => {
      this.game = result;
      this.numbers = Array(result.deck).fill(this.numbers).map((x, i) => i);
      this.showOpen = true;
      this.setStatus(result.status);
    }, error => console.error(error));
  }


  public select(event) {
    var target = event.target || event.srcElement || event.currentTarget;
    var idAttr = target.id;
    if (idAttr != "") {
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

    var idAttr = target.id;
    if (idAttr == "")
      idAttr = target.parentElement.id;
    else if (!this.showOpen && idAttr != "pile0")
      return;

    if (idAttr != "") {
      var url = this.baseUrl + 'api/Frits/playCard?card=' + this.selectedCard + '&pile=' + idAttr + '&frits=' + this.showOpen;

      this.http.get<Game>(url).subscribe(result => {
        this.game = result;
        this.setStatus(result.status);
        this.numbers = Array(result.deck).fill(this.numbers).map((x, i) => i);
        if (result.status.value > 0) { 
          this.selectedCard = null;
          $('.handcard').removeClass('active');
          this.showOpen = false;
        }
      }, error => console.error(error));
    }
  }

  public setStatus(status) {
    this.status = status;
    if (status.value < 2) {
      $('#message').fadeIn().delay(3000).fadeOut();
    } else {
      this.status.description = "";
    }
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
  cards: string[];
}

interface Result {
  name: string;
  description: string;
  value: number;
}
