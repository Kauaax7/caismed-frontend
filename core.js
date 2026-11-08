"use strict";
/* =====================================================================
   CaisMed — núcleo do front-end
   Dados ficam no localStorage só para demonstração.
   TODO(back-end): trocar cada DB.* por chamadas à API (rotas sugeridas no README).
   ===================================================================== */

// ---------- Utilitários ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const uid = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const isoLocal = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hojeISO = () => isoLocal();
const partes = (iso) => iso.split("-").map(Number);
const addDias = (iso, n) => { const [y, m, d] = partes(iso); return isoLocal(new Date(y, m - 1, d + n)); };
const diaSemana = (iso) => { const [y, m, d] = partes(iso); return new Date(y, m - 1, d).getDay(); };
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtData = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const fmtDataLonga = (iso) => { if (!iso) return "—"; const [, m, d] = partes(iso); return `${DIAS[diaSemana(iso)]}, ${d} de ${MESES[m - 1]}`; };
const fmtHora = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const rotuloDia = (iso) => (iso === hojeISO() ? "Hoje" : iso === addDias(hojeISO(), 1) ? "Amanhã" : `${DIAS[diaSemana(iso)].slice(0, 3)}, ${fmtData(iso).slice(0, 5)}`);
const hm = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const hmStr = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const agoraMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const horasAte = (iso, h) => (new Date(`${iso}T${h || "00:00"}`) - new Date()) / 36e5;
const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const fmtCPF = (c) => { const d = soDigitos(c); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : c || "—"; };
const iniciais = (n) => String(n || "?").replace(/^(Dr\.|Dra\.)\s*/, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const idade = (iso) => { if (!iso) return ""; const [y, m, d] = partes(iso); const h = new Date(); let a = h.getFullYear() - y; if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) a--; return a; };

// ---------- Ícones e logo ----------
const LOGO_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M38 14 h24 a6 6 0 0 1 6 6 v14 h14 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 H68 v14 a6 6 0 0 1 -6 6 H38 a6 6 0 0 1 -6 -6 V56 H18 a6 6 0 0 1 -6 -6 V40 a6 6 0 0 1 6 -6 h14 V20 a6 6 0 0 1 6 -6 Z" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round" fill="none"/><path class="heart" d="M58 30 c3.5-4 10-4 12.5 0.5 c2.5 4.5 -1 9 -12.5 17 c-11.5-8-15-12.5-12.5-17 c2.5-4.5 9-4.5 12.5-0.5Z"/></svg>`;
const ICONS = {
  home: "M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z",
  calendar: "M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 10h18M8 2v4M16 2v4",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  card: "M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 10h18M7 15h4",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1.5-4 5-6 8-6s6.5 2 8 6",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c1-4 4-6 7-6s6 2 7 6M17 3.5a4 4 0 010 7.5M19 15c2 .8 3 3 3.5 6",
  file: "M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zM14 2v6h6M8 13h8M8 17h5",
  wallet: "M3 7a2 2 0 012-2h13v4M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2zM16 14h2",
  shield: "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5zM9 12l2 2 4-4",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 018 0v4",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 17h.01",
  bell: "M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4",
  chat: "M4 5h16v11H9l-5 4zM8 10h8",
  video: "M3 7h12v10H3zM15 11l6-4v10l-6-4",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  pin: "M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l5 5 9-10",
  x: "M6 6l12 12M18 6L6 18",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  settings: "M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  building: "M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 10h4a1 1 0 011 1v10M2 21h20M8 8h3M8 12h3M8 16h3",
  chart: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  receipt: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6",
  download: "M12 3v12M7 10l5 5 5-5M4 21h16",
  print: "M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z",
  mic: "M9 3h6v12H9zM5 11a7 7 0 0014 0M12 18v3",
  send: "M5 12h14M13 6l6 6-6 6",
  right: "M9 6l6 6-6 6",
  back: "M15 18l-6-6 6-6",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14",
  alert: "M12 3l10 18H2zM12 10v5M12 18h.01",
  wrench: "M14.7 6.3a4 4 0 005 5L21 13l-8 8-4-4 8-8zM3 21l4-4",
  doc: "M7 3h10a2 2 0 012 2v16l-4-3-3 3-3-3-4 3V5a2 2 0 012-2zM9 8h6M9 12h6",
  a11y: "M12 6.3a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3.5 6M12 14.5l3.5 6",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  heart: "M12 21s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6-8 11-8 11z",
};
const ico = (n, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}><path d="${ICONS[n] || ""}"/></svg>`;

// ---------- Banco de dados (localStorage) ----------
const DB = {
  get(n, def = []) { try { const v = localStorage.getItem(n); return v ? JSON.parse(v) : structuredClone(def); } catch (e) { return structuredClone(def); } },
  set(n, v) { localStorage.setItem(n, JSON.stringify(v)); return v; },
  add(n, o) { const l = this.get(n); if (o.id == null) o.id = uid(); l.push(o); this.set(n, l); return o; },
  upd(n, id, p) { const l = this.get(n); const i = l.findIndex((x) => String(x.id) === String(id)); if (i < 0) return null; Object.assign(l[i], typeof p === "function" ? p(l[i]) : p); this.set(n, l); return l[i]; },
  del(n, id) { this.set(n, this.get(n).filter((x) => String(x.id) !== String(id))); },
  find(n, id) { return this.get(n).find((x) => String(x.id) === String(id)); },
};

