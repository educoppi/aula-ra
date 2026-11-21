/* =====================================================================
   Cartão Profissional em RA — lógica da experiência
   ---------------------------------------------------------------------
   - Os painéis 3D são planos (a-plane) cuja textura é desenhada em um
     <canvas>. Assim o texto fica nítido e aceita acentos (ç, ã, é...).
   - O MindAR emite "targetFound" / "targetLost" na entidade do target;
     usamos esses eventos para animar a entrada dos blocos e mostrar /
     esconder a interface HTML.
   ===================================================================== */

// ---------- Conteúdo do cartão ----------
const PROFILE = {
  nome: 'Eduardo Bruno Coppi',
  area: 'Desenvolvedor Backend',
  links: {
    linkedin: 'https://www.linkedin.com/in/eduardocoppi2004/',
    github: 'https://github.com/educoppi',
    projeto: 'https://github.com/educoppi/finance-dashboard',
  },
};

const COLORS = {
  navy: '#0b1324', panel: 'rgba(11,19,36,0.92)', border: '#2a3f63',
  white: '#f4f7fb', grey: '#9fb0c8', orange: '#f89820', green: '#6db33f', cyan: '#38bdf8',
};

const SKILLS = {
  java:   { label: 'Java',        color: COLORS.orange, desc: 'Linguagem principal no backend' },
  spring: { label: 'Spring Boot', color: COLORS.green,  desc: 'APIs REST e soluções ERP' },
  jwt:    { label: 'JWT',         color: COLORS.cyan,   desc: 'Autenticação segura em APIs' },
};

// Abas do painel de informações (título da aba, título do painel, linhas e link opcional)
const TABS = [
  { id: 'sobre', label: 'Sobre', title: 'Sobre mim',
    body: ['Desenvolvedor de Software com experiência em soluções ERP, focando em desenvolvimento backend em Java e Spring Boot.'] },
  { id: 'skills', label: 'Skills', title: 'Habilidades', skills: true },
  { id: 'projeto', label: 'Projeto', title: 'Projeto em destaque',
    body: ['finance-dashboard', 'Projeto pessoal publicado no GitHub.', 'github.com/educoppi/finance-dashboard'],
    hint: 'Toque no painel para abrir o repositório', link: PROFILE.links.projeto },
  { id: 'formacao', label: 'Formação', title: 'Formação',
    body: ['Tecnólogo em Análise e Desenvolvimento de Sistemas', 'Em andamento', 'Experiência: soluções ERP com Java e Spring Boot'] },
  { id: 'contato', label: 'Contato', title: 'Contato',
    body: ['LinkedIn — in/eduardocoppi2004', 'GitHub — github.com/educoppi'],
    hint: 'Toque no painel para abrir o LinkedIn', link: PROFILE.links.linkedin },
];

const PX = 1000; // pixels de canvas por unidade da cena (1 unidade = largura do cartão)
const textures = {}; // cache das texturas geradas (dataURL)
let currentTab = 'sobre';
let highlightedSkill = null;

// ---------- Utilitários de desenho em canvas ----------
function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * PX); c.height = Math.round(h * PX);
  const g = c.getContext('2d');
  draw(g, c.width, c.height);
  return c.toDataURL('image/png');
}

function roundRect(g, x, y, w, h, r, fill, stroke, lw = 4) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}

// Quebra o texto em linhas que caibam em maxWidth; devolve o y final
function wrapText(g, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (g.measureText(test).width > maxWidth && line) { g.fillText(line, x, y); line = word; y += lineHeight; }
    else line = test;
  }
  g.fillText(line, x, y);
  return y + lineHeight;
}

// ---------- Texturas de cada elemento ----------
function headerTexture() {
  return makeCanvas(1.05, 0.30, (g, w, h) => {
    roundRect(g, 4, 4, w - 8, h - 8, 36, COLORS.panel, COLORS.orange, 6);
    g.fillStyle = COLORS.green; g.fillRect(40, 40, 12, h - 80);
    g.fillStyle = COLORS.white; g.font = '800 74px Montserrat';
    g.fillText(PROFILE.nome, 80, 130);
    g.fillStyle = COLORS.orange; g.font = '700 54px Montserrat';
    g.fillText(PROFILE.area, 80, 215);
  });
}

