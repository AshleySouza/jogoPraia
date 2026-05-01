const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createElement(id) {
    const listeners = {};
    const children = {
        h1: { textContent: id === 'gameOver' ? 'GAME OVER' : id === 'startScreen' ? 'Jogo da Praia' : '' },
        p: { textContent: '' }
    };
    return {
        id,
        textContent: '',
        classList: {
            classes: new Set(id === 'mobileControls' ? ['hidden'] : []),
            add(name) {
                this.classes.add(name);
            },
            remove(name) {
                this.classes.delete(name);
            },
            contains(name) {
                return this.classes.has(name);
            }
        },
        addEventListener(type, handler) {
            listeners[type] = listeners[type] || [];
            listeners[type].push(handler);
        },
        querySelector(selector) {
            return children[selector] || null;
        },
        dispatch(type) {
            for (const handler of listeners[type] || []) {
                handler({
                    preventDefault() {}
                });
            }
        }
    };
}

function createCanvasContext() {
    const noop = () => {};
    return {
        fillRect: noop,
        clearRect: noop,
        beginPath: noop,
        arc: noop,
        fill: noop,
        stroke: noop,
        ellipse: noop,
        moveTo: noop,
        quadraticCurveTo: noop,
        lineTo: noop,
        save: noop,
        restore: noop,
        translate: noop,
        scale: noop,
        fillText: noop,
        strokeRect: noop
    };
}