// ---------- Dados padrão (demonstração) ----------
const ESP_PADRAO = [
  { id: "clinico_geral", nome: "Clínico Geral", valor: 180, duracao: 30 },
  { id: "pediatria", nome: "Pediatria", valor: 200, duracao: 30 },
  { id: "cardiologia", nome: "Cardiologia", valor: 260, duracao: 30 },
  { id: "dermatologia", nome: "Dermatologia", valor: 240, duracao: 30 },
  { id: "ortopedia", nome: "Ortopedia", valor: 250, duracao: 30 },
  { id: "ginecologia", nome: "Ginecologia", valor: 230, duracao: 30 },
];
const EXAMES_PADRAO = [
  { id: "hemograma", nome: "Hemograma Completo", valor: 45, preparo: "Jejum de 8 horas." },
  { id: "glicemia", nome: "Glicemia em Jejum", valor: 25, preparo: "Jejum de 8 horas." },
  { id: "lipidico", nome: "Perfil Lipídico", valor: 60, preparo: "Jejum de 12 horas." },
  { id: "ecg", nome: "Eletrocardiograma", valor: 90, preparo: "Sem preparo. Evite cremes no peito." },
  { id: "ultrassom", nome: "Ultrassom de Abdômen", valor: 160, preparo: "Jejum de 6 horas e bexiga cheia." },
  { id: "raiox", nome: "Raio-X de Tórax", valor: 110, preparo: "Sem preparo. Retire objetos de metal." },
];
const PLANOS_PADRAO = {
  essencial: { nome: "Plano Essencial", valor: 89.9, desc: "Consultas básicas e telemedicina", copart: 40 },
  conforto: { nome: "Plano Conforto", valor: 149.9, desc: "Essencial + exames simples e especialistas", copart: 30 },
  premium: { nome: "Plano Premium", valor: 249.9, desc: "Conforto + exames de imagem e check-up anual", copart: 20 },
  familia: { nome: "Plano Família", valor: 399.9, desc: "Cobertura Premium para até 4 pessoas", copart: 20 },
};
const UNIDADES_PADRAO = [
  { id: "u1", nome: "CaisMed Olinda", bairro: "Casa Caiada", cidade: "Olinda", endereco: "Av. Presidente Kennedy, 1200", fone: "(81) 3000-1001", horario: "Seg a Sex, 7h às 19h. Sáb, 8h às 12h", salas: 6, lat: -7.9855, lng: -34.8456, especialidades: ["clinico_geral", "pediatria", "dermatologia"], ativa: true },
  { id: "u2", nome: "CaisMed Recife", bairro: "Boa Viagem", cidade: "Recife", endereco: "Av. Domingos Ferreira, 850", fone: "(81) 3000-1002", horario: "Seg a Sex, 7h às 20h. Sáb, 8h às 13h", salas: 8, lat: -8.1189, lng: -34.9003, especialidades: ["clinico_geral", "cardiologia", "ortopedia"], ativa: true },
  { id: "u3", nome: "CaisMed Paulista", bairro: "Centro", cidade: "Paulista", endereco: "Av. Duque de Caxias, 430", fone: "(81) 3000-1003", horario: "Seg a Sex, 7h às 18h", salas: 4, lat: -7.9408, lng: -34.8731, especialidades: ["clinico_geral", "pediatria", "ginecologia"], ativa: true },
];
const blk = (unidadeId, dias, inicio, fim, duracao = 30) => ({ unidadeId, dias, inicio, fim, duracao });
const USUARIOS_PADRAO = [
  { id: "a1", perfil: "atendente", nome: "Marina Souza", matricula: "1001", senha: "caismed123", unidades: ["u1", "u2"], ativo: true },
  { id: "ad1", perfil: "admin", nome: "Administração CaisMed", matricula: "9001", senha: "caismed123", unidades: ["u1", "u2", "u3"], ativo: true },
  { id: "m1", perfil: "medico", nome: "Dra. Helena Cavalcanti", matricula: "2001", senha: "caismed123", crm: "CRM-PE 12345", especialidades: ["clinico_geral"], unidades: ["u1", "u2"], tele: true, nota: 4.9, bio: "Clínica geral com foco em prevenção e acompanhamento de doenças crônicas.", ativo: true, disp: [blk("u1", [1, 3, 5], "08:00", "12:00"), blk("u2", [2, 4], "13:00", "17:00")] },
  { id: "m2", perfil: "medico", nome: "Dr. Rafael Albuquerque", matricula: "2002", senha: "caismed123", crm: "CRM-PE 23456", especialidades: ["pediatria"], unidades: ["u1", "u3"], tele: true, nota: 4.8, bio: "Pediatra, atende de recém-nascidos a adolescentes.", ativo: true, disp: [blk("u1", [1, 2, 3, 4], "08:00", "12:00"), blk("u3", [5], "08:00", "12:00")] },
  { id: "m3", perfil: "medico", nome: "Dra. Camila Torres", matricula: "2003", senha: "caismed123", crm: "CRM-PE 34567", especialidades: ["dermatologia"], unidades: ["u1"], tele: false, nota: 4.7, bio: "Dermatologista clínica e estética.", ativo: true, disp: [blk("u1", [2, 4], "13:00", "17:00")] },
  { id: "m4", perfil: "medico", nome: "Dr. Bruno Teixeira", matricula: "2004", senha: "caismed123", crm: "CRM-PE 45678", especialidades: ["cardiologia"], unidades: ["u2"], tele: true, nota: 4.9, bio: "Cardiologista, check-up e risco cardiovascular.", ativo: true, disp: [blk("u2", [1, 2, 3], "08:00", "12:00")] },
  { id: "m5", perfil: "medico", nome: "Dr. André Lacerda", matricula: "2005", senha: "caismed123", crm: "CRM-PE 56789", especialidades: ["ortopedia"], unidades: ["u2"], tele: false, nota: 4.6, bio: "Ortopedista, lesões esportivas e coluna.", ativo: true, disp: [blk("u2", [4, 5], "08:00", "12:00")] },
  { id: "m6", perfil: "medico", nome: "Dra. Luíza Barros", matricula: "2006", senha: "caismed123", crm: "CRM-PE 67890", especialidades: ["ginecologia"], unidades: ["u3"], tele: true, nota: 4.8, bio: "Ginecologista e obstetra.", ativo: true, disp: [blk("u3", [1, 3], "13:00", "17:00")] },
  { id: "m7", perfil: "medico", nome: "Dr. Tiago Menezes", matricula: "2007", senha: "caismed123", crm: "CRM-PE 78901", especialidades: ["clinico_geral"], unidades: ["u3"], tele: true, nota: 4.5, bio: "Clínico geral, atendimento de rotina e urgências leves.", ativo: true, disp: [blk("u3", [1, 2, 3, 4, 5], "08:00", "12:00")] },
];
const CONFIG_PADRAO = { cancelarAteHoras: 24, lembreteHoras: 24, doisPassos: false, msgConfirmacao: "Sua consulta está confirmada. Chegue 10 minutos antes." };

