/* Todas as telas do jogo em React Native: início, personagens, armas, personalizar,
   online, amigos, sala de espera, mapa, diálogos, resultado, pausa, convite e avisos. */
import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Btn, C, Card, FONT, H2, H3, Lab, OText, Ov, P, Row, XpBar, st, useGame, useInfo, useLay } from './kit';
import { MiniCanvas } from './MiniCanvas';

/* fundo roxo listrado dos menus */
function MenuBg() {
  const game = useGame(), lay = useLay();
  return <MiniCanvas key={lay.W + 'x' + lay.H} w={lay.W} h={lay.H} width={lay.W} height={lay.H} animate={false}
    style={StyleSheet.absoluteFill} draw={g => game.paint.menuBg(g, lay.W, lay.H)} />;
}

/* ---------- início (no estilo do Brawl Stars) ---------- */
function SideBtn({ icon, label, color, onPress, badge }: { icon: string; label: string; color: string; onPress: () => void; badge?: boolean }) {
  const game = useGame();
  const [down, setDown] = useState(false);
  return (
    <Pressable onPress={() => { game.act.btnSound(); onPress(); }} onPressIn={() => setDown(true)} onPressOut={() => setDown(false)}
      accessibilityRole="button" accessibilityLabel={label} style={{ alignItems: 'center', width: 72, transform: [{ translateY: down ? 3 : 0 }] }}>
      <View>
        <View style={[hm.sideShadow]} />
        <View style={[hm.side, { backgroundColor: color }]}><Text style={hm.sideIcon}>{icon}</Text></View>
        {badge && <View style={hm.badge}><Text style={hm.badgeT}>!</Text></View>}
      </View>
      <OText stroke={3} lines={1} style={hm.sideLab}>{label}</OText>
    </Pressable>
  );
}
function StatPill({ icon, value, label }: { icon: string; value: any; label: string }) {
  return (
    <View style={hm.pill} accessibilityLabel={label + ': ' + value}>
      <Text style={hm.pillIcon}>{icon}</Text>
      <OText stroke={3} style={hm.pillT}>{String(value)}</OText>
    </View>
  );
}
function ModePicker({ onClose }: { onClose: () => void }) {
  const game = useGame(), lay = useLay();
  const md = useInfo(() => game.info.modes());
  const cols = lay.W < 700 ? 2 : 4;
  const cw = Math.min(200, (Math.min(lay.W, 900) - 40 - lay.ins.l - lay.ins.r - 14 * (cols - 1)) / cols);
  return (
    <Ov bg={<MenuBg />} z={7}>
      <View style={{ alignItems: 'center', gap: 12, width: '100%' }}>
        <OText stroke={6} drop={4} style={{ fontFamily: FONT.display, fontSize: 34, color: '#fff', textAlign: 'center' }}>Escolha o modo</OText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
          {md.list.map((m: any) => {
            const sel = m.k === md.cur;
            return (
              <Pressable key={m.k} onPress={() => { game.act.btnSound(); game.act.setMode(m.k); onClose(); }} accessibilityRole="button" accessibilityLabel={m.name}
                style={[hm.card, { width: cw, borderColor: sel ? C.gold : C.ink, transform: [{ translateY: sel ? -4 : 0 }] }]}>
                <View style={[hm.cardTop, { backgroundColor: m.col }]}>
                  <Text style={hm.tag}>{m.tag}</Text>
                  <MiniCanvas w={320} h={180} width={cw - 6} height={(cw - 6) * 180 / 320} draw={g => game.paint.mode(g, m.k)} />
                </View>
                <View style={{ padding: 8, gap: 2, alignItems: 'center' }}>
                  <Text style={hm.cardName}>{sel ? '✓ ' : ''}{m.name}</Text>
                  <Text style={hm.cardSub} numberOfLines={2}>{m.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Btn label="Voltar" kind="red" size="sm" onPress={onClose} />
      </View>
    </Ov>
  );
}
function Home() {
  const game = useGame(), lay = useLay();
  const m = useInfo(() => game.info.menu());
  const md = useInfo(() => game.info.modes());
  const [picking, setPicking] = useState(false);
  const cm = md.list.find((x: any) => x.k === md.cur) || md.list[0] || { k: 'story', name: 'História', sub: '', col: C.teal, tag: '' };
  const stage = Math.max(140, Math.min(340, lay.H * .74, lay.W * .36));
  const tileW = Math.min(230, lay.W * .27);
  const ins = lay.ins;
  if (picking) return <ModePicker onClose={() => setPicking(false)} />;
  return (
    <Ov bg={<MenuBg />} center={false}>
      <View style={{ flex: 1 }}>
        {/* barra de cima: perfil e números */}
        <View style={hm.top}>
          <Pressable onPress={() => { game.act.btnSound(); game.act.openHeroes(); }} style={hm.prof} accessibilityRole="button" accessibilityLabel="Perfil">
            <View style={hm.lvl}><Text style={hm.lvlT}>{m.lvl}</Text></View>
            <View style={{ minWidth: 0, gap: 3, width: Math.min(200, lay.W * .22) }}>
              <OText stroke={3} lines={1} style={hm.pname}>{m.name}</OText>
              <XpBar pct={m.xp} />
              <Text style={hm.pxp} numberOfLines={1}>{m.xpT}</Text>
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <StatPill icon="⚙️" value={m.gears} label="Engrenagens" />
            <StatPill icon="🤖" value={m.kills} label="Robôs derrotados" />
            <StatPill icon="🌊" value={m.wave} label="Recorde de ondas" />
            <Pressable onPress={() => { game.act.btnSound(); game.act.toggleSfx(); }} style={hm.round} accessibilityLabel={'Som ' + (m.sfx ? 'ligado' : 'desligado')}><Text style={hm.roundT}>{m.sfx ? '🔊' : '🔇'}</Text></Pressable>
            <Pressable onPress={() => { game.act.btnSound(); game.act.toggleMus(); }} style={[hm.round, !m.mus && { opacity: .5 }]} accessibilityLabel={'Música ' + (m.mus ? 'ligada' : 'desligada')}><Text style={hm.roundT}>🎵</Text></Pressable>
          </View>
        </View>
        {/* meio: botões do lado, personagem no palco */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={hm.sideGrid}>
            <SideBtn icon="🛒" label="Loja" color="#ff5d73" onPress={game.act.openShop} />
            <SideBtn icon="🦸" label="Heróis" color="#22c7c7" onPress={game.act.openHeroes} />
            <SideBtn icon="⚔️" label={m.arms === 'Armas' ? 'Armas' : 'Armas!'} color="#ffb020" onPress={game.act.openArsenal} badge={m.arms !== 'Armas'} />
            <SideBtn icon="🎨" label="Visual" color="#8b6cff" onPress={game.act.openSkin} badge={m.skin !== 'Personalizar'} />
            <SideBtn icon="🎯" label="Missões" color="#4cd964" onPress={game.act.openMissions} badge={m.missions !== 'Missões'} />
            {m.friends ? <SideBtn icon="👥" label="Amigos" color="#3f7be0" onPress={game.act.openFriends} badge={m.friendsLabel !== 'Amigos'} />
              : <SideBtn icon="🌐" label="Online" color="#3f7be0" onPress={game.act.openLobby} />}
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <MiniCanvas w={520} h={520} width={stage} draw={g => game.paint.menuScene(g)}
              onDown={(x, y) => game.input.homeDown(x, y)} onMove={(x, y) => game.input.homeMove(x, y)} onUp={() => game.input.homeUp()} onCancel={() => game.input.homeCancel()} />
            <View style={{ alignItems: 'center', marginTop: -stage * .06 }}>
              <OText stroke={5} style={{ fontFamily: FONT.display, fontSize: 24, color: '#fff', textAlign: 'center' }}>{m.hero}</OText>
              <Text style={h.role}>{m.role}</Text>
            </View>
          </View>
          <View style={{ width: tileW + 150 }} />
        </View>
      </View>
      {/* canto de baixo à direita: modo + Jogar */}
      <View style={[hm.playRow, { right: 16 + ins.r, bottom: 12 + ins.b }]}>
        <Pressable onPress={() => { game.act.btnSound(); setPicking(true); }} accessibilityRole="button" accessibilityLabel={'Modo: ' + cm.name + '. Trocar modo'}
          style={[hm.modeTile, { width: tileW, backgroundColor: cm.col }]}>
          <View style={hm.modeIcon}><MiniCanvas key={cm.k} w={320} h={180} width={72} height={40.5} draw={g => game.paint.mode(g, cm.k)} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <OText stroke={3} lines={1} style={hm.modeName}>{cm.name}</OText>
            <Text style={hm.modeSub} numberOfLines={1}>{cm.sub}</Text>
            <Text style={hm.modeHint}>▸ trocar modo</Text>
          </View>
        </Pressable>
        <Btn label="Jogar" kind="play" fontSize={36} padV={12} padH={22} start onPress={game.act.playMode} />
      </View>
    </Ov>
  );
}
const hm = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  prof: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(29,20,54,.6)', borderWidth: 3, borderColor: C.ink, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10 },
  lvl: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.gold, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  lvlT: { fontFamily: FONT.display, fontSize: 22, color: C.ink },
  pname: { fontFamily: FONT.display, fontSize: 18, color: '#fff' },
  pxp: { fontFamily: FONT.black, fontSize: 10, color: C.hint },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(29,20,54,.75)', borderWidth: 3, borderColor: C.ink, borderRadius: 999, paddingVertical: 3, paddingLeft: 6, paddingRight: 12 },
  pillIcon: { fontSize: 16 },
  pillT: { fontFamily: FONT.display, fontSize: 17, color: '#fff' },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  roundT: { fontSize: 16 },
  sideGrid: { width: 160, flexDirection: 'row', flexWrap: 'wrap', gap: 6, rowGap: 4, alignContent: 'center' },
  side: { width: 54, height: 54, borderRadius: 14, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  sideShadow: { position: 'absolute', left: 0, right: 0, top: 4, height: 54, borderRadius: 14, backgroundColor: C.ink },
  sideIcon: { fontSize: 26 },
  sideLab: { fontFamily: FONT.display, fontSize: 14, color: '#fff', textAlign: 'center', marginTop: 4 },
  badge: { position: 'absolute', right: -6, top: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.coral, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  badgeT: { fontFamily: FONT.display, fontSize: 13, color: '#fff' },
  playRow: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  modeTile: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 3, borderColor: C.ink, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 5 },
  modeIcon: { width: 78, height: 46, borderRadius: 10, backgroundColor: 'rgba(29,20,54,.35)', borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  modeName: { fontFamily: FONT.display, fontSize: 18, color: '#fff' },
  modeSub: { fontFamily: FONT.black, fontSize: 10, color: '#fff' },
  modeHint: { fontFamily: FONT.black, fontSize: 10, color: C.ink, opacity: .75 },
  card: { backgroundColor: '#fff', borderWidth: 4, borderRadius: 18, overflow: 'hidden' },
  cardTop: { alignItems: 'center', paddingTop: 4, borderBottomWidth: 3, borderBottomColor: C.ink },
  tag: { fontFamily: FONT.black, fontSize: 10, letterSpacing: 1.2, color: '#fff', backgroundColor: 'rgba(29,20,54,.55)', paddingHorizontal: 8, paddingVertical: 1, borderRadius: 999, overflow: 'hidden' },
  cardName: { fontFamily: FONT.display, fontSize: 19, color: C.ink, textAlign: 'center' },
  cardSub: { fontFamily: FONT.body, fontSize: 11, lineHeight: 14, color: C.sub, textAlign: 'center' },
});
const h = StyleSheet.create({
  role: { fontFamily: FONT.black, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: C.gold, textShadowColor: C.ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0.1, textAlign: 'center' },
});

/* ---------- personalizar ---------- */
function Skin() {
  const game = useGame();
  const s = useInfo(() => game.info.skin());
  const sw = (list: string[], key: 'b' | 'h', sel: string) => (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {list.map(c => (
        <Pressable key={c} accessibilityLabel={'Cor ' + c} onPress={() => { game.act.btnSound(); game.act.pickSkin(key, c); }}
          style={[sk.sw, { backgroundColor: c }, sel === c && sk.sel]} />
      ))}
    </View>
  );
  return (
    <Ov bg={<MenuBg />}>
      <Card>
        <H3>Personalizar</H3>
        <P>{s.who}</P>
        <MiniCanvas w={240} h={240} width={130} draw={g => game.paint.skin(g)} />
        <Lab style={{ width: '100%' }}>Roupa para equipar</Lab>
        <Row>
          <Btn label={(s.outfit === 'normal' ? '✓ ' : '') + 'Normal'} kind={s.outfit === 'normal' ? 'gold' : 'alt'} size="sm" onPress={() => game.act.pickOutfit('normal')} />
          <Btn label={(s.outfit === 'alt' ? '✓ ' : '') + s.altName} kind={s.outfit === 'alt' ? 'gold' : 'alt'} size="sm" onPress={() => game.act.pickOutfit('alt')} />
          <Btn label={s.lv20Lock ? '🔒 ' + s.lv20Name + ' · nível ' + s.lv20 : (s.outfit === 'lv20' ? '✓ ' : '') + s.lv20Name + (s.lv20New ? ' (nova!)' : '')}
            kind={s.outfit === 'lv20' ? 'gold' : 'red'} size="sm" disabled={s.lv20Lock} onPress={() => game.act.pickOutfit('lv20')} />
          {s.shopOwned && <Btn label={(s.outfit === 'shop' ? '✓ ' : '') + s.shopName} kind={s.outfit === 'shop' ? 'gold' : 'alt'} size="sm" onPress={() => game.act.pickOutfit('shop')} />}
        </Row>
        {!s.shopOwned && <Text style={[ls.empty, { fontSize: 12 }]}>Tem mais uma roupa ({s.shopName}) na Loja.</Text>}
        {s.lv20Lock && <Text style={[ls.empty, { fontSize: 12 }]}>A roupa {s.lv20Name} libera quando o personagem chega no nível {s.lv20} (agora: nível {s.lv}).</Text>}
        <Lab style={{ width: '100%' }}>Cor da roupa</Lab>{sw(s.body, 'b', s.b)}
        <Lab style={{ width: '100%' }}>Cabelo</Lab>{sw(s.hair, 'h', s.h)}
        <Row><Btn label="Cores originais" kind="alt" size="sm" onPress={game.act.skinReset} /><Btn label="Pronto" size="sm" onPress={game.act.skinBack} /></Row>
      </Card>
    </Ov>
  );
}
const sk = StyleSheet.create({
  sw: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: C.ink },
  sel: { outlineColor: C.gold, outlineWidth: 3, outlineStyle: 'solid', outlineOffset: 2, transform: [{ scale: 1.12 }], borderColor: '#fff' } as any,
});

/* ---------- barra de cima (sala de espera e mapa) ---------- */
function TopBar({ children, right }: { children?: any; right: any }) {
  const lay = useLay();
  return (
    <View pointerEvents="box-none" style={[tb.bar, { paddingTop: 8 + lay.ins.t, paddingLeft: 12 + lay.ins.l, paddingRight: 12 + lay.ins.r }]}>
      {children}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 1 }}>{right}</View>
    </View>
  );
}
function Pill({ children }: { children: any }) {
  return <View style={tb.pill}><OText stroke={3} lines={1} style={st.pill}>{children}</OText></View>;
}
const tb = StyleSheet.create({
  bar: { position: 'absolute', zIndex: 4, left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  pill: { backgroundColor: 'rgba(29,20,54,.75)', borderWidth: 3, borderColor: C.ink, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 14 },
});

/* ---------- sala de espera ---------- */
function WaitUI() {
  const game = useGame(), lay = useLay();
  const w = useInfo(() => game.info.wait());
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 4 }]}>
      <TopBar right={<>
        <Btn label="Convidar" kind="alt" size="sm" onPress={game.act.inviteRoom} />
        {w.friends && <Btn label={w.friendsLabel} size="sm" onPress={game.act.openFriends} />}
        <Btn label="Personagens" size="sm" onPress={game.act.openHeroes} />
        <Btn label="Armas" size="sm" onPress={game.act.openArsenal} />
      </>}>
        <Btn label="Sair" kind="red" size="sm" onPress={game.act.waitLeave} />
      </TopBar>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 58 + lay.ins.t, alignItems: 'center' }}>
        <View style={wt.card}>
          <Text style={wt.title}>Sala de espera · {w.code} · {w.count}</Text>
          <View style={wt.row}>
            {w.host && <Btn label={w.mode} kind="alt" size="sm" onPress={game.act.wMode} />}
            {w.arrows && <Btn label="‹" size="sm" a11y="Capítulo anterior" onPress={game.act.wPrev} />}
            <View style={{ alignItems: 'center', minWidth: 0, flexShrink: 1 }}>
              <Text style={wt.chN}>{w.chN}</Text>
              <Text style={wt.chT} numberOfLines={1}>{w.chT}</Text>
            </View>
            {w.arrows && <Btn label="›" size="sm" a11y="Próximo capítulo" onPress={game.act.wNext} />}
            {w.host && <Btn label={w.start} start disabled={w.startOff} onPress={game.act.wStart} />}
          </View>
          <Text style={wt.wait}>{w.wait}</Text>
        </View>
      </View>
    </View>
  );
}
const wt = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,.95)', borderWidth: 4, borderColor: C.ink, borderRadius: 16, paddingTop: 6, paddingHorizontal: 10, paddingBottom: 8, alignItems: 'center', gap: 4, maxWidth: '92%' },
  title: { fontFamily: FONT.black, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: C.sub },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chN: { fontFamily: FONT.black, fontSize: 11, color: C.sub2, textTransform: 'uppercase', letterSpacing: .9 },
  chT: { fontFamily: FONT.display, fontSize: 20, color: C.ink },
  wait: { fontFamily: FONT.body, fontSize: 12, color: '#2a9d6a', textAlign: 'center' },
});

