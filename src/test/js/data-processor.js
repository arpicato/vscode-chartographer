function transform(raw) {
    return raw.map(x => x * 2);
}

function validate(items) {
    return items.filter(x => x > 0);
}

function processData(input) {
    const cleaned = validate(input);
    return transform(cleaned);
}

module.exports = { processData };