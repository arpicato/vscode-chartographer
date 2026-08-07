// Show call graph from a → see a→b→c. Right-click b → expand → see d.
function c() { return 3; }
function b() { return c(); }
function a() { return b(); }

function d() { return b(); }