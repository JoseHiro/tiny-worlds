// The night market's people (bangkok/DESIGN.md §7): vendors and Noi's family. They are ordinary characters from
// airport/src/parts.js with Bangkok roles; the vendor poses (wok, fan, pound, shake, chop) live in that rig too.
import { ROLE_LOOKS, PALETTE } from '../../airport/src/parts.js';
import { SKINS } from '../../airport/src/looks.js';

const tan = SKINS[2], deep = SKINS[3];
Object.assign(ROLE_LOOKS, {
  // the story: Noi runs the pad thai cart with her father
  noi: { top: 0xe8673c, legs: 0x2c3a57, apron: 0x2c3a57, hat: 'long', hair: 0x1d1f23, skin: tan, fixed: true },
  noiDad: { top: 0xf4f0e8, legs: 0x3a3f4a, apron: 0xd9342b, hat: 'hair', hair: 0x2a2018, skin: deep, fixed: true },
  // vendors
  wokCook: { top: 0xf4f0e8, legs: 0x3a3f4a, scarf: 0xf4f0e8, hat: 'hair', skin: deep },
  griller: { top: 0x5f7f9a, legs: 0x3a3f4a, apron: 0x8a5a34, hat: 'baseball', capColor: PALETTE.red, skin: tan },
  somtamAunty: { top: 0xe88aa8, legs: 0x3a3f4a, hat: 'straw', skin: tan },
  noodleMan: { top: 0xf4f0e8, legs: 0x2c3a57, apron: 0x3a7fd0, hat: 'hair', glasses: true, skin: tan },
  fruitSeller: { top: 0xf2b84b, legs: 0x3a3f4a, apron: 0x4f9d6a, hat: 'long', skin: tan },
  teaVendor: { top: 0xe8673c, legs: 0x1c2232, apron: 0xf4f0e8, hat: 'baseball', capColor: 0x1c2232, skin: tan },
  // the street
  motoTaxi: { top: 0x2c3a57, vest: 0xe8673c, legs: 0x1c2232, hat: 'bike', capColor: 0xf4f0e8, skin: deep },
  thaiStudent: { top: 0xf4f0e8, legs: 0x2c3a57, hat: 'long', handbag: 0x2c3a57, skin: tan },
});
// which pose goes with which cooking kit
export const VENDOR_POSE = { wok: 'wok', grill: 'fan', mortar: 'pound', pot: 'shake', fruit: 'chop', griddle: 'wok', tea: 'pour' };