function skillTexture(key) {
  const s = SKILLS[key];
  const el = document.querySelector(`[data-skill="${key}"]`);
  const w = parseFloat(el.getAttribute('width')), h = parseFloat(el.getAttribute('height'));
  return makeCanvas(w, h, (g, cw, ch) => {
    roundRect(g, 3, 3, cw - 6, ch - 6, (ch - 6) / 2, s.color, COLORS.white, 5);
    g.fillStyle = COLORS.navy; g.font = '800 26px Montserrat';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(s.label, cw / 2, ch / 2 + 1);
  });
}

function tabTexture(tab, active) {
  return makeCanvas(0.195, 0.075, (g, w, h) => {
    roundRect(g, 3, 3, w - 6, h - 6, 22, active ? COLORS.orange : COLORS.panel, active ? COLORS.white : COLORS.border, 4);
    g.fillStyle = active ? COLORS.navy : COLORS.white;
    g.font = '700 30px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tab.label, w / 2, h / 2 + 2);
  });
}

function infoTexture(tab) {
  return makeCanvas(1.05, 0.50, (g, w, h) => {
    roundRect(g, 4, 4, w - 8, h - 8, 36, COLORS.panel, COLORS.cyan, 6);
    g.fillStyle = COLORS.orange; g.font = '800 58px Montserrat';
    g.fillText(tab.title, 60, 105);
    g.fillStyle = COLORS.green; g.fillRect(60, 130, 160, 8);

    let y = 210;
    if (tab.skills) {
      // Lista de habilidades com marcador colorido; a skill tocada fica destacada
      for (const [key, s] of Object.entries(SKILLS)) {
        const on = key === highlightedSkill;
        if (on) roundRect(g, 40, y - 52, w - 80, 74, 20, 'rgba(255,255,255,0.08)', s.color, 3);
        g.fillStyle = s.color; g.beginPath(); g.arc(80, y - 15, 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = COLORS.white; g.font = '800 42px Montserrat'; g.fillText(s.label, 115, y);
        const lw = g.measureText(s.label).width;
        g.fillStyle = COLORS.grey; g.font = '500 36px Montserrat'; g.fillText('— ' + s.desc, 135 + lw, y);
        y += 90;
      }
    } else {
      tab.body.forEach((line, i) => {
        g.fillStyle = i === 0 ? COLORS.white : COLORS.grey;
        g.font = i === 0 ? '700 44px Montserrat' : '500 38px Montserrat';
        y = wrapText(g, line, 60, y, w - 120, i === 0 ? 56 : 50) + 12;
      });
    }
    if (tab.hint) {
      g.fillStyle = COLORS.cyan; g.font = '700 32px Montserrat';
      g.fillText('👆 ' + tab.hint, 60, h - 45);
    }
  });
}

// Reinicia uma animação A-Frame (remover e recolocar o componente força o replay)
function playAnim(el, name, cfg) {
  el.removeAttribute('animation__' + name);
  el.setAttribute('animation__' + name, cfg);
}

// ---------- Troca de aba (3D + HTML ficam sincronizados) ----------
function selectTab(id) {
  currentTab = id;
  if (id !== 'skills') highlightedSkill = null;
  const tab = TABS.find(t => t.id === id);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const t = TABS.find(x => x.id === btn.dataset.tab);
    btn.setAttribute('material', 'src', tabTexture(t, t.id === id));
  });
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));

  const info = document.getElementById('info-panel');
  info.setAttribute('material', 'src', infoTexture(tab));
  // SCALE: pequeno "pulo" do painel para indicar a troca de conteúdo
  playAnim(info, 'pop', { property: 'scale', from: '0.9 0.9 0.9', to: '1 1 1', dur: 280, easing: 'easeOutBack' });
}

