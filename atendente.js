"use strict";
/* Portal do Atendente (A01 a A13) */

const doDia = (uni, iso) => DB.get("consultas").filter((c) => c.data === iso && (!uni || c.unidadeId === uni));
const pacienteDe = (c) => DB.find("clientes", c.pacienteId);

// ---------- A01 Painel do dia ----------
function atendentePainel() {
  const un = unidadeAtiva(), hoje = hojeISO(), l = doDia(un, hoje);
  const n = (s) => l.filter((c) => c.status === s).length;
  const atrasadas = l.filter((c) => c.status === "agendada" && hm(c.horario) + 15 < agoraMin());
  const espera = DB.get("espera").filter((e) => !e.avisado).length, aut = DB.get("autorizacoes").filter((a) => a.status === "em_analise").length;
  const proximas = l.filter((c) => ["agendada", "aguardando"].includes(c.status)).sort((a, b) => a.horario.localeCompare(b.horario));
  raizPag().innerHTML = `<div class="page-head"><div><h1>Painel do Dia</h1><p class="lead">${esc(nomeUnidade(un))}, ${fmtDataLonga(hoje)}</p></div><a class="btn" href="agendar-paciente.html">${ico("plus")} Novo Agendamento</a></div>
  <div class="stats"><div class="stat"><b>${l.filter((c) => c.status !== "cancelada").length}</b><span>Consultas do dia</span></div><div class="stat"><b>${n("aguardando")}</b><span>Na recepção</span></div><div class="stat"><b>${n("em_atendimento")}</b><span>Em atendimento</span></div><div class="stat"><b>${n("finalizada")}</b><span>Finalizadas</span></div><div class="stat"><b>${n("faltou")}</b><span>Faltas</span></div><div class="stat"><b>${n("cancelada")}</b><span>Cancelamentos</span></div><div class="stat"><b>${espera}</b><span>Na lista de espera</span></div><div class="stat"><b>${aut}</b><span>Autorizações em análise</span></div></div>
  <div class="two-col"><div class="stack"><h2>Próximos atendimentos</h2>${proximas.length ? proximas.map((c) => `<div class="item" style="cursor:default"><span class="avatar">${esc(c.horario)}</span><span class="grow"><b>${esc(c.paciente)}</b><small>${esc(nomeServico(c))}${nomeMedico(c) ? ` com ${esc(nomeMedico(c))}` : ""}</small></span>${badgeStatus(c.status)}${c.status === "agendada" ? `<button class="btn sm" data-ck="${c.id}" type="button">Check-in</button>` : ""}</div>`).join("") : vazio("Nenhum Atendimento Pendente Hoje", "Os agendamentos de hoje aparecem aqui.")}</div>
  <div class="stack"><div class="card stack"><h2>Alertas</h2>${atrasadas.length ? atrasadas.map((c) => `<div class="item" style="cursor:default">${ico("alert")}<span class="grow"><b>Atraso: ${esc(c.paciente)}</b><small>Horário ${esc(c.horario)}, ainda sem check-in</small></span></div>`).join("") : '<p class="muted">Sem atrasos agora.</p>'}</div>
  <a class="item" href="fila.html">${ico("clock")}<span class="grow"><b>Check-in e fila</b><small>Receber pacientes e chamar</small></span>${ico("right")}</a><a class="item" href="cliente-form.html">${ico("users")}<span class="grow"><b>Cadastrar cliente</b><small>Novo paciente da clínica</small></span>${ico("right")}</a><a class="item" href="caixa.html">${ico("wallet")}<span class="grow"><b>Caixa</b><small>Cobranças e recibos</small></span>${ico("right")}</a><a class="item" href="espera.html">${ico("list")}<span class="grow"><b>Lista de espera</b><small>Pacientes aguardando vaga</small></span>${ico("right")}</a></div></div>`;
  $$("[data-ck]").forEach((b) => b.addEventListener("click", () => checkinRecepcao(b.dataset.ck, () => atendentePainel())));
}

