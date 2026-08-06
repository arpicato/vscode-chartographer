function addTimestamp(data) {
    return { ...data, timestamp: Date.now() };
}

function toJSON(data) {
    return JSON.stringify(data, null, 2);
}

function formatResult(data) {
    const withTime = addTimestamp(data);
    return toJSON(withTime);
}

module.exports = { formatResult };