// ---------- Montagem da cena ----------
async function init() {
  // Garante que a fonte carregou antes de desenhar nos canvas
  try {
    await Promise.race([
      Promise.all(['500', '700', '800'].map(wt => document.fonts.load(`${wt} 40px Montserrat`))),
      new Promise(r => setTimeout(r, 3000)),
    ]);
  } catch (e) { /* segue com a fonte padrão */ }

  const flat = { shader: 'flat', transparent: true, alphaTest: 0.01 };

  document.getElementById('header-panel').setAttribute('material', { ...flat, src: headerTexture() });

  document.querySelectorAll('.skill').forEach(el => {
    el.setAttribute('material', { ...flat, src: skillTexture(el.dataset.skill) });
    // Tocar numa skill abre a aba "Skills" com ela destacada
    el.addEventListener('click', () => {
      highlightedSkill = el.dataset.skill;
      selectTab('skills');
      playAnim(el, 'tap', { property: 'scale', from: '1.4 1.4 1.4', to: '1 1 1', dur: 400, easing: 'easeOutElastic' });
    });
  });

  // Cria os 5 botões de aba 3D lado a lado (POSITION calculada em x)
  const row = document.getElementById('tab-buttons');
  TABS.forEach((tab, i) => {
    const btn = document.createElement('a-plane');
    btn.classList.add('tab-btn', 'clickable');
    btn.dataset.tab = tab.id;
    btn.setAttribute('width', 0.195);
    btn.setAttribute('height', 0.075);
    btn.setAttribute('position', `${(i - 2) * 0.212} 0 0`);
    btn.setAttribute('scale', '0 0 0');
    btn.setAttribute('material', { ...flat, src: tabTexture(tab, tab.id === currentTab) });
    btn.addEventListener('click', () => selectTab(tab.id));
    row.appendChild(btn);
  });

  // Tocar no painel de informações abre o link da aba (Projeto / Contato)
  const info = document.getElementById('info-panel');
  info.setAttribute('material', { ...flat, src: infoTexture(TABS[0]) });
  info.addEventListener('click', () => {
    const tab = TABS.find(t => t.id === currentTab);
    if (tab.link) window.open(tab.link, '_blank', 'noopener');
  });

  // Botões HTML das abas (alvo de toque maior no celular)
  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));

  // ---------- Eventos do MindAR ----------
  const target = document.getElementById('card-target');
  const animated = () => [
    document.getElementById('header-panel'),
    document.getElementById('logo'),
    ...document.querySelectorAll('.skill'),
    ...document.querySelectorAll('.tab-btn'),
    info,
  ];

  target.addEventListener('targetFound', () => {
    document.getElementById('scan-hint').classList.add('hidden');
    document.getElementById('tabs').classList.remove('hidden');
    document.getElementById('links').classList.remove('hidden');
    // SCALE: cada bloco "cresce" a partir do cartão, em sequência
    animated().forEach((el, i) => playAnim(el, 'in', {
      property: 'scale', from: '0 0 0', to: '1 1 1', dur: 600, delay: i * 90, easing: 'easeOutBack',
    }));
  });

  target.addEventListener('targetLost', () => {
    document.getElementById('scan-hint').classList.remove('hidden');
    // Zera a escala para a animação de entrada repetir no próximo reconhecimento
    animated().forEach(el => { el.removeAttribute('animation__in'); el.setAttribute('scale', '0 0 0'); });
  });
}

// Espera a cena do A-Frame terminar de carregar antes de montar os elementos
document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  if (scene.hasLoaded) init(); else scene.addEventListener('loaded', init);

  // Se a câmera for negada ou não existir, o MindAR emite "arError": avisamos o usuário
  scene.addEventListener('arError', () => {
    document.querySelector('#scan-hint p').textContent =
      'Não foi possível acessar a câmera. Permita o acesso e recarregue a página (é preciso HTTPS).';
  });
});
