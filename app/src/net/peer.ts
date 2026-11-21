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
  relay = false; private rlT: any = null; private rlTries = 0; private rlPend: any = null; private rlFlushT: any = null;
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
    this.relay = true; this.open = true;
    try { this.dc && this.dc.close(); } catch (e) {}
    try { this.peerConnection && this.peerConnection.close(); } catch (e) {}
    this.dc = null;
    if (!was) this.emit('open');
  }
  _onRelay(kind: string, d: any) {
    if (this.closed) return;
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
    this.closed = true; clearTimeout(this.rlT); clearTimeout(this.rlFlushT);
    const was = this.open; this.open = false;
    try { this.dc && this.dc.close(); } catch (e) {}
    try { this.peerConnection && this.peerConnection.close(); } catch (e) {}
    this.owner._forget(this);
    void was; this.emit('close');
  }
}

export class Peer extends Emitter {
  id: string; open = false; destroyed = false; disconnected = false;
  private ws: any = null; private token = rnd(10); private hb: any = null; private conns: { [cid: string]: DataConnection } = {};
  constructor(id?: string) {
    super();
    this.id = id || 'titacoral-v1-x-' + rnd(12);
    setTimeout(() => this.connectWs(), 0);
  }
  private connectWs() {
    if (this.destroyed) return;
    const WS = G.WebSocket;
    if (!WS) { this.emit('error', new PeerError('browser-incompatible')); return; }
    let ws: any;
    try { ws = new WS((G.__PEERJS_URL || 'wss://' + HOST + ':443/peerjs') + '?key=' + KEY + '&id=' + encodeURIComponent(this.id) + '&token=' + this.token + '&version=1.5.4'); }
    catch (e) { this.emit('error', new PeerError('network')); return; }
    this.ws = ws; this.disconnected = false;
    ws.onmessage = (ev: any) => { let m: any; try { m = JSON.parse(ev.data); } catch (e) { return; } this.onMsg(m); };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      clearInterval(this.hb); this.ws = null;
      if (this.destroyed) return;
      const wasOpen = this.open; this.open = false; this.disconnected = true;
      if (wasOpen) this.emit('disconnected', this.id); else this.emit('error', new PeerError('network', 'Sem conexão com o servidor'));
    };
    ws.onerror = () => {};
    clearInterval(this.hb);
    this.hb = setInterval(() => { this._send({ type: 'HEARTBEAT' }); }, 5000);
  }
  private onMsg(m: any) {
    const p = m.payload || {};
    switch (m.type) {
      case 'OPEN': this.open = true; this.emit('open', this.id); break;
      case 'ID-TAKEN': this.emit('error', new PeerError('unavailable-id', 'ID em uso')); this.destroy(); break;
      case 'INVALID-KEY': this.emit('error', new PeerError('invalid-key')); this.destroy(); break;
      case 'ERROR': this.emit('error', new PeerError('server-error', p.msg)); break;
      case 'EXPIRE': {
        for (const k in this.conns) { const c = this.conns[k]; if (c.peer === m.src && !c.open) { (c as any).emit2('error', new PeerError('peer-unavailable')); c.close(); } }
        this.emit('error', new PeerError('peer-unavailable', 'Não achei ' + m.src));
        break; }
      case 'LEAVE': for (const k in this.conns) { const c = this.conns[k]; if (c.peer === m.src) c.close(); } break;
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
  _send(o: any) { const ws = this.ws; if (!ws || ws.readyState !== 1) return; try { ws.send(JSON.stringify(o)); } catch (e) {} }
  _forget(c: DataConnection) { if (this.conns[c.connectionId] === c) delete this.conns[c.connectionId]; }
  connect(peer: string, opts?: any) {
    const cid = 'dc_' + rnd(12);
    const only = !!(opts && opts.relayOnly);
    const c = new DataConnection(this, peer, cid, undefined, true, only);
    this.conns[cid] = c;
    if (only) return c;
    if (this.open) c._start(); else this.on('open', () => c._start());
    return c;
  }
  reconnect() { if (this.destroyed || this.ws) return; this.connectWs(); }
  destroy() {
    if (this.destroyed) return; this.destroyed = true; this.open = false;
    clearInterval(this.hb);
    for (const k in this.conns) this.conns[k].close();
    try { this.ws && this.ws.close(); } catch (e) {}
    this.ws = null;
  }
}

// permite ao Peer avisar a conexão de erro (emit é protegido)
(DataConnection.prototype as any).emit2 = function (this: any, ev: string, ...a: any[]) { this.emit(ev, ...a); };
