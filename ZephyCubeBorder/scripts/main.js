import "./style.js";
import {
    world, system, GameMode, ItemStack, Player,
    CommandPermissionLevel, CustomCommandStatus, CustomCommandParamType
} from '@minecraft/server';
import { defineModules } from './modules.js';

// ZephyCube Border: square world border per dimension. Stable API only.
// Modules (turn parts off with /zc:bordermodules <module> off):
const on = defineModules("wb", "zc:bordermodules", "Border", [
    { key: "push", label: "push players back at the border" },
    { key: "wall", label: "blue particle wall near the edge" },
    { key: "build", label: "no placing or breaking blocks beyond the border" },
    { key: "pearls", label: "ender pearls beyond the border are removed" },
    { key: "barrier_pearls", label: "ender pearls cannot pass through barrier blocks" },
    { key: "spawn_area", label: "keep the world spawn area loaded (ticking area)" },
]);
const KEY = "wb:cfg";
const BYPASS_TAG = "zc:border_bypass";
const PUSH_IN = 2;          // blocks inside the edge a pushed player lands
const WALL_RANGE = 12;      // particle wall shows within this many blocks of an edge
const WARN_COOLDOWN = 60;   // ticks between chat warnings per player

// Default: 10,000 blocks in every direction from 0,0 in the Overworld and End, 1,250 in the
// Nether (1 Nether block = 8 Overworld blocks, so it covers the same area as the Overworld border).
const DEFAULT_RADIUS = 10000;
const NETHER_RADIUS = 1250;
const defaultCfg = () => ({
    "minecraft:overworld": { x: 0, z: 0, r: DEFAULT_RADIUS },
    "minecraft:nether": { x: 0, z: 0, r: NETHER_RADIUS },
    "minecraft:the_end": { x: 0, z: 0, r: DEFAULT_RADIUS },
});
// Defaults saved by earlier versions. A world still on exactly one of these gets the current default.
const OLD_DEFAULTS = [
    JSON.stringify({ "minecraft:overworld": { x: 0, z: 0, r: 35000 } }), // before 1.1.4
    JSON.stringify({ "minecraft:overworld": { x: 0, z: 0, r: 10000 }, "minecraft:nether": { x: 0, z: 0, r: 10000 }, "minecraft:the_end": { x: 0, z: 0, r: 10000 } }), // 1.1.4
];
let cfg = defaultCfg(); // used until the saved value is read
// world properties cannot be read during early execution, so load on the first tick
system.run(() => {
    const stored = world.getDynamicProperty(KEY);
    if (stored === undefined || OLD_DEFAULTS.includes(stored)) {
        // first run, or a world still on an old default
        cfg = defaultCfg();
        try { world.setDynamicProperty(KEY, JSON.stringify(cfg)); } catch { }
    } else {
        try { cfg = JSON.parse(stored) || {}; } catch { cfg = {}; }
    }
});
const save = () => { try { world.setDynamicProperty(KEY, JSON.stringify(cfg)); } catch (e) { console.warn(`[Border] save failed: ${e}`); } };

const lastWarn = new Map();
const DIM_NAMES = { "minecraft:overworld": "Overworld", "minecraft:nether": "Nether", "minecraft:the_end": "End" };

const outside = (b, x, z) => Math.abs(x - b.x) > b.r || Math.abs(z - b.z) > b.r;


// Bypass/alert tags: the single tag (e.g. zc:border_bypass) or the AdminTools bitmask tag zc:p.<hex> (bit 8 = border_bypass).
function hasPermTag(player, key, bit) {
    if (player.hasTag("zc:" + key)) return true;
    for (const t of player.getTags()) {
        if (t.startsWith("zc:p.")) return ((parseInt(t.slice(5), 16) >> bit) & 1) === 1;
    }
    return false;
}
function exempt(player) {
    try {
        if (hasPermTag(player, "border_bypass", 8)) return true;
        return player.getGameMode() === GameMode.Spectator;
    } catch { return true; }
}