// A05: conferir documento e convênio antes de liberar o paciente para a fila
function checkinRecepcao(id, depois) {
  const c = DB.find("consultas", id), cl = pacienteDe(c);
  abrirModal({ titulo: "Check-in de " + c.paciente, corpo: `<div class="card pale"><b>${esc(nomeServico(c))}</b><br><span class="muted">${esc(c.horario)}${nomeMedico(c) ? `, ${esc(nomeMedico(c))}` : ""}</span></div><label class="check"><input type="checkbox" id="k1"> Documento com foto conferido</label><label class="check"><input type="checkbox" id="k2"> Plano ${esc((PLANOS[cl?.plano] || {}).nome || "particular")} conferido</label><div class="field"><label for="k3">Telefone atualizado</label><input id="k3" type="tel" value="${esc(cl?.telefone || "")}"></div>`,
    botoes: [{ rotulo: "Voltar", classe: "outline" }, { rotulo: "Enviar para a Fila", aoClicar: () => { if (!$("#k1").checked || !$("#k2").checked) { toast("Confira o documento e o plano antes de continuar.", "err"); return false; } if (cl) DB.upd("clientes", cl.id, { telefone: $("#k3").value }); fazerCheckin(id, depois); } }] });
  ligarMascaras($(".modal"));
}