function loadGame() {
    let now = 10_000;
    const storage = new Map();
    const elements = new Map();
    const documentListeners = {};
    const ids = [
        'gameCanvas',
        'score',
        'bestScore',
        'time',
        'mode',
        'status',
        'gameOver',
        'startScreen',
        'mobileControls',
        'jumpButton',
        'duckButton'
    ];

    for (const id of ids) {
        elements.set(id, createElement(id));
    }

    const canvas = elements.get('gameCanvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.getContext = () => createCanvasContext();

    const document = {
        getElementById(id) {
            return elements.get(id);
        },
        addEventListener(type, handler) {
            documentListeners[type] = documentListeners[type] || [];
            documentListeners[type].push(handler);
        },
        dispatch(type, code) {
            for (const handler of documentListeners[type] || []) {
                handler({
                    code,
                    preventDefault() {}
                });
            }
        }
    };

    const mediaQuery = {
        matches: false,
        addEventListener() {},
        addListener() {}
    };

    const windowObj = {
        document,
        ontouchstart() {},
        localStorage: {
            getItem(key) {
                return storage.has(key) ? storage.get(key) : null;
            },
            setItem(key, value) {
                storage.set(key, value);
            }
        },
        matchMedia() {
            return mediaQuery;
        },
        requestAnimationFrame() {},
        setTimeout(fn) {
            fn();
        },
        AudioContext: function AudioContext() {
            return {
                currentTime: 0,
                destination: {},
                createOscillator() {
                    return {
                        frequency: { value: 0 },
                        type: '',
                        connect() {},
                        start() {},
                        stop() {}
                    };
                },
                createGain() {
                    return {
                        gain: {
                            setValueAtTime() {},
                            exponentialRampToValueAtTime() {}
                        },
                        connect() {}
                    };
                }
            };
        }
    };

    const context = {
        window: windowObj,
        document,
        console,
        Math,
        Date: {
            now() {
                return now;
            }
        },
        setTimeout(fn) {
            fn();
        }
    };

    const source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
    vm.runInNewContext(source, context, { filename: 'game.js' });

    return {
        api: windowObj.__gameTestApi__,
        elements,
        document,
        mediaQuery,
        storage,
        setNow(value) {
            now = value;
        }
    };
}

function testCollisionEndsGame() {
    const { api, setNow } = loadGame();
    api.iniciarJogo();

    api.estado.escorpioes.push({
        x: api.jogadora.x,
        y: api.jogadora.y,
        largura: 50,
        altura: 35
    });

    setNow(api.estado.tempoInicio + 5_000);
    api.atualizar();

    assert.strictEqual(api.estado.gameOver, true, 'sem imunidade a colisao deve encerrar o jogo');
}

function testFiveMinuteMessageAndImmunity() {
    const { api, elements, setNow } = loadGame();
    api.iniciarJogo();

    setNow(api.estado.tempoInicio + 120_000);
    api.atualizar();

    assert.strictEqual(api.estado.mostrandoMensagem, true, 'a mensagem deve aparecer aos 2 minutos');
    assert.strictEqual(api.estaImune(), true, 'a imunidade deve ativar aos 2 minutos');
    assert.match(elements.get('status').textContent, /Imune:/, 'UI deve mostrar a contagem de imunidade');

    api.estado.escorpioes.push({
        x: api.jogadora.x,
        y: api.jogadora.y,
        largura: 50,
        altura: 35
    });
    api.atualizar();
    assert.strictEqual(api.estado.gameOver, false, 'durante a imunidade a colisao nao deve encerrar o jogo');

    setNow(api.estado.tempoInicio + 128_000);
    api.atualizar();
    assert.strictEqual(api.estado.mostrandoMensagem, false, 'a mensagem deve sumir depois da contagem');
    assert.strictEqual(api.estaImune(), false, 'a imunidade deve acabar apos 7 segundos');
}

function testPowerUpImmunityLastsTenSeconds() {
    const { api, setNow } = loadGame();
    api.iniciarJogo();

    api.estado.poderes.push({
        x: api.jogadora.x,
        y: api.jogadora.y,
        largura: 32,
        altura: 32
    });

    setNow(api.estado.tempoInicio + 30_000);
    api.atualizar();

    assert.strictEqual(api.estaImune(), true, 'coletar o poder deve ativar imunidade');

    api.estado.escorpioes.push({
        x: api.jogadora.x,
        y: api.jogadora.y,
        largura: 50,
        altura: 35
    });
    api.atualizar();
    assert.strictEqual(api.estado.gameOver, false, 'durante a imunidade do poder a colisao nao deve encerrar o jogo');

    setNow(api.estado.tempoInicio + 41_000);
    api.atualizar();
    assert.strictEqual(api.estaImune(), false, 'a imunidade do poder deve acabar apos 10 segundos');
}

function testBestScorePersistence() {
    const { api, elements, storage } = loadGame();
    api.iniciarJogo();
    api.estado.pontos = 120;
    api.atualizarMelhorPontuacao();
    api.atualizar();

    assert.strictEqual(api.estado.melhorPontuacao, 120, 'recorde deve atualizar no estado');
    assert.strictEqual(storage.get('jogoDaPraiaBestScore'), '120', 'recorde deve ir para o localStorage');
    assert.strictEqual(elements.get('bestScore').textContent, 'Recorde: 120', 'UI deve mostrar o recorde');
}

function testJumpAndDuckControls() {
    const { api, document, elements, mediaQuery } = loadGame();
    mediaQuery.matches = true;
    api.atualizarVisibilidadeControles();
    assert.strictEqual(elements.get('mobileControls').classList.contains('hidden'), false, 'controles mobile devem aparecer em tela mobile');

    elements.get('jumpButton').dispatch('pointerdown');
    assert.strictEqual(api.estado.rodando, true, 'botao de pulo deve iniciar o jogo no mobile');

    document.dispatch('keydown', 'ArrowDown');
    assert.strictEqual(api.jogadora.abaixando, true, 'seta para baixo deve abaixar');
    assert.strictEqual(api.jogadora.y, 340, 'jogadora deve ir para a altura de abaixar');

    document.dispatch('keyup', 'ArrowDown');
    assert.strictEqual(api.jogadora.abaixando, false, 'soltar a seta deve levantar');
    assert.strictEqual(api.jogadora.y, 300, 'jogadora deve voltar ao chao');
}

function testStageAdvancesWhileAvatarStaysStable() {
    const { api, setNow } = loadGame();
    api.iniciarJogo();

    const xInicial = api.jogadora.x;
    setNow(api.estado.tempoInicio + 1_000);
    for (let i = 0; i < 40; i++) {
        api.atualizar();
    }

    assert.strictEqual(api.jogadora.x, xInicial, 'avatar nao deve escorregar sozinho na tela');
    assert.ok(api.estado.distancia > 0, 'fase deve acumular distancia percorrida');
}

function testDayLastsNinetySeconds() {
    const { api, setNow } = loadGame();
    api.iniciarJogo();

    setNow(api.estado.tempoInicio + 89_000);
    api.atualizar();
    assert.strictEqual(api.estado.modoDia, true, 'antes de 1:30 ainda deve ser dia');

    setNow(api.estado.tempoInicio + 91_000);
    api.atualizar();
    assert.strictEqual(api.estado.modoDia, false, 'apos 1:30 deve virar noite');
}

function testWinConditionAtTenMinutes() {
    const { api, elements, setNow } = loadGame();
    api.iniciarJogo();

    setNow(api.estado.tempoInicio + 601_000);
    api.atualizar();

    assert.strictEqual(api.estado.gameOver, true, 'ao atingir a meta o jogo deve encerrar');
    assert.strictEqual(api.estado.venceu, true, 'a flag de vitoria deve ser marcada');
    assert.strictEqual(elements.get('status').textContent, 'Resultado: Vitoria', 'UI deve mostrar vitoria');
}

function run() {
    testCollisionEndsGame();
    testFiveMinuteMessageAndImmunity();
    testPowerUpImmunityLastsTenSeconds();
    testBestScorePersistence();
    testJumpAndDuckControls();
    testStageAdvancesWhileAvatarStaysStable();
    testDayLastsNinetySeconds();
    testWinConditionAtTenMinutes();
    console.log('Todos os testes passaram.');
}

run();
