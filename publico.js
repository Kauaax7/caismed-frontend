"use strict";
/* Telas públicas: G01 landing, G02 busca, G03 login, G05 recuperar senha, G10 estados */

const cartaoUnidade = (u) => `<article class="card stack sm"><div class="row between"><h3>${esc(u.nome)}</h3>${u.ativa === false ? '<span class="badge mute">Inativa</span>' : ""}</div>
  <p>${esc(u.endereco)}, ${esc(u.bairro)}, ${esc(u.cidade)}</p><p class="muted">${esc(u.horario)}</p><p class="muted">${esc(u.fone)}</p>
  <div class="chips" style="margin-top:6px">${(u.especialidades || []).map((e) => `<span class="badge info">${esc(espNome(e))}</span>`).join("")}</div>
  <div class="actions" style="margin-top:10px"><a class="btn outline sm" href="${mapaURL(u)}" target="_blank" rel="noopener">${ico("pin")} Como Chegar</a><a class="btn sm" href="agendamento.html?unidade=${u.id}">Agendar Aqui</a></div></article>`;
const cartaoMedico = (m, p) => `<article class="doc-card" style="cursor:default"><span class="avatar lg">${esc(iniciais(m.nome))}</span><div class="grow"><b>${esc(m.nome)}</b><small>${esc((m.especialidades || []).map(espNome).join(", "))} · ${esc(m.crm || "")}</small>
  <small class="rating">★ ${(m.nota || 5).toFixed(1)}</small>${m.tele ? '<span class="badge info">Faz Teleconsulta</span>' : ""}
  <small>${p ? `Próximo horário: <b>${rotuloDia(p.data)} às ${p.h}</b>, ${esc(nomeUnidade(p.unidadeId))}` : "Sem horários nos próximos dias"}</small></div>
  <a class="btn sm" href="agendamento.html?especialidade=${(m.especialidades || [])[0]}&medico=${m.id}">Agendar</a></article>`;

function landing() {
  const sel = $("#f-esp");
  sel.innerHTML = espLista().map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join("");
  const desenhar = () => {
    const esp = sel.value;
    const itens = medicosAtivos().filter((m) => m.especialidades.includes(esp)).map((m) => ({ m, p: proximoLivre(m) })).filter((x) => x.p).sort((a, b) => (a.p.data + a.p.h).localeCompare(b.p.data + b.p.h)).slice(0, 3);
    $("#f-lista").innerHTML = itens.length
      ? itens.map(({ m, p }) => `<a class="free-row" href="agendamento.html?especialidade=${esp}&medico=${m.id}&unidade=${p.unidadeId}&data=${p.data}&horario=${p.h}"><span><b>${esc(m.nome)}</b><small>${esc(nomeUnidade(p.unidadeId))}</small></span><span class="badge info">${rotuloDia(p.data)} às ${p.h}</span></a>`).join("")
      : '<p class="muted">Sem horários livres nos próximos dias. Tente outra especialidade.</p>';
  };
  sel.addEventListener("change", desenhar); desenhar();
  $("#esp-grid").innerHTML = espLista().map((e) => `<a class="esp" href="buscar.html?especialidade=${e.id}"><b>${esc(e.nome)}</b><small>${medicosAtivos().filter((m) => m.especialidades.includes(e.id)).length} médico(s)</small></a>`).join("");
  $("#unidades-lista").innerHTML = DB.get("unidades").filter((u) => u.ativa !== false).map(cartaoUnidade).join("");
}