// ---- commands: /zc:border <set|center|off|status> [a] [b]
system.beforeEvents.startup.subscribe((init) => {
    const reg = init.customCommandRegistry;
    reg.registerEnum("zc:borderaction", ["set", "center", "off", "status"]);
    reg.registerCommand({
        name: "zc:border",
        description: "World border: set <radius> | center [x z] | off | status (current dimension)",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "zc:borderaction", type: CustomCommandParamType.Enum }],
        optionalParameters: [
            { name: "a", type: CustomCommandParamType.Integer },
            { name: "b", type: CustomCommandParamType.Integer }
        ]
    }, (origin, action, a, b) => {
        const src = origin.sourceEntity instanceof Player ? origin.sourceEntity : (origin.initiator instanceof Player ? origin.initiator : null);
        const dimId = src ? src.dimension.id : "minecraft:overworld";
        const name = DIM_NAMES[dimId] ?? dimId;
        const cur = cfg[dimId];
        const say = (m) => ({ status: CustomCommandStatus.Success, message: `§8[§bBorder§8]§7 ${m}` });
        const fail = (m) => ({ status: CustomCommandStatus.Failure, message: `§8[§cBorder§8]§c ${m}` });
        switch (action) {
            case "set": {
                if (a === undefined || a < 16) return fail("Usage: /zc:border set <radius, min 16>");
                const c = cur ?? { x: src ? Math.floor(src.location.x) : 0, z: src ? Math.floor(src.location.z) : 0, r: a };
                c.r = a;
                cfg[dimId] = c; save();
                return say(`${name}: radius ${a} (size ${a * 2 + 1}) centered on ${c.x}, ${c.z}.`);
            }
            case "center": {
                const x = a ?? (src ? Math.floor(src.location.x) : 0);
                const z = b ?? (src ? Math.floor(src.location.z) : 0);
                const c = cur ?? { x, z, r: 0 };
                c.x = x; c.z = z;
                if (!c.r) return fail("Set a radius first: /zc:border set <radius>");
                cfg[dimId] = c; save();
                return say(`${name}: center ${x}, ${z}, radius ${c.r}.`);
            }
            case "off":
                delete cfg[dimId]; save();
                return say(`${name}: border removed.`);
            default:
                return say(cur ? `${name}: center ${cur.x}, ${cur.z}, radius ${cur.r} (x ${cur.x - cur.r} to ${cur.x + cur.r}, z ${cur.z - cur.r} to ${cur.z + cur.r}).` : `${name}: no border.`);
        }
    });
});

// ---- enforcement: push back
system.runInterval(() => {
    if (!on("push")) return;
    for (const player of world.getAllPlayers()) {
        try {
            if (!player.isValid) continue;
            const b = cfg[player.dimension.id];
            if (!b || exempt(player)) continue;
            const { x, y, z } = player.location;
            if (!outside(b, x, z)) continue;
            const lim = b.r - PUSH_IN;
            const nx = Math.min(b.x + lim, Math.max(b.x - lim, x));
            const nz = Math.min(b.z + lim, Math.max(b.z - lim, z));
            player.teleport({ x: nx, y, z: nz }, { dimension: player.dimension, keepVelocity: false });
            const now = system.currentTick;
            if (now - (lastWarn.get(player.id) ?? -999) >= WARN_COOLDOWN) {
                lastWarn.set(player.id, now);
                player.sendMessage("§8[§bBorder§8]§c You cannot go beyond the world border.");
            }
        } catch (e) { /* player left or chunk not ready */ }
    }
}, 4);

