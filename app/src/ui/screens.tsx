/* Telas do jogo em React Native: início, campeonato, garagem, online, sala, pausa e resultado.
   A estrada desenhada pelo motor fica sempre por baixo. */
import React from 'react';
import { ScrollView, StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Btn, C, Coins, Ov, Panel, PIX, Pix, Stars, T, useGame, useInfo, useLay } from './kit';

export function Screens() {
  const game = useGame();
  const S = useInfo(() => ({ ...game.ui.show }));
  return (
    <>
      {S.menu && <Home />}
      {S.champ && <Champ />}
      {S.garage && <Garage />}
      {S.online && <Online />}
      {S.room && <Room />}
      {S.pause && <Pause />}
      {S.res && <Result />}
      <Toast />
    </>
  );
}

/* ---------- topo das telas: voltar + título + moedas ---------- */
function Top({ title, coins, onBack }: { title: string; coins?: number; onBack?: () => void }) {
  const game = useGame();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <Btn label="◄" onPress={onBack || (() => game.act.back())} color={C.panel2} text={C.white} padH={10} padV={7} sound="back" a11y="Voltar" />
      <View style={{ flex: 1 }}><T size={14} color={C.gold}>{title}</T></View>
      {coins != null && <Coins n={coins} />}
    </View>
  );
}

/* ---------- início ---------- */
function Home() {
  const game = useGame(), lay = useLay();
  const m = useInfo(() => game.info.menu());
  const tsz = lay.W < 640 ? 20 : 28;
  const bw = Math.min(300, lay.W * .4);
  return (
    <Ov dim={.25} center={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <T size={tsz} color={C.gold} shadow={C.red}>TURBO</T>
          <T size={tsz} color={C.white} shadow={C.blue} style={{ marginTop: 2 }}>ESTRADA</T>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Coins n={m.coins} />
          <View style={{ flexDirection: 'row' }}>
            <Btn label={m.sfx ? 'SOM' : 'SOM ×'} onPress={() => game.act.toggleSfx()} color={m.sfx ? C.panel2 : C.dim} text={C.white} size={8} padH={8} padV={6} />
            <Btn label={m.mus ? 'MÚSICA' : 'MÚSICA ×'} onPress={() => game.act.toggleMus()} color={m.mus ? C.panel2 : C.dim} text={C.white} size={8} padH={8} padV={6} />
          </View>
        </View>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ width: bw }}>
          <Btn label="CAMPEONATO" sub={'★ ' + m.stars + ' / ' + m.maxStars} onPress={() => game.act.openChamp()} color={C.gold} size={lay.short ? 11 : 13} padV={lay.short ? 7 : 10} style={{ marginBottom: 8 }} />
          <Btn label="ESTRADA SEM FIM" sub={m.bestDay ? 'Recorde: ' + m.bestDay + ' dias' : 'Quantos dias você aguenta?'} onPress={() => game.act.playEndless()} color={C.orange} size={lay.short ? 10 : 12} padV={lay.short ? 7 : 10} style={{ marginBottom: 8 }} />
          <View style={{ flexDirection: 'row' }}>
            <Btn label="ONLINE" onPress={() => game.act.openOnline()} color={C.cyan} size={10} style={{ flex: 1 }} padV={lay.short ? 7 : 10} />
            <Btn label="GARAGEM" onPress={() => game.act.openGarage()} color={C.green} text={C.white} size={10} style={{ flex: 1 }} padV={lay.short ? 7 : 10} />
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Pressable onPress={() => game.act.openGarage()} accessibilityLabel="Abrir garagem">
            <Panel style={{ alignItems: 'center', paddingVertical: 8 }} color="rgba(22,22,58,.85)">
              <Pix uri={m.img} w={lay.short ? 112 : 144} h={lay.short ? 70 : 90} />
              <T size={9} color={C.white} style={{ marginTop: 6 }}>{m.car}</T>
            </Panel>
          </Pressable>
          {m.touch && <Btn label={m.auto ? 'ACELERA SOZINHO: SIM' : 'ACELERA SOZINHO: NÃO'} onPress={() => game.act.toggleAuto()} color={C.panel2} text={C.white} size={7} padH={8} padV={6} />}
        </View>
      </View>
    </Ov>
  );
}