let PLANOS = PLANOS_PADRAO;
const espLista = () => DB.get("especialidades", ESP_PADRAO);
const espNome = (k) => (espLista().find((e) => e.id === k) || {}).nome || k || "—";
const ESPECIALIDADES = new Proxy({}, { get: (_, k) => espNome(k) }); // compatível com o código antigo: ESPECIALIDADES[chave]
const proximoDiaSemana = (dias, de) => { for (let i = 0; i < 21; i++) { const d = addDias(de, i); if (dias.includes(diaSemana(d))) return d; } return de; };

function seed() {
  const L = localStorage;
  if (L.getItem("caismed_seed") !== "3") {
    if (!L.getItem("unidades")) DB.set("unidades", UNIDADES_PADRAO);
    if (!L.getItem("usuarios")) DB.set("usuarios", USUARIOS_PADRAO);
    if (!L.getItem("especialidades")) DB.set("especialidades", ESP_PADRAO);
    if (!L.getItem("exames")) DB.set("exames", EXAMES_PADRAO);
    if (!L.getItem("planos")) DB.set("planos", PLANOS_PADRAO);
    if (!L.getItem("config")) DB.set("config", CONFIG_PADRAO);
    const cls = DB.get("clientes");
    if (!cls.some((c) => c.cpf === "52998224725")) {
      const cid = "c-demo";
      DB.add("clientes", { id: cid, nome: "Maria Oliveira", cpf: "52998224725", nascimento: "1988-04-12", telefone: "(81) 99999-0000", email: "maria@exemplo.com", cidade: "Olinda", plano: "conforto", pagamento: "Pix", senha: "123456", criadoEm: new Date().toISOString(), demo: true,
        dependentes: [{ id: "d1", nome: "Pedro Oliveira", nascimento: "2016-09-03", parentesco: "Filho", acesso: true }, { id: "d2", nome: "José Oliveira", nascimento: "1960-02-20", parentesco: "Pai", acesso: false }],
        consentimentos: { termos: true, lgpd: true, notificacoes: true, marketing: false, aceitoEm: new Date().toISOString() } });
      const hoje = hojeISO();
      const m1 = USUARIOS_PADRAO.find((u) => u.id === "m1");
      const prox = proximoDiaSemana([1, 3, 5], addDias(hoje, 1));
      DB.add("consultas", { id: uid(), pacienteId: cid, paciente: "Maria Oliveira", tipo: "consulta", especialidade: "clinico_geral", unidadeId: "u1", medicoId: m1.id, data: prox, horario: "09:00", status: "agendada", valor: 54, pago: false, origem: "app", criadoEm: new Date().toISOString(), historico: [{ quando: new Date().toISOString(), texto: "Agendada pelo aplicativo" }] });
      const passada = addDias(hoje, -9);
      const fid = uid();
      DB.add("consultas", { id: fid, pacienteId: cid, paciente: "Maria Oliveira", tipo: "consulta", especialidade: "clinico_geral", unidadeId: "u1", medicoId: m1.id, data: passada, horario: "10:00", status: "finalizada", valor: 54, pago: true, origem: "app", criadoEm: new Date().toISOString(), atendida: true,
        anamnese: "Dor de cabeça frequente há duas semanas, piora no fim do dia. Sem febre.", evolucao: "Quadro compatível com cefaleia tensional. Orientada sobre hidratação, sono e pausas durante o trabalho.", cid: "G44.2 - Cefaleia tensional", historico: [{ quando: new Date().toISOString(), texto: "Atendimento finalizado" }] });
      DB.add("documentos", { id: uid(), clienteId: cid, consultaId: fid, tipo: "receita", titulo: "Receita Médica", medicoId: m1.id, data: passada, itens: [{ nome: "Dipirona 500 mg", posologia: "1 comprimido a cada 6 horas se houver dor, por até 3 dias" }], visto: true });
      DB.add("documentos", { id: uid(), clienteId: cid, consultaId: fid, tipo: "exame_pedido", titulo: "Pedido de Exame: Hemograma Completo", medicoId: m1.id, data: passada, itens: [{ nome: "Hemograma Completo", posologia: "Justificativa: investigação de cefaleia" }], visto: true });
      DB.add("documentos", { id: uid(), clienteId: cid, tipo: "resultado", titulo: "Resultado: Hemograma Completo", medicoId: m1.id, data: addDias(hoje, -5), laudo: "Hemácias, leucócitos e plaquetas dentro dos valores de referência. Sem alterações.", itens: [], visto: false });
      DB.add("autorizacoes", { id: uid(), clienteId: cid, titulo: "Ultrassom de Abdômen", guiaNome: "guia-ultrassom.pdf", status: "em_analise", obs: "", criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() });
      notificar("cliente:" + cid, "Bem-vindo ao CaisMed", "Sua conta está pronta. Agende consultas, veja seus documentos e use a carteirinha digital.", "home.html");
    }
    migrar();
    L.setItem("caismed_seed", "3");
  }
  PLANOS = DB.get("planos", PLANOS_PADRAO);
}

// Atualiza dados criados pela versão anterior do app
function migrar() {
  const cls = DB.get("clientes");
  cls.forEach((c) => { c.dependentes ??= []; c.consentimentos ??= { termos: true, lgpd: true, notificacoes: true, marketing: false, aceitoEm: c.criadoEm }; });
  DB.set("clientes", cls);
  const cons = DB.get("consultas");
  const meds = DB.get("usuarios").filter((u) => u.perfil === "medico");
  cons.forEach((c) => {
    c.tipo ??= "consulta";
    if (!c.status) c.status = c.atendida ? "finalizada" : c.data ? "agendada" : "sugerida";
    if (!c.pacienteId) { const cl = cls.find((x) => x.nome === c.paciente); if (cl) c.pacienteId = cl.id; }
    if (!c.medicoId && c.data) { const m = meds.find((x) => (x.especialidades || []).includes(c.especialidade)); if (m) { c.medicoId = m.id; c.unidadeId ??= (m.unidades || [])[0]; } }
    c.historico ??= [];
  });
  DB.set("consultas", cons);
}

