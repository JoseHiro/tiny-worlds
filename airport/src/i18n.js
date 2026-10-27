// Simple Japanese / English switch for the airport page UI.
let lang = 'ja';
try { lang = localStorage.getItem('mini-airport-lang') || 'ja'; } catch { /* storage unavailable */ }

const D = {
  ja: {
    brandP: '滑走路1本・スポット6つ、2階建てターミナルの小さな空港の午後です。近づくと屋根が開いて館内が見えます。着陸から、給油・手荷物の積み下ろし、プッシュバック、離陸までが自動で回り続けます。',
    howto: '<b>操作</b>　ドラッグで回転 · 右ドラッグで移動 · ホイールでズーム · 飛行機をクリックすると追跡 · <a href="./parts.html" style="color:inherit">パーツ一覧 →</a>',
    landings: '着陸', takeoffs: '離陸', onTime: '定時率', stands: 'スポット', selected: '選択中の便',
    clickHint: '飛行機をクリックすると、ここに便の詳細が表示されます。',
    tod: '時間帯', day: '昼', dusk: '夕方', night: '夜',
    terminal: 'ターミナル', auto: '自動', exterior: '外観', f2: '2F 出発', f1: '1F 到着',
    display: '表示', labels: 'ラベル', follow: '追跡', reset: '全体を見る', logTitle: 'ログ',
    free: '空き', waiting: '次の便を待っています',
    state: '状態', stand: 'スポット', arrived: '到着', std: '出発予定', speedAlt: '速度 / 高度',
    paxOffOn: '降機 / 搭乗', bagsOffOn: '荷物 降ろし / 積込', people: '人', pieces: '個',
    paxLine: (p) => `館内の旅客　出発 ${p.dep}人 · 到着 ${p.arr}人 · 搭乗済み ${p.boarded}人 · 荷物 移動中 ${p.bags}個`,
    svc: { bridge: 'ブリッジ', fuel: '給油', bags: '手荷物', tug: 'タグ', on: '作業中', done: '完了', move: '移動中', wait: '—' },
    log: {
      landed: (p) => `${p.n} 着陸（${p.from}から）`,
      arrivedStand: (p) => `${p.n} が ${p.stand} に到着`,
      pushback: (p) => `${p.n} プッシュバック開始`,
      cleared: (p) => `${p.n} 離陸許可`,
      tookOff: (p) => `${p.n} 離陸（${p.to}行き）`,
    },
    langBtn: 'EN',
    seat: '座席', seats: '座席', cabin: '機内',
    storyTitle: 'ストーリー', storyIdle: '出番待ち', watch: '見る', doing: '今していること', gateLabel: 'ゲート', flightLabel: '便',
    acts: {
      arrive: '車寄せに到着', checkin: 'チェックインへ', desk: 'チェックイン中', security: '保安検査へ', xray: 'X線検査', cleared: '保安検査を通過',
      lounge: 'ラウンジで待機', toGate: 'ゲートへ移動', gate: 'ゲートで待機', boarding: '搭乗中', aboard: '機内',
      deplane: '飛行機を降りる', corridor: '到着通路', escalator: 'エスカレーターで1Fへ', toClaim: '手荷物受取へ', waitBag: '荷物を待っている',
      gotBag: '荷物を受け取った', lostBag: '荷物が出てこない', service: '手荷物サービスで相談', delivery: '次の便で届く荷物を待っている',
      bagDelivered: '荷物が届いた', reunion: '出迎えの人と再会', exit: '到着ロビーから外へ', curb: '迎えの車へ',
      crewIn: 'ゲートへ向かう', briefing: '打ち合わせ', marshal: '誘導の準備', guide: '飛行機を誘導中',
    },
    types: { passenger: '旅行者', woman: '旅行者', backpacker: 'バックパッカー', business: 'ビジネス客', child: '子ども', senior: 'シニア', pilot: '機長', attendant: '客室乗務員', marshaller: 'マーシャラー' },
    kinds: { departure: '出発の乗客', arrival: '到着の乗客', crew: '乗務員' },
  },
  en: {
    brandP: 'An afternoon at a small airport: one runway, six stands and a two-storey terminal. Come closer and the roof opens to show the halls inside. Landings, fuelling, baggage, pushbacks and take-offs run on their own.',
    howto: '<b>Controls</b>　Drag to orbit · right-drag to pan · scroll to zoom · click an aircraft to follow it · <a href="./parts.html" style="color:inherit">Parts catalog →</a>',
    landings: 'Landings', takeoffs: 'Take-offs', onTime: 'On time', stands: 'Stands', selected: 'Selected flight',
    clickHint: 'Click an aircraft to see its flight here.',
    tod: 'Time of day', day: 'Day', dusk: 'Dusk', night: 'Night',
    terminal: 'Terminal', auto: 'Auto', exterior: 'Outside', f2: '2F Dep.', f1: '1F Arr.',
    display: 'View', labels: 'Labels', follow: 'Follow', reset: 'Overview', logTitle: 'Log',
    free: 'Free', waiting: 'Waiting for the next flight',
    state: 'Status', stand: 'Stand', arrived: 'Arrived', std: 'Scheduled', speedAlt: 'Speed / alt',
    paxOffOn: 'Pax off / on', bagsOffOn: 'Bags off / on', people: '', pieces: '',
    paxLine: (p) => `In the terminal: ${p.dep} departing · ${p.arr} arriving · ${p.boarded} boarded · ${p.bags} bags moving`,
    svc: { bridge: 'Bridge', fuel: 'Fuel', bags: 'Bags', tug: 'Tug', on: 'working', done: 'done', move: 'en route', wait: '—' },
    log: {
      landed: (p) => `${p.n} landed from ${p.from}`,
      arrivedStand: (p) => `${p.n} on stand ${p.stand}`,
      pushback: (p) => `${p.n} pushing back`,
      cleared: (p) => `${p.n} cleared for take-off`,
      tookOff: (p) => `${p.n} departed for ${p.to}`,
    },
    langBtn: '日本語',
    seat: 'Seat', seats: 'Seats', cabin: 'Cabin',
    storyTitle: 'Story', storyIdle: 'waiting for their scene', watch: 'Watch', doing: 'Doing', gateLabel: 'Gate', flightLabel: 'Flight',
    acts: {
      arrive: 'Dropped off', checkin: 'To check-in', desk: 'Checking in', security: 'To security', xray: 'Bags through the X-ray', cleared: 'Through security',
      lounge: 'Waiting in the lounge', toGate: 'Walking to the gate', gate: 'At the gate', boarding: 'Boarding', aboard: 'On board',
      deplane: 'Leaving the aircraft', corridor: 'Arrivals corridor', escalator: 'Escalator down to 1F', toClaim: 'To baggage claim', waitBag: 'Waiting for the bag',
      gotBag: 'Got the bag', lostBag: "Bag didn't come out", service: 'At baggage service', delivery: 'Waiting for the bag on the next flight',
      bagDelivered: 'Bag delivered', reunion: 'Meeting family', exit: 'Leaving through arrivals', curb: 'To the pick-up car',
      crewIn: 'Heading to the gate', briefing: 'Briefing', marshal: 'Ready to marshal', guide: 'Guiding an aircraft in',
    },
    types: { passenger: 'Traveller', woman: 'Traveller', backpacker: 'Backpacker', business: 'Business traveller', child: 'Child', senior: 'Senior', pilot: 'Captain', attendant: 'Cabin crew', marshaller: 'Marshaller' },
    kinds: { departure: 'Departing passenger', arrival: 'Arriving passenger', crew: 'Crew' },
  },
};

// flight status strings come from the simulation in Japanese
const STATUS_EN = {
  着陸進入: 'Approach', 着陸滑走: 'Landing roll', スポットイン: 'Docking', タキシング: 'Taxiing',
  降機中: 'Deboarding', '清掃・機内食': 'Cleaning & catering', 搭乗中: 'Boarding', 出発待ち: 'Awaiting pushback',
  出発準備: 'Preparing', プッシュバック: 'Pushback', エンジン始動: 'Engine start', 離陸待ち: 'Holding short',
  滑走路進入: 'Lining up', 上昇中: 'Climbing', 離陸滑走: 'Take-off roll',
};

export const getLang = () => lang;
export function setLang(l) {
  lang = l;
  try { localStorage.setItem('mini-airport-lang', l); } catch { /* storage unavailable */ }
}
export const t = (key) => D[lang][key];
export const status = (s) => (lang === 'en' ? STATUS_EN[s] ?? s : s);
export const city = (c) => (lang === 'en' ? c[2] : c[0]);
export const logLine = (e) => D[lang].log[e.key]?.(e.params) ?? '';

// static page text: elements carry data-i18n="key" (text) or data-i18n-html="key"
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.documentElement.lang = lang;
}
