<p align="center"><img src="logo.png" alt="ZephyCube" width="160"></p>

# ZephyCubeBorder v1.1.5

Square world border per dimension. Stable Script API only.

> [!NOTE]
> This add-on is built for, and tuned specifically for, [WhitemaneSMP](https://whitemane.fun/). Every feature is a separate module, so you can turn off anything you do not need with `/zc:bordermodules <module> off` (run `/zc:bordermodules` to list the modules).

## Install

Download `ZephyCubeBorder-v1.1.5-BP.mcaddon` (behavior pack; this add-on has no resource pack) or `ZephyCubeBorder-v1.1.5.mcpack` from the Releases page and open it. Or install by hand: copy the `ZephyCubeBorder` folder into your world's `behavior_packs` folder and add its `uuid` and `version` (from `manifest.json`) to the world's `world_behavior_packs.json`. Needs `@minecraft/server` 2.8.0.

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

Default border, all centred on 0,0: Overworld and End 10,000 blocks in every direction (x and z from -10,000 to 10,000), Nether 1,250 blocks (the same area, since 1 Nether block is 8 Overworld blocks). A world still on an earlier default (Overworld only at 35,000 from before 1.1.4, or 10,000 in every dimension from 1.1.4) is switched to this on first load; a border set with `/zc:border` is kept.

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

## License

MIT, see `LICENSE`.
