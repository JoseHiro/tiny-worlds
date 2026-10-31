# Tiny Worlds

Small 3D dioramas with stories inside, built in the browser with [three.js](https://threejs.org).
小さな3Dの世界に、それぞれの物語を詰めたジオラマ集です。

**Live:** https://josehiro.github.io/tiny-worlds/

## Worlds

### Bangkok night market — [`bangkok/`](bangkok/)

A street-food night in Bangkok: a neon main road and a lane of coloured tents. Over two minutes dusk turns to night, the signs come on one by one and the stalls open; forty people queue, eat on plastic stools and wander into the lane while tuk-tuks stop for them. Click anyone to follow them, or watch the story of Noi, the pad thai stall's daughter. Pages: [`bangkok/`](bangkok/) (the street) · [`bangkok/parts.html`](bangkok/parts.html) (parts catalogue) · [`bangkok/DESIGN.md`](bangkok/DESIGN.md)

### World Map — [`world/`](world/)

Every world on one low-poly globe, with the routes out of Mini Airport and aircraft flying them. Fly to Naha: a 45-second flight over the clouds, then the landing at Naha Airport on the Naha road. Pages: [`world/index.html`](world/index.html) (the map) · [`world/flight.html`](world/flight.html) (in flight) · [`world/DESIGN.md`](world/DESIGN.md) · in-flight cabin (work in progress): [`world/cabin.html`](world/cabin.html) (the whole cabin through the flight) · [`world/cabin-parts.html`](world/cabin-parts.html) (parts catalogue) · [`world/CABIN.md`](world/CABIN.md)

### 01 · Mini Airport — [`airport/`](airport/)

One runway, six stands and a two-storey terminal (departures on 2F, arrivals on 1F).

- **Cutaway view** — come close and the roof opens; switch between the 2F departures floor and the 1F arrivals floor
- **Live operations** — landings, jet bridges, fuelling, baggage trains, pushbacks and take-offs; one aircraft on the runway at a time
- **Per-flight passengers** — check-in → security → lounge → gate → jet bridge → seat; and aircraft → arrivals corridor → escalator → baggage claim → pick-up curb
- **Bag tracking** — every checked bag goes from the desk scale through the sorting hall onto its stand's baggage train and into the hold; inbound bags come off onto the carousel and only their owner picks them up
- **Cabin view** — click an aircraft (or follow someone boarding) to open a person-scale cut-open cabin: passengers walk to their own seats, stow bags and later file off row by row
- **Arrivals** — immigration for international flights, the arrivals hall with greeters holding name boards, and the ride home: private cars, a taxi rank, the airport bus
- **Round trips** — every departure comes back later as the next-numbered flight
- **Story cast** — Hana's family trip, Kenji running late, Sora's missing backpack, Midori's reunion, Captain Tanaka, Yu the marshaller. Click anyone to follow them
- **日本語 / English** UI

Pages: [`airport/index.html`](airport/index.html) (the airport) · [`airport/parts.html`](airport/parts.html) (parts and room kits) · [`airport/DESIGN.md`](airport/DESIGN.md) (design notes, in Japanese)

## Run locally

No build step — plain ES modules, three.js from a CDN.

```bash
node serve.mjs 5181
```

Then open http://localhost:5181/airport/ (any static file server works too).

## Layout

```
index.html        world list
serve.mjs         tiny static server for local preview
airport/
  index.html      the airport
  parts.html      parts & room-kit catalog
  DESIGN.md       design notes
  src/            parts, rooms, layout, simulation, passengers, bags, story, i18n
```
