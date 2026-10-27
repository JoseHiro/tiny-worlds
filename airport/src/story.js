// Story: a small cast of named characters riding on the real simulation.
// Each one is an ordinary passenger / crew member (pax.js) with a few options, plus
// lines that fire when they reach marked steps (actor.activity). When a story ends
// it starts again a little later with new flights.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { TURN } from './sim.js';
import { getLang } from './i18n.js';
import * as L from './layout.js';

const NAHA = ['那覇', 'OKA', 'Naha'];
const TAIPEI = ['台北', 'TPE', 'Taipei'];
const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
const L2 = (ja, en) => ({ ja, en });

// lines per character: act → (ctx) => { ja, en }
const CAST = [
  {
    id: 'hana', name: L2('ハナ', 'Hana'), role: L2('7歳・家族で沖縄へ', 'age 7, family trip to Okinawa'),
    lines: {
      arrive: () => L2('ハナの一家が車で到着。沖縄旅行に出発です', "Hana's family pulls up at departures — off to Okinawa"),
      desk: () => L2('スーツケースを預けました。クマのぬいぐるみは手荷物に', 'Suitcase checked in. Her teddy bear stays in the carry-on'),
      xray: () => L2('X線でクマのぬいぐるみが止められた…！係員さんが確認中', 'The X-ray stops her teddy bear! An officer takes a look'),
      cleared: () => L2('クマは無事に返ってきました。ほっと一安心', 'Teddy is handed back. Phew'),
      lounge: () => L2('ラウンジで飛行機を待っています', 'Waiting in the lounge for their plane'),
      gate: (c) => L2(`ゲート${c.stand}へ。窓から飛行機を見つけて大はしゃぎ`, `At gate ${c.stand}, nose pressed to the window`),
      boarding: () => L2('搭乗開始！家族で並びます', 'Boarding! The family lines up'),
      aboard: (c) => L2(`${c.flight} で那覇へ出発！`, `Off to Naha on ${c.flight}!`),
      // …and home again
      deplane: (c) => L2(`ハナの一家が ${c.flight} で沖縄から帰ってきました。ハナの手にはお土産の袋`, `Hana's family is back from Okinawa on ${c.flight}. Hana carries a bag of souvenirs`),
      waitBag: () => L2('スーツケースが出てくるのを待っています', 'Waiting for their suitcase'),
      reunion: () => L2('おばあちゃんが「おかえり ハナ！」のボードで出迎え', 'Grandma is there with a sign: "Welcome home, Hana!"'),
      curb: () => L2('家族そろって車で家へ', 'The whole family drives home together'),
    },
  },
  {
    id: 'kenji', name: L2('ケンジさん', 'Kenji'), role: L2('出張・乗り遅れそう', 'business trip, running late'),
    lines: {
      arrive: (c) => L2(`ケンジさん、${c.stand}発の便に遅れそう。車から飛び出しました`, `Kenji is about to miss his flight from ${c.stand} — he leaps out of the car`),
      desk: () => L2('優先カウンターで滑り込みの手続き', 'A last-minute check-in at the priority desk'),
      security: () => L2('保安検査は優先レーンへ', 'Straight to the priority security lane'),
      gate: () => L2('ゲートまで全力疾走', 'Sprinting down the concourse'),
      boarding: () => L2('間に合った！ 飛行機はブリッジを外さずに待っていました', 'Made it! The aircraft waited for him'),
      aboard: (c) => L2(`最後の1人として ${c.flight} に搭乗。ドアが閉まります`, `Last one aboard ${c.flight}. Doors closing`),
      familyWaits: () => L2('ケンジさんの家族が到着ロビーへ。でも帰りの便は遅れています', "Kenji's family arrives in the hall — but his flight home is late"),
      stillWaiting: () => L2('「パパまだかな…」', '"Is Daddy here yet…?"'),
      deplane: (c) => L2(`遅れていた ${c.flight} がやっと到着`, `The delayed ${c.flight} finally lands`),
      reunion: () => L2('やっと再会。「おかえり、パパ！」', 'Together at last. "Welcome home, Daddy!"'),
      curb: () => L2('ケンジさんは家族と車で帰ります', 'Kenji heads home with his family'),
    },
  },
  {
    id: 'sora', name: L2('ソラ', 'Sora'), role: L2('台北からのバックパッカー', 'backpacker from Taipei'),
    lines: {
      deplane: (c) => L2(`ソラが台北から ${c.flight} で到着`, `Sora arrives from Taipei on ${c.flight}`),
      waitBag: () => L2('ターンテーブルで自分の荷物を待っています', 'Waiting at the carousel for the backpack'),
      immigration: () => L2('入国審査の列に並んでいます', 'Queueing at immigration'),
      passport: () => L2('パスポートにスタンプ。ようこそ日本へ', 'A stamp in the passport. Welcome to Japan'),
      lostBag: () => L2('…荷物が出てこない', "…the bag isn't coming out"),
      service: () => L2('手荷物サービスで相談。次の便で届くそうです', 'At baggage service: it will come on the next flight'),
      delivery: () => L2('ソファで次の便を待っています', 'Waiting for the next flight to land'),
      bagDelivered: () => L2('荷物が届きました！', 'The bag has arrived!'),
      waitBus: () => L2('空港バスで街へ向かいます', 'Waiting for the airport bus into town'),
      waitTaxi: () => L2('タクシー乗り場へ', 'To the taxi rank'),
      curb: () => L2('ソラは笑顔で街へ', 'Sora heads into town, smiling'),
    },
  },
  {
    id: 'midori', name: L2('ミドリさん', 'Midori'), role: L2('孫に会いに来た', 'visiting her grandchild'),
    lines: {
      deplane: (c) => L2(`ミドリさんが ${c.from} から到着。孫に会いに来ました`, `Midori arrives from ${c.from} to see her grandchild`),
      gotBag: () => L2('荷物を受け取りました', 'She has her suitcase'),
      immigration: () => L2('到着通路を抜けて1Fへ', 'Down to the arrivals floor'),
      reunion: () => L2('到着ロビーで「おばあちゃん！」のボードを持った孫が駆け寄ってきた。再会！', 'In the arrivals hall her grandchild runs up with a sign: "Grandma!" Reunion!'),
      curb: () => L2('みんなで車に乗って帰ります', 'Everyone heads home together'),
    },
  },
  {
    id: 'crew', name: L2('タナカ機長', 'Captain Tanaka'), role: L2('機長と客室乗務員', 'captain and cabin crew'),
    lines: {
      crewIn: (c) => L2(`タナカ機長と客室乗務員が ${c.stand} へ向かいます`, `Captain Tanaka and the crew head for ${c.stand}`),
      briefing: () => L2('ゲートで最終の打ち合わせ', 'A final briefing at the gate'),
      aboard: (c) => L2(`機長が ${c.flight} に乗り込みました`, `The captain boards ${c.flight}`),
    },
  },
  {
    id: 'yu', name: L2('マーシャラーのユウ', 'Yu the marshaller'), role: L2('A3 担当', 'works stand A3'),
    lines: {
      guide: (c) => L2(`ユウが ${c.flight} をA3へ誘導しています`, `Yu waves ${c.flight} onto stand A3`),
      parked: (c) => L2(`${c.flight} がぴったり停止。ユウが合図`, `${c.flight} stops right on the mark. Yu signals`),
    },
  },
];