/* ---------- campeonato ---------- */
function Champ() {
  const game = useGame(), lay = useLay();
  const c = useInfo(() => game.info.champ());
  const cw = Math.floor((lay.W - lay.ins.l - lay.ins.r - 28 - 3 * 10) / 4);
  return (
    <Ov dim={.7} center={false}>
      <Top title={'CAMPEONATO  ★ ' + c.stars} coins={c.coins} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
        {c.cups.map((cup: any) => (
          <View key={cup.name}>
            <T size={9} color={cup.col} style={{ marginBottom: 5 }}>{cup.name.toUpperCase()}</T>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {cup.stages.map((s: any) => (
                <Pressable key={s.i} onPress={() => { game.act.btnSound('click'); game.act.playStage(s.i); }} accessibilityLabel={'Etapa ' + (s.i + 1) + ' ' + s.name}>
                  <Panel style={{ width: cw, minHeight: 78, opacity: s.locked ? .55 : 1 }} color={s.locked ? '#101024' : C.panel2}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <T size={8} color={C.gray}>{'ETAPA ' + (s.i + 1)}</T>
                      {s.locked ? <T size={8} color={C.gray}>🔒</T> : <Stars n={s.stars} size={8} />}
                    </View>
                    <T size={cw < 160 ? 8 : 9} color={C.white} style={{ marginTop: 6 }} lines={2}>{s.name}</T>
                    <T size={7} color={C.cyan} shadow={false} style={{ marginTop: 4 }} lines={1}>{s.scene + ' · ' + s.tods}</T>
                    <T size={7} color={C.gold} shadow={false} style={{ marginTop: 4 }}>{'⚑ ' + s.target + ' carros · ' + s.time + 's'}</T>
                  </Panel>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Ov>
  );
}

/* ---------- garagem ---------- */
function Bar({ v, col }: { v: number; col: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => <View key={i} style={{ width: 8, height: 8, backgroundColor: i < Math.round(v * 10) ? col : '#2c2c54' }} />)}
    </View>
  );
}
function Garage() {
  const game = useGame(), lay = useLay();
  const g = useInfo(() => game.info.garage());
  const imgW = lay.short ? 160 : 210;
  return (
    <Ov dim={.75} center={false}>
      <Top title="GARAGEM" coins={g.coins} />
      <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
        {/* carro */}
        <Panel style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Btn label="◄" onPress={() => game.act.garagePrev()} color={C.panel2} text={C.white} padH={9} padV={7} />
            <View style={{ alignItems: 'center', minWidth: 120 }}>
              <T size={12} color={C.gold}>{g.name}</T>
              <T size={7} color={C.gray} shadow={false} style={{ marginTop: 4 }}>{(g.sel + 1) + ' / ' + g.n}</T>
            </View>
            <Btn label="►" onPress={() => game.act.garageNext()} color={C.panel2} text={C.white} padH={9} padV={7} />
          </View>
          <Pix uri={g.img} w={imgW} h={imgW * 20 / 32} />
          <T size={7} color={C.white} shadow={false} center style={{ maxWidth: 260 }}>{g.desc}</T>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            {g.thumbs.map((t: any, i: number) => (
              <Pressable key={i} onPress={() => { game.act.btnSound('click'); game.act.garageSel(i); }} accessibilityLabel={t.name}>
                <View style={{ borderWidth: 2, borderColor: t.sel ? C.gold : '#000', backgroundColor: '#0b0b1e', padding: 2, opacity: t.owned ? 1 : .45 }}>
                  <Pix uri={t.img} w={34} h={21} />
                </View>
              </Pressable>
            ))}
          </View>
        </Panel>
        {/* números e melhorias */}
        <Panel style={{ flex: 1.15, gap: 6 }}>
          <ScrollView contentContainerStyle={{ gap: 7 }} showsVerticalScrollIndicator={false}>
            {g.stats.map((s: any) => (
              <View key={s.k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <T size={7} color={C.gray} shadow={false} style={{ width: 104 }}>{s.k.toUpperCase()}</T>
                <Bar v={s.v} col={C.cyan} />
                <T size={7} color={C.white} shadow={false} style={{ width: 62, textAlign: 'right' }}>{s.t}</T>
              </View>
            ))}
            <View style={{ height: 2, backgroundColor: '#000', marginVertical: 2 }} />
            {g.owned ? g.upg.map((u: any, k: number) => (
              <View key={u.k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <View style={{ flex: 1 }}>
                  <T size={8} color={C.white}>{u.name.toUpperCase()}</T>
                  <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
                    {Array.from({ length: u.max }, (_, i) => <View key={i} style={{ width: 12, height: 6, backgroundColor: i < u.lvl ? C.green : '#2c2c54' }} />)}
                  </View>
                </View>
                {u.lvl >= u.max ? <T size={7} color={C.green}>MÁXIMO</T>
                  : <Btn label={'$ ' + u.cost} onPress={() => game.act.upgBuy(k)} color={g.coins >= u.cost ? C.gold : C.dim} size={8} padH={8} padV={6} sound={null} />}
              </View>
            )) : <T size={8} color={C.gray} shadow={false}>Compre o carro para melhorar motor, turbo e pneus.</T>}
            <View style={{ height: 2, backgroundColor: '#000', marginVertical: 2 }} />
            <T size={7} color={C.gray} shadow={false}>{'COR  (nova: $ ' + g.colorPrice + ')'}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {g.colors.map((c: any, i: number) => (
                <Pressable key={i} onPress={() => game.act.colorPick(i)} accessibilityLabel={c.name}>
                  <View style={{ width: 22, height: 22, backgroundColor: c.c, borderWidth: c.sel ? 3 : 2, borderColor: c.sel ? C.white : '#000', alignItems: 'center', justifyContent: 'center' }}>
                    {!c.owned && <T size={7} color="#000" shadow={false}>$</T>}
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {!g.owned ? <Btn label={'COMPRAR  $ ' + g.price} onPress={() => game.act.garageBuy()} color={g.coins >= g.price ? C.gold : C.dim} size={10} sound={null} />
            : g.using ? <Btn label="NA PISTA ✓" color={C.green} text={C.white} size={10} disabled />
              : <Btn label="USAR ESTE CARRO" onPress={() => game.act.garageUse()} color={C.cyan} size={10} />}
        </Panel>
      </View>
    </Ov>
  );
}

/* ---------- online ---------- */
function Online() {
  const game = useGame(), lay = useLay();
  const o = useInfo(() => game.info.online());
  const [name, setName] = React.useState(o.name);
  return (
    <Ov dim={.75} center={false}>
      <Top title="ONLINE" />
      <View style={{ flex: 1, flexDirection: lay.W < 600 ? 'column' : 'row', gap: 12 }}>
        <Panel style={{ flex: 1, gap: 8 }}>
          <T size={8} color={C.gray} shadow={false}>SEU NOME</T>
          <TextInput value={name} onChangeText={setName} onBlur={() => game.act.setName(name)} onSubmitEditing={() => game.act.setName(name)} maxLength={12} style={inp} placeholder="Piloto" placeholderTextColor={C.dim} />
          <View style={{ height: 6 }} />
          <T size={9} color={C.white}>CRIAR UMA SALA</T>
          <T size={7} color={C.gray} shadow={false} style={{ lineHeight: 12 }}>Você recebe um código de 4 números para mandar aos amigos. Até 4 pilotos.</T>
          <Btn label="CRIAR SALA" onPress={() => { game.act.setName(name); game.act.createRoom(); }} color={C.gold} disabled={o.busy} />
        </Panel>
        <Panel style={{ flex: 1, gap: 8 }}>
          <T size={9} color={C.white}>ENTRAR NUMA SALA</T>
          <T size={7} color={C.gray} shadow={false} style={{ lineHeight: 12 }}>Digite o código que seu amigo mandou.</T>
          <TextInput value={o.input} onChangeText={(v) => game.act.setCodeIn(v)} keyboardType="number-pad" maxLength={4} style={[inp, { fontSize: 20, letterSpacing: 6, textAlign: 'center' }]} placeholder="0000" placeholderTextColor={C.dim} onSubmitEditing={() => game.act.joinRoom()} />
          <Btn label="ENTRAR" onPress={() => { game.act.setName(name); game.act.joinRoom(); }} color={C.cyan} disabled={o.busy || String(o.input).length !== 4} />
          {!!o.status && <T size={7} color={o.busy ? C.gold : C.pink} shadow={false} style={{ lineHeight: 12 }}>{o.status}</T>}
        </Panel>
      </View>
    </Ov>
  );
}
const inp: any = { fontFamily: PIX, fontSize: 12, color: C.white, backgroundColor: '#000', borderWidth: 3, borderColor: C.gray, paddingHorizontal: 10, paddingVertical: 8 };

function Room() {
  const game = useGame();
  const r = useInfo(() => game.info.room());
  const slots = Array.from({ length: r.max }, (_, i) => r.players[i] || null);
  return (
    <Ov dim={.75} center={false}>
      <Top title="SALA" onBack={() => game.act.leaveRoom()} />
      <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
        <Panel style={{ width: 210, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <T size={8} color={C.gray} shadow={false}>CÓDIGO DA SALA</T>
          <T size={30} color={C.gold} shadow={C.red}>{r.code}</T>
          <Btn label="CHAMAR AMIGOS" onPress={() => game.act.shareRoom()} color={C.cyan} size={9} />
          {r.host ? <Btn label="COMEÇAR!" onPress={() => game.act.startRoom()} color={r.players.length >= 2 ? C.gold : C.dim} size={11} />
            : <T size={7} color={C.white} shadow={false} center style={{ lineHeight: 12 }}>Esperando o dono da sala começar…</T>}
        </Panel>
        <Panel style={{ flex: 1, gap: 6 }}>
          <T size={8} color={C.gray} shadow={false}>{'PILOTOS  ' + r.players.length + ' / ' + r.max}</T>
          {slots.map((p: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: p ? C.panel2 : '#101024', borderWidth: 2, borderColor: p && p.me ? C.gold : '#000', padding: 5, minHeight: 38 }}>
              <T size={9} color={C.gray}>{String(i + 1)}</T>
              {p ? <>
                <Pix uri={p.img} w={45} h={28} />
                <View style={{ flex: 1 }}>
                  <T size={9} color={C.white}>{p.name + (p.me ? ' (você)' : '')}</T>
                  <T size={7} color={C.gray} shadow={false} style={{ marginTop: 3 }}>{p.car + (p.host ? ' · dono da sala' : '')}</T>
                </View>
              </> : <T size={7} color={C.dim} shadow={false}>vaga livre</T>}
            </View>
          ))}
          <T size={7} color={C.gray} shadow={false} style={{ lineHeight: 12 }}>Corrida de 2 minutos: ganha quem passar mais carros.</T>
        </Panel>
      </View>
    </Ov>
  );
}

/* ---------- pausa ---------- */
function Pause() {
  const game = useGame();
  const m = useInfo(() => game.info.menu());
  const online = useInfo(() => !!game.info.room().code);
  return (
    <Ov dim={.65}>
      <Panel style={{ alignItems: 'stretch', gap: 6, minWidth: 260, paddingHorizontal: 18, paddingVertical: 14 }}>
        <T size={16} color={C.gold} center style={{ marginBottom: 6 }}>PAUSA</T>
        <Btn label="CONTINUAR" onPress={() => game.act.resume()} color={C.gold} />
        {!online && <Btn label="RECOMEÇAR" onPress={() => game.act.restart()} color={C.cyan} />}
        <Btn label={online ? 'SAIR DA CORRIDA' : 'SAIR'} onPress={() => game.act.quit()} color={C.red} text={C.white} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 4 }}>
          <Btn label={m.sfx ? 'SOM' : 'SOM ×'} onPress={() => game.act.toggleSfx()} color={C.panel2} text={C.white} size={8} padH={8} padV={6} />
          <Btn label={m.mus ? 'MÚSICA' : 'MÚSICA ×'} onPress={() => game.act.toggleMus()} color={C.panel2} text={C.white} size={8} padH={8} padV={6} />
        </View>
      </Panel>
    </Ov>
  );
}

/* ---------- resultado ---------- */
function Result() {
  const game = useGame();
  const r = useInfo(() => game.info.res());
  const online = r.mode === 'online';
  const inRoom = useInfo(() => !!game.info.room().code);
  return (
    <Ov dim={.7}>
      <Panel style={{ alignItems: 'center', gap: 6, minWidth: 330, maxWidth: 520, paddingHorizontal: 18 }}>
        <T size={18} color={r.win ? C.gold : C.pink} center>{r.title}</T>
        <T size={8} color={C.gray} shadow={false} center>{r.sub}</T>
        {r.mode === 'champ' && r.win && <Stars n={r.stars} size={18} />}
        <View style={{ alignSelf: 'stretch', gap: 4, marginVertical: 4 }}>
          {online && r.rank ? r.rank.map((p: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: p.me ? '#3c3c14' : C.panel2, borderWidth: 2, borderColor: p.me ? C.gold : '#000', padding: 4 }}>
              <T size={10} color={i === 0 ? C.gold : C.white}>{(i + 1) + 'º'}</T>
              <Pix uri={p.img} w={38} h={24} />
              <View style={{ flex: 1 }}><T size={8} color={C.white}>{p.name}</T></View>
              <T size={8} color={C.gold}>{p.p + ' carros'}</T>
            </View>
          )) : (r.lines || []).map((l: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={8} color={C.gray} shadow={false}>{l[0].toUpperCase()}</T>
              <T size={8} color={C.white} shadow={false}>{l[1]}</T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><T size={8} color={C.gray} shadow={false}>GANHOU</T><Coins n={r.coins | 0} /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
          {r.mode === 'champ' && r.next && <Btn label="PRÓXIMA ETAPA" onPress={() => game.act.resNext()} color={C.gold} size={10} />}
          {online ? (inRoom && <Btn label="VOLTAR À SALA" onPress={() => game.act.resRetry()} color={C.cyan} size={10} />)
            : <Btn label={r.win ? 'CORRER DE NOVO' : 'TENTAR DE NOVO'} onPress={() => game.act.resRetry()} color={r.win ? C.cyan : C.gold} size={10} />}
          <Btn label="MENU" onPress={() => game.act.resMenu()} color={C.panel2} text={C.white} size={10} />
        </View>
      </Panel>
    </Ov>
  );
}

/* ---------- aviso rápido ---------- */
function Toast() {
  const game = useGame(), lay = useLay();
  const t = useInfo(() => game.ui.toast);
  if (!t) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 54 + lay.ins.b }]}>
      <View style={{ backgroundColor: '#000', borderWidth: 3, borderColor: C.gold, paddingHorizontal: 12, paddingVertical: 8, maxWidth: lay.W - 60 }}>
        <T size={8} color={C.white} shadow={false} center style={{ lineHeight: 13 }}>{t.s}</T>
      </View>
    </View>
  );
}