function buscar() {
  const q = new URLSearchParams(location.search);
  const fe = $("#b-esp"), fc = $("#b-cidade"), ft = $("#b-texto"), fm = $("#b-tele");
  fe.innerHTML = `<option value="">Todas as Especialidades</option>` + espLista().map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join("");
  const cidades = [...new Set(DB.get("unidades").map((u) => u.cidade))];
  fc.innerHTML = `<option value="">Todas as Cidades</option>` + cidades.map((c) => `<option>${esc(c)}</option>`).join("");
  fe.value = q.get("especialidade") || "";
  const desenhar = () => {
    const t = ft.value.trim().toLowerCase();
    const un = DB.get("unidades").filter((u) => u.ativa !== false && (!fc.value || u.cidade === fc.value) && (!fe.value || u.especialidades.includes(fe.value)) && (!t || `${u.nome} ${u.bairro} ${u.cidade}`.toLowerCase().includes(t) || u.especialidades.some((e) => espNome(e).toLowerCase().includes(t))));
    const ids = new Set(un.map((u) => u.id));
    const md = medicosAtivos().filter((m) => (!fe.value || m.especialidades.includes(fe.value)) && (!fm.checked || m.tele) && (!fc.value || m.unidades.some((x) => ids.has(x))) && (!t || `${m.nome} ${m.especialidades.map(espNome).join(" ")}`.toLowerCase().includes(t) || m.unidades.some((x) => nomeUnidade(x).toLowerCase().includes(t))));
    $("#b-med").innerHTML = md.length ? md.map((m) => cartaoMedico(m, proximoLivre(m))).join("") : vazio("Nenhum Médico Encontrado", "Tente tirar algum filtro ou buscar por outro nome.");
    $("#b-uni").innerHTML = un.length ? un.map(cartaoUnidade).join("") : vazio("Nenhuma Unidade Encontrada", "Tente outra cidade ou especialidade.");
    $("#b-total").textContent = `${md.length} médico(s) e ${un.length} unidade(s)`;
  };
  [fe, fc, fm].forEach((e) => e.addEventListener("change", desenhar)); ft.addEventListener("input", desenhar); desenhar();
}

