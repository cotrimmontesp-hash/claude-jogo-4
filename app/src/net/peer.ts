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
  constructor(owner: Peer, peer: string, connectionId: string, label?: string) {
    super(); this.owner = owner; this.peer = peer; this.connectionId = connectionId; this.label = label || connectionId;
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
      if (s === 'failed' || s === 'closed') { this.close(); }
    });
    pc.addEventListener('datachannel', (ev: any) => { this.useChannel(ev.channel); });
    return pc;
  }
  private useChannel(dc: any) {
    this.dc = dc;
    const onOpen = () => { if (this.open || this.closed) return; this.open = true; this.emit('open'); };
    dc.addEventListener('open', onOpen);
    dc.addEventListener('message', (ev: any) => {
      let d = ev && ev.data;
      if (typeof d !== 'string') return;
      try { d = JSON.parse(d); } catch (e) { return; }
      this.emit('data', d);
    });
    dc.addEventListener('close', () => this.close());
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
    if (!this.dc || this.dc.readyState !== 'open') throw new PeerError('not-open-yet');
    this.dc.send(JSON.stringify(d));
  }
  close() {
    if (this.closed) return; this.closed = true;
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
    try { ws = new WS('wss://' + HOST + ':443/peerjs?key=' + KEY + '&id=' + encodeURIComponent(this.id) + '&token=' + this.token + '&version=1.5.4'); }
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
      case 'CANDIDATE': { const c = this.conns[p.connectionId]; if (c && p.candidate) c._onCandidate(p.candidate); break; }
    }
  }
  _send(o: any) { const ws = this.ws; if (!ws || ws.readyState !== 1) return; try { ws.send(JSON.stringify(o)); } catch (e) {} }
  _forget(c: DataConnection) { if (this.conns[c.connectionId] === c) delete this.conns[c.connectionId]; }
  connect(peer: string, _opts?: any) {
    const cid = 'dc_' + rnd(12);
    const c = new DataConnection(this, peer, cid);
    this.conns[cid] = c;
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
