/* =====================================================
   app.js — Camada de dados compartilhada
   Sistema de Classificação de Informações
   ===================================================== */

const SC = (() => {

  /* ── Chave no localStorage ── */
  const KEY = 'sc_informacoes';

  /* ── CRUD ── */
  const DB = {
    getAll() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
      catch { return []; }
    },
    save(info) {
      const all = this.getAll();
      const idx = all.findIndex(i => i.id === info.id);
      if (idx >= 0) all[idx] = info;
      else all.push(info);
      localStorage.setItem(KEY, JSON.stringify(all));
      return info;
    },
    delete(id) {
      const all = this.getAll().filter(i => i.id !== id);
      localStorage.setItem(KEY, JSON.stringify(all));
    },
    getById(id) {
      return this.getAll().find(i => i.id === id) || null;
    }
  };

  /* ── Gerador de ID ── */
  function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── Formatar data ── */
  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  /* ── Tabelas de pontuação ── */
  const SCORES = {
    confidencialidade: { publico: 0, interno: 25, confidencial: 65, secreto: 100 },
    integridade:       { baixo: 0,  medio: 33,   alto: 66,          critico: 100 },
    disponibilidade:   { baixo: 0,  medio: 33,   alto: 66,          critico: 100 },
    financeiro:  { 'muito-baixo': 0, baixo: 20, medio: 50, alto: 75, critico: 100 },
    operacional: { nenhum: 0, baixo: 25, medio: 50, alto: 75, critico: 100 },
    reputacional:{ nenhum: 0, baixo: 25, medio: 50, alto: 75, critico: 100 },
    regulatorio: { nenhum: 0, baixo: 25, medio: 50, alto: 75, critico: 100 },
    recuperacao: { 'muito-baixo': 0, baixo: 20, medio: 50, alto: 75, irrecuperavel: 100 }
  };

  /* ── Calcular score de risco (0-100) ── */
  function calcularScore(info) {
    let ciaScore = null, impactScore = null;

    if (info.classificacao?.confidencialidade) {
      const c = SCORES.confidencialidade[info.classificacao.confidencialidade] ?? 0;
      const i = SCORES.integridade[info.classificacao.integridade] ?? 0;
      const d = SCORES.disponibilidade[info.classificacao.disponibilidade] ?? 0;
      ciaScore = c * 0.40 + i * 0.35 + d * 0.25;
    }

    if (info.avaliacao?.financeiro) {
      const f   = SCORES.financeiro[info.avaliacao.financeiro]     ?? 0;
      const o   = SCORES.operacional[info.avaliacao.operacional]   ?? 0;
      const r   = SCORES.reputacional[info.avaliacao.reputacional] ?? 0;
      const reg = SCORES.regulatorio[info.avaliacao.regulatorio]   ?? 0;
      const rec = SCORES.recuperacao[info.avaliacao.recuperacao]   ?? 0;
      impactScore = f * 0.25 + o * 0.25 + r * 0.20 + reg * 0.20 + rec * 0.10;
    }

    if (ciaScore !== null && impactScore !== null)
      return Math.round(ciaScore * 0.50 + impactScore * 0.50);
    if (ciaScore !== null)   return Math.round(ciaScore);
    if (impactScore !== null) return Math.round(impactScore);
    return null;
  }

  /* ── Nível de risco baseado no score ── */
  function nivelRisco(score) {
    if (score === null) return { label: 'Sem dados', color: '#6b6b6b', bg: '#1a1a1a' };
    if (score >= 80) return { label: 'Crítico',  color: '#ef4444', bg: '#200a0a' };
    if (score >= 60) return { label: 'Alto',     color: '#f97316', bg: '#1e0e00' };
    if (score >= 40) return { label: 'Médio',    color: '#eab308', bg: '#1e1800' };
    if (score >= 20) return { label: 'Baixo',    color: '#84cc16', bg: '#0d1f00' };
    return             { label: 'Mínimo',  color: '#22c55e', bg: '#0a1f0e' };
  }

  /* ── Cor da barra horizontal por score ── */
  function corBarra(score) {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#eab308';
    if (score >= 20) return '#84cc16';
    return '#22c55e';
  }

  /* ── Toast notification ── */
  function toast(msg, tipo = 'success') {
    const el = document.createElement('div');
    el.className = 'sc-toast sc-toast--' + tipo;
    el.innerHTML = `
      <span class="sc-toast__icon">${tipo === 'success' ? '✓' : tipo === 'error' ? '✕' : 'ℹ'}</span>
      <span>${msg}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('sc-toast--visible'));
    setTimeout(() => {
      el.classList.remove('sc-toast--visible');
      setTimeout(() => el.remove(), 350);
    }, 3200);
  }

  /* ── Preencher um <select> com informações do DB ── */
  function popularSelectInfos(selectEl, valorAtual = '') {
    const infos = DB.getAll();
    selectEl.innerHTML = '<option value="" disabled selected>Selecione uma informação...</option>';
    if (!infos.length) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.text = '— Nenhuma informação cadastrada —';
      selectEl.appendChild(opt);
      return;
    }
    infos.forEach(info => {
      const opt = document.createElement('option');
      opt.value = info.id;
      opt.text = info.nome;
      if (info.id === valorAtual) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  /* ── Rótulos amigáveis ── */
  const LABELS = {
    confidencialidade: { publico:'Público', interno:'Interno', confidencial:'Confidencial', secreto:'Secreto' },
    integridade:       { baixo:'Baixo', medio:'Médio', alto:'Alto', critico:'Crítico' },
    disponibilidade:   { baixo:'Baixo', medio:'Médio', alto:'Alto', critico:'Crítico' },
    financeiro:        { 'muito-baixo':'Muito Baixo', baixo:'Baixo', medio:'Médio', alto:'Alto', critico:'Crítico' },
    operacional:       { nenhum:'Nenhum', baixo:'Baixo', medio:'Médio', alto:'Alto', critico:'Crítico' },
    reputacional:      { nenhum:'Nenhum', baixo:'Baixo', medio:'Médio', alto:'Alto', critico:'Crítico' },
    regulatorio:       { nenhum:'Nenhum', baixo:'Baixo', medio:'Médio', alto:'Alto', critico:'Crítico' },
    recuperacao:       { 'muito-baixo':'Muito Baixo', baixo:'Baixo', medio:'Médio', alto:'Alto', irrecuperavel:'Irrecuperável' }
  };

  return { DB, gerarId, formatDate, calcularScore, nivelRisco, corBarra, toast, popularSelectInfos, LABELS, SCORES };
})();