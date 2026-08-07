// Test scenarios for Chartographer call graph features
//
// Open this file, place cursor on a function, run:
//   Ctrl+Shift+P → Chartographer: Show Call Graph
//
// =========================================================================
// Scenario 1: Edge click navigation (single call site)
//   Cursor on `handleLogin` → Show Call Graph (Outgoing, depth 1)
//   Click edge `handleLogin → validateCredentials` → navigates to line 43
// =========================================================================
// Scenario 2: Edge click navigation (multiple call sites)
//   Cursor on `logEvent` → Show Call Graph (Incoming, depth 1)
//   Click edge `validateCredentials → logEvent` → quickPick shows 2 call sites
//   Pick one → navigates to that call site
// =========================================================================
// Scenario 3: Shift+Click path finding
//   Cursor on `entryPoint` → Show Call Graph (Both, depth -1)
//   Click node `entryPoint` (highlights neighborhood)
//   Shift+Click node `saveToDb` → highlights path: entryPoint → handleLogin → validateCredentials → saveToDb · 3 hops
// =========================================================================
// Scenario 4: Find path from here (context menu)
//   Right-click node `entryPoint` → "Find path from here"
//   Click node `formatResponse` → shows path: entryPoint → handleRequest → processPayload → formatResponse · 3 hops
//   Press Esc → cancels mode
// =========================================================================
// Scenario 5: No path (disconnected)
//   Right-click node `standaloneHelper` → "Find path from here"
//   Click node `entryPoint` → shows "standaloneHelper → entryPoint · no path"
// =========================================================================
// Scenario 6: Directed path (reverse has no path)
//   Click node `saveToDb` → Shift+Click node `entryPoint` → no path (reverse direction)
// =========================================================================
// Scenario 7: Click to highlight connections
//   Click node `handleRequest` → highlights its neighbors (processPayload, handleLogin, formatResponse)
//   Click background → clears highlights
// =========================================================================

// --- Core data-flow functions ---

function validateCredentials(user, pass) {
    logEvent('login_attempt', { user });
    if (!user || !pass) {
        logEvent('login_fail', { reason: 'missing' });
        return false;
    }
    return user.length > 0 && pass.length > 0;
}

function saveToDb(record) {
    logEvent('db_write', { table: 'users' });
    return { id: Date.now(), ...record };
}

function formatResponse(data) {
    return { status: 'ok', data };
}

function parseInput(raw) {
    const parsed = JSON.parse(raw);
    return { user: parsed.user, pass: parsed.pass, meta: parsed.meta };
}

// --- Multiple call sites (Scenario 2) ---

function logEvent(eventType, ctx) {
    console.log(`[${eventType}]`, JSON.stringify(ctx));
}

// --- Mid-level orchestration ---

function handleLogin(rawInput) {
    const parsed = parseInput(rawInput);
    const valid = validateCredentials(parsed.user, parsed.pass);
    if (!valid) {
        return { status: 'error', message: 'invalid credentials' };
    }
    const record = saveToDb({ user: parsed.user, meta: parsed.meta });
    return formatResponse(record);
}

function handleRequest(req) {
    const payload = processPayload(req);
    return handleLogin(payload);
}

function processPayload(req) {
    const transformed = transformInput(req);
    return transformed;
}

function transformInput(req) {
    return { raw: req.body, meta: req.headers };
}

// --- Entry point (Scenario 3: long path) ---

function entryPoint(event) {
    const req = parseEvent(event);
    return handleRequest(req);
}

function parseEvent(event) {
    return { body: event.body, headers: event.headers };
}

// --- Disconnected function (Scenario 5: no path) ---

function standaloneHelper(value) {
    return value * 2;
}

function unusedUtility() {
    return standaloneHelper(42);
}

// --- Fan-out helper (many callers) ---

function notify(target, msg) {
    console.log('notify', target, msg);
}

function sendAlert(msg) {
    notify('admin', msg);
}

function sendUpdate(msg) {
    notify('user', msg);
}

// --- Cross-module style ---

const db = {
    query: (sql) => { logEvent('db_query', { sql }); return []; },
    insert: (table, data) => { logEvent('db_insert', { table }); return true; },
};

function fetchUser(id) {
    return db.query(`SELECT * FROM users WHERE id = ${id}`);
}

function createUser(data) {
    return db.insert('users', data);
}

// --- Export for require() ---

module.exports = {
    entryPoint,
    handleLogin,
    handleRequest,
    logEvent,
    validateCredentials,
    saveToDb,
    formatResponse,
    standaloneHelper,
    unusedUtility,
    fetchUser,
    createUser,
};