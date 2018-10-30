import { Injectable } from '@angular/core';
import { WebSocketService } from "./websocket.service"
import { Observable, Subject } from 'rxjs/Rx';
@Injectable()
export class ChatService {

  messages: Subject<any>;

  constructor(private webService: WebSocketService) {
    this.messages = <Subject<any>>webService
      .connect()
      .map((response: any): any => {
        return response;
      })
  }

  sendMsg(msg) {
    this.messages.next(msg);
  }
}