// ---------- A02 / A04 Agenda geral ----------
function agenda() {
  const un = unidadeAtiva(), q = new URLSearchParams(location.search);
  let data = sessionStorage.getItem("agendaData") || hojeISO();
  if (q.get("ok")) toast("Agendamento criado.", "ok");
  const desenhar = () => {
    sessionStorage.setItem("agendaData", data);
    const meds = medicosAtivos().filter((m) => m.unidades.includes(un));
    const por = meds.map((m) => ({ m, slots: slotsDoMedico(m, data, un) })).filter((x) => x.slots.length);
    const horas = [...new Set(por.flatMap((x) => x.slots.map((s) => s.h)))].sort();
    const cons = doDia(un, data).filter((c) => c.status !== "cancelada");
    let grade = "";
    if (por.length) {
      grade = `<div class="agenda" style="grid-template-columns:72px repeat(${por.length},minmax(170px,1fr))"><div class="h">Hora</div>${por.map((x) => `<div class="h">${esc(x.m.nome)}<br><small class="muted">${esc(espNome(x.m.especialidades[0]))}</small></div>`).join("")}${horas.map((h) => `<div class="t">${h}</div>${por.map((x) => { const s = x.slots.find((y) => y.h === h); const c = cons.find((y) => y.medicoId === x.m.id && y.horario === h); if (c) return `<div class="c"><button class="ev ${c.status}" data-c="${c.id}" type="button"><b>${esc(c.paciente)}</b><small>${esc(STATUS[c.status][0])}${c.tipo === "teleconsulta" ? ", online" : ""}</small></button></div>`; if (!s) return `<div class="c"></div>`; if (s.bloqueado) return `<div class="c"><button class="blk" data-un="${x.m.id}|${h}" type="button">Bloqueado</button></div>`; if (!s.livre) return `<div class="c"><span class="muted small">Encerrado</span></div>`; return `<div class="c"><button data-free="${x.m.id}|${h}" type="button">Livre</button></div>`; }).join("")}`).join("")}</div>`;
    }
    $("#grade").innerHTML = grade || vazio("Sem Atendimentos Neste Dia", "Nenhum médico atende nesta unidade no dia escolhido.");
    $("#data-lbl").textContent = fmtDataLonga(data);
    $$("[data-c]").forEach((b) => b.addEventListener("click", () => detalheConsulta(b.dataset.c, desenhar)));
    $$("[data-free]").forEach((b) => b.addEventListener("click", () => { const [mid, h] = b.dataset.free.split("|"); const m = medicoPorId(mid); abrirModal({ titulo: `${h}, ${m.nome}`, corpo: `<div class="stack"><a class="btn" href="agendar-paciente.html?medico=${mid}&especialidade=${m.especialidades[0]}&unidade=${un}&data=${data}&horario=${h}">Agendar Paciente</a><button class="btn outline" id="bloq" type="button">Bloquear Horário</button></div>`, aoAbrir: (ov) => $("#bloq", ov).addEventListener("click", () => { DB.add("bloqueios", { medicoId: mid, data, horario: h, por: eu().nome }); audit("Bloqueou horário", `${m.nome} ${fmtData(data)} ${h}`); $(".x-btn", ov).click(); desenhar(); }) }); }));
    $$("[data-un]").forEach((b) => b.addEventListener("click", async () => { const [mid, h] = b.dataset.un.split("|"); if (await confirmar("Liberar este horário de novo?", { ok: "Liberar" })) { DB.set("bloqueios", DB.get("bloqueios").filter((x) => !(x.medicoId === mid && x.data === data && x.horario === h))); desenhar(); } }));
  };
  raizPag().innerHTML = `<div class="page-head"><h1>Agenda Geral</h1><a class="btn" href="agendar-paciente.html">${ico("plus")} Novo Agendamento</a></div><div class="row between" style="margin-bottom:14px"><div class="row"><button class="btn outline sm" id="ant" type="button" aria-label="Dia anterior">${ico("back")}</button><b id="data-lbl" style="min-width:150px;text-align:center"></b><button class="btn outline sm" id="prox" type="button" aria-label="Próximo dia">${ico("right")}</button><button class="btn outline sm" id="hj" type="button">Hoje</button></div><input type="date" id="pick" style="width:auto" aria-label="Escolher data"></div><div id="grade"></div><p class="hint" style="margin-top:10px">Toque em um horário livre para agendar ou bloquear. Toque em uma consulta para ver os detalhes, remarcar ou cancelar.</p>`;
  const mover = (n) => { data = addDias(data, n); $("#pick").value = data; desenhar(); };
  $("#ant").addEventListener("click", () => mover(-1)); $("#prox").addEventListener("click", () => mover(1)); $("#hj").addEventListener("click", () => { data = hojeISO(); $("#pick").value = data; desenhar(); });
  $("#pick").value = data; $("#pick").addEventListener("change", (e) => { if (e.target.value) { data = e.target.value; desenhar(); } });
  desenhar();
}
function detalheConsulta(id, depois) {
  const c = DB.find("consultas", id), m = c.medicoId ? medicoPorId(c.medicoId) : null, ativa = ["agendada", "aguardando"].includes(c.status);
  abrirModal({ titulo: "Detalhe da Consulta", corpo: `<div class="row between"><b>${esc(c.paciente)}</b>${badgeStatus(c.status)}</div><div class="card" style="margin:10px 0"><div class="kv"><span>Atendimento</span><span>${esc(nomeServico(c))}</span></div><div class="kv"><span>Data</span><span>${fmtData(c.data)} às ${esc(c.horario)}</span></div>${m ? `<div class="kv"><span>Médico</span><span>${esc(m.nome)}</span></div>` : ""}<div class="kv"><span>Valor</span><span>${brl(c.valor)} ${c.pago ? "(pago)" : ""}</span></div></div><b>Histórico de alterações</b>${(c.historico || []).slice().reverse().map((h) => `<div class="kv"><span class="small">${fmtHora(h.quando)}</span><span class="small">${esc(h.texto)}</span></div>`).join("")}
  <div class="actions"><a class="btn outline sm" href="paciente.html?id=${c.pacienteId}">Ficha do Paciente</a>${c.status === "agendada" ? `<button class="btn sm" id="d-ck" type="button">Check-in</button>` : ""}${ativa ? `<a class="btn outline sm" href="agendar-paciente.html?remarcar=${c.id}">Remarcar</a><button class="btn danger outline sm" id="d-can" type="button">Cancelar</button>` : ""}${c.status === "agendada" ? `<button class="btn danger outline sm" id="d-falta" type="button">Registrar Falta</button>` : ""}</div>`,
    aoAbrir: (ov, fechar) => {
      $("#d-ck", ov)?.addEventListener("click", () => { fechar(); checkinRecepcao(id, depois); });
      $("#d-can", ov)?.addEventListener("click", () => { fechar(); abrirModal({ titulo: "Cancelar Consulta", corpo: `<div class="field"><label for="mt">Motivo</label><select id="mt"><option>Pedido do paciente</option><option>Médico indisponível</option><option>Erro de agendamento</option><option>Outro</option></select></div>`, botoes: [{ rotulo: "Voltar", classe: "outline" }, { rotulo: "Cancelar Consulta", classe: "danger", aoClicar: () => { cancelarConsulta(id, $("#mt").value, "atendente"); toast("Consulta cancelada.", "ok"); depois(); } }] }); });
      $("#d-falta", ov)?.addEventListener("click", async () => { fechar(); if (await confirmar("Registrar falta deste paciente?", { perigo: true, ok: "Registrar Falta" })) { DB.upd("consultas", id, (x) => ({ status: "faltou", historico: [...(x.historico || []), { quando: new Date().toISOString(), texto: "Falta registrada pela recepção" }] })); audit("Registrou falta", c.paciente); depois(); } });
    } });
}

