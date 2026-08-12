import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket?: Socket;

  constructor(private auth: AuthService) {}

  connect(): Socket | undefined {
    const token = this.auth.getToken();
    if (!token) return undefined;
    if (!this.socket) {
      const origin = environment.apiUrl.startsWith('http')
        ? environment.apiUrl.replace(/\/api\/?$/, '')
        : window.location.origin;
      this.socket = io(origin, { auth: { token }, transports: ['websocket'] });
    }
    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}