/* ---------- online ---------- */
function Lobby() {
  const game = useGame();
  const l = useInfo(() => game.info.lobby());
  return (
    <Ov bg={<MenuBg />}>
      <Card>
        <H3>Jogar online</H3>
        <P>{l.msg}</P>
        <View style={{ width: '100%', gap: 4 }}>
          <Lab>Seu nome</Lab>
          <TextInput style={st.input} value={l.name} maxLength={12} autoCorrect={false} autoComplete="off" onChangeText={game.act.lobbyName} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, width: '100%', justifyContent: 'center' }}>
          <View style={{ flexGrow: 1, flexBasis: 200, minWidth: 0, gap: 8, alignItems: 'stretch' }}>
            <Btn label="Criar sala" disabled={!l.ok} onPress={game.act.createRoom} />
            <View style={{ gap: 4 }}>
              <Lab>Código de uma sala</Lab>
              <TextInput style={st.input} value={l.code} maxLength={4} autoCapitalize="characters" autoCorrect={false} autoComplete="off" placeholder="ABCD" placeholderTextColor="#b9b0d6"
                onChangeText={game.act.lobbyCode} onSubmitEditing={game.act.joinCode} />
            </View>
            <Btn label="Entrar com código" kind="alt" size="sm" disabled={!l.ok} onPress={game.act.joinCode} />
          </View>
          {!l.p2p && (
            <View style={{ flexGrow: 1, flexBasis: 200, minWidth: 0, gap: 8 }}>
              <Lab>Salas abertas</Lab>
              {!l.rooms.length ? <Text style={ls.empty}>{l.empty}</Text> : l.rooms.map((r: any) => (
                <Pressable key={r.code} disabled={r.full} onPress={() => { game.act.btnSound(); game.act.joinListed(r.join); }} style={[ls.room, r.full && { opacity: .5 }]}>
                  <Text style={ls.code}>{r.code}</Text><Text style={ls.rlab}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <Btn label="Voltar" kind="red" size="sm" onPress={game.act.lobbyBack} />
      </Card>
    </Ov>
  );
}
const ls = StyleSheet.create({
  empty: { fontFamily: FONT.body, color: C.sub2, fontSize: 14, textAlign: 'center' },
  room: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  code: { fontFamily: FONT.display, fontSize: 20, letterSpacing: 1.2, color: C.ink },
  rlab: { fontFamily: FONT.black, fontSize: 15, color: C.ink },
});

/* ---------- mapa da ilha ---------- */
function MapUI() {
  const game = useGame(), lay = useLay();
  const m = useInfo(() => game.info.map());
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 4 }]}>
      <TopBar right={<>
        {m.invite && <Btn label="Convidar" kind="alt" size="sm" onPress={game.act.inviteRoom} />}
        {m.friends && <Btn label={m.friendsLabel} size="sm" onPress={game.act.openFriends} />}
        <Btn label="Personagens" size="sm" onPress={game.act.openHeroes} />
        {m.room && <Pill>{m.room}</Pill>}
        <Pill>{m.gears}</Pill>
      </>}>
        <Btn label="Sair" kind="red" size="sm" onPress={game.act.mapBack} />
      </TopBar>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 10 + lay.ins.b, alignItems: 'center' }}>
        <View style={mp.card}>
          <View style={{ minWidth: 0, flexShrink: 1 }}>
            <Text style={mp.n}>{m.n}</Text>
            <Text style={mp.t} numberOfLines={1}>{m.t}</Text>
            <Text style={mp.s}>{m.s}</Text>
          </View>
          {m.go && <Btn label="Entrar" start disabled={m.goOff} onPress={game.act.mapEnter} />}
        </View>
      </View>
    </View>
  );
}
const mp = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderWidth: 4, borderColor: C.ink, borderRadius: 18, paddingVertical: 8, paddingLeft: 16, paddingRight: 10, maxWidth: '92%' },
  n: { fontFamily: FONT.black, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: C.sub2 },
  t: { fontFamily: FONT.display, fontSize: 22, lineHeight: 24, color: C.ink },
  s: { fontFamily: FONT.body, fontSize: 12, color: '#2a9d6a' },
});

