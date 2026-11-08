"use strict";
/* Portal do Médico (M01 a M14) */

const CIDS = ["J00 - Resfriado comum", "J06.9 - Infecção aguda das vias aéreas superiores", "G44.2 - Cefaleia tensional", "I10 - Hipertensão essencial", "E11 - Diabetes mellitus tipo 2", "M54.5 - Dor lombar baixa", "K29.7 - Gastrite", "L20 - Dermatite atópica", "R50.9 - Febre não especificada", "Z00.0 - Exame médico geral", "N76.0 - Vaginite aguda", "J45 - Asma", "B34.9 - Infecção viral não especificada"];
const MODELOS_RX = { "Dor e febre": [{ nome: "Dipirona 500 mg", posologia: "1 comprimido a cada 6 horas se dor ou febre, por até 3 dias" }], "Resfriado": [{ nome: "Soro fisiológico nasal", posologia: "2 jatos em cada narina, 3 vezes ao dia" }, { nome: "Paracetamol 750 mg", posologia: "1 comprimido a cada 8 horas se febre ou dor, por 3 dias" }], "Hidratação e repouso": [{ nome: "Hidratação oral", posologia: "Beber de 2 a 3 litros de água por dia e repousar" }] };
const euMedico = () => eu();

// ---------- M01 / M02 Agenda do dia e da semana ----------
function medicoPainel() {
  const me = euMedico(), un = unidadeAtiva();
  let data = sessionStorage.getItem("medData") || hojeISO(), modo = "dia";
  if (new URLSearchParams(location.search).get("ok")) toast("Atendimento finalizado. Documentos enviados ao paciente.", "ok");
  const minhas = (iso) => DB.get("consultas").filter((c) => c.medicoId === me.id && c.data === iso && c.status !== "cancelada" && (!un || c.unidadeId === un || c.unidadeId === "online")).sort((a, b) => a.horario.localeCompare(b.horario));
  const linha = (c) => { const chamado = c.chamadoEm && c.status === "aguardando"; return `<div class="item" style="cursor:default${c.status === "aguardando" ? ";border-color:var(--blue-text)" : ""}"><span class="avatar">${esc(c.horario)}</span><span class="grow"><b>${esc(c.paciente)}</b><small>${esc(nomeServico(c))}${c.tipo === "teleconsulta" ? ", online" : ", " + esc(nomeUnidade(c.unidadeId))}</small>${c.preTriagem ? '<small>Tem pré-triagem do chatbot</small>' : ""}</span>${chamado ? '<span class="badge ok">Chamado</span>' : ""}${badgeStatus(c.status)}${c.status === "aguardando" && !chamado && c.tipo !== "teleconsulta" ? `<button class="btn outline sm" data-chamar="${c.id}" type="button">Chamar</button>` : ""}<a class="btn sm ${["agendada"].includes(c.status) ? "outline" : ""}" href="atendimento.html?id=${c.id}">${c.status === "finalizada" ? "Ver" : "Atender"}</a></div>`; };
  const desenhar = () => {
    sessionStorage.setItem("medData", data); $("#data-lbl").textContent = fmtDataLonga(data);
    const l = minhas(data), hoje = minhas(hojeISO());
    $("#stats").innerHTML = `<div class="stat"><b>${hoje.length}</b><span>Consultas hoje</span></div><div class="stat"><b>${hoje.filter((c) => c.status === "aguardando").length}</b><span>Aguardando agora</span></div><div class="stat"><b>${hoje.filter((c) => c.status === "em_atendimento").length}</b><span>Em atendimento</span></div><div class="stat"><b>${hoje.filter((c) => c.status === "finalizada").length}</b><span>Finalizadas hoje</span></div>`;
    if (modo === "dia") $("#corpo").innerHTML = l.length ? `<div class="stack">${l.map(linha).join("")}</div>` : vazio("Sem Consultas Neste Dia", "Quando houver pacientes agendados, eles aparecem aqui.");
    else { const seg = addDias(data, -((diaSemana(data) + 6) % 7)); $("#corpo").innerHTML = `<div class="grid g4">${Array.from({ length: 7 }, (_, i) => addDias(seg, i)).map((d) => { const x = minhas(d); return `<button type="button" class="card stack sm" data-dia="${d}" style="text-align:left;${d === hojeISO() ? "border-color:var(--blue-text)" : ""}"><b>${fmtDataLonga(d)}</b><span class="badge ${x.length ? "info" : "mute"}">${x.length} consulta(s)</span>${x.slice(0, 3).map((c) => `<small class="muted">${esc(c.horario)} ${esc(c.paciente.split(" ")[0])}</small>`).join("")}</button>`; }).join("")}</div>`; $$("[data-dia]").forEach((b) => b.addEventListener("click", () => { data = b.dataset.dia; modo = "dia"; $$("#modo button").forEach((o) => o.setAttribute("aria-selected", String(o.dataset.m === "dia"))); desenhar(); })); }
    $$("[data-chamar]").forEach((b) => b.addEventListener("click", () => { DB.upd("consultas", b.dataset.chamar, { chamadoEm: new Date().toISOString() }); audit("Chamou paciente", DB.find("consultas", b.dataset.chamar).paciente); toast("Paciente chamado.", "ok"); desenhar(); }));
  };
  raizPag().innerHTML = `<div class="page-head"><div><h1>Agenda do Dia</h1><p class="lead">${esc(me.nome)}${un ? `, ${esc(nomeUnidade(un))}` : ", todas as unidades"}</p></div></div><div class="stats" id="stats"></div><div class="row between" style="margin-bottom:14px"><div class="row"><button class="btn outline sm" id="ant" type="button" aria-label="Anterior">${ico("back")}</button><b id="data-lbl" style="min-width:150px;text-align:center"></b><button class="btn outline sm" id="prox" type="button" aria-label="Próximo">${ico("right")}</button><button class="btn outline sm" id="hj" type="button">Hoje</button></div><div class="seg" id="modo" role="tablist" style="width:auto"><button data-m="dia" aria-selected="true" type="button">Dia</button><button data-m="semana" aria-selected="false" type="button">Semana</button></div></div><div id="corpo"></div>`;
  const passo = () => (modo === "dia" ? 1 : 7);
  $("#ant").addEventListener("click", () => { data = addDias(data, -passo()); desenhar(); }); $("#prox").addEventListener("click", () => { data = addDias(data, passo()); desenhar(); }); $("#hj").addEventListener("click", () => { data = hojeISO(); desenhar(); });
  $$("#modo button").forEach((b) => b.addEventListener("click", () => { modo = b.dataset.m; $$("#modo button").forEach((o) => o.setAttribute("aria-selected", String(o === b))); desenhar(); }));
  desenhar();
  setInterval(() => !document.querySelector(".overlay") && modo === "dia" && desenhar(), 8000);
}

