// "Hana and her grandmother walk the old capital in kimono" (koto/DESIGN.md §5.2): one chapter per scene, in the order
// 参道 (index) → 竹林 (yama) → 海 (umi) → 路地 (lane). The two walk a route like everyone else (people.js); the steps of
// Hana's route also carry the story: say (the line under the picture), shot ([[eye], [target]] or { track: offset }),
// call (something happens), end (the link to the next chapter). Grandma walks the same route a little behind.
import { Agent } from './people.js';
import { v3 } from './world.js';

const $ = (id) => document.getElementById(id);
export const CHAPTERS = [
  { no: 1, href: './?story=1', title: '着物で参道へ' },
  { no: 2, href: './yama.html?story=2', title: '人力車で竹林へ' },
  { no: 3, href: './umi.html?story=3', title: '電車で海へ' },
  { no: 4, href: './lane.html?story=4', title: '夕暮れの路地' },
];

// route(who): the steps for Hana (who = 0) or Grandma (who = 1); setup() runs before each telling (hide a bench sitter…)
export function story(world, { no, heightAt, cast = ['kimonoKid', 'baaKimono'], route, setup = null, speed = 0.85 }) {
  const ch = CHAPTERS[no - 1], next = CHAPTERS[no];
  let actors = [];
  $('storyTitle').textContent = `第${no}章「${ch.title}」`;
  $('storyBtn').textContent = '物語を見る';
  function onStep(s) {
    if (s.say) $('storyLine').textContent = s.say;
    if (s.shot) { if (s.shot.track) world.track(actors[0], s.shot.track); else world.cam(v3(...s.shot[0]), v3(...s.shot[1])); }
    s.call?.();
    if (s.end) {
      const a = $('storyNext');
      a.href = next ? next.href : '../'; a.textContent = next ? `第${next.no}章「${next.title}」へ →` : 'おしまい · Tiny Worlds へ →';
      a.hidden = false;
    }
  }
  function start() {
    for (const a of actors) { a.remove(); world.people.splice(world.people.indexOf(a), 1); }
    $('storyNext').hidden = true;
    setup?.();
    actors = [0, 1].map((who) => new Agent(world.scene, cast[who], route(who), { heightAt, speed, delay: who * 0.7, phase: who * 2, onStep: who ? null : onStep }));
    world.people.push(...actors);
    $('storyBtn').textContent = 'はじめから';
  }
  $('storyBtn').onclick = start;
  if (Number(new URLSearchParams(location.search).get('story')) === no) start();
  return { start, actors: () => actors };
}