/* ---------- diálogo da história ---------- */
const WEB = Platform.OS === 'web';
const Wrap: any = WEB ? Pressable : View;
function Dialog() {
  const game = useGame(), lay = useLay();
  const d = useInfo(() => ({ ...game.ui.dlg }));
  const ct = Math.max(28, Math.min(44, lay.W * .055));
  /* toques "crus" (não o onPress): funcionam mesmo com o outro dedo ainda no
     joystick, que é como a fala costuma aparecer no meio da fase */
  const downs = useRef<{ [id: string]: number }>({}), onSkip = useRef(false);
  const tStart = (e: any) => { for (const t of e.nativeEvent.changedTouches || [e.nativeEvent]) downs.current[String(t.identifier)] = Date.now(); };
  const tEnd = (e: any) => {
    for (const t of e.nativeEvent.changedTouches || [e.nativeEvent]) {
      const id = String(t.identifier), t0 = downs.current[id]; delete downs.current[id];
      if (t0 == null || Date.now() - t0 > 900) continue;
      if (onSkip.current) { onSkip.current = false; continue; }
      game.act.dlgTap();
    }
  };
  const tCancel = (e: any) => { for (const t of e.nativeEvent.changedTouches || [e.nativeEvent]) delete downs.current[String(t.identifier)]; };
  return (
    <Wrap style={[StyleSheet.absoluteFill, { zIndex: 6 }]} accessibilityRole="button" accessibilityLabel="Continuar"
      {...(WEB ? { onPress: game.act.dlgTap } : { onTouchStart: tStart, onTouchEnd: tEnd, onTouchCancel: tCancel, accessible: true, onAccessibilityTap: game.act.dlgTap })}>
      <MiniCanvas key={lay.W + 'x' + lay.H} w={lay.W} h={lay.H} width={lay.W} height={lay.H} animate={false} style={StyleSheet.absoluteFill}
        draw={g => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, lay.W, lay.H); const gr = g.createLinearGradient(0, lay.H * .35, 0, lay.H); gr.addColorStop(0, 'rgba(20,10,50,0)'); gr.addColorStop(1, 'rgba(20,10,50,.7)'); g.fillStyle = gr; g.fillRect(0, 0, lay.W, lay.H); }} />
      {d.title && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 14 + lay.ins.t, left: 0, right: 0, alignItems: 'center', gap: 2 }}>
          <Text style={dg.ctA}>{d.title[0]}</Text>
          <OText stroke={6} style={{ fontFamily: FONT.display, color: '#fff', fontSize: ct, lineHeight: ct * 1.15, textAlign: 'center' }}>{d.title[1]}</OText>
        </View>
      )}
      <Pressable onTouchStart={WEB ? undefined : () => { onSkip.current = true; }} onPress={game.act.dlgSkip} style={[dg.skip, { top: 10 + lay.ins.t, right: 14 + lay.ins.r }]} accessibilityRole="button">
        <Text style={dg.skipT}>Pular</Text>
      </Pressable>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 6, paddingBottom: 12 + lay.ins.b, paddingLeft: 16 + lay.ins.l, paddingRight: 16 + lay.ins.r }}>
        <View pointerEvents="none" style={{ width: '100%', maxWidth: 720, flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
          <View style={dg.por}><MiniCanvas w={240} h={240} width={90} draw={g => game.paint.portrait(g)} /></View>
          <View style={dg.box}>
            <OText stroke={3} style={dg.nm}>{d.name}</OText>
            <Text style={dg.txt}>{d.text}</Text>
          </View>
        </View>
        <Text style={dg.tap}>Toque para continuar</Text>
      </View>
    </Wrap>
  );
}
const dg = StyleSheet.create({
  ctA: { fontFamily: FONT.black, color: C.gold, letterSpacing: 1.8, textTransform: 'uppercase', fontSize: 13, textShadowColor: C.ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0.1 },
  skip: { position: 'absolute', backgroundColor: 'rgba(255,255,255,.92)', borderWidth: 3, borderColor: C.ink, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 12, zIndex: 2 },
  skipT: { fontFamily: FONT.black, fontSize: 14, color: C.ink },
  por: { width: 96, height: 96, backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 18, overflow: 'hidden' },
  box: { flex: 1, minWidth: 0, backgroundColor: '#fff', borderWidth: 3, borderColor: C.ink, borderRadius: 18, paddingTop: 8, paddingHorizontal: 14, paddingBottom: 10, minHeight: 78 },
  nm: { fontFamily: FONT.display, fontSize: 19, color: C.coral },
  txt: { fontFamily: FONT.body, fontSize: 15, lineHeight: 20, color: C.ink, marginTop: 2 },
  tap: { color: '#fff', fontFamily: FONT.black, fontSize: 12, letterSpacing: .7, opacity: .85 },
});