// ---------- A05 / A06 Check-in e fila ----------
function fila() {
  const un = unidadeAtiva();
  const desenhar = () => {
    const l = doDia(un, hojeISO());
    const col = (st, tit) => { const it = l.filter((c) => (st === "aguardando" ? c.status === "aguardando" : c.status === st)).sort((a, b) => (a.chegouEm || a.horario).localeCompare(b.chegouEm || b.horario)); return `<div class="col"><h3>${tit}<span class="badge info">${it.length}</span></h3>${it.map((c) => `<div class="card stack sm"><b>${esc(c.paciente)}</b><small class="muted">${esc(c.horario)}, ${esc(nomeServico(c))}${nomeMedico(c) ? `, ${esc(nomeMedico(c))}` : ""}</small>${st === "aguardando" ? `<small>Espera: <b>${Math.max(0, Math.round((Date.now() - new Date(c.chegouEm || Date.now())) / 60000))} min</b>${c.chamadoEm ? ' <span class="badge ok">Chamado</span>' : ""}</small><button class="btn sm" data-call="${c.id}" type="button">${c.chamadoEm ? "Chamar de Novo" : "Chamar Paciente"}</button>` : ""}</div>`).join("") || '<p class="muted small">Ninguém aqui.</p>'}</div>`; };
    $("#kanban").innerHTML = col("aguardando", "Aguardando") + col("em_atendimento", "Em Atendimento") + col("finalizada", "Finalizado");
    $$("[data-call]").forEach((b) => b.addEventListener("click", () => { const c = DB.find("consultas", b.dataset.call); DB.upd("consultas", c.id, { chamadoEm: new Date().toISOString() }); if (c.medicoId) notificar("medico:" + c.medicoId, "Paciente Chamado", `${c.paciente} foi chamado pela recepção.`, "medico-painel.html"); audit("Chamou paciente", c.paciente); toast(`${c.paciente} chamado no painel da sala de espera.`, "ok"); desenhar(); }));
  };
  raizPag().innerHTML = `<div class="page-head"><h1>Check-in e Fila</h1><a class="btn outline" href="painel-tv.html" target="_blank" rel="noopener">${ico("video")} Abrir Painel da Sala de Espera</a></div>
  <form class="card" id="busca" style="margin-bottom:18px"><label for="q">Buscar paciente por nome, CPF ou QR Code da carteirinha</label><div class="row" style="flex-wrap:nowrap;margin-top:6px"><input id="q" placeholder="Digite ou use o leitor de QR Code" autocomplete="off"><button class="btn" type="submit">Buscar</button></div><div id="res" class="stack" style="margin-top:12px"></div></form><div class="kanban" id="kanban"></div>`;
  $("#busca").addEventListener("submit", (e) => {
    e.preventDefault(); const t = $("#q").value.trim(); if (!t) return;
    let cid = null, depId = null; const m = t.match(/^CAISMED:(CLI|DEP):([^:]+):(.+)$/i);
    if (m) { cid = m[2]; depId = m[1].toUpperCase() === "DEP" ? m[3] : null; }
    const d = soDigitos(t); const cls = DB.get("clientes").filter((c) => (cid ? c.id === cid : c.nome.toLowerCase().includes(t.toLowerCase()) || (d.length >= 3 && c.cpf.includes(d))));
    const cons = DB.get("consultas").filter((c) => c.data === hojeISO() && cls.some((x) => x.id === c.pacienteId) && c.status === "agendada" && (!depId || c.dependenteId === depId));
    $("#res").innerHTML = !cls.length ? vazio("Paciente Não Encontrado", "Confira os dados ou cadastre o paciente.", '<a class="btn sm" href="cliente-form.html">Cadastrar Paciente</a>') : cons.length ? cons.map((c) => `<div class="item" style="cursor:default"><span class="avatar">${esc(c.horario)}</span><span class="grow"><b>${esc(c.paciente)}</b><small>${esc(nomeServico(c))}, ${esc(nomeUnidade(c.unidadeId))}</small></span><button class="btn sm" data-ck="${c.id}" type="button">Check-in</button></div>`).join("") : vazio(`${cls[0].nome} não tem consulta para confirmar hoje`, "", `<a class="btn sm" href="agendar-paciente.html?cliente=${cls[0].id}">Agendar Agora</a>`);
    $$("#res [data-ck]").forEach((b) => b.addEventListener("click", () => checkinRecepcao(b.dataset.ck, () => { $("#res").innerHTML = ""; $("#q").value = ""; desenhar(); })));
  });
  desenhar();
}
function painelTV() {
  const un = unidadeAtiva();
  const d = () => { const l = doDia(un, hojeISO()).filter((c) => c.chamadoEm && ["aguardando", "em_atendimento"].includes(c.status)).sort((a, b) => b.chamadoEm.localeCompare(a.chamadoEm)).slice(0, 5); $("#tv").innerHTML = l.length ? l.map((c, i) => `<div class="card ${i ? "" : "raise"}" style="padding:${i ? 14 : 28}px"><div class="${i ? "" : "display"}" style="font-size:${i ? "1.3rem" : "clamp(2rem,6vw,4rem)"};font-weight:800">${esc(c.paciente.split(" ").slice(0, 2).join(" "))}</div><div class="muted">${esc(nomeMedico(c) || nomeServico(c))}</div></div>`).join("") : '<p class="lead" style="text-align:center;padding:60px 0">Aguarde. Você será chamado pelo nome.</p>'; };
  raizPag().innerHTML = `<div class="page-head"><h1>Chamadas da Sala de Espera</h1><p class="lead">${esc(nomeUnidade(un))}. Esta tela atualiza sozinha.</p></div><div class="stack" id="tv" style="max-width:900px"></div>`; d(); setInterval(d, 2000);
}

