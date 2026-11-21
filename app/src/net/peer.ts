/* Conexão direta entre aparelhos (WebRTC), falando o mesmo protocolo do servidor
   público do PeerJS (0.peerjs.com) só para se encontrarem. Depois de conectados,
   os dados vão direto de um aparelho para o outro, em JSON.
   Na web usa o WebRTC do navegador; no celular, o react-native-webrtc
   (registrado em ./rtc antes do jogo começar). */

type Handler = (...a: any[]) => void;

class Emitter {
  private hs: { [k: string]: Handler[] } = {};
  on(ev: string, fn: Handler) { (this.hs[ev] = this.hs[ev] || []).push(fn); return this; }
  off(ev: string, fn?: Handler) { if (!fn) delete this.hs[ev]; else this.hs[ev] = (this.hs[ev] || []).filter(f => f !== fn); return this; }
  protected emit(ev: string, ...a: any[]) { for (const f of (this.hs[ev] || []).slice()) { try { f(...a); } catch (e) { console.warn(e); } } }
}

const HOST = '0.peerjs.com';
const KEY = 'peerjs';
const ICE: any[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
];
const rnd = (n: number) => { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
const G: any = globalThis as any;

export class PeerError extends Error { type: string; constructor(type: string, msg?: string) { super(msg || type); this.type = type; } }

export class DataConnection extends Emitter {
  peer: string; connectionId: string; open = false; label: string; peerConnection: any = null;
  private dc: any = null; private owner: Peer; private queued: any[] = []; private remoteSet = false; private closed = false;
  /** caminho de reserva: quando a ligação direta não abre (internets diferentes,
      4G x Wi-Fi), as mensagens passam pelo servidor que já usamos para nos encontrar */
  relay = false; private rlT: any = null; private rlLast = 0; private rlKa: any = null; private rlTries = 0; private rlPend: any = null; private rlFlushT: any = null;
  constructor(owner: Peer, peer: string, connectionId: string, label?: string, private caller = false, relayOnly = false) {
    super(); this.owner = owner; this.peer = peer; this.connectionId = connectionId; this.label = label || connectionId;
    // quem chama tenta a reserva se a ligação direta não abrir logo
    // (recados curtos, como pedido de amizade e convite, já vão direto pela reserva)
    if (caller) this.rlT = setTimeout(() => this.tryRelay(), relayOnly ? 0 : 3000);
    else this.rlT = setTimeout(() => { if (!this.open) this.close(); }, 40000);
  }
  private rl(kind: string, d?: any) { this.owner._send({ type: 'CANDIDATE', dst: this.peer, payload: { type: 'data', connectionId: this.connectionId, rl: kind, d } }); }
  private tryRelay() {
    if (this.open || this.closed) return;
    if (++this.rlTries > 8) { this.close(); return; }
    this.rl('hi');
    clearTimeout(this.rlT); this.rlT = setTimeout(() => this.tryRelay(), 1500);
  }
  private goRelay() {
    if (this.closed) return;
    clearTimeout(this.rlT); this.rlT = null;
    if (this.relay) return;
    const was = this.open;
    this.relay = true; this.open = true; this.rlLast = Date.now();
    // sinal de vida: sem notícias por 15 s, a conexão é dada como fechada
    this.rlKa = setInterval(() => { if (Date.now() - this.rlLast > 15000) { this.close(true); return; } this.rl('k'); }, 4000);
    try { this.dc && this.dc.close(); } catch (e) {}
    try { this.peerConnection && this.peerConnection.close(); } catch (e) {}
    this.dc = null;
    if (!was) this.emit('open');
  }
  _onRelay(kind: string, d: any) {
    if (this.closed) return;
    this.rlLast = Date.now();
    if (kind === 'hi') { this.goRelay(); this.rl('ok'); }
    else if (kind === 'ok') { if (this.caller) this.goRelay(); }
    else if (kind === 'd') { if (this.relay && d !== undefined) this.emit('data', d); }
    else if (kind === 'bye') { this.close(true); }
  }
  private makePc() {
    const PC = G.RTCPeerConnection;
    if (!PC) throw new PeerError('browser-incompatible', 'WebRTC indisponível');
    const pc = new PC({ iceServers: ICE });
    this.peerConnection = pc;
    pc.addEventListener('icecandidate', (ev: any) => {
      const c = ev && ev.candidate;
      if (!c) return;
      this.owner._send({ type: 'CANDIDATE', dst: this.peer, payload: { candidate: { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex }, type: 'data', connectionId: this.connectionId } });
    });
    pc.addEventListener('iceconnectionstatechange', () => {
      const s = pc.iceConnectionState;
      if (s === 'failed' || s === 'closed') {
        if (this.relay) return;
        if (!this.open) { if (this.caller) this.tryRelay(); return; }
        this.close();
      }
    });
    pc.addEventListener('datachannel', (ev: any) => { this.useChannel(ev.channel); });
    return pc;
  }
  private useChannel(dc: any) {
    this.dc = dc;
    const onOpen = () => { if (this.open || this.closed) return; clearTimeout(this.rlT); this.rlT = null; this.open = true; this.emit('open'); };
    dc.addEventListener('open', onOpen);
    dc.addEventListener('message', (ev: any) => {
      let d = ev && ev.data;
      if (typeof d !== 'string') return;
      try { d = JSON.parse(d); } catch (e) { return; }
      this.emit('data', d);
    });
    dc.addEventListener('close', () => { if (!this.relay) this.close(); });
    dc.addEventListener('error', () => { this.emit('error', new PeerError('connection')); });
    if (dc.readyState === 'open') setTimeout(onOpen, 0);
  }
  /** quem chama: cria a oferta */
  async _start() {
    try {
      const pc = this.makePc();
      this.useChannel(pc.createDataChannel(this.label, { ordered: true }));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.owner._send({ type: 'OFFER', dst: this.peer, payload: { sdp: { type: offer.type, sdp: offer.sdp }, type: 'data', connectionId: this.connectionId, label: this.label, reliable: true, serialization: 'json', browser: 'tita' } });
    } catch (e) { this.emit('error', e); this.close(); }
  }
  /** quem recebe: responde a oferta */
  async _answer(sdp: any) {
    try {
      const pc = this.makePc();
      await pc.setRemoteDescription(new G.RTCSessionDescription(sdp));
      this.remoteSet = true; this.flush();
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      this.owner._send({ type: 'ANSWER', dst: this.peer, payload: { sdp: { type: ans.type, sdp: ans.sdp }, type: 'data', connectionId: this.connectionId, browser: 'tita' } });
    } catch (e) { this.emit('error', e); this.close(); }
  }
  async _onAnswer(sdp: any) {
    try { await this.peerConnection.setRemoteDescription(new G.RTCSessionDescription(sdp)); this.remoteSet = true; this.flush(); }
    catch (e) { this.emit('error', e); this.close(); }
  }
  _onCandidate(c: any) { this.queued.push(c); this.flush(); }
  private flush() {
    if (!this.remoteSet || !this.peerConnection) return;
    const q = this.queued; this.queued = [];
    for (const c of q) { try { this.peerConnection.addIceCandidate(new G.RTCIceCandidate(c)).catch(() => {}); } catch (e) {} }
  }
  send(d: any) {
    if (this.relay) {
      // estado completo (t:'s' / t:'p'): manda só o mais novo, até 10 por segundo
      if (d && (d.t === 's' || d.t === 'p')) {
        this.rlPend = JSON.parse(JSON.stringify(d));
        if (!this.rlFlushT) this.rlFlushT = setTimeout(() => { this.rlFlushT = null; const x = this.rlPend; this.rlPend = null; if (x && !this.closed) this.rl('d', x); }, 100);
      } else this.rl('d', JSON.parse(JSON.stringify(d)));
      return;
    }
    if (!this.dc || this.dc.readyState !== 'open') throw new PeerError('not-open-yet');
    this.dc.send(JSON.stringify(d));
  }
  close(fromRemote?: boolean) {
    if (this.closed) return;
    if (this.relay && !fromRemote) this.rl('bye');
    this.closed = true; clearTimeout(this.rlT); clearTimeout(this.rlFlushT); clearInterval(this.rlKa);
    const was = this.open; this.open = false;
    try { this.dc && this.dc.close(); } catch (e) {}
    try { this.peerConnection && this.peerConnection.close(); } catch (e) {}
    this.owner._forget(this);
    void was; this.emit('close');
  }
}

/* ---------- servidores para os aparelhos se acharem ----------
   O servidor público do PeerJS às vezes fica fora do ar. Por isso o jogo
   também usa dois servidores públicos MQTT (EMQX e HiveMQ): cada recado vai
   por todos os que estiverem ligados e quem recebe ignora as repetições. */
const MQTT_URLS: string[] = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const TOPIC = 'ilhadocoral-v1/';
const enc = (str: string) => { const u = unescape(encodeURIComponent(str)); const a = new Uint8Array(u.length); for (let i = 0; i < u.length; i++) a[i] = u.charCodeAt(i); return a; };
const dec = (a: Uint8Array) => { let u = ''; for (let i = 0; i < a.length; i += 8192) u += String.fromCharCode.apply(null, Array.from(a.subarray(i, i + 8192))); try { return decodeURIComponent(escape(u)); } catch (e) { return u; } };
const mStr = (str: string) => { const b = enc(str); const o = new Uint8Array(b.length + 2); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; };
function mPacket(head: number, parts: Uint8Array[]) {
  let n = 0; for (const p of parts) n += p.length;
  const len: number[] = []; let x = n; do { let d = x % 128; x = Math.floor(x / 128); if (x > 0) d |= 128; len.push(d); } while (x > 0);
  const o = new Uint8Array(1 + len.length + n); o[0] = head; o.set(len, 1); let k = 1 + len.length; for (const p of parts) { o.set(p, k); k += p.length; }
  return o;
}

interface Link { name: string; ready: boolean; send(o: any): void; close(): void }

class MqttLink implements Link {
  name: string; ready = false; private ws: any = null; private ping: any = null; private retry: any = null; private dead = false; private tries = 0; private buf = new Uint8Array(0);
  constructor(private url: string, private owner: Peer) { this.name = url; this.connect(); }
  private connect() {
    if (this.dead) return;
    const WS = G.WebSocket; if (!WS) return;
    let ws: any; try { ws = new WS(this.url, ['mqtt']); } catch (e) { this.later(); return; }
    this.ws = ws; ws.binaryType = 'arraybuffer'; this.buf = new Uint8Array(0);
    ws.onopen = () => {
      const cid = 'ic' + rnd(18);
      ws.send(mPacket(0x10, [mStr('MQTT'), new Uint8Array([4, 2, 0, 45]), mStr(cid)]));
    };
    ws.onmessage = (ev: any) => { if (this.ws !== ws) return; const d = ev.data; if (typeof d === 'string') return; this.feed(new Uint8Array(d)); };
    ws.onclose = () => { if (this.ws !== ws) return; this.ws = null; const was = this.ready; this.ready = false; clearInterval(this.ping); if (was) this.owner._linkDown(this); this.later(); };
    ws.onerror = () => {};
  }
  private later() { if (this.dead) return; clearTimeout(this.retry); this.retry = setTimeout(() => this.connect(), Math.min(15000, 1500 * Math.pow(1.6, this.tries++))); }
  private feed(chunk: Uint8Array) {
    const b = new Uint8Array(this.buf.length + chunk.length); b.set(this.buf); b.set(chunk, this.buf.length); this.buf = b;
    for (;;) {
      if (this.buf.length < 2) return;
      let mul = 1, len = 0, i = 1, byte = 0;
      do { if (i >= this.buf.length) return; byte = this.buf[i++]; len += (byte & 127) * mul; mul *= 128; } while (byte & 128);
      if (this.buf.length < i + len) return;
      const head = this.buf[0], body = this.buf.subarray(i, i + len);
      this.buf = this.buf.slice(i + len);
      this.packet(head, body);
    }
  }
  private packet(head: number, body: Uint8Array) {
    const t = head >> 4;
    if (t === 2) { // CONNACK
      if (body[1] !== 0) { try { this.ws && this.ws.close(); } catch (e) {} return; }
      this.ws.send(mPacket(0x82, [new Uint8Array([0, 1]), mStr(TOPIC + this.owner.id), new Uint8Array([0])]));
    } else if (t === 9) { // SUBACK
      if (body[2] === 0x80) { try { this.ws && this.ws.close(); } catch (e) {} return; }
      this.ready = true; this.tries = 0;
      clearInterval(this.ping); this.ping = setInterval(() => { try { this.ws && this.ws.send(new Uint8Array([0xC0, 0])); } catch (e) {} }, 20000);
      this.owner._linkUp(this);
    } else if (t === 3) { // PUBLISH
      const tl = (body[0] << 8) | body[1]; let k = 2 + tl; if ((head >> 1) & 3) k += 2;
      let m: any; try { m = JSON.parse(dec(body.subarray(k))); } catch (e) { return; }
      if (m && typeof m === 'object') this.owner._onMsg(m, this);
    }
  }
  send(o: any) {
    if (!this.ready || !this.ws || !o.dst) return;
    try { this.ws.send(mPacket(0x30, [mStr(TOPIC + o.dst), enc(JSON.stringify(Object.assign({ src: this.owner.id }, o)))])); } catch (e) {}
  }
  close() { this.dead = true; this.ready = false; clearInterval(this.ping); clearTimeout(this.retry); try { this.ws && this.ws.close(); } catch (e) {} this.ws = null; }
}

class PeerJsLink implements Link {
  name = 'peerjs'; ready = false; private ws: any = null; private hb: any = null; private retry: any = null; private dead = false; private tries = 0; private token = rnd(10);
  constructor(private owner: Peer) { this.connect(); }
  private connect() {
    if (this.dead) return;
    const WS = G.WebSocket; if (!WS) return;
    let ws: any;
    try { ws = new WS((G.__PEERJS_URL || 'wss://' + HOST + ':443/peerjs') + '?key=' + KEY + '&id=' + encodeURIComponent(this.owner.id) + '&token=' + this.token + '&version=1.5.4'); }
    catch (e) { this.later(); return; }
    this.ws = ws;
    ws.onmessage = (ev: any) => {
      let m: any; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'OPEN') { this.ready = true; this.tries = 0; this.owner._linkUp(this); return; }
      if (m.type === 'ID-TAKEN') { this.owner._idTaken(this); return; }
      this.owner._onMsg(m, this);
    };
    ws.onclose = () => { if (this.ws !== ws) return; this.ws = null; clearInterval(this.hb); const was = this.ready; this.ready = false; if (was) this.owner._linkDown(this); this.later(); };
    ws.onerror = () => {};
    clearInterval(this.hb); this.hb = setInterval(() => this.raw({ type: 'HEARTBEAT' }), 5000);
  }
  private later() { if (this.dead) return; clearTimeout(this.retry); this.retry = setTimeout(() => this.connect(), Math.min(20000, 2000 * Math.pow(1.6, this.tries++))); }
  private raw(o: any) { const ws = this.ws; if (!ws || ws.readyState !== 1) return; try { ws.send(JSON.stringify(o)); } catch (e) {} }
  send(o: any) { if (this.ready) this.raw(o); }
  close() { this.dead = true; this.ready = false; clearInterval(this.hb); clearTimeout(this.retry); try { this.ws && this.ws.close(); } catch (e) {} this.ws = null; }
}