// ---------- Sessão e permissões ----------
const Sessao = {
  get perfil() { return sessionStorage.getItem("sessao"); },
  get id() { return sessionStorage.getItem("sessaoId"); },
  entrar(perfil, id) { sessionStorage.setItem("sessao", perfil); sessionStorage.setItem("sessaoId", id); },
  sair() { ["sessao", "sessaoId", "unidadeAtiva"].forEach((k) => sessionStorage.removeItem(k)); },
};
const HOME = { cliente: "home.html", atendente: "atendente-painel.html", medico: "medico-painel.html", admin: "admin-painel.html" };
const PERFIL_NOME = { cliente: "Paciente", atendente: "Atendente", medico: "Médico", admin: "Administrador" };
const eu = () => (Sessao.perfil === "cliente" ? DB.find("clientes", Sessao.id) : DB.find("usuarios", Sessao.id));
const unidadesDoUsuario = () => { const u = eu(); return DB.get("unidades").filter((x) => (u?.unidades || []).includes(x.id) && x.ativa !== false); };
const unidadeAtiva = () => { const sel = sessionStorage.getItem("unidadeAtiva"); if (sel === "") return ""; const ls = unidadesDoUsuario(); return ls.find((u) => u.id === sel)?.id || (Sessao.perfil === "medico" ? "" : ls[0]?.id || ""); };
const sair = () => { audit("Saiu do sistema"); Sessao.sair(); location.href = "login.html"; };

// ---------- Notificações e auditoria ----------
function notificar(para, titulo, texto, link) { DB.add("notificacoes", { para, titulo, texto, link: link || "", quando: new Date().toISOString(), lida: false }); }
function minhasNotifs() {
  const p = Sessao.perfil, id = Sessao.id;
  const chaves = p === "cliente" ? ["cliente:" + id] : p === "atendente" ? ["atendente", "atendente:" + id] : p === "medico" ? ["medico:" + id] : ["admin"];
  return DB.get("notificacoes").filter((n) => chaves.includes(n.para)).sort((a, b) => b.quando.localeCompare(a.quando));
}
function audit(acao, alvo = "") {
  const u = Sessao.perfil ? eu() : null;
  DB.add("auditoria", { quando: new Date().toISOString(), perfil: Sessao.perfil || "visitante", quem: u?.nome || "Visitante", acao, alvo });
}

// ---------- Regras de agenda ----------
const medicosAtivos = () => DB.get("usuarios").filter((u) => u.perfil === "medico" && u.ativo !== false);
const medicoPorId = (id) => DB.find("usuarios", id);
const unidadePorId = (id) => DB.find("unidades", id);
const nomeUnidade = (id) => (id === "online" ? "Teleconsulta (Online)" : unidadePorId(id)?.nome || "—");
const STATUS = { sugerida: ["Aguardando Horário", "warn"], agendada: ["Agendada", "info"], aguardando: ["Na Recepção", "warn"], em_atendimento: ["Em Atendimento", "info"], finalizada: ["Finalizada", "ok"], cancelada: ["Cancelada", "err"], faltou: ["Faltou", "err"] };
const badgeStatus = (s) => `<span class="badge ${(STATUS[s] || ["", "mute"])[1]}">${(STATUS[s] || [s])[0]}</span>`;
const TIPOS = { consulta: "Consulta", exame: "Exame", teleconsulta: "Teleconsulta" };

function slotsDoMedico(m, iso, unidadeId) {
  if ((m.folgas || []).some((f) => iso >= f.inicio && iso <= f.fim)) return [];
  const dow = diaSemana(iso);
  const base = new Map();
  (m.disp || []).filter((b) => b.dias.includes(dow) && (!unidadeId || unidadeId === "online" || b.unidadeId === unidadeId)).forEach((b) => {
    for (let t = hm(b.inicio); t + b.duracao <= hm(b.fim); t += b.duracao) base.set(hmStr(t), b.unidadeId);
  });
  const todas = DB.get("consultas").filter((c) => c.medicoId === m.id && c.data === iso && c.status !== "cancelada");
  const ocupados = new Set(todas.map((c) => c.horario));
  const bloq = new Set(DB.get("bloqueios").filter((b) => b.medicoId === m.id && b.data === iso).map((b) => b.horario));
  const passado = iso < hojeISO() ? 1e6 : iso === hojeISO() ? agoraMin() : -1;
  return [...base.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([h, u]) => ({ h, unidadeId: u, ocupado: ocupados.has(h), bloqueado: bloq.has(h), livre: !ocupados.has(h) && !bloq.has(h) && hm(h) > passado }));
}
function proximoLivre(m, unidadeId) {
  for (let i = 0; i < 45; i++) { const d = addDias(hojeISO(), i); const s = slotsDoMedico(m, d, unidadeId).find((x) => x.livre); if (s) return { data: d, h: s.h, unidadeId: s.unidadeId }; }
  return null;
}
function slotsExame(unidadeId, iso) {
  if (diaSemana(iso) === 0) return [];
  const usados = DB.get("consultas").filter((c) => c.tipo === "exame" && c.unidadeId === unidadeId && c.data === iso && c.status !== "cancelada");
  const passado = iso < hojeISO() ? 1e6 : iso === hojeISO() ? agoraMin() : -1;
  const out = [];
  for (let t = hm("07:00"); t <= hm("11:40"); t += 20) { const h = hmStr(t); out.push({ h, unidadeId, livre: usados.filter((c) => c.horario === h).length < 2 && t > passado }); }
  return out;
}
function valorCliente(cliente, tipo, chave) {
  const base = tipo === "exame" ? (DB.find("exames", chave) || {}).valor || 0 : (DB.find("especialidades", chave) || {}).valor || 0;
  const pl = cliente && PLANOS[cliente.plano];
  const pct = pl ? pl.copart ?? 100 : 100;
  return { base, pct, valor: Math.round(base * pct) / 100, plano: !!pl };
}
const cfg = () => DB.get("config", CONFIG_PADRAO);
const mapaURL = (u) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${u.endereco}, ${u.bairro}, ${u.cidade} PE`)}`;
const nomeServico = (c) => (c.tipo === "exame" ? (DB.find("exames", c.exame) || {}).nome || "Exame" : espNome(c.especialidade));