export class Story {
  constructor(scene, world, pax) {
    this.scene = scene;
    this.world = world;
    this.pax = pax;
    this.feed = [];
    this.cast = CAST.map((c, i) => ({ ...c, members: [], state: 'waiting', cooldown: 4 + i * 7, last: null, tags: [] }));
    this.byId = Object.fromEntries(this.cast.map((c) => [c.id, c]));
    // Yu is always on duty
    const yu = this.byId.yu;
    yu.state = 'active';
    yu.members = [{ p: world.stands[2].marshaller.obj, activity: 'marshal', permanent: true, stand: world.stands[2] }];
    yu.last = L2('A3 で次の飛行機を待っています', 'Waiting at A3 for the next aircraft');
    this.tag(yu, yu.members[0], yu.name);
    this.yuSeen = null;
  }

  text(line) { return line[getLang()]; }

  say(c, act, ctx = {}) {
    const fn = c.lines[act];
    if (!fn) return;
    const line = fn(ctx);
    c.last = line;
    this.feed.unshift({ time: this.world.clock, castId: c.id, line });
    this.feed.length = Math.min(this.feed.length, 8);
  }

  tag(c, actor, name) {
    const el = document.createElement('div');
    el.className = 'tag story';
    el.dataset.name = JSON.stringify(name);
    el.textContent = `★ ${name[getLang()]}`;
    const obj = new CSS2DObject(el);
    obj.position.set(0, 1.75, 0);
    actor.p.add(obj);
    c.tags.push({ obj, el, name });
  }

