# ZephyCube Border 1.2.0

Square world border per dimension. Stable Script API only.

## Always on
* **Border enforcement:** a player outside the border is teleported back inside (2 blocks in) with a chat warning. Only players with the bypass tag (see Tags) can cross it; this includes spectators and operators without the tag.
* **Spawn kept loaded:** a 2-chunk ticking area (`zc_spawn`) at world spawn, re-checked every 30 min. Bedrock does not keep spawn chunks loaded on its own, so this keeps spawn holograms, leaderboards and farms running with nobody nearby.

## Features (modules)
`/zc:bordermodules` opens a menu with a switch per module (from the console it lists them). `/zc:bordermodules <module> on|off` also works. The choice is saved in the world and needs no restart.

| Module | What it does |
| --- | --- |
| `wall` | Blue flame particle wall within 12 blocks of an edge |
| `build` | Blocks placing and breaking blocks beyond the border (placed blocks are removed and the item returned) |
| `pearls` | Ender pearls that land beyond the border are removed |
| `barrier_pearls` | Ender pearls cannot pass through barrier blocks (the pearl is removed and given back; if it landed first, the thrower is sent back) |

Default border, all centred on 0,0: Overworld and End 10,000 blocks in every direction (x and z from -10,000 to 10,000), Nether 1,250 blocks (the same area, since 1 Nether block is 8 Overworld blocks). A world still on an earlier default (Overworld only at 35,000 from before 1.1.4, or 10,000 in every dimension from 1.1.4) is switched to this on first load; a border set with `/zc:border` is kept.

## Commands
| Command | Who | Use |
| --- | --- | --- |
| `/zc:border set <radius>` | operators | Set the radius (min 16) for the dimension you are in |
| `/zc:border center [x z]` | operators | Move the centre (default: where you stand) |
| `/zc:border off` | operators | Remove the border of your dimension |
| `/zc:border status` | operators | Show centre, radius and limits |
| `/zc:bordermodules [module] [on\|off]` | operators | Open the modules menu, or turn one module on or off |

## Tags
| Tag | Effect |
| --- | --- |
| `zc:border_bypass` | Ignores the border (also in the AdminTools permission bitmask `zc:p.<hex>`, bit 8) |

Spectators are exempt from the `build` and `pearls` rules, but are still teleported back inside.

## Storage
World property `wb:cfg` (borders), `wb:modules` (disabled modules).