// ---------- M03 / M05 / M06 Atendimento ----------
function atendimento() {
  const id = new URLSearchParams(location.search).get("id"); let c = DB.find("consultas", id), me = euMedico();
  if (!c || c.medicoId !== me.id) { raizPag().innerHTML = vazio("Consulta Não Encontrada", "Você só acessa os atendimentos da sua agenda.", '<a class="btn sm" href="medico-painel.html">Voltar à Agenda</a>'); return; }
  const cl = DB.find("clientes", c.pacienteId) || { nome: c.paciente, alertas: {} }, somenteLer = c.status === "finalizada";
  if (["agendada", "aguardando"].includes(c.status) && c.tipo !== "teleconsulta") c = DB.upd("consultas", id, (x) => ({ status: "em_atendimento", iniciouEm: new Date().toISOString(), historico: [...(x.historico || []), { quando: new Date().toISOString(), texto: "Atendimento iniciado" }] }));
  audit("Abriu prontuário/atendimento", c.paciente);
  const r = c.rascunho || { anamnese: c.anamnese || "", evolucao: c.evolucao || "", cid: c.cid || "", meds: [], atestado: { on: false, dias: 1, texto: "" }, exames: [], justificativa: "", anexos: [] };
  const hist = DB.get("consultas").filter((x) => x.pacienteId === c.pacienteId && x.status === "finalizada" && x.id !== c.id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3);
  const t = c.preTriagem, al = cl.alertas || {};
  const exames = DB.get("exames", EXAMES_PADRAO);
  raizPag().innerHTML = `<div class="page-head"><div><h1>${esc(c.paciente)}</h1><p class="lead">${cl.nascimento ? idade(cl.nascimento) + " anos, " : ""}${esc((PLANOS[cl.plano] || {}).nome || "Particular")}. ${esc(nomeServico(c))}, ${esc(c.horario)}</p></div><div class="row">${badgeStatus(c.status)}<a class="btn outline sm" href="prontuario.html?paciente=${c.pacienteId}">Prontuário Completo</a></div></div>
  ${c.tipo === "teleconsulta" && !somenteLer ? `<div class="card pale row between" style="margin-bottom:14px"><span><b>Teleconsulta</b><br><small class="muted">${c.teleIniciada ? "Chamada em andamento. O vídeo vem do serviço de videochamada do back-end." : "O paciente entra na sala de espera e aguarda você iniciar."}</small></span>${c.teleIniciada ? "" : `<button class="btn" id="tele" type="button">${ico("video")} Iniciar Teleconsulta</button>`}</div>` : ""}
  <div class="two-col"><div class="stack"><div class="tabs" id="abas">${[["t-an", "Anamnese"], ["t-ev", "Evolução e CID"], ["t-rx", "Prescrição"], ["t-ex", "Exames"], ["t-ax", "Anexos"]].map(([k, v], i) => `<button type="button" class="tab-btn ${i ? "" : "active"}" data-tab="${k}">${v}</button>`).join("")}</div>
  <div class="tab-panel active" id="t-an"><div class="field"><label for="anamnese">Queixa principal e história</label><textarea id="anamnese" rows="8">${esc(r.anamnese)}</textarea></div></div>
  <div class="tab-panel" id="t-ev"><div class="field"><label for="evolucao">Evolução clínica</label><textarea id="evolucao" rows="7">${esc(r.evolucao)}</textarea></div><div class="field"><label for="cid">Diagnóstico (CID)</label><input id="cid" list="cids" value="${esc(r.cid)}" placeholder="Digite o código ou o nome"><datalist id="cids">${CIDS.map((x) => `<option value="${esc(x)}">`).join("")}</datalist></div></div>
  <div class="tab-panel" id="t-rx"><div class="row"><div class="field" style="margin:0;flex:1 1 200px"><label for="modelo">Modelo pronto</label><select id="modelo"><option value="">Escolha um modelo</option>${Object.keys(MODELOS_RX).map((k) => `<option>${k}</option>`).join("")}</select></div><button class="btn outline sm" id="add-med" type="button" style="align-self:flex-end">${ico("plus")} Adicionar Medicamento</button></div><div class="stack" id="meds"></div>
    <label class="check" style="margin-top:8px"><input type="checkbox" id="at-on" ${r.atestado.on ? "checked" : ""}> Emitir atestado</label><div id="at-box" class="form-grid" ${r.atestado.on ? "" : "hidden"}><div class="field"><label for="at-dias">Dias de afastamento</label><input id="at-dias" type="number" min="1" max="30" value="${r.atestado.dias}"></div><div class="field full"><label for="at-txt">Texto do atestado</label><textarea id="at-txt">${esc(r.atestado.texto)}</textarea></div></div><button class="btn outline sm" id="prev-rx" type="button">${ico("print")} Visualizar Receita em PDF</button></div>
  <div class="tab-panel" id="t-ex"><div class="field"><label for="busca-ex">Buscar exame</label><input id="busca-ex" type="search" placeholder="Digite o nome do exame"></div><div class="stack" id="lista-ex"></div><div class="field" style="margin-top:12px"><label for="just">Justificativa clínica</label><textarea id="just">${esc(r.justificativa)}</textarea></div></div>
  <div class="tab-panel" id="t-ax"><div class="field"><label for="anexo">Anexar arquivo (foto ou PDF)</label><input id="anexo" type="file" accept="image/*,application/pdf" multiple></div><div class="stack" id="lista-ax"></div></div>
  ${somenteLer ? '<p class="badge ok">Atendimento finalizado. Somente leitura.</p>' : `<div class="actions"><button class="btn outline" id="salvar" type="button">Salvar Rascunho</button><button class="btn" id="finalizar" type="button">Finalizar Atendimento</button></div>`}</div>
  <div class="stack"><div class="card stack sm"><div class="card-h"><h2>Alertas clínicos</h2>${somenteLer ? "" : '<button class="link" id="ed-al" type="button">Editar</button>'}</div><p><b>Alergias:</b> ${esc(al.alergias || "Não informado")}</p><p><b>Medicamentos em uso:</b> ${esc(al.medicamentos || "Não informado")}</p></div>
  ${t ? `<div class="card stack sm"><h2>Pré-triagem do chatbot</h2><p><b>Motivo:</b> ${esc(t.motivo || "—")}</p><p><b>Sintomas:</b> ${esc((t.sintomas || []).map((s) => ({ febre: "Febre", tosse: "Tosse", dor_cabeca: "Dor de cabeça", dor_corpo: "Dor no corpo", falta_ar: "Falta de ar", nausea: "Náusea" }[s] || s)).join(", ") || "Nenhum")}</p><p><b>Urgência:</b> ${esc({ baixa: "Baixa", media: "Média", alta: "Alta" }[t.urgencia] || "—")}</p><p><b>Observações:</b> ${esc(t.observacoes || "—")}</p></div>` : ""}
  <div class="card stack sm"><h2>Histórico resumido</h2>${hist.length ? hist.map((x) => `<div class="kv"><span>${fmtData(x.data)}<br><small class="muted">${esc(x.cid || "")}</small></span><span class="small">${esc((x.evolucao || "").slice(0, 110))}</span></div>`).join("") : '<p class="muted">Primeira consulta nesta clínica.</p>'}</div></div></div>`;
  ligarAbas(raizPag());
  const st = { ...r, meds: [...(r.meds || [])], exames: [...(r.exames || [])], anexos: [...(r.anexos || [])] };
  const rascunho = () => { st.anamnese = $("#anamnese").value; st.evolucao = $("#evolucao").value; st.cid = $("#cid").value; st.atestado = { on: $("#at-on").checked, dias: +$("#at-dias").value || 1, texto: $("#at-txt").value }; st.justificativa = $("#just").value; if (!somenteLer) DB.upd("consultas", id, { rascunho: st }); };
  const medsUI = () => { $("#meds").innerHTML = st.meds.length ? st.meds.map((m, i) => `<div class="card stack sm"><div class="row" style="flex-wrap:nowrap"><input data-m="${i}" data-k="nome" value="${esc(m.nome)}" placeholder="Medicamento e dose" aria-label="Medicamento"><button class="btn danger outline sm" data-rm="${i}" type="button" aria-label="Remover">${ico("trash")}</button></div><input data-m="${i}" data-k="posologia" value="${esc(m.posologia)}" placeholder="Como tomar" aria-label="Posologia"></div>`).join("") : '<p class="muted">Nenhum medicamento adicionado.</p>'; $$("[data-m]").forEach((el) => el.addEventListener("input", () => { st.meds[+el.dataset.m][el.dataset.k] = el.value; rascunho(); })); $$("[data-rm]").forEach((b) => b.addEventListener("click", () => { st.meds.splice(+b.dataset.rm, 1); medsUI(); rascunho(); })); };
  const exUI = () => { const q = $("#busca-ex").value.toLowerCase(); $("#lista-ex").innerHTML = exames.filter((x) => x.nome.toLowerCase().includes(q)).map((x) => `<label class="check"><input type="checkbox" data-ex="${x.id}" ${st.exames.includes(x.id) ? "checked" : ""}> ${esc(x.nome)}</label>`).join(""); $$("[data-ex]").forEach((el) => el.addEventListener("change", () => { st.exames = el.checked ? [...new Set([...st.exames, el.dataset.ex])] : st.exames.filter((x) => x !== el.dataset.ex); rascunho(); })); };
  const axUI = () => ($("#lista-ax").innerHTML = st.anexos.length ? st.anexos.map((a) => `<div class="item" style="cursor:default">${ico("file")}<span class="grow">${esc(a)}</span></div>`).join("") : '<p class="muted">Nenhum anexo.</p>');
  medsUI(); exUI(); axUI();
  if (somenteLer) $$("input,textarea,select,button.btn:not(.outline)", raizPag()).forEach((el) => { if (!el.closest("#abas") && !el.closest(".page-head")) el.disabled = true; });
  $$("textarea,#cid,#at-dias,#just").forEach((el) => el.addEventListener("input", rascunho));
  $("#at-on").addEventListener("change", () => { $("#at-box").hidden = !$("#at-on").checked; rascunho(); });
  $("#busca-ex").addEventListener("input", exUI);
  $("#anexo").addEventListener("change", (e) => { st.anexos.push(...[...e.target.files].map((f) => f.name)); axUI(); rascunho(); });
  $("#add-med").addEventListener("click", () => { st.meds.push({ nome: "", posologia: "" }); medsUI(); rascunho(); });
  $("#modelo").addEventListener("change", (e) => { if (e.target.value) { st.meds.push(...structuredClone(MODELOS_RX[e.target.value])); medsUI(); rascunho(); e.target.value = ""; } });
  $("#tele")?.addEventListener("click", () => { DB.upd("consultas", id, { teleIniciada: true, status: "em_atendimento", iniciouEm: new Date().toISOString() }); audit("Iniciou teleconsulta", c.paciente); location.reload(); });
  $("#ed-al")?.addEventListener("click", () => abrirModal({ titulo: "Alertas Clínicos", corpo: `<div class="field"><label for="a1">Alergias</label><input id="a1" value="${esc(al.alergias || "")}"></div><div class="field"><label for="a2">Medicamentos em uso</label><input id="a2" value="${esc(al.medicamentos || "")}"></div>`, botoes: [{ rotulo: "Cancelar", classe: "outline" }, { rotulo: "Salvar", aoClicar: () => { DB.upd("clientes", cl.id, { alertas: { alergias: $("#a1").value, medicamentos: $("#a2").value } }); audit("Atualizou alertas clínicos", c.paciente); setTimeout(() => location.reload(), 100); } }] }));
  const corpoRx = () => `<h1>Receita Médica</h1><p class="m">Paciente: ${esc(c.paciente)}<br>Data: ${fmtData(hojeISO())}<br>${esc(me.nome)}, ${esc(me.crm)}</p><ul>${st.meds.filter((m) => m.nome).map((m) => `<li><b>${esc(m.nome)}</b><br>${esc(m.posologia)}</li>`).join("")}</ul><div class="sig">${esc(me.nome)}<br>${esc(me.crm)}<br>Assinatura digital (simulada)</div>`;
  $("#prev-rx").addEventListener("click", () => (st.meds.filter((m) => m.nome).length ? imprimirDoc("Receita Médica", corpoRx()) : toast("Adicione ao menos um medicamento.", "err")));
  $("#salvar")?.addEventListener("click", () => { rascunho(); toast("Rascunho salvo.", "ok"); });
  $("#finalizar")?.addEventListener("click", async () => {
    rascunho();
    if (!st.evolucao.trim()) { toast("Preencha a evolução clínica antes de finalizar.", "err"); $$("#abas .tab-btn")[1].click(); return; }
    if (!(await confirmar("Finalizar o atendimento? Receitas e pedidos serão enviados ao paciente.", { ok: "Finalizar" }))) return;
    // TODO: POST /atendimentos/:id/finalizar (back-end valida assinatura digital e regras do CFM)
    const hoje = hojeISO(), base = { clienteId: c.pacienteId, consultaId: c.id, medicoId: me.id, data: hoje, visto: false };
    const meds = st.meds.filter((m) => m.nome.trim());
    if (meds.length) DB.add("documentos", { ...base, tipo: "receita", titulo: "Receita Médica", itens: meds });
    if (st.exames.length) DB.add("documentos", { ...base, tipo: "exame_pedido", titulo: "Pedido de Exame: " + st.exames.map((x) => exames.find((e) => e.id === x)?.nome).join(", "), itens: st.exames.map((x) => ({ nome: exames.find((e) => e.id === x)?.nome, posologia: "Justificativa: " + (st.justificativa || "avaliação clínica") })) });
    if (st.atestado.on) DB.add("documentos", { ...base, tipo: "atestado", titulo: "Atestado Médico", texto: `Atesto que ${c.paciente} esteve em consulta em ${fmtData(hoje)} e deve permanecer afastado por ${st.atestado.dias} dia(s). ${st.atestado.texto}`, itens: [] });
    DB.upd("consultas", id, (x) => ({ status: "finalizada", atendida: true, finalizadoEm: new Date().toISOString(), anamnese: st.anamnese, evolucao: st.evolucao, cid: st.cid, anexos: st.anexos, rascunho: null, historico: [...(x.historico || []), { quando: new Date().toISOString(), texto: "Atendimento finalizado" }] }));
    notificar("cliente:" + c.pacienteId, "Documentos Disponíveis", "Seu atendimento foi finalizado. Receitas e pedidos já estão em Documentos.", "documentos.html");
    audit("Finalizou atendimento", c.paciente);
    location.href = "medico-painel.html?ok=1";
  });
}

