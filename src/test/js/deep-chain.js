// Deep call chain for testing Chartographer call graph

function level10() {
    return "done";
}

function level9() {
    return level10();
}

function level8() {
    return level9();
}

function level7() {
    return level8();
}

function level6() {
    return level7();
}

function level5() {
    return level6();
}

function level4() {
    return level5();
}

function level3() {
    return level4();
}

function level2() {
    return level3();
}

function level1() {
    return level2();
}

function entryPoint() {
    return level1();
}