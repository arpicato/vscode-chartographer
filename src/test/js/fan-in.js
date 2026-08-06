// Multiple callers targeting same function

function sharedHelper() {
    return "shared";
}

function callerA() {
    return sharedHelper();
}

function callerB() {
    return sharedHelper();
}

function CallerC() {
    return sharedHelper() + callerA() + callerB();
}

function topLevel() {
    return callerA() + callerB() + CallerC();
}