// Real-time connection to the Spring Boot backend (STOMP over WebSocket).
//
// The components were written for Socket.IO, so this file offers the same small API
// they already use:
//     const s = io(url, { auth: { token } });
//     s.on("connect", fn);   s.on("match:round:update", fn);
//     s.emit("join:event", { eventId });
//     s.emit("query:send", payload, (ack) => { ... });
//     s.connected;  s.disconnect();
//
// Under the hood:
//     join:event  {eventId}  -> SUBSCRIBE /topic/event/{eventId}
//     join:club   {clubId}   -> SUBSCRIBE /topic/club/{clubId}
//     anything else          -> SEND /app/<name with ":" replaced by ".">  (e.g. /app/query.send)
//     server -> client       -> {type, data} envelopes, delivered to s.on(type, ...)
//     ack callbacks          -> matched by requestId on /user/queue/ack
import { Client } from "@stomp/stompjs";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");
const WS_URL = API_URL.replace(/^http/, "ws") + "/ws";
const ACK_TIMEOUT_MS = 10000;

const ROOM_EVENTS = {
  "join:event": (p) => `/topic/event/${p.eventId}`,
  "join:club": (p) => `/topic/club/${p.clubId}`,
};
const LEAVE_EVENTS = {
  "leave:event": (p) => `/topic/event/${p.eventId}`,
  "leave:club": (p) => `/topic/club/${p.clubId}`,
};

let counter = 0;
const nextId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

class StompSocket {
  constructor(options = {}) {
    this.id = nextId();
    this.connected = false;
    this.handlers = new Map(); // event name -> Set of callbacks
    this.rooms = new Map(); // destination -> active subscription (or null until connected)
    this.pendingAcks = new Map(); // requestId -> { ack, timer }
    this.explicitToken = options?.auth?.token || null;

    this.client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      // Read the newest token before every (re)connect: axios may have refreshed it meanwhile.
      beforeConnect: () => {
        const token = localStorage.getItem("accessToken") || this.explicitToken;
        this.client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      onConnect: () => {
        this.connected = true;
        this.client.subscribe("/user/queue/events", (msg) => this._dispatch(msg));
        this.client.subscribe("/user/queue/ack", (msg) => this._resolveAck(msg));
        // Subscriptions die with the connection, so re-join every room after a reconnect.
        for (const destination of this.rooms.keys()) this._subscribe(destination);
        this._fire("connect");
      },
      onWebSocketClose: () => {
        if (this.connected) {
          this.connected = false;
          this._fire("disconnect", "transport close");
        }
      },
      onStompError: (frame) => {
        const err = new Error(frame.headers?.message || "STOMP error");
        this._fire("connect_error", err);
        this._fire("error", err);
      },
      onWebSocketError: () => this._fire("connect_error", new Error("WebSocket error")),
    });

    this.client.activate();
  }

  on(event, callback) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(callback);
    return this;
  }

  off(event, callback) {
    if (!callback) this.handlers.delete(event);
    else this.handlers.get(event)?.delete(callback);
    return this;
  }

  emit(event, payload = {}, ack) {
    const reply = typeof ack === "function" ? ack : () => {};

    if (ROOM_EVENTS[event]) {
      const destination = ROOM_EVENTS[event](payload);
      if (!this.rooms.get(destination)) {
        this.rooms.set(destination, null);
        if (this.connected) this._subscribe(destination);
      }
      reply({ success: true });
      return this;
    }

    if (LEAVE_EVENTS[event]) {
      const destination = LEAVE_EVENTS[event](payload);
      this.rooms.get(destination)?.unsubscribe();
      this.rooms.delete(destination);
      reply({ success: true });
      return this;
    }

    if (!this.connected) {
      reply({ success: false, error: "Socket not connected" });
      return this;
    }

    const requestId = nextId();
    if (typeof ack === "function") {
      const timer = setTimeout(() => {
        if (this.pendingAcks.delete(requestId)) ack({ success: false, error: "Timed out" });
      }, ACK_TIMEOUT_MS);
      this.pendingAcks.set(requestId, { ack, timer });
    }
    this.client.publish({
      destination: `/app/${event.replace(/:/g, ".")}`,
      body: JSON.stringify({ ...payload, requestId }),
    });
    return this;
  }

  disconnect() {
    this.connected = false;
    this.pendingAcks.forEach(({ timer }) => clearTimeout(timer));
    this.pendingAcks.clear();
    this.rooms.clear();
    this.client.deactivate();
  }

  _subscribe(destination) {
    const subscription = this.client.subscribe(destination, (msg) => this._dispatch(msg));
    this.rooms.set(destination, subscription);
  }

  _dispatch(message) {
    let envelope;
    try {
      envelope = JSON.parse(message.body);
    } catch {
      return;
    }
    if (envelope?.type) this._fire(envelope.type, envelope.data);
  }

  _resolveAck(message) {
    let body;
    try {
      body = JSON.parse(message.body);
    } catch {
      return;
    }
    const pending = this.pendingAcks.get(body.requestId);
    if (!pending) return; // ack for another tab of the same user
    clearTimeout(pending.timer);
    this.pendingAcks.delete(body.requestId);
    pending.ack(body);
  }

  _fire(event, ...args) {
    this.handlers.get(event)?.forEach((callback) => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`[socket] handler for "${event}" failed`, err);
      }
    });
  }
}

/** Same call shape as socket.io-client's io(url, options). The URL comes from VITE_API_URL. */
export function io(_url, options) {
  return new StompSocket(options);
}

let shared = null;

/** One shared connection for components that don't need their own. */
export const getSocket = () => {
  if (!shared) shared = io(API_URL, { auth: { token: localStorage.getItem("accessToken") } });
  return shared;
};
