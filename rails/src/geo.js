// Tokyo's stations and lines (rails/DESIGN.md §1): real names, real line colours, positions from latitude and longitude.
// The map is 1 km = 2.0 (§2.1), north is −z, east is +x, centred near the Imperial Palace.
export const KM = 2.0;
const LAT0 = 35.68, LON0 = 139.74;
export const toXZ = (lat, lon) => [(lon - LON0) * 111.32 * Math.cos(LAT0 * Math.PI / 180) * KM, -(lat - LAT0) * 110.57 * KM];

// key: [kanji, hiragana, English, lat, lon]
export const STATIONS = {
  tokyo: ['東京', 'とうきょう', 'Tokyo', 35.6812, 139.7671],
  yurakucho: ['有楽町', 'ゆうらくちょう', 'Yūrakuchō', 35.6751, 139.7630],
  shimbashi: ['新橋', 'しんばし', 'Shimbashi', 35.6663, 139.7583],
  hamamatsucho: ['浜松町', 'はままつちょう', 'Hamamatsuchō', 35.6555, 139.7570],
  tamachi: ['田町', 'たまち', 'Tamachi', 35.6457, 139.7476],
  takanawa: ['高輪ゲートウェイ', 'たかなわげーとうぇい', 'Takanawa Gateway', 35.6355, 139.7406],
  shinagawa: ['品川', 'しながわ', 'Shinagawa', 35.6285, 139.7387],
  osaki: ['大崎', 'おおさき', 'Ōsaki', 35.6197, 139.7286],
  gotanda: ['五反田', 'ごたんだ', 'Gotanda', 35.6262, 139.7236],
  meguro: ['目黒', 'めぐろ', 'Meguro', 35.6339, 139.7157],
  ebisu: ['恵比寿', 'えびす', 'Ebisu', 35.6467, 139.7101],
  shibuya: ['渋谷', 'しぶや', 'Shibuya', 35.6580, 139.7016],
  harajuku: ['原宿', 'はらじゅく', 'Harajuku', 35.6702, 139.7027],
  yoyogi: ['代々木', 'よよぎ', 'Yoyogi', 35.6830, 139.7020],
  shinjuku: ['新宿', 'しんじゅく', 'Shinjuku', 35.6896, 139.7006],
  shinokubo: ['新大久保', 'しんおおくぼ', 'Shin-Ōkubo', 35.7012, 139.7000],
  takadanobaba: ['高田馬場', 'たかだのばば', 'Takadanobaba', 35.7126, 139.7038],
  mejiro: ['目白', 'めじろ', 'Mejiro', 35.7212, 139.7066],
  ikebukuro: ['池袋', 'いけぶくろ', 'Ikebukuro', 35.7295, 139.7109],
  otsuka: ['大塚', 'おおつか', 'Ōtsuka', 35.7318, 139.7286],
  sugamo: ['巣鴨', 'すがも', 'Sugamo', 35.7334, 139.7393],
  komagome: ['駒込', 'こまごめ', 'Komagome', 35.7365, 139.7470],
  tabata: ['田端', 'たばた', 'Tabata', 35.7381, 139.7608],
  nishinippori: ['西日暮里', 'にしにっぽり', 'Nishi-Nippori', 35.7320, 139.7668],
  nippori: ['日暮里', 'にっぽり', 'Nippori', 35.7278, 139.7710],
  uguisudani: ['鶯谷', 'うぐいすだに', 'Uguisudani', 35.7206, 139.7781],
  ueno: ['上野', 'うえの', 'Ueno', 35.7138, 139.7773],
  okachimachi: ['御徒町', 'おかちまち', 'Okachimachi', 35.7075, 139.7748],
  akihabara: ['秋葉原', 'あきはばら', 'Akihabara', 35.6984, 139.7731],
  kanda: ['神田', 'かんだ', 'Kanda', 35.6918, 139.7709],
  // the Chūō and Sōbu lines across the middle
  ochanomizu: ['御茶ノ水', 'おちゃのみず', 'Ochanomizu', 35.6995, 139.7650],
  suidobashi: ['水道橋', 'すいどうばし', 'Suidōbashi', 35.7021, 139.7535],
  iidabashi: ['飯田橋', 'いいだばし', 'Iidabashi', 35.7020, 139.7450],
  ichigaya: ['市ケ谷', 'いちがや', 'Ichigaya', 35.6916, 139.7357],
  yotsuya: ['四ツ谷', 'よつや', 'Yotsuya', 35.6860, 139.7302],
  shinanomachi: ['信濃町', 'しなのまち', 'Shinanomachi', 35.6801, 139.7202],
  sendagaya: ['千駄ケ谷', 'せんだがや', 'Sendagaya', 35.6812, 139.7113],
  okubo: ['大久保', 'おおくぼ', 'Ōkubo', 35.7009, 139.6974],
  asakusabashi: ['浅草橋', 'あさくさばし', 'Asakusabashi', 35.6975, 139.7861],
  // just off the board: only on the name boards, as the next station
  nakano: ['中野', 'なかの', 'Nakano', 35.7056, 139.6657],
  higashinakano: ['東中野', 'ひがしなかの', 'Higashi-Nakano', 35.7066, 139.6828],
  ryogoku: ['両国', 'りょうごく', 'Ryōgoku', 35.6956, 139.7930],
};

// line colours (§1.1)
export const LINES = {
  yamanote: { name: ['山手線', 'Yamanote Line'], color: 0x80c241, code: 'JY' },
  chuo: { name: ['中央線快速', 'Chūō Line (Rapid)'], color: 0xf15a22, code: 'JC' },
  sobu: { name: ['中央・総武線各駅停車', 'Chūō-Sōbu Line (Local)'], color: 0xffd400, code: 'JB' },
};

// the Yamanote stops clockwise (外回り) from Tokyo: south down the east side, west, north up the west side, east, down
export const YAMANOTE = ['tokyo', 'yurakucho', 'shimbashi', 'hamamatsucho', 'tamachi', 'takanawa', 'shinagawa', 'osaki', 'gotanda', 'meguro', 'ebisu', 'shibuya', 'harajuku', 'yoyogi', 'shinjuku', 'shinokubo', 'takadanobaba', 'mejiro', 'ikebukuro', 'otsuka', 'sugamo', 'komagome', 'tabata', 'nishinippori', 'nippori', 'uguisudani', 'ueno', 'okachimachi', 'akihabara', 'kanda'];