// ---------- M04 Prontuário completo ----------
function prontuario() {
  const pid = new URLSearchParams(location.search).get("paciente"), perfil = Sessao.perfil, me = eu();
  const cl = DB.find("clientes", pid);
  if (!cl) { raizPag().innerHTML = vazio("Paciente Não Encontrado"); return; }
  if (perfil === "medico" && !DB.get("consultas").some((c) => c.medicoId === me.id && c.pacienteId === pid)) { location.replace("estado.html?tipo=sem-permissao"); return; }
  const desenhar = () => {
    audit(perfil === "admin" ? "Acessou prontuário (admin)" : "Abriu prontuário", cl.nome);
    const ev = [];
    DB.get("consultas").filter((c) => c.pacienteId === pid && c.status === "finalizada").forEach((c) => ev.push({ d: c.data, t: `Consulta: ${nomeServico(c)}`, m: medicoPorId(c.medicoId)?.nome, txt: [c.anamnese && `Anamnese: ${c.anamnese}`, c.evolucao && `Evolução: ${c.evolucao}`, c.cid && `CID: ${c.cid}`].filter(Boolean).join("\n") }));
    DB.get("documentos").filter((d) => d.clienteId === pid).forEach((d) => ev.push({ d: d.data, t: d.titulo, m: medicoPorId(d.medicoId)?.nome, txt: [d.laudo, d.texto, ...(d.itens || []).map((i) => `${i.nome}: ${i.posologia || ""}`)].filter(Boolean).join("\n") }));
    ev.sort((a, b) => b.d.localeCompare(a.d));
    const draw = () => { const q = $("#busca").value.toLowerCase(); const l = ev.filter((e) => !q || `${e.t} ${e.txt} ${e.m}`.toLowerCase().includes(q)); $("#linha").innerHTML = l.length ? l.map((e) => `<div class="ev"><div class="row between"><b>${esc(e.t)}</b><span class="muted small">${fmtData(e.d)}</span></div>${e.m ? `<small class="muted">${esc(e.m)}</small>` : ""}${e.txt ? `<p style="white-space:pre-line;margin-top:6px">${esc(e.txt)}</p>` : ""}</div>`).join("") : vazio("Nada Encontrado", "Tente outra palavra na busca."); };
    raizPag().innerHTML = `<div class="page-head"><div><h1>Prontuário: ${esc(cl.nome)}</h1><p class="lead">${idade(cl.nascimento)} anos. Todo acesso fica registrado em auditoria.</p></div></div><div class="card stack sm" style="margin-bottom:16px"><p><b>Alergias:</b> ${esc(cl.alertas?.alergias || "Não informado")}</p><p><b>Medicamentos em uso:</b> ${esc(cl.alertas?.medicamentos || "Não informado")}</p></div><div class="field"><label for="busca" class="sr">Buscar no histórico</label><input id="busca" type="search" placeholder="Buscar no histórico (diagnóstico, remédio, exame...)"></div><div class="timeline" id="linha"></div>`;
    $("#busca").addEventListener("input", draw); draw();
  };
  if (perfil === "admin" && !sessionStorage.getItem("just" + pid)) {
    raizPag().innerHTML = vazio("Acesso Com Justificativa", "O administrador só abre prontuário com justificativa. O motivo fica registrado na auditoria.");
    abrirModal({ titulo: "Justificar Acesso ao Prontuário", corpo: `<div class="field"><label for="just">Motivo do acesso</label><textarea id="just" required></textarea></div>`, botoes: [{ rotulo: "Voltar", classe: "outline", aoClicar: () => { location.href = "admin-auditoria.html"; } }, { rotulo: "Acessar", aoClicar: () => { const j = $("#just").value.trim(); if (j.length < 10) { toast("Descreva o motivo com pelo menos 10 letras.", "err"); return false; } sessionStorage.setItem("just" + pid, j); audit("Justificativa de acesso ao prontuário", `${cl.nome}: ${j}`); setTimeout(desenhar, 50); } }] });
    return;
  }
  desenhar();
}

