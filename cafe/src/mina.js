// "Mina, a travelling illustrator, on a rainy day" (DESIGN.md §12): one chapter per café, in the order 北欧 → 和 →
// バルセロナ. It runs on the same story panel as the old capital (koto/src/story.js); every line is [ja, en].
import { story } from '../../koto/src/story.js';

export const MINA = [
  { no: 1, href: './nordic.html?story=1', title: ['小雨の朝、北の街で', 'A drizzly morning up north'] },
  { no: 2, href: './wa.html?story=2', title: ['にわか雨と借りた傘', 'A sudden shower and a borrowed umbrella'] },
  { no: 3, href: './barcelona.html?story=3', title: ['雨上がりの聖堂', 'The basilica after the rain'] },
];
// weather.hold() also lights the matching button, so the panel says what the story is doing
export function minaStory(world, { no, heightAt, route, setup, role = 'mina' }) {
  return story(world, { no, heightAt, cast: [role], route: () => route, setup, speed: 0.9, chapters: MINA, end: { href: '../', label: ['おしまい · Tiny Worlds へ →', 'The end · back to Tiny Worlds →'] } });
}
export const holdWeather = (weather, v) => { weather.hold(v); for (const b of document.getElementById('weather').children) b.classList.toggle('on', b.dataset.v === v); };