// ---- particle wall near the edge
system.runInterval(() => {
    if (!on("wall")) return;
    for (const player of world.getAllPlayers()) {
        try {
            const dim = player.dimension;
            const b = cfg[dim.id];
            if (!b) continue;
            const { x, y, z } = player.location;
            const edges = [
                { axis: "x", pos: b.x - b.r, d: x - (b.x - b.r) },
                { axis: "x", pos: b.x + b.r, d: (b.x + b.r) - x },
                { axis: "z", pos: b.z - b.r, d: z - (b.z - b.r) },
                { axis: "z", pos: b.z + b.r, d: (b.z + b.r) - z }
            ];
            for (const e of edges) {
                if (e.d < -2 || e.d > WALL_RANGE) continue;
                const along = e.axis === "x" ? z : x;
                for (let t = -8; t <= 8; t += 2) {
                    for (let h = -2; h <= 4; h += 2) {
                        const loc = e.axis === "x"
                            ? { x: e.pos + 0.5, y: y + h, z: along + t }
                            : { x: along + t, y: y + h, z: e.pos + 0.5 };
                        try { dim.spawnParticle("minecraft:blue_flame_particle", loc); } catch { }
                    }
                }
            }
        } catch { }
    }
}, 10);

// ---- nothing placed / broken / pearled beyond the border
world.beforeEvents.playerBreakBlock.subscribe((ev) => {
    if (!on("build")) return;
    const b = cfg[ev.player.dimension.id];
    if (!b || exempt(ev.player)) return;
    const l = ev.block.location;
    if (outside(b, l.x, l.z)) {
        ev.cancel = true;
        system.run(() => { try { ev.player.sendMessage("§8[§bBorder§8]§c You cannot build beyond the world border."); } catch { } });
    }
});

world.afterEvents.playerPlaceBlock.subscribe((ev) => {
    if (!on("build")) return;
    const player = ev.player;
    const b = cfg[player.dimension.id];
    if (!b || exempt(player)) return;
    const l = ev.block.location;
    if (!outside(b, l.x, l.z)) return;
    const typeId = ev.block.typeId;
    const dim = ev.block.dimension;
    const loc = { x: l.x, y: l.y, z: l.z };
    const pid = player.id;
    system.run(() => {
        try { dim.getBlock(loc)?.setType("minecraft:air"); } catch { }
        try {
            const p = world.getAllPlayers().find(q => q.id === pid);
            if (p) {
                p.getComponent("inventory")?.container?.addItem(new ItemStack(typeId, 1));
                p.sendMessage("§8[§bBorder§8]§c You cannot build beyond the world border.");
            }
        } catch { }
    });
});

system.runInterval(() => {
    if (!on("pearls")) return;
    for (const dimId of Object.keys(cfg)) {
        const b = cfg[dimId];
        try {
            const dim = world.getDimension(dimId);
            for (const e of dim.getEntities({ type: "minecraft:ender_pearl" })) {
                try {
                    const { x, z } = e.location;
                    if (outside(b, x, z)) e.remove();
                } catch { }
            }
        } catch { }
    }
}, 10);

world.afterEvents.playerLeave.subscribe((ev) => { lastWarn.delete(ev.playerId); });

// ---- World spawn stays loaded (ticking area), so spawn holograms / leaderboards keep updating with nobody near ----
const SPAWN_AREA = { name: "zc_spawn", radiusChunks: 2 };     // circle radius 1-4 chunks
function keepSpawnLoaded() {
    if (!on("spawn_area")) return;
    try {
        const s = world.getDefaultSpawnLocation();
        const dim = world.getDimension("minecraft:overworld");
        const cmd = `tickingarea add circle ${Math.floor(s.x)} ${Math.floor(s.y)} ${Math.floor(s.z)} ${SPAWN_AREA.radiusChunks} ${SPAWN_AREA.name} true`;
        try {
            const r = dim.runCommand(cmd);
            if ((r?.successCount ?? 0) >= 1) console.warn(`[Border] Spawn area ${SPAWN_AREA.name} added at ${Math.floor(s.x)}, ${Math.floor(s.z)} (radius ${SPAWN_AREA.radiusChunks} chunks).`);
        } catch { /* it exists already, or no free ticking area slot: nothing to do */ }
    } catch (e) { console.warn(`[Border] Spawn area failed: ${e}`); }
}
system.runTimeout(keepSpawnLoaded, 100);                 // after startup
system.runInterval(keepSpawnLoaded, 20 * 60 * 30);       // every 30 min, in case someone removed it