// Cria ou completa um agendamento, sem permitir horário repetido
function agendar(d) {
  const ehExame = d.tipo === "exame";
  const m = ehExame ? null : medicoPorId(d.medicoId);
  const livres = ehExame ? slotsExame(d.unidadeId, d.data) : m ? slotsDoMedico(m, d.data, d.tipo === "teleconsulta" ? "online" : d.unidadeId) : [];
  const alvo = livres.find((s) => s.h === d.horario);
  const mesmo = d.idExistente && DB.find("consultas", d.idExistente);
  if (!alvo || (!alvo.livre && !(mesmo && mesmo.data === d.data && mesmo.horario === d.horario))) return { ok: false, erro: "Esse horário acabou de ser ocupado. Escolha outro." };
  const cliente = DB.find("clientes", d.clienteId);
  const dep = d.dependenteId ? (cliente?.dependentes || []).find((x) => x.id === d.dependenteId) : null;
  const val = valorCliente(cliente, d.tipo, ehExame ? d.exame : d.especialidade);
  const base = { pacienteId: d.clienteId, dependenteId: d.dependenteId || null, paciente: dep ? `${dep.nome} (dependente)` : cliente?.nome || "Paciente", tipo: d.tipo, especialidade: ehExame ? "" : d.especialidade, exame: d.exame || "", unidadeId: d.tipo === "teleconsulta" ? "online" : d.unidadeId, medicoId: ehExame ? null : d.medicoId, data: d.data, horario: d.horario, valor: val.valor, pedidoNome: d.pedidoNome || "" };
  let c;
  if (d.idExistente) {
    c = DB.upd("consultas", d.idExistente, (x) => ({ ...base, status: "agendada", historico: [...(x.historico || []), { quando: new Date().toISOString(), texto: `${x.data ? "Remarcada" : "Horário marcado"} para ${fmtData(d.data)} às ${d.horario} por ${d.por || "paciente"}` }] }));
  } else {
    c = DB.add("consultas", { ...base, status: "agendada", pago: false, origem: d.origem || "app", criadoEm: new Date().toISOString(), historico: [{ quando: new Date().toISOString(), texto: `Agendada por ${d.por || "paciente"}` }] });
  }
  const quando = `${fmtData(d.data)} às ${d.horario}`;
  notificar("cliente:" + d.clienteId, "Consulta Confirmada", `${nomeServico(c)} em ${quando}, ${nomeUnidade(c.unidadeId)}${m ? " com " + m.nome : ""}.`, "consulta.html?id=" + c.id);
  notificar("atendente", "Novo Agendamento", `${base.paciente}: ${nomeServico(c)} em ${quando}.`, "agenda.html");
  if (m) notificar("medico:" + m.id, "Novo Paciente na Agenda", `${base.paciente} em ${quando}.`, "medico-painel.html");
  audit(d.idExistente ? "Remarcou consulta" : "Criou agendamento", `${base.paciente} - ${quando}`);
  return { ok: true, consulta: c };
}
function cancelarConsulta(id, motivo, por) {
  const c = DB.find("consultas", id);
  if (!c) return { ok: false, erro: "Consulta não encontrada." };
  if (por === "cliente" && c.data && horasAte(c.data, c.horario) < cfg().cancelarAteHoras) return { ok: false, erro: `O cancelamento online só é possível com ${cfg().cancelarAteHoras} horas de antecedência. Ligue para a clínica.` };
  DB.upd("consultas", id, (x) => ({ status: "cancelada", motivoCancelamento: motivo, historico: [...(x.historico || []), { quando: new Date().toISOString(), texto: `Cancelada por ${por}. Motivo: ${motivo}` }] }));
  notificar("cliente:" + c.pacienteId, "Consulta Cancelada", `${nomeServico(c)} de ${fmtData(c.data)} às ${c.horario} foi cancelada.`, "consultas.html");
  if (c.medicoId) notificar("medico:" + c.medicoId, "Consulta Cancelada", `${c.paciente} cancelou ${fmtData(c.data)} às ${c.horario}.`, "medico-painel.html");
  avisarEspera(c);
  audit("Cancelou consulta", `${c.paciente} - ${fmtData(c.data)} ${c.horario}`);
  return { ok: true };
}
function avisarEspera(c) {
  const fila = DB.get("espera").filter((e) => e.especialidade === c.especialidade && !e.avisado);
  fila.forEach((e) => { notificar("cliente:" + e.clienteId, "Abriu um Horário", `Abriu vaga de ${espNome(c.especialidade)} em ${fmtData(c.data)} às ${c.horario}. Corra para agendar.`, "agendamento.html?especialidade=" + c.especialidade); DB.upd("espera", e.id, { avisado: true }); });
}