// ---------- A07 Cadastro de pacientes ----------
function pacientes() {
  const desenhar = () => {
    const t = $("#q").value.trim().toLowerCase(), dg = soDigitos(t);
    const l = DB.get("clientes").filter((c) => !t || c.nome.toLowerCase().includes(t) || (dg.length >= 3 && c.cpf.includes(dg))).sort((a, b) => a.nome.localeCompare(b.nome));
    $("#lista").innerHTML = l.length ? l.map((c) => `<a class="item" href="paciente.html?id=${c.id}"><span class="avatar">${esc(iniciais(c.nome))}</span><span class="grow"><b>${esc(c.nome)}</b><small>CPF ${fmtCPF(c.cpf)}, ${esc(c.telefone || "")}</small></span><span class="badge info">${esc((PLANOS[c.plano] || {}).nome || "Particular")}</span>${c.senha ? "" : '<span class="badge warn">Sem senha</span>'}</a>`).join("") : vazio("Nenhum Paciente Encontrado", "Cadastre um novo cliente da clínica.", '<a class="btn sm" href="cliente-form.html">Cadastrar Cliente</a>');
  };
  raizPag().innerHTML = `<div class="page-head"><h1>Pacientes</h1><a class="btn" href="cliente-form.html">${ico("plus")} Cadastrar Novo Cliente</a></div><div class="field"><label class="sr" for="q">Buscar</label><input id="q" type="search" placeholder="Buscar por nome ou CPF"></div><div class="grid g2" id="lista"></div>`;
  $("#q").addEventListener("input", desenhar); desenhar();
}
function clienteForm() {
  const id = new URLSearchParams(location.search).get("id"), atual = id ? DB.find("clientes", id) : null;
  let plano = atual?.plano || "";
  raizPag().innerHTML = `<div class="page-head"><h1>${atual ? "Alterar Dados do Cliente" : "Cadastrar Novo Cliente"}</h1></div><form id="f" class="card" style="max-width:820px" novalidate><div class="form-grid"><div class="field full"><label for="nome">Nome completo</label><input id="nome" required></div><div class="field"><label for="cpf">CPF</label><input id="cpf" name="cpf" data-valida="cpf" required></div><div class="field"><label for="nascimento">Data de nascimento</label><input id="nascimento" type="date" max="${hojeISO()}" required></div><div class="field"><label for="telefone">Telefone</label><input id="telefone" type="tel" data-valida="tel" required></div><div class="field"><label for="email">E-mail</label><input id="email" type="email" data-valida="email" required></div><div class="field"><label for="cidade">Cidade</label><input id="cidade" required></div><div class="field"><label for="pagamento">Forma de pagamento</label><select id="pagamento"><option>Pix</option><option>Cartão de Crédito</option><option>Boleto</option></select></div></div><span class="label">Plano do cliente</span><div class="grid g2" id="planos" style="margin:8px 0 18px"></div><div class="actions"><button class="btn" type="submit">Salvar Cliente</button><a class="btn outline" href="pacientes.html">Cancelar</a></div></form>`;
  const pl = () => { $("#planos").innerHTML = Object.entries(PLANOS).map(([k, p]) => `<button type="button" class="opt" data-k="${k}" aria-pressed="${k === plano}"><span class="grow"><b>${esc(p.nome)}, ${brl(p.valor)}/mês</b><small>${esc(p.desc)}. Coparticipação de ${p.copart}%.</small></span></button>`).join("") + `<button type="button" class="opt" data-k="" aria-pressed="${plano === ""}"><span class="grow"><b>Sem plano (particular)</b><small>Paga o valor integral de cada atendimento.</small></span></button>`; $$("#planos .opt").forEach((b) => b.addEventListener("click", () => { plano = b.dataset.k; pl(); })); };
  pl();
  if (atual) ["nome", "nascimento", "telefone", "email", "cidade", "pagamento"].forEach((k) => ($("#" + k).value = atual[k] || "")), ($("#cpf").value = atual.cpf);
  ligarMascaras($("#f"));
  $("#f").addEventListener("submit", async (e) => {
    e.preventDefault(); if (!formularioValido(e.target)) return;
    const cpf = soDigitos($("#cpf").value);
    if (!cpfValido(cpf)) return toast("CPF inválido. Confira os 11 números.", "err");
    if (DB.get("clientes").some((c) => c.cpf === cpf && (!atual || c.id !== atual.id))) return toast("Já existe um cliente cadastrado com este CPF.", "err");
    if (atual && !(await confirmar("Salvar as alterações deste cliente?", { ok: "Salvar" }))) return;
    // TODO: POST /clientes ou PUT /clientes/:id (back-end)
    const d = { nome: $("#nome").value.trim(), cpf, nascimento: $("#nascimento").value, telefone: $("#telefone").value, email: $("#email").value, cidade: $("#cidade").value.trim(), pagamento: $("#pagamento").value, plano };
    let c;
    if (atual) { c = DB.upd("clientes", atual.id, d); audit("Alterou cadastro de cliente", c.nome); }
    else { c = DB.add("clientes", { ...d, dependentes: [], consentimentos: { termos: false, lgpd: false, notificacoes: true, marketing: false, aceitoEm: null }, criadoEm: new Date().toISOString() }); audit("Cadastrou cliente", c.nome); }
    abrirModal({ titulo: atual ? "Dados Atualizados" : "Cliente Cadastrado", corpo: `<p>${atual ? "As alterações foram salvas." : `Peça para ${esc(c.nome.split(" ")[0])} abrir o app, tocar em <b>Primeiro Acesso</b> e criar a senha com o CPF cadastrado.`}</p>`, botoes: [{ rotulo: "Ver Ficha do Paciente", aoClicar: () => { location.href = "paciente.html?id=" + c.id; } }] });
  });
}