// ---- Ender pearls cannot pass through barrier blocks ----
// Pearls are followed tick by tick (only while one is in the air). The line between the last and the new position is checked
// every 0.35 blocks, so a fast pearl cannot skip a one-block-thick barrier. Two cases:
//  1. the pearl is still flying when it is seen behind / inside a barrier: it is removed before it can teleport anyone;
//  2. the pearl lands in the same tick it passes the barrier (nobody sees it in between): the hit event checks the line from the
//     last seen position to the hit point, and if a barrier is on it the thrower is sent back to where they were.
// In both cases the thrower gets the pearl back (not in creative).
const PEARL = "minecraft:ender_pearl";
const BARRIER = "minecraft:barrier";
const pearls = new Map();      // entity id -> { e, last:{x,y,z}, owner, ownerLast:{x,y,z}, dimId }

world.afterEvents.entitySpawn.subscribe((ev) => {
    try {
        const e = ev.entity;
        if (!on("barrier_pearls") || e.typeId !== PEARL || pearls.size > 100) return;
        const l = e.location;
        const rec = { e, last: { x: l.x, y: l.y, z: l.z }, owner: null, ownerLast: null, dimId: e.dimension.id };
        try { rec.owner = e.getComponent("minecraft:projectile")?.owner ?? null; } catch { }
        if (rec.owner) { try { const o = rec.owner.location; rec.ownerLast = { x: o.x, y: o.y, z: o.z }; } catch { } }
        pearls.set(e.id, rec);
    } catch { }
});

function crossesBarrier(dim, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const steps = Math.max(1, Math.ceil(len / 0.35));
    for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        let blk;
        try { blk = dim.getBlock({ x: Math.floor(a.x + dx * f), y: Math.floor(a.y + dy * f), z: Math.floor(a.z + dz * f) }); } catch { continue; }
        if (blk?.typeId === BARRIER) return true;
    }
    return false;
}

function giveBack(owner) {
    try {
        if (owner?.typeId === "minecraft:player" && owner.isValid) {
            if (String(owner.getGameMode()).toLowerCase() !== "creative") owner.getComponent("inventory")?.container?.addItem(new ItemStack(PEARL, 1));
            owner.sendMessage("§8[§bBorder§8]§c Ender pearls cannot pass through barriers.");
        }
    } catch { }
}

system.runInterval(() => {
    if (!pearls.size || !on("barrier_pearls")) return;
    for (const [id, p] of pearls) {
        try {
            const e = p.e;
            if (!e.isValid) { pearls.delete(id); continue; }
            if (!p.owner) { try { p.owner = e.getComponent("minecraft:projectile")?.owner ?? null; } catch { } }
            const now = e.location;
            if (crossesBarrier(e.dimension, p.last, now)) {
                try { e.remove(); } catch { }
                pearls.delete(id);
                giveBack(p.owner);
                continue;
            }
            p.last = { x: now.x, y: now.y, z: now.z };
            if (p.owner) { try { if (p.owner.isValid) { const o = p.owner.location; p.ownerLast = { x: o.x, y: o.y, z: o.z }; } } catch { } }
        } catch { pearls.delete(id); }
    }
}, 1);

function onPearlHit(ev) {
    if (!on("barrier_pearls")) return;
    try {
        const proj = ev.projectile;
        if (proj.typeId !== PEARL) return;
        const rec = pearls.get(proj.id);
        pearls.delete(proj.id);
        if (!rec) return;
        const hit = ev.location ?? ev.hitVector ?? proj.location;
        if (!crossesBarrier(proj.dimension, rec.last, hit)) return;
        const owner = rec.owner ?? ev.source;
        const back = rec.ownerLast;
        const dim = world.getDimension(rec.dimId);
        const undo = () => { try { if (owner?.isValid && back) owner.teleport(back, { dimension: dim }); } catch { } };
        system.runTimeout(undo, 1);          // after the pearl has teleported the thrower
        system.runTimeout(undo, 4);          // again in case the first one ran before it
        system.runTimeout(() => giveBack(owner), 1);
    } catch { }
}
world.afterEvents.projectileHitBlock.subscribe(onPearlHit);
world.afterEvents.projectileHitEntity.subscribe(onPearlHit);