// ---------- Máscaras e validação ----------
function cpfValido(c) {
  c = soDigitos(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +c[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +c[9] && dv(10) === +c[10];
}
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e || "");
function ligarMascaras(raiz = document) {
  $$('input[name="cpf"],input[data-mask="cpf"]', raiz).forEach((el) => {
    el.maxLength = 14; el.inputMode = "numeric"; el.autocomplete = "off";
    const f = () => { const d = soDigitos(el.value).slice(0, 11); el.value = d.length > 9 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d.length > 6 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}.${d.slice(3)}` : d; };
    el.addEventListener("input", f); f();
  });
  $$('input[type="tel"]', raiz).forEach((el) => {
    el.placeholder ||= "(81) 99999-9999"; el.inputMode = "tel";
    const f = () => { const d = soDigitos(el.value).slice(0, 11); el.value = d.length > 7 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d; };
    el.addEventListener("input", f); f();
  });
  // validação em tempo real (ao sair do campo)
  $$("input[data-valida]", raiz).forEach((el) => {
    const msg = document.createElement("span"); msg.className = "err-msg"; msg.setAttribute("role", "alert"); msg.hidden = true; el.insertAdjacentElement("afterend", msg);
    const v = () => {
      const t = el.dataset.valida, val = el.value.trim(); let erro = "";
      if (val) { if (t === "cpf" && !cpfValido(val)) erro = "CPF inválido. Confira os 11 números."; if (t === "email" && !emailValido(val)) erro = "E-mail inválido. Exemplo: nome@email.com"; if (t === "tel" && soDigitos(val).length < 10) erro = "Telefone incompleto. Inclua o DDD."; }
      el.setAttribute("aria-invalid", erro ? "true" : "false"); msg.textContent = erro; msg.hidden = !erro; return !erro;
    };
    el.addEventListener("blur", v); el.addEventListener("input", () => el.getAttribute("aria-invalid") === "true" && v());
    el._valida = v;
  });
}
const formularioValido = (form) => { let ok = true; $$("input[data-valida]", form).forEach((el) => { if (el._valida && !el._valida()) { ok = false; } }); const ruim = $('input[aria-invalid="true"]', form); if (ruim) ruim.focus(); return ok; };

// ---------- Interface: avisos, janelas, arquivos ----------
function toast(msg, tipo = "") {
  let a = $(".toast-area"); if (!a) { a = document.createElement("div"); a.className = "toast-area"; a.setAttribute("role", "status"); a.setAttribute("aria-live", "polite"); document.body.appendChild(a); }
  const t = document.createElement("div"); t.className = "toast " + tipo; t.textContent = msg; a.appendChild(t); setTimeout(() => t.remove(), 4200);
}
function abrirModal({ titulo, corpo = "", botoes = [], lateral = false, aoAbrir }) {
  const ov = document.createElement("div"); ov.className = "overlay open" + (lateral ? " side" : "");
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="modal-top"><h2>${esc(titulo)}</h2><button type="button" class="x-btn" aria-label="Fechar">${ico("x")}</button></div><div class="modal-body"></div><div class="actions"></div></div>`;
  const body = $(".modal-body", ov); typeof corpo === "string" ? (body.innerHTML = corpo) : body.appendChild(corpo);
  const acoes = $(".actions", ov); if (!botoes.length) acoes.remove();
  const anterior = document.activeElement;
  const fechar = () => { ov.remove(); document.removeEventListener("keydown", tecla); anterior && anterior.focus && anterior.focus(); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  document.addEventListener("keydown", tecla);
  botoes.forEach((b) => { const el = document.createElement("button"); el.type = "button"; el.className = "btn " + (b.classe || ""); el.textContent = b.rotulo; el.addEventListener("click", async () => { const r = b.aoClicar ? await b.aoClicar(el, ov) : undefined; if (r !== false) fechar(); }); acoes.appendChild(el); });
  $(".x-btn", ov).addEventListener("click", fechar);
  ov.addEventListener("click", (e) => { if (e.target === ov) fechar(); });
  document.body.appendChild(ov);
  (body.querySelector("input,select,textarea,button") || $(".x-btn", ov)).focus();
  aoAbrir && aoAbrir(ov, fechar);
  return { fechar, el: ov };
}
const confirmar = (msg, { ok = "Confirmar", perigo = false, titulo = "Confirmar Ação" } = {}) => new Promise((res) => {
  let r = false;
  const m = abrirModal({ titulo, corpo: `<p>${esc(msg)}</p>`, botoes: [{ rotulo: "Voltar", classe: "outline", aoClicar: () => { r = false; } }, { rotulo: ok, classe: perigo ? "danger" : "", aoClicar: () => { r = true; } }] });
  const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); res(r); } }); obs.observe(document.body, { childList: true });
});
function baixarArquivo(nome, conteudo, tipo = "text/plain") {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo + ";charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const baixarCSV = (nome, linhas) => baixarArquivo(nome, "\ufeff" + linhas.map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n"), "text/csv");
function imprimirDoc(titulo, corpo) {
  const w = window.open("", "_blank"); if (!w) return toast("Libere as janelas pop-up para imprimir.", "err");
  w.document.write(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:32px auto;padding:0 20px;color:#000;line-height:1.5}h1{font-size:22px;color:#132C77;border-bottom:3px solid #132C77;padding-bottom:8px}.m{color:#444;font-size:14px}li{margin:6px 0}.sig{margin-top:56px;border-top:1px solid #000;width:280px;padding-top:4px;font-size:14px}</style></head><body>${corpo}<script>window.onload=()=>setTimeout(()=>print(),200)<\/script></body></html>`);
  w.document.close();
}
function qrSVG(texto) { const q = qrcode(0, "M"); q.addData(texto); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
const vazio = (titulo, texto = "", acao = "") => `<div class="empty"><b>${esc(titulo)}</b>${esc(texto)}${acao ? `<div style="margin-top:12px">${acao}</div>` : ""}</div>`;

// ---------- Navegação por perfil ----------
const NAV = {
  cliente: {
    principal: [["home.html", "Início", "home"], ["consultas.html", "Consultas", "calendar", ["consulta.html", "agendamento.html", "agendamento-confirmado.html", "teleconsulta.html"]], ["documentos.html", "Exames", "file"], ["carteirinha.html", "Carteirinha", "card"], ["perfil.html", "Perfil", "user", ["perfil-editar.html", "privacidade.html", "dependentes.html"]]],
    mais: [["triagem.html", "Triagem", "chat"], ["pagamento.html", "Pagamentos", "wallet"], ["autorizacoes.html", "Autorizações", "shield"], ["dependentes.html", "Dependentes", "users"], ["privacidade.html", "Privacidade", "lock"], ["ajuda.html", "Ajuda e Ouvidoria", "help"]],
  },
  atendente: {
    principal: [["atendente-painel.html", "Painel", "home"], ["agenda.html", "Agenda", "calendar", ["agendar-paciente.html"]], ["fila.html", "Fila", "clock"], ["pacientes.html", "Pacientes", "users", ["cliente-form.html", "paciente.html"]], ["caixa.html", "Caixa", "wallet"]],
    mais: [["autorizacoes.html", "Autorizações", "shield"], ["ajuda.html", "Ajuda", "help"]],
  },
  medico: {
    principal: [["medico-painel.html", "Agenda", "calendar", ["atendimento.html"]], ["meus-pacientes.html", "Pacientes", "users", ["prontuario.html"]], ["horarios.html", "Horários", "clock"], ["medico-perfil.html", "Perfil", "user"]],
    mais: [["ajuda.html", "Ajuda", "help"]],
  },
  admin: {
    principal: [["admin-painel.html", "Painel", "chart"], ["admin-unidades.html", "Unidades", "building"], ["admin-usuarios.html", "Usuários", "users"], ["admin-servicos.html", "Serviços", "list"], ["admin-financeiro.html", "Financeiro", "wallet"]],
    mais: [["admin-auditoria.html", "Auditoria", "shield"], ["admin-ouvidoria.html", "Ouvidoria", "chat"], ["admin-config.html", "Configurações", "settings"]],
  },
};

// ---------- Estrutura das telas (cabeçalho, menu, acessibilidade) ----------
const Pagina = { ok: true };
const arquivoAtual = () => location.pathname.split("/").pop() || "index.html";
function guarda() {
  const perfis = (document.body.dataset.perfis || "").split(",").filter(Boolean);
  if (!perfis.length || perfis[0] === "*") return;
  if (!Sessao.perfil || !eu()) { Pagina.ok = false; location.replace(`login.html?expirada=1&volta=${encodeURIComponent(arquivoAtual() + location.search)}`); return; }
  if (!perfis.includes(Sessao.perfil)) { Pagina.ok = false; location.replace("estado.html?tipo=sem-permissao"); }
}
function painelAcessibilidade() {
  const TEMAS = [{ id: "claro", nome: "Claro", desc: "Fundo claro, padrão do app" }, { id: "escuro", nome: "Escuro", desc: "Fundo escuro, melhor à noite" }];
  const aplicar = (id) => { document.documentElement.setAttribute("data-tema", id); try { localStorage.setItem("tema", id); } catch (e) {} $$(".a11y-opt").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tema === id))); };
  const fonte = (n) => { document.documentElement.classList.remove("fonte-1", "fonte-2"); if (n) document.documentElement.classList.add("fonte-" + n); try { localStorage.setItem("fonte", n || ""); } catch (e) {} };
  const abrir = () => abrirModal({
    titulo: "Acessibilidade",
    corpo: `<p class="muted">Escolha o tema e o tamanho do texto. As cores do app continuam as mesmas.</p><div class="stack" style="margin-top:10px">${TEMAS.map((t) => `<button type="button" class="a11y-opt" data-tema="${t.id}" aria-pressed="false"><span class="a11y-swatch sw-${t.id}"></span><span><b>${t.nome}</b><small>${t.desc}</small></span></button>`).join("")}
      <div><span class="label">Tamanho do texto</span><div class="fonte-ctl" style="margin-top:6px"><button type="button" class="btn outline sm" data-f="">Normal</button><button type="button" class="btn outline sm" data-f="1">Grande</button><button type="button" class="btn outline sm" data-f="2">Muito Grande</button></div></div></div>`,
    aoAbrir: (ov) => { aplicar(document.documentElement.getAttribute("data-tema") || "claro"); $$(".a11y-opt", ov).forEach((b) => b.addEventListener("click", () => aplicar(b.dataset.tema))); $$("[data-f]", ov).forEach((b) => b.addEventListener("click", () => fonte(b.dataset.f))); },
  });
  $$('[data-slot="a11y"]').forEach((slot) => { const b = document.createElement("button"); b.type = "button"; b.className = "ibtn"; b.setAttribute("aria-label", "Acessibilidade"); b.title = "Acessibilidade"; b.innerHTML = ico("a11y"); b.addEventListener("click", abrir); slot.replaceWith(b); });
}
function montarShell() {
  $$(".logo-icon").forEach((el) => (el.innerHTML = LOGO_SVG));
  const perfil = Sessao.perfil, b = document.body;
  const pf = b.dataset.perfis || "";
  if (!pf.length || (pf === "*" && !(perfil && eu()))) {
    if (pf === "*") { const h = document.createElement("header"); h.className = "site-header"; h.innerHTML = `<a class="brand" href="index.html"><span class="logo-icon"></span><span>CaisMed</span></a><span class="grow"></span><span data-slot="a11y"></span><a class="btn outline" href="login.html">Entrar</a>`; $(".app").insertBefore(h, $(".app").firstChild); $$(".logo-icon", h).forEach((el) => (el.innerHTML = LOGO_SVG)); }
    painelAcessibilidade(); return;
  }
  const app = $(".app"), nav = NAV[perfil], u = eu();
  const atual = arquivoAtual();
  // cabeçalho
  const h = document.createElement("header"); h.className = "app-header";
  const voltar = b.dataset.voltar;
  const nUnid = unidadesDoUsuario();
  const seletor = (perfil === "atendente" || perfil === "medico") && nUnid.length ? `<label class="unit-pick"><span class="sr">Unidade ativa</span><select id="unidade-ativa">${perfil === "medico" ? `<option value="">Todas as Unidades</option>` : ""}${nUnid.map((x) => `<option value="${x.id}" ${x.id === unidadeAtiva() ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select></label>` : "";
  const naoLidas = minhasNotifs().filter((n) => !n.lida).length;
  h.innerHTML = `${voltar ? `<a href="${voltar}" class="ibtn" aria-label="Voltar">${ico("back")}</a>` : ""}<a class="brand" href="${HOME[perfil]}"><span class="logo-icon"></span><span>CaisMed</span></a><span class="top-date">${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span><span class="grow"></span>${seletor}<span data-slot="a11y"></span><a class="ibtn" href="notificacoes.html" aria-label="Notificações${naoLidas ? `, ${naoLidas} novas` : ""}">${ico("bell")}${naoLidas ? `<span class="dot">${naoLidas > 9 ? "9+" : naoLidas}</span>` : ""}</a><button type="button" class="ibtn" id="btn-user" aria-haspopup="true" aria-expanded="false" aria-label="Menu da conta"><b>${esc(iniciais(u.nome))}</b></button>
    <div class="user-menu" id="user-menu"><div class="who"><b>${esc(u.nome)}</b><small>${PERFIL_NOME[perfil]}</small></div>${perfil === "cliente" ? `<a href="perfil.html">${ico("user")} Meu Perfil</a>` : ""}${perfil === "medico" ? `<a href="medico-perfil.html">${ico("user")} Meu Perfil</a>` : ""}<a href="notificacoes.html">${ico("bell")} Notificações</a><a href="ajuda.html">${ico("help")} Ajuda</a><button type="button" id="btn-sair">${ico("logout")} Sair da Conta</button></div>`;
  app.insertBefore(h, app.firstChild);
  $$(".logo-icon", h).forEach((el) => (el.innerHTML = LOGO_SVG));
  // menu
  const item = ([href, rot, ic, also = []], extra = "") => `<a href="${href}" class="${[href, ...also].includes(atual) ? "on" : ""} ${extra}" ${[href, ...also].includes(atual) ? 'aria-current="page"' : ""}><span class="ni">${ico(ic)}</span><span>${rot}</span></a>`;
  const n = document.createElement("nav"); n.className = "nav"; n.setAttribute("aria-label", "Menu principal");
  n.innerHTML = `<a class="nav-brand" href="${HOME[perfil]}"><span class="logo-icon"></span><span>CaisMed</span></a>${nav.principal.map((i) => item(i)).join("")}${nav.mais.length ? `<span class="nav-sec">Mais Opções</span>` + nav.mais.map((i) => item(i, "only-wide")).join("") : ""}<div class="nav-foot"><b>${esc(u.nome)}</b><br>${PERFIL_NOME[perfil]}</div>`;
  document.body.appendChild(n);
  document.body.classList.add("com-nav");
  $$(".logo-icon", n).forEach((el) => (el.innerHTML = LOGO_SVG));
  // eventos
  const menu = $("#user-menu"), bu = $("#btn-user");
  bu.addEventListener("click", (e) => { e.stopPropagation(); const a = menu.classList.toggle("open"); bu.setAttribute("aria-expanded", a); });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) { menu.classList.remove("open"); bu.setAttribute("aria-expanded", "false"); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") menu.classList.remove("open"); });
  $("#btn-sair").addEventListener("click", sair);
  $("#unidade-ativa")?.addEventListener("change", (e) => { sessionStorage.setItem("unidadeAtiva", e.target.value); location.reload(); });
  painelAcessibilidade();
}

// ---------- Abas, pagamentos e pendências (usados por várias telas) ----------
function ligarAbas(raiz = document) {
  const bs = $$(".tab-btn", raiz);
  bs.forEach((b) => b.addEventListener("click", () => { bs.forEach((x) => x.classList.remove("active")); $$(".tab-panel", raiz).forEach((p) => p.classList.remove("active")); b.classList.add("active"); $("#" + b.dataset.tab).classList.add("active"); }));
}
function pendencias(c) {
  const mes = hojeISO().slice(0, 7), pl = PLANOS[c.plano], pags = DB.get("pagamentos").filter((p) => p.clienteId === c.id), out = [];
  if (pl && !pags.some((p) => p.tipo === "mensalidade" && p.mes === mes)) out.push({ tipo: "mensalidade", descricao: `${pl.nome}, ${mes.slice(5)}/${mes.slice(0, 4)}`, valor: pl.valor, mes });
  DB.get("consultas").filter((x) => x.pacienteId === c.id && x.status === "finalizada" && !x.pago && x.valor > 0).forEach((x) => out.push({ tipo: "consulta", consultaId: x.id, descricao: `${nomeServico(x)} de ${fmtData(x.data)}`, valor: x.valor }));
  return out;
}
function registrarPagamento(c, pend, metodo, por, unidadeId) {
  // TODO: trocar por POST /faturas/:id/pagamento (back-end)
  const p = DB.add("pagamentos", { clienteId: c.id, tipo: pend.tipo, consultaId: pend.consultaId || null, mes: pend.mes || null, descricao: pend.descricao, valor: pend.valor, metodo, data: hojeISO(), quando: new Date().toISOString(), por, unidadeId: unidadeId || null });
  if (pend.consultaId) DB.upd("consultas", pend.consultaId, { pago: true });
  notificar("cliente:" + c.id, "Pagamento Confirmado", `${pend.descricao}: ${brl(pend.valor)} (${metodo}).`, "pagamento.html");
  audit("Registrou pagamento", `${c.nome} - ${pend.descricao} - ${brl(pend.valor)}`);
  return p;
}
function fazerCheckin(id, aoFim) {
  const c = DB.find("consultas", id); if (!c) return;
  DB.upd("consultas", id, (x) => ({ status: "aguardando", chegouEm: new Date().toISOString(), historico: [...(x.historico || []), { quando: new Date().toISOString(), texto: `Check-in feito (${Sessao.perfil === "cliente" ? "online" : "recepção"})` }] }));
  notificar("atendente", "Paciente Chegou", `${c.paciente} fez check-in para ${c.horario}.`, "fila.html");
  if (c.medicoId) notificar("medico:" + c.medicoId, "Paciente Chegou", `${c.paciente} está aguardando (${c.horario}).`, "medico-painel.html");
  audit("Check-in", `${c.paciente} - ${c.horario}`);
  toast("Check-in feito! Aguarde ser chamado.", "ok"); aoFim && aoFim();
}

// Executa o código da página só quando o acesso está liberado
const ready = (fn) => { if (Pagina.ok) fn(); };

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
seed();
guarda();
if (Pagina.ok) montarShell();
ligarMascaras();