function login() {
  const q = new URLSearchParams(location.search);
  if (q.get("expirada")) $("#aviso-sessao").hidden = false;
  const abas = $$("#abas-perfil button"); let perfil = q.get("perfil") || "cliente";
  const f = $("#login-form"), erro = $("#erro-login");
  const trocar = (p) => {
    perfil = p; erro.hidden = true;
    abas.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.perfil === p)));
    $("#campo-cpf").hidden = p !== "cliente"; $("#campo-mat").hidden = p === "cliente";
    $("#cpf").required = p === "cliente"; $("#matricula").required = p !== "cliente";
    $("#mais-cliente").hidden = p !== "cliente"; $("#demo-box").hidden = p === "cliente";
    $("#titulo-login").textContent = p === "cliente" ? "Acesse Sua Conta" : `Área ${p === "medico" ? "do Médico" : p === "admin" ? "do Administrador" : "do Atendente"}`;
  };
  abas.forEach((b) => b.addEventListener("click", () => trocar(b.dataset.perfil)));
  trocar(["cliente", "atendente", "medico", "admin"].includes(perfil) ? perfil : "cliente");
  $("#ver-senha").addEventListener("click", () => { const s = $("#senha"); const mostrar = s.type === "password"; s.type = mostrar ? "text" : "password"; $("#ver-senha").setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha"); });
  const falha = (msg) => { erro.textContent = msg; erro.hidden = false; };
  const destino = (p) => { const v = q.get("volta"); return v && /^[a-z0-9-]+\.html(\?.*)?$/i.test(v) && p === "cliente" ? v : HOME[p]; };
  const concluir = (id) => { Sessao.entrar(perfil, id); audit("Entrou no sistema"); location.href = destino(perfil); };
  f.addEventListener("submit", (e) => {
    e.preventDefault(); erro.hidden = true;
    const senha = $("#senha").value;
    if (perfil === "cliente") {
      // TODO: trocar por POST /auth/login (back-end)
      const cpf = soDigitos($("#cpf").value);
      if (!cpfValido(cpf)) return falha("CPF inválido. Confira os 11 números.");
      const c = DB.get("clientes").find((x) => x.cpf === cpf);
      if (!c) return falha("CPF não encontrado. Procure a recepção da clínica para fazer seu cadastro.");
      if (!c.senha) return falha("Você ainda não criou sua senha. Use o Primeiro Acesso.");
      if (c.senha !== senha) return falha("CPF ou senha incorretos.");
      return concluir(c.id);
    }
    // TODO: trocar por POST /auth/profissional/login (back-end)
    const u = DB.get("usuarios").find((x) => x.perfil === perfil && x.matricula === $("#matricula").value.trim() && x.ativo !== false);
    if (!u || u.senha !== senha) return falha("Matrícula ou senha incorretas.");
    if (cfg().doisPassos) {
      abrirModal({ titulo: "Verificação em 2 Etapas", corpo: `<p class="muted">Digite o código de 6 dígitos enviado ao seu e-mail. Na demonstração, o código é <b>123456</b>.</p><div class="field" style="margin-top:12px"><label for="cod">Código</label><input id="cod" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div><p class="err-msg" id="cod-erro" hidden>Código incorreto.</p>`,
        botoes: [{ rotulo: "Confirmar", aoClicar: () => { if ($("#cod").value !== "123456") { $("#cod-erro").hidden = false; return false; } concluir(u.id); } }] });
      return;
    }
    concluir(u.id);
  });
}

function primeiroAcesso() {
  const f = $("#primeiro-acesso-form"), erro = $("#erro-pa");
  f.addEventListener("submit", (e) => {
    e.preventDefault(); erro.hidden = true;
    const falha = (m) => { erro.textContent = m; erro.hidden = false; };
    if (!formularioValido(f)) return;
    // TODO: trocar por POST /auth/primeiro-acesso (back-end)
    const cpf = soDigitos($("#cpf").value), senha = $("#senha").value;
    if (senha !== $("#senha2").value) return falha("As senhas não são iguais.");
    const todos = DB.get("clientes"), cli = todos.find((c) => c.cpf === cpf);
    if (!cli) return falha("CPF não encontrado. Procure a recepção da clínica para fazer seu cadastro.");
    if (cli.senha) return falha("Este CPF já tem senha. Volte e faça o login.");
    if (!$("#aceite").checked) return falha("Aceite os termos e o tratamento de dados (LGPD) para continuar.");
    cli.senha = senha; cli.consentimentos = { termos: true, lgpd: true, notificacoes: true, marketing: $("#marketing").checked, aceitoEm: new Date().toISOString() };
    DB.set("clientes", todos);
    Sessao.entrar("cliente", cli.id); audit("Criou a senha (primeiro acesso)");
    notificar("cliente:" + cli.id, "Conta Ativada", "Sua senha foi criada. Já pode agendar consultas e ver sua carteirinha.", "home.html");
    toast("Senha criada com sucesso!", "ok");
    setTimeout(() => (location.href = "home.html"), 700);
  });
}

function recuperar() {
  $("#recuperar-form").addEventListener("submit", (e) => {
    e.preventDefault(); if (!formularioValido(e.target)) return;
    // TODO: POST /auth/recuperar-senha (back-end envia o e-mail)
    audit("Pediu redefinição de senha", soDigitos($("#cpf-recuperar").value));
    location.href = "confirmacao.html";
  });
}

const ESTADOS = {
  vazio: ["list", "Nada por Aqui Ainda", "Quando houver informações, elas aparecem nesta tela.", "Voltar ao Início"],
  erro: ["alert", "Algo Deu Errado", "Não foi possível carregar esta tela. Tente de novo em alguns instantes.", "Tentar Novamente"],
  "sem-permissao": ["lock", "Sem Permissão", "Seu perfil não tem acesso a esta tela. Se precisar, fale com o administrador da clínica.", "Ir para Minha Área"],
  manutencao: ["wrench", "Em Manutenção", "Estamos melhorando o sistema. Volte em alguns minutos.", "Voltar ao Início"],
  "sessao-expirada": ["clock", "Sessão Expirada", "Por segurança, você precisa entrar de novo.", "Entrar Novamente"],
  "404": ["search", "Página Não Encontrada", "O endereço que você abriu não existe ou foi movido.", "Voltar ao Início"],
};
function estado() {
  const t = new URLSearchParams(location.search).get("tipo");
  const [ic, titulo, texto, rot] = ESTADOS[t] || ESTADOS["404"];
  const destino = t === "sem-permissao" && Sessao.perfil ? HOME[Sessao.perfil] : t === "sessao-expirada" ? "login.html" : t === "erro" ? "javascript:location.reload()" : "index.html";
  $("#estado").innerHTML = `<div class="state-box"><span class="big">${ico(ic)}</span><h1>${titulo}</h1><p class="lead">${texto}</p><a class="btn" href="${destino}">${rot}</a></div>`;
}

ready(() => {
  const p = document.body.dataset.pagina;
  ({ landing, buscar, login, "primeiro-acesso": primeiroAcesso, recuperar, estado })[p]?.();
});
