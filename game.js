(function () {
    const STORAGE_KEY = 'jogoDaPraiaBestScore';
    const GROUND_Y = 300;
    const DUCK_Y = 340;
    const DAY_DURATION_SECONDS = 90;
    const MESSAGE_START_SECONDS = 300;
    const MESSAGE_END_SECONDS = 307;
    const IMMUNITY_DURATION_SECONDS = 7;
    const WIN_TIME_SECONDS = 600;
    const START_X = 128;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 800;
    canvas.height = 400;

    const ui = {
        score: document.getElementById('score'),
        bestScore: document.getElementById('bestScore'),
        time: document.getElementById('time'),
        mode: document.getElementById('mode'),
        status: document.getElementById('status'),
        gameOver: document.getElementById('gameOver'),
        startScreen: document.getElementById('startScreen'),
        mobileControls: document.getElementById('mobileControls'),
        jumpButton: document.getElementById('jumpButton'),
        duckButton: document.getElementById('duckButton')
    };

    const CORES = {
        dia: {
            ceu: '#87CEEB',
            sol: '#FFD700',
            mar: '#006994',
            areia: '#F4A460',
            areiaEscuro: '#D2691E',
            texto: '#000'
        },
        noite: {
            ceu: '#0a0a1a',
            lua: '#FFFACD',
            estrela: '#FFF',
            mar: '#001a33',
            areia: '#8B7355',
            areiaEscuro: '#5C4033',
            texto: '#FFF'
        }
    };

    function criarEstadoInicial() {
        return {
            rodando: false,
            gameOver: false,
            venceu: false,
            pontos: 0,
            melhorPontuacao: carregarMelhorPontuacao(),
            tempoInicio: 0,
            tempoDecorrido: 0,
            modoDia: true,
            velocidade: 4.4,
            distancia: 0,
            escorpioes: [],
            obstaculosVoadores: [],
            ultimoEscorpiao: 0,
            ultimoObstaculoVoador: 0,
            mostrandoMensagem: false,
            tempoMensagem: 0,
            imuneAte: 0,
            mensagem5MinAtivada: false,
            somDedosTocado: false
        };
    }

    const estado = criarEstadoInicial();

    const jogadora = {
        x: START_X,
        y: GROUND_Y,
        largura: 40,
        altura: 80,
        alturaAgachada: 42,
        velocidadeY: 0,
        pulando: false,
        noChao: true,
        frameAnimacao: 0,
        abaixando: false
    };

    function carregarMelhorPontuacao() {
        try {
            const valor = window.localStorage.getItem(STORAGE_KEY);
            return valor ? Number(valor) || 0 : 0;
        } catch (error) {
            return 0;
        }
    }

    function salvarMelhorPontuacao() {
        try {
            window.localStorage.setItem(STORAGE_KEY, String(estado.melhorPontuacao));
        } catch (error) {
            // Ignora falhas de armazenamento no navegador de testes.
        }
    }

    function formatarTempo(totalSegundos) {
        const minutos = Math.floor(totalSegundos / 60);
        const segundos = Math.max(0, Math.floor(totalSegundos % 60));
        return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    }

    function alturaAtualJogadora() {
        return jogadora.abaixando && !jogadora.pulando ? jogadora.alturaAgachada : jogadora.altura;
    }

    function tempoRestanteImunidade() {
        return Math.max(0, estado.imuneAte - Date.now());
    }

    function estaImune() {
        return tempoRestanteImunidade() > 0;
    }

    function baseAtualJogadora() {
        return jogadora.y + alturaAtualJogadora();
    }

    function atualizarMelhorPontuacao() {
        if (estado.pontos > estado.melhorPontuacao) {
            estado.melhorPontuacao = estado.pontos;
            salvarMelhorPontuacao();
        }
    }

    function resetarJogadora() {
        jogadora.x = START_X;
        jogadora.y = GROUND_Y;
        jogadora.velocidadeY = 0;
        jogadora.pulando = false;
        jogadora.noChao = true;
        jogadora.abaixando = false;
        jogadora.frameAnimacao = 0;
    }

    function iniciarJogo() {
        estado.rodando = true;
        estado.gameOver = false;
        estado.venceu = false;
        estado.pontos = 0;
        estado.tempoInicio = Date.now();
        estado.tempoDecorrido = 0;
        estado.modoDia = true;
        estado.velocidade = 4.4;
        estado.distancia = 0;
        estado.escorpioes = [];
        estado.obstaculosVoadores = [];
        estado.ultimoEscorpiao = 0;
        estado.ultimoObstaculoVoador = 0;
        estado.mostrandoMensagem = false;
        estado.tempoMensagem = 0;
        estado.imuneAte = 0;
        estado.mensagem5MinAtivada = false;
        estado.somDedosTocado = false;
        resetarJogadora();
        ui.startScreen.classList.add('hidden');
        ui.gameOver.classList.add('hidden');
        atualizarUI();
    }

    function encerrarJogo(titulo = 'GAME OVER', mensagem = 'Pressione ESPACO para reiniciar', venceu = false) {
        estado.gameOver = true;
        estado.venceu = venceu;
        atualizarMelhorPontuacao();
        const tituloEl = ui.gameOver.querySelector ? ui.gameOver.querySelector('h1') : null;
        const mensagemEl = ui.gameOver.querySelector ? ui.gameOver.querySelector('p') : null;
        if (tituloEl) {
            tituloEl.textContent = titulo;
        }
        if (mensagemEl) {
            mensagemEl.textContent = mensagem;
        }
        ui.gameOver.classList.remove('hidden');
        atualizarUI();
    }

    function pular() {
        if (!estado.rodando) {
            iniciarJogo();
            return;
        }

        if (estado.gameOver) {
            iniciarJogo();
            return;
        }

        if (jogadora.noChao && !estado.mostrandoMensagem) {
            jogadora.pulando = true;
            jogadora.noChao = false;
            jogadora.abaixando = false;
            jogadora.velocidadeY = -16;
        }
    }

    function abaixar(ativo) {
        if (!estado.rodando || estado.gameOver || jogadora.pulando || estado.mostrandoMensagem) {
            if (!ativo) {
                jogadora.abaixando = false;
                if (jogadora.noChao) {
                    jogadora.y = GROUND_Y;
                }
            }
            return;
        }

        jogadora.abaixando = ativo;
        jogadora.y = ativo ? DUCK_Y : GROUND_Y;
    }

    function registrarToqueBotao(botao, onPress, onRelease) {
        if (!botao) {
            return;
        }

        const eventoPress = (event) => {
            event.preventDefault();
            onPress();
        };
        const eventoRelease = (event) => {
            event.preventDefault();
            onRelease();
        };

        ['pointerdown', 'touchstart', 'mousedown'].forEach((tipo) => {
            botao.addEventListener(tipo, eventoPress, { passive: false });
        });
        ['pointerup', 'pointercancel', 'touchend', 'mouseup', 'mouseleave'].forEach((tipo) => {
            botao.addEventListener(tipo, eventoRelease, { passive: false });
        });
    }

    function desenharJogadora() {
        const frame = jogadora.frameAnimacao * 0.28;
        const corrida = jogadora.noChao && estado.rodando && !estado.gameOver;
        const x = Math.round(jogadora.x);
        const y = Math.round(jogadora.y);
        const agachada = jogadora.abaixando && !jogadora.pulando;
        const swingPerna = corrida ? Math.sin(frame) * 6 : 0;
        const swingBraco = corrida ? Math.sin(frame + Math.PI) * 4 : 0;
        const sobeDesce = corrida ? Math.abs(Math.sin(frame)) * 1 : 0;
        const cabecaY = y - sobeDesce + (agachada ? 12 : 0);
        const troncoY = y + 34 - sobeDesce + (agachada ? 10 : 0);
        const camisaAltura = agachada ? 20 : 28;
        const shortsY = troncoY + camisaAltura;
        const pernasY = agachada ? shortsY + 5 : shortsY + 10;
        const pernaAltura = agachada ? 11 : 20;

        if (corrida && !agachada) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const faixa = (frame * 18 + i * 16) % 54;
                ctx.beginPath();
                ctx.moveTo(x - 28 - faixa, y + 112);
                ctx.lineTo(x - 16 - faixa, y + 112);
                ctx.stroke();
            }
        }

        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + 6, cabecaY + 5, 28, agachada ? 18 : 26);
        ctx.fillRect(x + 5, cabecaY + 12, 6, agachada ? 19 : 30);
        ctx.fillRect(x + 29, cabecaY + 12, 6, agachada ? 19 : 30);

        ctx.fillStyle = '#FFE0BD';
        ctx.beginPath();
        ctx.arc(x + 20, cabecaY + 20, agachada ? 12 : 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(173, 216, 230, 0.32)';
        ctx.fillRect(x + 10, cabecaY + 14, 9, 6);
        ctx.fillRect(x + 21, cabecaY + 14, 9, 6);
        ctx.fillRect(x + 19, cabecaY + 16, 2, 2);
        ctx.strokeStyle = 'rgba(90, 90, 90, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 10, cabecaY + 14, 9, 6);
        ctx.strokeRect(x + 21, cabecaY + 14, 9, 6);

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + 14, cabecaY + 17, 2.2, 0, Math.PI * 2);
        ctx.arc(x + 26, cabecaY + 17, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(x + 13.4, cabecaY + 16.2, 0.8, 0, Math.PI * 2);
        ctx.arc(x + 25.4, cabecaY + 16.2, 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#CD5C5C';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + 20, cabecaY + 25, 4, 0.15, Math.PI - 0.15);
        ctx.stroke();

        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(x + 11, troncoY, 18, camisaAltura);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('LOVE', x + 12, troncoY + 13);

        ctx.fillStyle = '#FFE0BD';
        ctx.fillRect(x + 7 - swingBraco, troncoY + 2, 5, agachada ? 12 : 18);
        ctx.fillRect(x + 28 + swingBraco, troncoY + 2, 5, agachada ? 12 : 18);
        ctx.beginPath();
        ctx.arc(x + 9 - swingBraco, troncoY + (agachada ? 15 : 21), 3, 0, Math.PI * 2);
        ctx.arc(x + 31 + swingBraco, troncoY + (agachada ? 15 : 21), 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4d5963';
        ctx.fillRect(x + 11, shortsY, 18, agachada ? 10 : 12);

        ctx.fillStyle = '#FFE0BD';
        ctx.fillRect(x + 13 - swingPerna, pernasY, 5, pernaAltura);
        ctx.fillRect(x + 22 + swingPerna, pernasY, 5, pernaAltura);

        ctx.fillStyle = '#333';
        ctx.fillRect(x + 11 - swingPerna, pernasY + pernaAltura - 1, 10, 4);
        ctx.fillRect(x + 20 + swingPerna, pernasY + pernaAltura - 1, 10, 4);

        if (corrida && !agachada) {
            const poeira = Math.abs(Math.sin(frame * 0.9));
            ctx.fillStyle = `rgba(255, 240, 200, ${0.18 + poeira * 0.18})`;
            ctx.beginPath();
            ctx.arc(x + 8, y + 112, 5 + poeira * 2, 0, Math.PI * 2);
            ctx.arc(x + 32, y + 112, 4 + poeira * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function desenharEscorpiao(esc) {
        const x = esc.x;
        const y = esc.y;
        const corpoY = y + 12;

        ctx.strokeStyle = '#171717';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
            const pernaY = corpoY + i * 3;
            ctx.beginPath();
            ctx.moveTo(x + 12, pernaY);
            ctx.lineTo(x + 7, pernaY + 4);
            ctx.moveTo(x + 24, pernaY);
            ctx.lineTo(x + 29, pernaY + 4);
            ctx.stroke();
        }

        ctx.fillStyle = '#1f1f1f';
        ctx.fillRect(x + 10, y + 8, 16, 10);
        ctx.fillStyle = '#131313';
        ctx.fillRect(x + 5, y + 9, 7, 8);

        ctx.strokeStyle = '#131313';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 7, y + 11);
        ctx.lineTo(x + 2, y + 6);
        ctx.moveTo(x + 7, y + 15);
        ctx.lineTo(x + 2, y + 20);
        ctx.stroke();

        ctx.strokeStyle = '#1f1f1f';
        ctx.beginPath();
        ctx.moveTo(x + 26, y + 10);
        ctx.quadraticCurveTo(x + 33, y + 5, x + 31, y + 1);
        ctx.quadraticCurveTo(x + 30, y - 1, x + 35, y + 1);
        ctx.stroke();

        ctx.fillStyle = '#ff4b4b';
        ctx.fillRect(x + 34, y, 3, 3);
        ctx.fillRect(x + 7, y + 11, 1.5, 1.5);
        ctx.fillRect(x + 10, y + 11, 1.5, 1.5);
    }

    function desenharMorcego(obs) {
        const x = obs.x;
        const y = obs.y;

        ctx.fillStyle = '#1a0a0a';
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 12, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 5, y + 5);
        ctx.lineTo(x, y - 5);
        ctx.lineTo(x + 10, y + 5);
        ctx.moveTo(x + 25, y + 5);
        ctx.lineTo(x + 30, y - 5);
        ctx.lineTo(x + 20, y + 5);
        ctx.fill();

        ctx.fillStyle = '#2d1a1a';
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 10);
        ctx.quadraticCurveTo(x - 5, y - 10, x - 10, y + 15);
        ctx.quadraticCurveTo(x + 5, y + 5, x + 15, y + 15);
        ctx.moveTo(x + 15, y + 10);
        ctx.quadraticCurveTo(x + 35, y - 10, x + 40, y + 15);
        ctx.quadraticCurveTo(x + 25, y + 5, x + 15, y + 15);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 2, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    function desenharNuvem(x, y, escala) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(escala, escala);
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.arc(30, -5, 30, 0, Math.PI * 2);
        ctx.arc(60, 0, 25, 0, Math.PI * 2);
        ctx.arc(20, 10, 20, 0, Math.PI * 2);
        ctx.arc(40, 10, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function desenharPalmeira(x, y) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + 15, y + 50, 15, 80);

        ctx.fillStyle = '#228B22';
        for (let i = 0; i < 7; i++) {
            ctx.beginPath();
            ctx.ellipse(x + 22, y + 50, 40, 8, i * 0.4 - 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function desenharElementosPraia() {
        const palmeiras = [
            { x: 90, y: 280, escala: 0.95 },
            { x: 370, y: 288, escala: 0.75 },
            { x: 650, y: 282, escala: 1.05 },
            { x: 930, y: 286, escala: 0.82 }
        ];
        const conchas = [
            { x: 120, y: 346, r: 4 },
            { x: 280, y: 362, r: 3 },
            { x: 520, y: 335, r: 4 },
            { x: 760, y: 355, r: 3 },
            { x: 980, y: 342, r: 4 }
        ];

        if (estado.modoDia) {
            palmeiras.forEach((item) => {
                ctx.save();
                ctx.translate(item.x, item.y);
                ctx.scale(item.escala, item.escala);
                desenharPalmeira(0, 0);
                ctx.restore();
            });
        }

        ctx.fillStyle = estado.modoDia ? '#d08752' : '#6c5443';
        conchas.forEach((item) => {
            ctx.beginPath();
            ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function desenharFundo() {
        const cores = estado.modoDia ? CORES.dia : CORES.noite;

        ctx.fillStyle = cores.ceu;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (estado.modoDia) {
            ctx.fillStyle = cores.sol;
            ctx.beginPath();
            ctx.arc(720, 60, 45, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(720, 60, 60, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            desenharNuvem(100, 70, 1);
            desenharNuvem(350, 50, 0.8);
            desenharNuvem(550, 90, 1.2);
            desenharNuvem(700, 40, 0.7);
        } else {
            ctx.fillStyle = cores.lua;
            ctx.beginPath();
            ctx.arc(720, 60, 35, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(200, 200, 180, 0.3)';
            ctx.beginPath();
            ctx.arc(710, 55, 8, 0, Math.PI * 2);
            ctx.arc(730, 70, 5, 0, Math.PI * 2);
            ctx.arc(715, 75, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = cores.estrela;
            for (let i = 0; i < 60; i++) {
                const x = (i * 137 + 50) % canvas.width;
                const y = (i * 89 + 30) % 180;
                const tamanho = (i % 3) + 1;
                ctx.beginPath();
                ctx.arc(x, y, tamanho, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.fillStyle = cores.mar;
        ctx.fillRect(0, 220, canvas.width, 100);

        ctx.strokeStyle = estado.modoDia ? '#008B8B' : '#003355';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            for (let x = -20; x < canvas.width + 20; x += 15) {
                const y = 235 + i * 22 + Math.sin(x * 0.05) * 5;
                if (x === -20) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        ctx.fillStyle = cores.areia;
        ctx.fillRect(0, 310, canvas.width, 90);

        ctx.fillStyle = cores.areiaEscuro;
        for (let i = 0; i < 20; i++) {
            const x = (i * 73) % canvas.width;
            const y = 320 + (i * 17) % 60;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        desenharElementosPraia();
    }

    function tocarSomDedos() {
        if (estado.somDedosTocado) {
            return;
        }

        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) {
            estado.somDedosTocado = true;
            return;
        }

        estado.somDedosTocado = true;
        const audioCtx = new AudioCtor();
        const notas = [523, 659, 784, 1047];
        notas.forEach((freq, i) => {
            setTimeout(() => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.frequency.value = freq;
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.08);
            }, i * 80);
        });
    }

    function colidiu(a, b) {
        return a.x < b.x + b.largura &&
            a.x + a.largura > b.x &&
            a.y < b.y + b.altura &&
            a.y + a.altura > b.y;
    }

    function limitesJogadora() {
        return {
            x: jogadora.x,
            y: jogadora.y,
            largura: jogadora.largura,
            altura: alturaAtualJogadora()
        };
    }

    function atualizarUI() {
        ui.score.textContent = `Pontos: ${estado.pontos}`;
        ui.bestScore.textContent = `Recorde: ${estado.melhorPontuacao}`;
        ui.time.textContent = `Tempo: ${formatarTempo(estado.tempoDecorrido)}`;
        ui.mode.textContent = `Modo: ${estado.modoDia ? 'Dia' : 'Noite'}`;
        if (estado.gameOver && estado.venceu) {
            ui.status.textContent = 'Resultado: Vitoria';
        } else if (estaImune()) {
            ui.status.textContent = `Imune: ${formatarTempo(Math.ceil(tempoRestanteImunidade() / 1000))}`;
        } else {
            ui.status.textContent = `Meta: ${formatarTempo(WIN_TIME_SECONDS)}`;
        }
    }

    function atualizar() {
        if (!estado.rodando || estado.gameOver) {
            atualizarUI();
            return;
        }

        estado.tempoDecorrido = (Date.now() - estado.tempoInicio) / 1000;

        if (estado.tempoDecorrido > DAY_DURATION_SECONDS && estado.modoDia) {
            estado.modoDia = false;
        }

        estado.velocidade = 4.4 + Math.floor(estado.tempoDecorrido / 45) * 0.7;

        if (!estado.mensagem5MinAtivada && estado.tempoDecorrido >= MESSAGE_START_SECONDS) {
            estado.mensagem5MinAtivada = true;
            estado.mostrandoMensagem = true;
            estado.tempoMensagem = IMMUNITY_DURATION_SECONDS;
            estado.imuneAte = Date.now() + (IMMUNITY_DURATION_SECONDS * 1000);
        }

        if (estado.mostrandoMensagem) {
            estado.tempoMensagem = Math.max(0, (estado.imuneAte - Date.now()) / 1000);
            if (estado.tempoDecorrido >= MESSAGE_END_SECONDS || !estaImune()) {
                estado.mostrandoMensagem = false;
                estado.tempoMensagem = 0;
            }
        }

        if (estado.tempoDecorrido > 240 && !estado.somDedosTocado) {
            tocarSomDedos();
        }

        if (jogadora.pulando) {
            jogadora.y += jogadora.velocidadeY;
            jogadora.velocidadeY += 0.8;

            if (baseAtualJogadora() >= GROUND_Y + jogadora.altura) {
                jogadora.y = GROUND_Y;
                jogadora.pulando = false;
                jogadora.noChao = true;
                jogadora.velocidadeY = 0;
                if (jogadora.abaixando) {
                    jogadora.y = DUCK_Y;
                }
            }
        }

        if (jogadora.noChao) {
            jogadora.frameAnimacao += 1 + estado.velocidade * 0.05;
        }

        estado.distancia += estado.velocidade;

        const intervaloEscorpiao = 1500 + Math.random() * 900;
        if (Date.now() - estado.ultimoEscorpiao > intervaloEscorpiao) {
            estado.escorpioes.push({
                x: canvas.width + 70,
                y: 334,
                largura: 38,
                altura: 24
            });
            estado.ultimoEscorpiao = Date.now();
        }

        if (!estado.modoDia) {
            const intervaloVoador = 2600 + Math.random() * 1500;
            if (Date.now() - estado.ultimoObstaculoVoador > intervaloVoador) {
                estado.obstaculosVoadores.push({
                    x: canvas.width + 50,
                    y: 195 + Math.random() * 55,
                    largura: 35,
                    altura: 25
                });
                estado.ultimoObstaculoVoador = Date.now();
            }
        }

        for (let i = estado.escorpioes.length - 1; i >= 0; i--) {
            estado.escorpioes[i].x -= estado.velocidade;
            if (estado.escorpioes[i].x < -50) {
                estado.escorpioes.splice(i, 1);
                estado.pontos += 10;
                atualizarMelhorPontuacao();
            }
        }

        for (let i = estado.obstaculosVoadores.length - 1; i >= 0; i--) {
            estado.obstaculosVoadores[i].x -= estado.velocidade * 1.2;
            if (estado.obstaculosVoadores[i].x < -50) {
                estado.obstaculosVoadores.splice(i, 1);
                estado.pontos += 15;
                atualizarMelhorPontuacao();
            }
        }

        const hitboxJogadora = limitesJogadora();
        if (!estaImune()) {
            for (const esc of estado.escorpioes) {
                if (colidiu(hitboxJogadora, esc)) {
                    encerrarJogo();
                    break;
                }
            }

            if (!estado.gameOver) {
                for (const obs of estado.obstaculosVoadores) {
                    if (colidiu(hitboxJogadora, obs)) {
                        encerrarJogo();
                        break;
                    }
                }
            }
        }

        if (!estado.gameOver && estado.tempoDecorrido >= WIN_TIME_SECONDS) {
            encerrarJogo('VOCE VENCEU!', 'Pressione ESPACO para jogar novamente', true);
        }

        atualizarUI();
    }

    function desenharTrofeuVitoria() {
        if (!(estado.gameOver && estado.venceu)) {
            return;
        }

        const x = canvas.width / 2;
        const y = 118;

        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = '#ffd54a';
        ctx.beginPath();
        ctx.moveTo(-26, -16);
        ctx.lineTo(26, -16);
        ctx.lineTo(18, 12);
        ctx.lineTo(-18, 12);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#c08a00';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-30, -4, 12, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(30, -4, 12, Math.PI * 1.5, Math.PI * 0.5);
        ctx.stroke();

        ctx.fillStyle = '#c08a00';
        ctx.fillRect(-6, 12, 12, 16);
        ctx.fillRect(-18, 28, 36, 8);

        ctx.fillStyle = '#fff4b0';
        ctx.beginPath();
        ctx.arc(0, -2, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function desenharMensagemEspecial() {
        if (!estado.mostrandoMensagem) {
            return;
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(110, 76, 580, 92);

        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 3;
        ctx.strokeRect(110, 76, 580, 92);

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('"Estou confusa sobre nos..."', canvas.width / 2, 112);

        ctx.font = 'bold 20px Arial';
        ctx.fillText(`Imune por ${Math.ceil(estado.tempoMensagem)}s`, canvas.width / 2, 144);
        ctx.textAlign = 'left';
    }

    function desenhar() {
        desenharFundo();

        for (const esc of estado.escorpioes) {
            desenharEscorpiao(esc);
        }

        for (const obs of estado.obstaculosVoadores) {
            desenharMorcego(obs);
        }

        desenharJogadora();
        desenharMensagemEspecial();
        desenharTrofeuVitoria();
    }

    function loop() {
        atualizar();
        desenhar();
        window.requestAnimationFrame(loop);
    }

    function controlesMobileAtivos() {
        const mediaAtiva = typeof window.matchMedia === 'function'
            ? window.matchMedia('(max-width: 768px)').matches
            : false;
        const toqueAtivo = typeof window !== 'undefined' && (
            'ontouchstart' in window ||
            (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
        );
        return mediaAtiva || toqueAtivo;
    }

    function atualizarVisibilidadeControles() {
        if (controlesMobileAtivos()) {
            ui.mobileControls.classList.remove('hidden');
        } else {
            ui.mobileControls.classList.add('hidden');
        }
    }

    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' || event.code === 'ArrowUp') {
            event.preventDefault();
            pular();
        }

        if (event.code === 'ArrowDown') {
            event.preventDefault();
            abaixar(true);
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.code === 'ArrowDown') {
            event.preventDefault();
            abaixar(false);
        }
    });

    registrarToqueBotao(ui.jumpButton, pular, () => {});
    registrarToqueBotao(ui.duckButton, () => abaixar(true), () => abaixar(false));

    if (typeof window.matchMedia === 'function') {
        const media = window.matchMedia('(max-width: 768px)');
        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', atualizarVisibilidadeControles);
        } else if (typeof media.addListener === 'function') {
            media.addListener(atualizarVisibilidadeControles);
        }
    }

    atualizarVisibilidadeControles();
    atualizarUI();
    loop();

    window.__gameTestApi__ = {
        estado,
        jogadora,
        atualizar,
        pular,
        abaixar,
        iniciarJogo,
        estaImune,
        tempoRestanteImunidade,
        formatarTempo,
        atualizarMelhorPontuacao,
        resetarJogadora,
        atualizarVisibilidadeControles
    };
})();