// ---------- M10 Meus pacientes ----------
function meusPacientes() {
  const me = eu(), cons = DB.get("consultas").filter((c) => c.medicoId === me.id);
  const ids = [...new Set(cons.map((c) => c.pacienteId).filter(Boolean))];
  const desenhar = () => { const q = $("#q").value.toLowerCase(); const l = ids.map((i) => DB.find("clientes", i)).filter((c) => c && (!q || c.nome.toLowerCase().includes(q))); $("#lista").innerHTML = l.length ? l.map((c) => { const mine = cons.filter((x) => x.pacienteId === c.id), ult = mine.filter((x) => x.status === "finalizada").sort((a, b) => b.data.localeCompare(a.data))[0]; return `<a class="item" href="prontuario.html?paciente=${c.id}"><span class="avatar">${esc(iniciais(c.nome))}</span><span class="grow"><b>${esc(c.nome)}</b><small>${mine.length} consulta(s)${ult ? `, última em ${fmtData(ult.data)}` : ""}</small></span>${ico("right")}</a>`; }).join("") : vazio("Nenhum Paciente", "Você vê só quem já atendeu ou está na sua agenda."); };
  raizPag().innerHTML = `<div class="page-head"><h1>Meus Pacientes</h1></div><div class="field"><label class="sr" for="q">Buscar</label><input id="q" type="search" placeholder="Buscar por nome"></div><div class="grid g2" id="lista"></div>`;
  $("#q").addEventListener("input", desenhar); desenhar();
}

