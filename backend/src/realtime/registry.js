/**
 * realtime/registry — a tiny holder for the live WorldManager so non-realtime code (e.g. the
 * HTTP inventory service) can ask "is this character live in a 3D world?" and route a consumable
 * through the authoritative in-world path instead of writing currentHealth (which the realtime
 * autosave would overwrite). Lazy `require` of this module avoids a load-time dependency cycle.
 */

let _manager = null;

function setRealtimeManager(m) { _manager = m; }
function getRealtimeManager() { return _manager; }

module.exports = { setRealtimeManager, getRealtimeManager };