  untag(c) {
    for (const t of c.tags) { t.obj.removeFromParent(); t.el.remove(); }
    c.tags = [];
  }

  ctx(actor) {
    const f = actor.flight ?? actor.stand?.flight;
    return { stand: actor.stand?.id ?? '', flight: f?.number ?? '', from: actor.from ? actor.from[getLang() === 'en' ? 2 : 0] : '' };
  }

  // the actor's marked steps speak for the character
  listen(c, actor, lead = true) {
    actor.storyId = c.id;
    actor.onAct = (act, a) => {
      if (c.id === 'hana' && act === 'boarding' && a.stand?.flight) a.stand.flight.to = NAHA;
      // the flight they leave on will come back with them (sim.js schedules the return)
      if ((c.id === 'hana' || c.id === 'kenji') && act === 'aboard' && a.flight && a.kind === 'departure') { a.flight.storyReturn = c.id; c.away = true; }
      if (lead) this.say(c, act, this.ctx(a));
    };
  }

  begin(c, members) {
    c.members = members.filter(Boolean);
    if (!c.members.length) return false;
    c.state = 'active';
    return true;
  }

  // candidates
  inboundStand() { // a stand whose aircraft is on its way in
    return this.world.stands.find((s) => s.flight && ['approach', 'landing', 'taxiIn'].includes(s.flight.state));
  }

  deplaningStand(exclude) { // an aircraft just on stand with passengers still to come off
    return this.world.stands.find((s) => s !== exclude && s.flight && s.flight.state === 'parked' && s.bridge.extend > 0.99
      && s.flight.t < TURN.deboard && (s.flight.deplaned ?? 0) < (s.flight.paxIn ?? 9));
  }

