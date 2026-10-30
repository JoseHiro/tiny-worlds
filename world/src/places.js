// The cities on the world map and the worlds you can open there (world/DESIGN.md §2). Shared by the map and the flight.
// Mini Airport sits where Tokyo is (decision B). Routes from it follow the airport's own destination list
// (airport/src/sim.js CITIES), plus two long-haul routes to the worlds in Europe.

// [code, ja, en, lat, lon]
export const CITIES = {
  HND: ['ミニ空港（東京）', 'Mini Airport (Tokyo)', 35.55, 139.78],
  CTS: ['札幌', 'Sapporo', 42.78, 141.69],
  SDJ: ['仙台', 'Sendai', 38.14, 140.92],
  ITM: ['大阪', 'Osaka', 34.79, 135.44],
  FUK: ['福岡', 'Fukuoka', 33.59, 130.45],
  OKA: ['那覇', 'Naha', 26.21, 127.65],
  HIJ: ['広島', 'Hiroshima', 34.44, 132.92],
  ICN: ['ソウル', 'Seoul', 37.46, 126.44],
  TPE: ['台北', 'Taipei', 25.08, 121.23],
  PVG: ['上海', 'Shanghai', 31.14, 121.81],
  HKG: ['香港', 'Hong Kong', 22.31, 113.91],
  KYO: ['京都', 'Kyoto', 35.01, 135.77],
  BCN: ['バルセロナ', 'Barcelona', 41.39, 2.17],
  ARN: ['ストックホルム', 'Stockholm', 59.33, 18.07],
};

// the worlds: which city, its little model on the globe, what it is, and the pages it opens
export const WORLDS = [
  { city: 'HND', model: 'tower', title: ['ミニ空港', 'Mini Airport'],
    text: ['滑走路1本と6つのスポット。乗客、荷物、整備の人たちが一日じゅう働く空港。', 'One runway and six stands, with passengers, bags and a maintenance crew at work all day.'],
    links: [{ href: '../airport/', label: ['開く', 'Open'] }] },
  { city: 'OKA', model: 'palm', title: ['那覇', 'Naha'],
    text: ['那覇空港からレンタカーでビーチへ。サンゴ礁の海とウミガメ。', 'From Naha Airport by rental car to the beach, the reef and the sea turtles.'],
    links: [{ href: '../road/', label: ['道', 'The road'] }, { href: '../naha/', label: ['海', 'The sea'] }],
    fly: true },
  { city: 'KYO', model: 'pagoda', title: ['古都', 'Koto'],
    text: ['京都と鎌倉のような町。参道、花街の路地、竹林と千本鳥居、海と大仏。和のカフェもここに。', 'A town like Kyoto and Kamakura: the temple street, a lantern lane, bamboo and torii, the sea and the Buddha. The Japanese café is here too.'],
    links: [{ href: '../koto/', label: ['参道', 'Temple street'] }, { href: '../koto/lane.html', label: ['路地', 'Lantern lane'] }, { href: '../cafe/wa.html', label: ['和のカフェ', 'Japanese café'] }] },
  { city: 'BCN', model: 'sagrada', title: ['バルセロナ', 'Barcelona'],
    text: ['テラスのカフェと、本当の大きさのサグラダ・ファミリア。', 'A café terrace, and the Sagrada Família at full size.'],
    links: [{ href: '../cafe/barcelona.html', label: ['テラス', 'Terrace'] }, { href: '../cafe/sagrada.html', label: ['サグラダ', 'Sagrada'] }] },
  { city: 'ARN', model: 'cabin', title: ['北欧のカフェ', 'Nordic café'],
    text: ['雨の日の Stilla Kaffe。ミナの物語。', 'Stilla Kaffe on a rainy day, and Mina’s story.'],
    links: [{ href: '../cafe/nordic.html', label: ['開く', 'Open'] }] },
];

// every route starts at Mini Airport
export const ROUTES = ['CTS', 'SDJ', 'ITM', 'FUK', 'OKA', 'HIJ', 'ICN', 'TPE', 'PVG', 'HKG', 'BCN', 'ARN'];
export const LIVERY_KEYS = ['sunrise', 'lagoon', 'midnight'];