// ---------- M11 Meus horários, folgas e férias ----------
function horarios() {
  const salvar = (m) => { DB.upd("usuarios", m.id, { disp: m.disp, folgas: m.folgas }); };
  const desenhar = () => {
    const m = eu(); m.disp ||= []; m.folgas ||= [];
    raizPag().innerHTML = `<div class="page-head"><h1>Meus Horários</h1><button class="btn" id="novo" type="button">${ico("plus")} Adicionar Horário</button></div><div class="two-col"><div class="stack"><h2>Disponibilidade por unidade</h2>${m.disp.length ? m.disp.map((b, i) => `<div class="card stack sm"><div class="row between"><b>${esc(nomeUnidade(b.unidadeId))}</b><button class="btn danger outline sm" data-rm="${i}" type="button">${ico("trash")} Remover</button></div><p>${b.dias.map((d) => DIAS[d].slice(0, 3)).join(", ")}</p><p class="muted">${b.inicio} às ${b.fim}, consultas de ${b.duracao} minutos</p></div>`).join("") : vazio("Sem Horários Definidos", "Adicione os dias e horários em que você atende.")}</div>
    <div class="stack"><div class="row between"><h2>Folgas e férias</h2><button class="btn outline sm" id="nova-folga" type="button">${ico("plus")} Adicionar</button></div>${m.folgas.length ? m.folgas.map((f, i) => `<div class="item" style="cursor:default"><span class="grow"><b>${fmtData(f.inicio)} a ${fmtData(f.fim)}</b><small>${esc(f.motivo || "Folga")}</small></span><button class="btn danger outline sm" data-rf="${i}" type="button" aria-label="Remover">${ico("trash")}</button></div>`).join("") : '<p class="muted">Nenhuma folga ou férias cadastrada.</p>'}<p class="hint">Nesses dias nenhum horário seu fica disponível para agendamento.</p></div></div>`;
    $$("[data-rm]").forEach((b) => b.addEventListener("click", async () => { if (await confirmar("Remover este horário? Consultas já marcadas continuam.", { perigo: true, ok: "Remover" })) { m.disp.splice(+b.dataset.rm, 1); salvar(m); desenhar(); } }));
    $$("[data-rf]").forEach((b) => b.addEventListener("click", () => { m.folgas.splice(+b.dataset.rf, 1); salvar(m); desenhar(); }));
    $("#novo").addEventListener("click", () => abrirModal({ titulo: "Adicionar Horário", corpo: `<div class="field"><label for="h-un">Unidade</label><select id="h-un">${unidadesDoUsuario().map((u) => `<option value="${u.id}">${esc(u.nome)}</option>`).join("")}</select></div><span class="label">Dias da semana</span><div class="chips" id="h-dias" style="margin:6px 0 12px">${[1, 2, 3, 4, 5, 6].map((d) => `<button type="button" class="chip" data-d="${d}" aria-pressed="false">${DIAS[d].slice(0, 3)}</button>`).join("")}</div><div class="form-grid"><div class="field"><label for="h-i">Início</label><input id="h-i" type="time" value="08:00"></div><div class="field"><label for="h-f">Fim</label><input id="h-f" type="time" value="12:00"></div></div><div class="field"><label for="h-d">Duração da consulta</label><select id="h-d">${[15, 20, 30, 40, 60].map((x) => `<option ${x === 30 ? "selected" : ""} value="${x}">${x} minutos</option>`).join("")}</select></div>`,
      aoAbrir: (ov) => $$("#h-dias .chip", ov).forEach((b) => b.addEventListener("click", () => b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")))),
      botoes: [{ rotulo: "Cancelar", classe: "outline" }, { rotulo: "Salvar Horário", aoClicar: () => { const dias = $$("#h-dias .chip").filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => +b.dataset.d), i = $("#h-i").value, f = $("#h-f").value; if (!dias.length) { toast("Escolha ao menos um dia.", "err"); return false; } if (!i || !f || hm(f) <= hm(i)) { toast("O fim precisa ser depois do início.", "err"); return false; } m.disp.push({ unidadeId: $("#h-un").value, dias, inicio: i, fim: f, duracao: +$("#h-d").value }); salvar(m); audit("Alterou horários de atendimento"); setTimeout(desenhar, 0); } }] }));
    $("#nova-folga").addEventListener("click", () => abrirModal({ titulo: "Folga ou Férias", corpo: `<div class="form-grid"><div class="field"><label for="f-i">De</label><input id="f-i" type="date" min="${hojeISO()}"></div><div class="field"><label for="f-f">Até</label><input id="f-f" type="date" min="${hojeISO()}"></div></div><div class="field"><label for="f-m">Motivo</label><input id="f-m" placeholder="Ex.: férias"></div>`, botoes: [{ rotulo: "Cancelar", classe: "outline" }, { rotulo: "Salvar", aoClicar: () => { const i = $("#f-i").value, f = $("#f-f").value; if (!i || !f || f < i) { toast("Confira as datas.", "err"); return false; } m.folgas.push({ inicio: i, fim: f, motivo: $("#f-m").value }); salvar(m); audit("Cadastrou folga ou férias"); setTimeout(desenhar, 0); } }] }));
  };
  desenhar();
}

// ---------- M14 Perfil profissional ----------
function medicoPerfil() {
  const m = eu();
  raizPag().innerHTML = `<div class="page-head"><h1>Perfil Profissional</h1><p class="lead">Estas informações aparecem para o paciente na hora de escolher o médico.</p></div><form class="card" id="f" style="max-width:720px"><div class="row" style="margin-bottom:14px"><span class="avatar lg">${esc(iniciais(m.nome))}</span><div><b>${esc(m.nome)}</b><br><span class="muted">${esc(m.crm)}</span></div></div><div class="field"><label>Especialidades</label><div class="chips">${m.especialidades.map((e) => `<span class="badge info">${esc(espNome(e))}</span>`).join("")}</div><span class="hint">CRM e especialidades são alterados pelo administrador.</span></div><div class="field"><label for="bio">Mini-bio</label><textarea id="bio" maxlength="220">${esc(m.bio || "")}</textarea></div><label class="check"><input type="checkbox" id="tele" ${m.tele ? "checked" : ""}> Atendo por teleconsulta</label><div class="field" style="margin-top:12px"><label for="sn">Nova senha (opcional)</label><input id="sn" type="password" minlength="6" autocomplete="new-password"></div><p class="hint">Assinatura digital: o certificado do médico é configurado no back-end. Nas receitas deste demo ela aparece como simulada.</p><div class="actions"><button class="btn" type="submit">Salvar Perfil</button></div></form>`;
  $("#f").addEventListener("submit", (e) => { e.preventDefault(); const sn = $("#sn").value; if (sn && sn.length < 6) return toast("A senha precisa de ao menos 6 caracteres.", "err"); DB.upd("usuarios", m.id, { bio: $("#bio").value.trim(), tele: $("#tele").checked, ...(sn ? { senha: sn } : {}) }); audit("Atualizou perfil profissional"); toast("Perfil salvo.", "ok"); });
}

ready(() => {
  ({ "medico-painel": medicoPainel, atendimento, prontuario, "meus-pacientes": meusPacientes, horarios, "medico-perfil": medicoPerfil })[document.body.dataset.pagina]?.();
});