  start(c) {
    const P = this.pax;
    const deckX = -48;
    switch (c.id) {
      case 'hana': {
        const stand = this.inboundStand() ?? this.world.stands[0];
        const fam = [['child', 'ハナ', 'Hana'], ['woman', 'ママ', 'Mum'], ['business', 'パパ', 'Dad']].map(([type, ja, en], i) => {
          const choice = { lane: 1, gate: 0, second: false, seat: i, gx: 0 }; // the family sticks together
          const a = P.spawnDeparture(deckX + i * 0.9, { story: true, type, stand, choice, xrayHold: type === 'child' ? 6 : 0, init: (x) => { x.preferSeat = ['12A', '12B', '12C'][i]; this.listen(c, x, i === 0); } });
          if (a) this.tag(c, a, i === 0 ? c.name : L2(`ハナの${ja}`, `Hana's ${en}`));
          return a;
        });
        return this.begin(c, fam);
      }
      case 'kenji': {
        const stand = this.inboundStand();
        if (!stand) return false;
        const a = P.spawnDeparture(-36, { story: true, type: 'business', stand, priority: true, speed: 2.1, init: (x) => { x.preferSeat = '2C'; this.listen(c, x); } });
        if (a) this.tag(c, a, c.name);
        return this.begin(c, [a]);
      }
      case 'sora':
      case 'midori': {
        const other = this.byId[c.id === 'sora' ? 'midori' : 'sora'];
        const stand = this.deplaningStand(other.members[0]?.stand);
        if (!stand) return false;
        const f = stand.flight;
        if (c.id === 'sora') f.from = TAIPEI;
        f.deplaned = (f.deplaned ?? 0) + 1;
        const a = P.spawnArrival(stand, c.id === 'sora'
          ? { type: 'backpacker', lost: true, delivery: true, greeter: false, init: (x) => { x.stand = stand; this.listen(c, x); } }
          : { type: 'senior', greeter: { type: 'child', board: 'おばあちゃん！' }, init: (x) => { x.stand = stand; this.listen(c, x); } });
        if (a) this.tag(c, a, c.name);
        return this.begin(c, [a]);
      }
      case 'crew': {
        const stand = this.world.stands.find((s) => s.flight && s.flight.state === 'parked' && s.flight.t < 6);
        if (!stand) return false;
        const members = [['pilot', c.name], ['attendant', L2('客室乗務員', 'Cabin crew')]].map(([type, name], i) => {
          const a = this.crewWalk(stand, type, i, (x) => { x.stand = stand; this.listen(c, x, i === 0); });
          this.tag(c, a, name);
          return a;
        });
        return this.begin(c, members);
      }
      default:
        return false;
    }
  }

  // captain + crew: along the concourse to the gate, a briefing, then aboard before the passengers
  crewWalk(stand, type, i, init) {
    const P = this.pax, R = P.rooms;
    const gate = R.gates[this.world.stands.indexOf(stand)], ga = gate.userData.anchors;
    const y = L.FLOOR.f2 + 0.02;
    const at = (p) => P.at(gate, p).setY(y);
    const cz = (L.BANDS.concourse[0] + L.BANDS.concourse[1]) / 2;
    const e = at(ga.entryS);
    const b = stand.bridge;
    const steps = [
      { to: V(e.x + 10 + i * 0.8, cz, y), act: 'crewIn' },
      { to: V(e.x, cz, y) },
      { to: e },
      { to: at(V(1.0 + i * 0.7, -1.9)), wait: 4, act: 'briefing', look: Math.PI / 2 },
      { to: at(V(4.5, -4.9)) },
      { to: at(ga.door), until: () => stand.bridge.extend > 0.99 },
      { to: V(b.pivot.x, b.pivot.z + 0.6, L.FLOOR.f2) },
      { to: V(b.pivot.x, b.pivot.z, L.FLOOR.f2) },
      { to: V(b.docked.x, b.docked.z, 1.42) },
      { to: V(b.docked.x + 0.9, b.docked.z, 1.42), act: 'aboard', then: (a) => { a.flight = stand.flight; } },
    ];
    return P.run(type, steps, null, (a) => { a.kind = 'crew'; a.type = type; init(a); });
  }

  update(dt) {
    for (const c of this.cast) {
      if (c.id === 'yu') continue;
      if (c.state === 'active' && c.members.every((m) => m.done)) {
        this.untag(c);
        c.members = [];
        if (c.away) { c.state = 'away'; c.away = false; c.last = L2('旅行中…帰りの便を待っています', 'Away — waiting for the flight home'); }
        else { c.state = 'waiting'; c.cooldown = 40 + Math.random() * 30; c.ph = c.lead = c.greeters = null; c.saidWaiting = false; }
      }
      if (c.state === 'away') this.homecoming(c);
      if (c.ph && c.lead) { c.ph.activity = c.lead.activity; c.ph.done = c.lead.done; c.ph.meetSide = c.lead.meetSide; }
      if (c.state === 'waiting') {
        c.cooldown -= dt;
        if (c.cooldown <= 0 && !this.start(c)) c.cooldown = 3;
      }
    }
    // Yu: lines when an aircraft taxis onto A3 and when it stops
    const yu = this.byId.yu, f = this.world.stands[2].flight;
    if (f && f.state === 'taxiIn' && f.track.remaining < 30 && this.yuSeen !== `${f.id}g`) { this.yuSeen = `${f.id}g`; this.say(yu, 'guide', { flight: f.number }); yu.members[0].activity = 'guide'; }
    if (f && f.state === 'parked' && this.yuSeen === `${f.id}g`) { this.yuSeen = `${f.id}p`; this.say(yu, 'parked', { flight: f.number }); yu.members[0].activity = 'marshal'; }
  }

