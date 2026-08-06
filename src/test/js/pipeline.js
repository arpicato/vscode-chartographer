// Cross-file call chain for testing multi-file graph

const { processData } = require('./data-processor');
const { formatResult } = require('./formatter');

function runPipeline(input) {
    const data = processData(input);
    return formatResult(data);
}

module.exports = { runPipeline };