export class Peer extends Emitter {
  id: string; open = false; destroyed = false; disconnected = false;
  private links: Link[] = []; private conns: { [cid: string]: DataConnection } = {};
  private seen: { [k: string]: 1 } = {}; private seenQ: string[] = []; private failT: any = null;
  constructor(id?: string) {
    super();
    this.id = id || 'titacoral-v1-x-' + rnd(12);
    setTimeout(() => {
      if (this.destroyed) return;
      if (!G.WebSocket) { this.emit('error', new PeerError('browser-incompatible')); return; }
      const urls: string[] = Array.isArray(G.__MQTT_URLS) ? G.__MQTT_URLS : MQTT_URLS;
      this.links.push(new PeerJsLink(this));
      for (const u of urls) this.links.push(new MqttLink(u, this));
      // nenhum servidor respondeu
      this.failT = setTimeout(() => { if (!this.open && !this.destroyed) this.emit('error', new PeerError('network', 'Sem conexão com o servidor')); }, 12000);
    }, 0);
  }
  _linkUp(_l: Link) {
    if (this.destroyed) return;
    this.disconnected = false;
    if (!this.open) { this.open = true; clearTimeout(this.failT); this.emit('open', this.id); }
  }
  _linkDown(_l: Link) {
    if (this.destroyed) return;
    if (this.open && !this.links.some(x => x.ready)) { this.open = false; this.disconnected = true; this.emit('disconnected', this.id); }
  }
  _idTaken(l: Link) {
    // já entrou por outro servidor: só deixa de usar o do PeerJS
    if (this.open) { l.close(); this.links = this.links.filter(x => x !== l); return; }
    this.emit('error', new PeerError('unavailable-id', 'ID em uso')); this.destroy();
  }
  _onMsg(m: any, from: Link) {
    if (this.destroyed || !m) return;
    const mid = m.mid || (m.payload && m.payload._mid);
    if (mid) { const k = String(mid); if (this.seen[k]) return; this.seen[k] = 1; this.seenQ.push(k); if (this.seenQ.length > 600) delete this.seen[this.seenQ.shift() as string]; }
    const p = m.payload || {};
    switch (m.type) {
      case 'INVALID-KEY': case 'ERROR': break;
      case 'EXPIRE': {
        // pelo PeerJS a sala não existe, mas ela pode estar nos outros servidores
        if (this.links.some(x => x.ready && x !== from)) break;
        for (const k in this.conns) { const c = this.conns[k]; if (c.peer === m.src && !c.open) { (c as any).emit2('error', new PeerError('peer-unavailable')); c.close(); } }
        this.emit('error', new PeerError('peer-unavailable', 'Não achei ' + m.src));
        break; }
      case 'LEAVE': for (const k in this.conns) { const c = this.conns[k]; if (c.peer === m.src && !c.open) c.close(); } break;
      case 'OFFER': {
        if (!p.connectionId || this.conns[p.connectionId]) break;
        const c = new DataConnection(this, m.src, p.connectionId, p.label);
        this.conns[p.connectionId] = c;
        this.emit('connection', c);
        c._answer(p.sdp);
        break; }
      case 'ANSWER': { const c = this.conns[p.connectionId]; if (c) c._onAnswer(p.sdp); break; }
      case 'CANDIDATE': {
        let c = this.conns[p.connectionId];
        if (p.rl) {
          // a oferta pode não ter chegado: cria a conexão só pela reserva
          if (!c && p.rl === 'hi' && p.connectionId && m.src) { c = new DataConnection(this, m.src, p.connectionId); this.conns[p.connectionId] = c; this.emit('connection', c); }
          if (c) c._onRelay(String(p.rl), p.d);
          break;
        }
        if (c && p.candidate) c._onCandidate(p.candidate); break; }
    }
  }
  _send(o: any) {
    if (this.destroyed) return;
    const id = rnd(12);
    const m = Object.assign({ mid: id }, o);
    if (m.payload && typeof m.payload === 'object') m.payload = Object.assign({ _mid: id }, m.payload);
    for (const l of this.links) l.send(m);
  }
  _forget(c: DataConnection) { if (this.conns[c.connectionId] === c) delete this.conns[c.connectionId]; }
  connect(peer: string, opts?: any) {
    const cid = 'dc_' + rnd(12);
    const only = !!(opts && opts.relayOnly);
    const c = new DataConnection(this, peer, cid, undefined, true, only);
    this.conns[cid] = c;
    if (only) return c;
    if (this.open) c._start(); else { const go = () => { this.off('open', go); c._start(); }; this.on('open', go); }
    return c;
  }
  /** os servidores voltam sozinhos; fica aqui para quem já chamava */
  reconnect() {}
  destroy() {
    if (this.destroyed) return; this.destroyed = true; this.open = false;
    clearTimeout(this.failT);
    for (const k in this.conns) this.conns[k].close();
    for (const l of this.links) l.close();
    this.links = [];
  }
}

// permite ao Peer avisar a conexão de erro (emit é protegido)
(DataConnection.prototype as any).emit2 = function (this: any, ev: string, ...a: any[]) { this.emit(ev, ...a); };