  // tags and lines follow the language switch
  relabel() {
    for (const c of this.cast) for (const t of c.tags) t.el.textContent = `★ ${t.name[getLang()]}`;
  }
}

// ---------- the way home (methods added to Story) ----------

Story.prototype.homecoming = function (c) {
  const W = this.world, P = this.pax;
  // Kenji's family comes to the hall at the time his flight was due; it is running late
  if (c.id === 'kenji' && !c.ph) {
    const r = W.returns.find((x) => x.opts.returnStory === 'kenji') ?? null;
    const f = W.flights.find((x) => x.returnStory === 'kenji');
    if ((r && W.time >= r.due - 90) || f) {
      c.ph = { activity: null, done: false, meetSide: 1 }; // stands in for Kenji until he lands
      const ticket = P.ticket('car');
      c.greeters = [['woman', 'おかえり パパ', 0], ['child', 'パパ！', 0.7]].map(([type, board, offset]) => {
        const g = P.spawnGreeter(c.ph, ticket, { type, board, offset });
        this.tag(c, g, type === 'woman' ? L2('ケンジさんの家族', "Kenji's family") : L2('ケンジさんの子', "Kenji's kid"));
        return g;
      });
      c.waitT = W.time;
      this.say(c, 'familyWaits');
    }
  }
  if (c.id === 'kenji' && c.ph && !c.saidWaiting && W.time - c.waitT > 60) { c.saidWaiting = true; this.say(c, 'stillWaiting'); }

  const f = W.flights.find((x) => x.returnStory === c.id && x.state === 'parked' && x.stand.bridge.extend > 0.99 && !x.storyDone);
  if (!f) return;
  f.storyDone = true;
  const stand = f.stand;
  if (c.id === 'hana') {
    const child = P.spawnArrival(stand, { type: 'child', greeter: { type: 'senior', board: 'おかえり ハナ！' }, init: (x) => {
      x.stand = stand;
      this.listen(c, x);
      const gift = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.08), new THREE.MeshStandardMaterial({ color: 0xe8673c }));
      gift.position.set(0.05, 0.3, -0.3);
      x.p.add(gift);
      x.cleanup = () => gift.removeFromParent();
    } });
    const parents = ['woman', 'business'].map((type, i) => P.spawnArrival(stand, { type, ticket: child.ticket, rideOffset: 1.3 + i * 0.8, init: (x) => { x.stand = stand; this.listen(c, x, false); } }));
    f.deplaned = (f.deplaned ?? 0) + 3;
    this.tag(c, child, c.name);
    parents.forEach((p, i) => this.tag(c, p, i ? L2('ハナのパパ', "Hana's Dad") : L2('ハナのママ', "Hana's Mum")));
    this.begin(c, [child, ...parents]);
  } else if (c.id === 'kenji') {
    const a = P.spawnArrival(stand, { type: 'business', greeterActor: c.greeters?.[0], init: (x) => { x.stand = stand; this.listen(c, x); } });
    f.deplaned = (f.deplaned ?? 0) + 1;
    this.tag(c, a, c.name);
    c.lead = a;
    this.begin(c, [a, ...(c.greeters ?? [])]);
    c.ph = c.ph ?? { activity: null, done: false, meetSide: 1 };
  }
};
