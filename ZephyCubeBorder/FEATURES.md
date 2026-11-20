# ZephyCube Border 1.1.4

Square world border per dimension. Stable Script API only.

## Features (modules)
Turn any of these off or on without a restart: `/zc:bordermodules <module> off|on` (no argument lists them). The choice is saved in the world.

| Module | What it does |
| --- | --- |
| `push` | Pushes players back inside when they cross the border (2 blocks in), with a chat warning |
| `wall` | Blue flame particle wall within 12 blocks of an edge |
| `build` | Blocks placing and breaking blocks beyond the border (placed blocks are removed and the item returned) |
| `pearls` | Ender pearls that land beyond the border are removed |
| `barrier_pearls` | Ender pearls cannot pass through barrier blocks (the pearl is removed and given back; if it landed first, the thrower is sent back) |
| `spawn_area` | Keeps a 2-chunk ticking area (`zc_spawn`) at world spawn loaded, re-checked every 30 min |

Default border: Overworld, Nether and End, 10,000 blocks in every direction from 0,0 (x and z from -10,000 to 10,000). A world still on the old default (Overworld only, 35,000) is switched to this on first load; a border set with `/zc:border` is kept.

## Commands
| Command | Who | Use |
| --- | --- | --- |
| `/zc:border set <radius>` | operators | Set the radius (min 16) for the dimension you are in |
| `/zc:border center [x z]` | operators | Move the centre (default: where you stand) |
| `/zc:border off` | operators | Remove the border of your dimension |
| `/zc:border status` | operators | Show centre, radius and limits |
| `/zc:bordermodules [module] [on\|off]` | operators | List or toggle modules |

## Tags
| Tag | Effect |
| --- | --- |
| `zc:border_bypass` | Ignores the border (also in the AdminTools permission bitmask `zc:p.<hex>`, bit 8) |

Spectators are always exempt.

## Storage
World property `wb:cfg` (borders), `wb:modules` (disabled modules).