/* ---------- resultado e pausa ---------- */
function Result() {
  const game = useGame();
  const r = useInfo(() => ({ ...game.ui.res }));
  return (
    <Ov dim>
      <Card>
        <H2 lose={r.lose}>{r.title}</H2>
        <P>{r.sub}</P>
        <Row>
          {!!r.l1 && <Btn label={r.l1} onPress={() => game.act.resPick(0)} />}
          {!!r.l2 && <Btn label={r.l2} kind="alt" onPress={() => game.act.resPick(1)} />}
        </Row>
      </Card>
    </Ov>
  );
}
function Pause() {
  const game = useGame();
  const p = useInfo(() => ({ ...game.ui.pause, m: game.info.menu() }));
  return (
    <Ov dim>
      <Card>
        <H2>Pausa</H2>
        <P>{p.tip}</P>
        <Row><Btn label={'Som: ' + (p.m.sfx ? 'ligado' : 'desligado')} kind="alt" size="sm" onPress={game.act.toggleSfx} /><Btn label={'Música: ' + (p.m.mus ? 'ligada' : 'desligada')} kind="alt" size="sm" onPress={game.act.toggleMus} /></Row>
        <Row><Btn label="Continuar" onPress={game.act.pauseContinue} /><Btn label={p.quit} kind="red" onPress={game.act.pauseQuit} /></Row>
      </Card>
    </Ov>
  );
}