// ---------- A08 Ficha do paciente (sem prontuário clínico) ----------
function paciente() {
  const c = DB.find("clientes", new URLSearchParams(location.search).get("id")); if (!c) { raizPag().innerHTML = vazio("Paciente Não Encontrado", "", '<a class="btn sm" href="pacientes.html">Voltar</a>'); return; }
  const cons = DB.get("consultas").filter((x) => x.pacienteId === c.id).sort((a, b) => (b.data || "").localeCompare(a.data || "")), pend = pendencias(c);
  raizPag().innerHTML = `<div class="page-head"><div><h1>${esc(c.nome)}</h1><p class="lead">${esc((PLANOS[c.plano] || {}).nome || "Particular")}</p></div><div class="row"><a class="btn" href="agendar-paciente.html?cliente=${c.id}">Agendar</a><a class="btn outline" href="cliente-form.html?id=${c.id}">${ico("edit")} Alterar Dados</a><a class="btn outline" href="caixa.html?cliente=${c.id}">Cobrar</a></div></div>
  <div class="two-col"><div class="stack"><div class="card"><h2 style="margin-bottom:8px">Dados cadastrais</h2><div class="kv"><span>CPF</span><span>${fmtCPF(c.cpf)}</span></div><div class="kv"><span>Nascimento</span><span>${fmtData(c.nascimento)} (${idade(c.nascimento)} anos)</span></div><div class="kv"><span>Telefone</span><span>${esc(c.telefone)}</span></div><div class="kv"><span>E-mail</span><span>${esc(c.email)}</span></div><div class="kv"><span>Cidade</span><span>${esc(c.cidade)}</span></div><div class="kv"><span>Acesso ao app</span><span>${c.senha ? "Senha criada" : "Aguardando primeiro acesso"}</span></div></div>
  <div class="card stack"><h2>Consultas</h2>${cons.length ? cons.slice(0, 8).map((x) => `<div class="kv"><span>${fmtData(x.data)} ${esc(x.horario || "")}<br><small class="muted">${esc(nomeServico(x))}</small></span><span>${badgeStatus(x.status)}</span></div>`).join("") : '<p class="muted">Sem consultas.</p>'}</div></div>
  <div class="stack"><div class="card stack"><h2>Pendências financeiras</h2>${pend.length ? pend.map((p) => `<div class="kv"><span>${esc(p.descricao)}</span><span>${brl(p.valor)}</span></div>`).join("") : '<p class="muted">Nada em aberto.</p>'}</div><div class="card stack"><h2>Dependentes</h2>${(c.dependentes || []).length ? c.dependentes.map((d) => `<div class="kv"><span>${esc(d.nome)}</span><span>${esc(d.parentesco)}</span></div>`).join("") : '<p class="muted">Nenhum dependente.</p>'}</div><p class="hint">A recepção não tem acesso ao prontuário clínico.</p></div></div>`;
}

// ---------- A09 Caixa ----------
function caixa() {
  const un = unidadeAtiva(), q = new URLSearchParams(location.search), foco = q.get("cliente"), hoje = hojeISO();
  const desenhar = () => {
    const fechado = DB.get("caixas").find((x) => x.data === hoje && x.unidadeId === un);
    const pagsHoje = DB.get("pagamentos").filter((p) => p.data === hoje && p.unidadeId === un);
    const por = {}; pagsHoje.forEach((p) => (por[p.metodo] = (por[p.metodo] || 0) + p.valor)); const total = pagsHoje.reduce((s, p) => s + p.valor, 0);
    let itens = []; const t = ($("#q")?.value || "").trim().toLowerCase(), dg = soDigitos(t);
    DB.get("clientes").forEach((c) => { if (foco && c.id !== foco && !t) return; if (t && !(c.nome.toLowerCase().includes(t) || (dg.length >= 3 && c.cpf.includes(dg)))) return; if (!foco && !t) { pendencias(c).filter((p) => p.tipo === "consulta" && DB.find("consultas", p.consultaId)?.unidadeId === un).forEach((p) => itens.push({ c, p })); } else pendencias(c).forEach((p) => itens.push({ c, p })); });
    $("#pend").innerHTML = itens.length ? itens.map(({ c, p }, i) => `<div class="item" style="cursor:default"><span class="grow"><b>${esc(c.nome)}</b><small>${esc(p.descricao)}</small></span><b>${brl(p.valor)}</b><button class="btn sm" data-cobrar="${i}" type="button" ${fechado ? "disabled" : ""}>Cobrar</button></div>`).join("") : vazio("Nenhuma Cobrança Pendente", "Busque um paciente para ver as pendências dele.");
    $("#resumo").innerHTML = `<div class="kv"><span>Recebimentos do dia</span><span>${pagsHoje.length}</span></div>${Object.entries(por).map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><span>${brl(v)}</span></div>`).join("")}<div class="kv"><span><b>Total em caixa</b></span><span><b>${brl(total)}</b></span></div>${fechado ? `<p class="badge ok" style="margin-top:10px">Caixa fechado às ${fmtHora(fechado.quando).slice(-5)} por ${esc(fechado.por)}</p>` : `<button class="btn block" id="fechar" type="button" style="margin-top:12px">Fechar Caixa do Dia</button>`}`;
    $$("[data-cobrar]").forEach((b) => b.addEventListener("click", () => cobrar(itens[+b.dataset.cobrar])));
    $("#fechar")?.addEventListener("click", async () => { if (await confirmar(`Fechar o caixa de hoje com total de ${brl(total)}? Depois disso não dá para registrar novas cobranças hoje.`, { ok: "Fechar Caixa" })) { DB.add("caixas", { data: hoje, unidadeId: un, total, porMetodo: por, por: eu().nome, quando: new Date().toISOString() }); audit("Fechou o caixa", `${nomeUnidade(un)} ${fmtData(hoje)} ${brl(total)}`); desenhar(); } });
  };
  function cobrar({ c, p }) {
    abrirModal({ titulo: "Cobrar " + brl(p.valor), corpo: `<p class="muted">${esc(c.nome)}: ${esc(p.descricao)}</p><div class="field" style="margin-top:12px"><label for="met">Forma de pagamento</label><select id="met"><option>Dinheiro</option><option>Pix</option><option>Cartão de Débito</option><option>Cartão de Crédito</option></select></div><div class="field" id="rec-box"><label for="rec">Valor recebido</label><input id="rec" type="number" step="0.01" min="0" value="${p.valor}"><span class="hint" id="troco">Troco: R$ 0,00</span></div>`,
      aoAbrir: (ov) => { const m = $("#met", ov), r = $("#rec", ov); const f = () => { $("#rec-box", ov).hidden = m.value !== "Dinheiro"; $("#troco", ov).textContent = "Troco: " + brl(Math.max(0, (+r.value || 0) - p.valor)); }; m.addEventListener("change", f); r.addEventListener("input", f); f(); },
      botoes: [{ rotulo: "Voltar", classe: "outline" }, { rotulo: "Confirmar Recebimento", aoClicar: () => { if ($("#met").value === "Dinheiro" && (+$("#rec").value || 0) < p.valor) { toast("O valor recebido é menor que o valor cobrado.", "err"); return false; } const met = $("#met").value; registrarPagamento(c, p, met, eu().nome, un); toast("Pagamento registrado.", "ok"); setTimeout(() => { desenhar(); abrirModal({ titulo: "Emitir Recibo?", corpo: `<p>Pagamento de ${brl(p.valor)} registrado.</p>`, botoes: [{ rotulo: "Não Precisa", classe: "outline" }, { rotulo: "Imprimir Recibo", aoClicar: () => imprimirDoc("Recibo CaisMed", `<h1>Recibo de Pagamento</h1><p class="m">${esc(nomeUnidade(un))}<br>${fmtData(hoje)}</p><p>Recebemos de <b>${esc(c.nome)}</b> (CPF ${fmtCPF(c.cpf)}) a quantia de <b>${brl(p.valor)}</b>, referente a ${esc(p.descricao)}, pago em ${esc(met)}.</p><div class="sig">${esc(eu().nome)}<br>CaisMed</div>`) }] }); }, 100); } }] });
  }
  raizPag().innerHTML = `<div class="page-head"><div><h1>Caixa</h1><p class="lead">${esc(nomeUnidade(un))}, ${fmtDataLonga(hoje)}</p></div></div><div class="two-col"><div class="stack"><div class="field"><label class="sr" for="q">Buscar paciente</label><input id="q" type="search" placeholder="Buscar paciente por nome ou CPF"></div><div class="stack" id="pend"></div></div><div class="card" id="resumo"></div></div>`;
  $("#q").addEventListener("input", desenhar); desenhar();
}

// ---------- A11 Lista de espera ----------
function espera() {
  const desenhar = () => {
    const l = DB.get("espera").sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    $("#lista").innerHTML = l.length ? l.map((e) => { const c = DB.find("clientes", e.clienteId); return `<div class="card stack sm"><div class="row between"><b>${esc(c?.nome || "—")}</b>${e.avisado ? '<span class="badge ok">Avisado</span>' : '<span class="badge warn">Aguardando</span>'}</div><p class="muted">${esc(espNome(e.especialidade))}, desde ${fmtHora(e.criadoEm)}</p><div class="row"><a class="btn sm" href="agendar-paciente.html?cliente=${e.clienteId}&especialidade=${e.especialidade}">Agendar</a><button class="btn outline sm" data-av="${e.id}" type="button">Avisar Agora</button><button class="btn danger outline sm" data-rm="${e.id}" type="button">Remover</button></div></div>`; }).join("") : vazio("Lista de Espera Vazia", "Quando um paciente não achar horário, ele entra aqui. Ao cancelar uma consulta, o aviso sai automático.");
    $$("[data-av]").forEach((b) => b.addEventListener("click", () => { const e = DB.find("espera", b.dataset.av); notificar("cliente:" + e.clienteId, "Temos Horário Para Você", `Pode haver vaga de ${espNome(e.especialidade)}. Toque para agendar.`, "agendamento.html?especialidade=" + e.especialidade); DB.upd("espera", e.id, { avisado: true }); toast("Paciente avisado.", "ok"); desenhar(); }));
    $$("[data-rm]").forEach((b) => b.addEventListener("click", () => { DB.del("espera", b.dataset.rm); desenhar(); }));
  };
  raizPag().innerHTML = `<div class="page-head"><h1>Lista de Espera</h1></div><div class="grid g2" id="lista"></div>`; desenhar();
}

ready(() => {
  ({ "atendente-painel": atendentePainel, agenda, "agendar-paciente": () => iniciarWizard("atendente"), fila, "painel-tv": painelTV, pacientes, "cliente-form": clienteForm, paciente, caixa, espera })[document.body.dataset.pagina]?.();
});