/* ---------- amigos ---------- */
function Friends() {
  const game = useGame();
  const f = useInfo(() => game.info.friends());
  return (
    <Ov bg={<MenuBg />}>
      <Card>
        <H3>Amigos</H3>
        <View style={fr.mycode}>
          <Lab>Seu código</Lab>
          <View style={fr.codeBox}><Text style={fr.code}>{f.fid}</Text></View>
          <Btn label="Enviar" kind="alt" size="sm" onPress={game.act.shareFid} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, width: '100%', alignItems: 'flex-start' }}>
          <TextInput style={[st.input, { flex: 1, width: undefined, minWidth: 0 }]} value={f.input} maxLength={6} autoCapitalize="characters" autoCorrect={false} autoComplete="off"
            placeholder="Código do amigo" placeholderTextColor="#b9b0d6" accessibilityLabel="Código do amigo" onChangeText={game.act.setFidIn} onSubmitEditing={game.act.addFriend} />
          <Btn label="Adicionar" size="sm" disabled={f.busy} onPress={game.act.addFriend} />
        </View>
        <Text style={ls.empty}>{f.msg}</Text>
        {f.reqs.map((r: any) => (
          <View key={'r' + r.id} style={fr.row}>
            <View style={fr.who}><Text style={fr.name} numberOfLines={1}>{r.name}</Text><Text style={fr.sub}>{r.sub}</Text></View>
            <Btn label="Aceitar" size="sm" onPress={() => game.act.friendAccept(r.id)} />
            <Btn label="Recusar" kind="red" size="sm" onPress={() => game.act.friendReject(r.id)} />
          </View>
        ))}
        {f.list.map((x: any) => (
          <View key={'f' + x.id} style={fr.row}>
            <View style={[fr.dot, x.dot === 'room' ? { backgroundColor: C.gold } : x.dot === 'on' ? { backgroundColor: '#5ee04a' } : null]} />
            <View style={fr.who}><Text style={fr.name} numberOfLines={1}>{x.name}</Text><Text style={fr.sub}>{x.sub}</Text></View>
            {x.join ? <Btn label="Entrar" size="sm" onPress={() => game.act.friendJoin(x.join)} />
              : x.invite ? <Btn label={x.invited ? 'Enviado' : 'Convidar'} kind="alt" size="sm" disabled={x.invited} onPress={() => game.act.friendInvite(x.id)} /> : null}
            <Btn label={x.rmAsk ? 'Remover?' : '×'} kind="red" size="sm" a11y={'Remover ' + x.name} onPress={() => game.act.friendRemove(x.id)} />
          </View>
        ))}
        <Btn label="Voltar" kind="red" size="sm" onPress={game.act.friendsBack} />
      </Card>
    </Ov>
  );
}
const fr = StyleSheet.create({
  mycode: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  codeBox: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2 },
  code: { fontFamily: FONT.display, fontSize: 30, letterSpacing: 3.6, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 12, paddingVertical: 6, paddingLeft: 12, paddingRight: 8, width: '100%' },
  who: { flex: 1, minWidth: 0 },
  name: { fontFamily: FONT.display, fontSize: 19, color: C.ink },
  sub: { fontFamily: FONT.body, fontSize: 12, color: C.sub2 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.ink, backgroundColor: '#b9b2d6' },
});

/* ---------- personagens ---------- */
function Heroes() {
  const game = useGame(), lay = useLay();
  const v = useInfo(() => game.info.heroes());
  const cols = lay.xnarrow ? 3 : 5;
  const cardW = Math.min(720, lay.W - 32 - lay.ins.l - lay.ins.r) - 48;
  const cw = Math.min(110, (cardW - 8 * (cols - 1)) / cols - 14);
  return (
    <Ov bg={<MenuBg />}>
      <Card maxW={720}>
        <H3>Personagens</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' }}>
          {v.cards.map((c: any, i: number) => (
            <Pressable key={i} onPress={() => { game.act.btnSound(); game.act.heroSel(i); }} accessibilityRole="button"
              style={[hr.card, { width: `${100 / cols - 2}%` as any }, i === v.sel && hr.sel]}>
              <MiniCanvas w={220} h={220} width={cw} draw={g => game.paint.heroCard(g, i)} />
              <Text style={hr.cname} numberOfLines={1}>{c.full}</Text>
              <Text style={[hr.tag, i === v.sel && { color: C.ink }]}>{c.tag}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ width: '100%', gap: 4 }}>
          <OText stroke={4} style={hr.name}>{v.name}</OText>
          <Text style={hr.role}>{v.role}</Text>
          <P style={{ textAlign: 'left', maxWidth: undefined }}>{v.desc}</P>
          <P style={{ textAlign: 'left', maxWidth: undefined, color: '#a06a00' }}>{v.sup}</P>
          <View style={{ gap: 4 }}>
            {v.stats.map(([k, n]: any) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={[hr.role, { width: 70 }]}>{k}</Text>
                <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
                  {[0, 1, 2, 3, 4].map(j => <View key={j} style={[hr.cell, j < n && { backgroundColor: C.teal }]} />)}
                </View>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={hr.lvl}>{v.lvl}</Text><XpBar pct={v.xp} style={{ flex: 1 }} /><Text style={hr.lvl}>{v.xpT}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {v.ws.map((w: any) => (
              <Pressable key={w.t} onPress={() => { game.act.btnSound(); game.act.heroWeapon(w.t); }} style={[hr.w, w.lock && hr.wLock, w.eq && { backgroundColor: C.gold }]}>
                <Text style={[hr.wb, w.col && { color: w.col }, w.lock && { color: C.sub2 }]}>{w.b}</Text>
                <Text style={[hr.wn, w.lock && { color: C.sub2 }]} numberOfLines={2}>{w.name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={hr.winfo}>{v.wInfo}</Text>
        </View>
        <Row><Btn label={v.pick} disabled={v.pickOff} onPress={game.act.heroPick} /><Btn label="Voltar" kind="red" size="sm" onPress={game.act.heroBack} /></Row>
      </Card>
    </Ov>
  );
}
const hr = StyleSheet.create({
  card: { alignItems: 'center', gap: 2, backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 14, paddingTop: 6, paddingHorizontal: 4, paddingBottom: 8, flexGrow: 1 },
  sel: { backgroundColor: C.gold, transform: [{ translateY: -3 }] },
  cname: { fontFamily: FONT.display, fontSize: 17, color: C.ink },
  tag: { fontFamily: FONT.black, fontSize: 10, letterSpacing: .6, textTransform: 'uppercase', color: C.sub },
  name: { fontFamily: FONT.display, fontSize: 26, color: C.coral },
  role: { fontFamily: FONT.black, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: C.sub },
  cell: { flex: 1, height: 10, borderWidth: 2, borderColor: C.ink, borderRadius: 4, backgroundColor: '#e4def5' },
  lvl: { fontFamily: FONT.black, fontSize: 13, color: C.sub },
  w: { width: '18.6%', flexGrow: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.ink, borderRadius: 10, backgroundColor: C.paper, paddingVertical: 3, paddingHorizontal: 2 },
  wLock: { backgroundColor: '#d8d2ee', borderColor: C.sub2 },
  wb: { fontFamily: FONT.display, fontSize: 15, color: C.ink },
  wn: { fontFamily: FONT.black, fontSize: 10, lineHeight: 11, color: C.ink, textAlign: 'center' },
  winfo: { fontFamily: FONT.body, fontSize: 13, color: C.ink, minHeight: 17 },
});

/* ---------- armas ---------- */
function Arsenal() {
  const game = useGame();
  const a = useInfo(() => game.info.arsenal());
  return (
    <Ov bg={<MenuBg />}>
      <Card maxW={620}>
        <H3>Armas</H3>
        <View style={{ flexDirection: 'row', gap: 6, width: '100%' }}>
          {a.tabs.map((t: string, i: number) => (
            <Pressable key={i} onPress={() => { game.act.btnSound(); game.act.arTab(i); }} style={[ar.tab, i === a.sel && { backgroundColor: C.gold }]}>
              <Text style={ar.tabT} numberOfLines={1}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ width: '100%', gap: 4 }}>
          <Text style={ar.head}>{a.head}</Text>
          <XpBar pct={a.xp} />
          <Text style={ar.head}>{a.sub}</Text>
        </View>
        <View style={{ width: '100%', gap: 6 }}>
          {a.rows.map((r: any) => (
            <View key={r.i} style={[ar.row, r.lock && ar.lock, r.eq && { backgroundColor: '#fff3c4' }]}>
              <View style={[ar.num, r.col && { backgroundColor: r.col }]}><Text style={ar.numT}>{r.i + 1}</Text></View>
              <MiniCanvas key={a.id + r.i + (r.lock ? 'l' : '')} w={120} h={60} width={72} animate={r.i === 14 && !r.lock} draw={g => game.paint.weapon(g, a.id, r.i, r.lock)} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[ar.name, r.lock && { color: C.sub2 }]} numberOfLines={1}>{r.name}</Text>
                <Text style={ar.info}>{r.info}</Text>
                {r.lock && <View style={ar.lbar}><View style={{ width: r.pct + '%' as any, height: '100%', backgroundColor: C.teal }} /></View>}
              </View>
              <Btn label={r.btn} kind={r.eq ? 'gold' : 'alt'} size="sm" disabled={r.lock || r.eq} onPress={() => game.act.arEquip(r.i)} />
            </View>
          ))}
        </View>
        <Btn label="Voltar" kind="red" size="sm" onPress={game.act.arBack} />
      </Card>
    </Ov>
  );
}
const ar = StyleSheet.create({
  tab: { flex: 1, borderWidth: 3, borderColor: C.ink, borderRadius: 10, backgroundColor: C.paper, paddingVertical: 5, paddingHorizontal: 2, alignItems: 'center' },
  tabT: { fontFamily: FONT.display, fontSize: 15, color: C.ink },
  head: { fontFamily: FONT.black, fontSize: 13, color: C.sub },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 12, paddingVertical: 6, paddingLeft: 10, paddingRight: 8 },
  lock: { backgroundColor: '#e6e1f5', borderColor: '#8a7cba' },
  num: { width: 34, height: 34, borderRadius: 9, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  numT: { fontFamily: FONT.display, fontSize: 17, color: C.ink },
  name: { fontFamily: FONT.display, fontSize: 18, color: C.ink },
  info: { fontFamily: FONT.body, fontSize: 12, color: C.sub },
  lbar: { height: 6, borderRadius: 3, backgroundColor: '#d0c8ec', marginTop: 3, overflow: 'hidden' },
});

/* ---------- convite, aviso e botão de pausa ---------- */
function Invite() {
  const game = useGame(), lay = useLay();
  const t = useInfo(() => game.ui.invite.txt);
  return (
    <View style={[iv.card, { right: 12 + lay.ins.r, top: 60 + lay.ins.t }]}>
      <Text style={iv.t}>{t}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn label="Entrar" size="sm" onPress={game.act.inviteGo} />
        <Btn label="Agora não" kind="red" size="sm" onPress={game.act.inviteNo} />
      </View>
    </View>
  );
}
const iv = StyleSheet.create({
  card: { position: 'absolute', zIndex: 10, backgroundColor: '#fff', borderWidth: 4, borderColor: C.ink, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, gap: 8, maxWidth: 300 },
  t: { fontFamily: FONT.black, fontSize: 15, color: C.ink },
});
function Toast() {
  const game = useGame(), lay = useLay();
  const t = useInfo(() => game.ui.toast);
  if (!t) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', zIndex: 9, top: 60 + lay.ins.t, left: 20, right: 20, alignItems: 'center' }}>
      <View style={to.box}><Text style={to.t}>{t.s}</Text></View>
    </View>
  );
}
const to = StyleSheet.create({
  box: { backgroundColor: '#fff', borderWidth: 3, borderColor: C.ink, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 16, maxWidth: '100%' },
  t: { fontFamily: FONT.black, fontSize: 15, color: C.ink, textAlign: 'center' },
});
function PauseBtn() {
  const game = useGame(), lay = useLay();
  return (
    <Pressable accessibilityLabel="Pausar" onPress={() => { game.act.btnSound(); game.act.pause(); }}
      style={{ position: 'absolute', zIndex: 4, top: 10 + lay.ins.t, right: 12 + lay.ins.r, width: 42, height: 42, borderRadius: 12, borderWidth: 3, borderColor: C.ink, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FONT.display, fontSize: 18, color: C.ink }}>II</Text>
    </Pressable>
  );
}

/* ---------- loja ---------- */
function Shop() {
  const game = useGame(), lay = useLay();
  const s = useInfo(() => game.info.shop());
  const sections: [string, string][] = [['outfit', 'Roupas'], ['color', 'Cores raras'], ['fx', 'Efeitos de tiro']];
  const wide = !lay.narrow;
  return (
    <Ov bg={<MenuBg />}>
      <Card maxW={720}>
        <H3>Loja</H3>
        <View style={sh.gears}><Text style={sh.gearsT}>⚙ {s.gears} engrenagens</Text></View>
        <Text style={[ls.empty, { fontSize: 12 }]}>Ganhe engrenagens nas fases, nas ondas e no baú das Missões.</Text>
        {sections.map(([type, title]) => (
          <View key={type} style={{ width: '100%', gap: 6 }}>
            <Lab>{title}</Lab>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {s.items.filter((i: any) => i.type === type).map((i: any) => (
                <View key={i.k} style={[sh.item, { width: wide ? '31.5%' : '48%' } as any, i.eq && { backgroundColor: '#fff3c4' }]}>
                  {i.type === 'outfit' ? <MiniCanvas w={240} h={240} width={70} draw={g => game.paint.outfit(g, i.ch, 'shop')} />
                    : i.type === 'color' ? <View style={[sh.sw, { backgroundColor: i.col }]} />
                    : <Text style={sh.fx}>{i.k === 'fx_confete' ? '🎉' : i.k === 'fx_arco' ? '🌈' : '🔥'}</Text>}
                  <Text style={sh.name} numberOfLines={1}>{i.name}</Text>
                  <Text style={sh.desc} numberOfLines={2}>{i.desc}</Text>
                  {i.owned
                    ? <Btn label={i.type === 'color' ? 'Usar' : i.eq ? '✓ Usando' : 'Usar'} kind={i.eq ? 'gold' : 'alt'} size="sm" onPress={() => game.act.shopUse(i.k)} />
                    : <Btn label={'⚙ ' + i.price} kind={i.afford ? 'gold' : 'red'} size="sm" onPress={() => game.act.shopBuy(i.k)} />}
                </View>
              ))}
            </View>
          </View>
        ))}
        <Btn label="Voltar" kind="red" size="sm" onPress={game.act.shopBack} />
      </Card>
    </Ov>
  );
}
const sh = StyleSheet.create({
  gears: { backgroundColor: C.ink, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 14 },
  gearsT: { fontFamily: FONT.display, fontSize: 18, color: C.gold },
  item: { alignItems: 'center', gap: 4, backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 6, flexGrow: 1 },
  sw: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: C.ink, marginVertical: 9 },
  fx: { fontSize: 40, lineHeight: 70 },
  name: { fontFamily: FONT.display, fontSize: 16, color: C.ink, textAlign: 'center' },
  desc: { fontFamily: FONT.body, fontSize: 11, lineHeight: 14, color: C.sub, textAlign: 'center', minHeight: 28 },
});

/* ---------- missões do dia e baú ---------- */
function Missions() {
  const game = useGame();
  const m = useInfo(() => game.info.missions());
  return (
    <Ov bg={<MenuBg />}>
      <Card>
        <H3>Missões do dia</H3>
        <P>Complete as 3 missões para abrir o baú. Amanhã chegam missões novas.</P>
        {m.list.map((x: any, i: number) => (
          <View key={i} style={[mi.row, x.done && { backgroundColor: '#e3f9d6' }]}>
            <Text style={mi.check}>{x.done ? '✅' : '🎯'}</Text>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={mi.t}>{x.t}</Text>
              <View style={mi.bar}><View style={{ width: Math.round(x.p / x.goal * 100) + '%' as any, height: '100%', backgroundColor: x.done ? '#5ee04a' : C.teal }} /></View>
            </View>
            <Text style={mi.n}>{x.p}/{x.goal}</Text>
          </View>
        ))}
        {m.chest ? (
          <View style={mi.prize}>
            <Text style={{ fontSize: 40 }}>🎁</Text>
            <Text style={mi.pt}>Você ganhou:</Text>
            {m.chest.lines.map((l: string, i: number) => <Text key={i} style={mi.pl}>{l}</Text>)}
          </View>
        ) : m.opened ? <Text style={ls.empty}>Baú de hoje já aberto. Volte amanhã!</Text>
          : <Btn label={m.ready ? '🎁 Abrir baú' : '🔒 Baú (faça as 3 missões)'} kind={m.ready ? 'play' : 'gold'} disabled={!m.ready} onPress={game.act.openChest} />}
        <Btn label="Voltar" kind="red" size="sm" onPress={game.act.missionsBack} />
      </Card>
    </Ov>
  );
}
const mi = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  check: { fontSize: 22 },
  t: { fontFamily: FONT.black, fontSize: 14, color: C.ink },
  bar: { height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.ink, backgroundColor: '#e4def5', overflow: 'hidden' },
  n: { fontFamily: FONT.display, fontSize: 16, color: C.ink },
  prize: { alignItems: 'center', gap: 2, backgroundColor: '#fff3c4', borderWidth: 3, borderColor: C.ink, borderRadius: 14, padding: 10, width: '100%' },
  pt: { fontFamily: FONT.display, fontSize: 18, color: C.coral },
  pl: { fontFamily: FONT.black, fontSize: 14, color: C.ink },
});

/** todas as camadas por cima da tela do jogo, na mesma ordem do jogo antigo */
export function Screens() {
  const game = useGame();
  const s = useInfo(() => ({ ...game.ui.show }));
  return (
    <>
      {s.pauseBtn && <PauseBtn />}
      {s.menu && <Home />}
      {s.skin && <Skin />}
      {s.waitUI && <WaitUI />}
      {s.lobby && <Lobby />}
      {s.mapUI && <MapUI />}
      {s.dlg && <Dialog />}
      {s.res && <Result />}
      {s.pause && <Pause />}
      {s.friends && <Friends />}
      {s.heroes && <Heroes />}
      {s.arsenal && <Arsenal />}
      {s.shop && <Shop />}
      {s.missions && <Missions />}
      {s.inviteCard && <Invite />}
      <Toast />
    </>
  );
}
