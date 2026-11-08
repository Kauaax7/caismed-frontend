"use strict";
/* Portal do Paciente (C01 a C18) e telas compartilhadas (notificações, ajuda, autorizações) */

const raizPag = () => $("#conteudo");
const iconeTipo = (t) => (t === "exame" ? "file" : t === "teleconsulta" ? "video" : "calendar");
const nomeMedico = (c) => (c.medicoId ? medicoPorId(c.medicoId)?.nome || "" : "");
const minhasConsultas = () => DB.get("consultas").filter((c) => c.pacienteId === Sessao.id);
function itemConsulta(c, href) {
  const quando = c.data ? `${rotuloDia(c.data)} às ${c.horario}` : "Escolha o dia e o horário";
  return `<a class="item" href="${href}"><span class="avatar">${ico(iconeTipo(c.tipo))}</span><span class="grow"><b>${esc(nomeServico(c))}</b><small>${esc(quando)}${nomeMedico(c) ? ` com ${esc(nomeMedico(c))}` : ""}</small><small>${esc(c.paciente || "")}${c.unidadeId ? `, ${esc(nomeUnidade(c.unidadeId))}` : ""}</small></span>${badgeStatus(c.status)}</a>`;
}

// ---------- C01 Início ----------
function home() {
  const c = eu(), hoje = hojeISO(), mine = minhasConsultas();
  const prox = mine.filter((x) => x.data && ["agendada", "aguardando"].includes(x.status) && x.data >= hoje).sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))[0];
  const avisos = [];
  mine.filter((x) => x.status === "sugerida").forEach((x) => avisos.push(["chat", "A triagem sugeriu " + espNome(x.especialidade), "Toque para escolher o dia e o horário.", `agendamento.html?remarcar=${x.id}`]));
  DB.get("documentos").filter((d) => d.clienteId === c.id && d.tipo === "resultado" && !d.visto).forEach((d) => avisos.push(["file", "Resultado disponível", d.titulo.replace("Resultado: ", ""), "documentos.html"]));
  const pend = pendencias(c); if (pend.length) avisos.push(["wallet", `Você tem ${brl(pend.reduce((s, p) => s + p.valor, 0))} em aberto`, `${pend.length} cobrança(s) pendente(s).`, "pagamento.html"]);
  DB.get("autorizacoes").filter((a) => a.clienteId === c.id && a.status !== "em_analise" && !a.visto).forEach((a) => avisos.push(["shield", `Autorização ${a.status === "aprovada" ? "aprovada" : "negada"}`, a.titulo, "autorizacoes.html"]));
  const hero = prox
    ? `<div class="hero-card"><span>Sua próxima consulta</span><div class="when">${rotuloDia(prox.data)} às ${prox.horario}</div><div>${esc(nomeServico(prox))}${nomeMedico(prox) ? ` com ${esc(nomeMedico(prox))}` : ""}<br><small>${esc(nomeUnidade(prox.unidadeId))}</small></div><div class="row"><a class="btn" href="consulta.html?id=${prox.id}">Ver Detalhes</a>${prox.data === hoje && prox.status === "agendada" ? `<button class="btn outline" id="home-checkin" type="button">Fazer Check-in</button>` : ""}${prox.tipo === "teleconsulta" && prox.data === hoje ? `<a class="btn outline" href="teleconsulta.html?id=${prox.id}">Entrar na Sala</a>` : ""}</div></div>`
    : `<div class="card pale stack"><h2>Nenhuma Consulta Marcada</h2><p class="lead">Agende em poucos passos ou converse com a triagem para descobrir a especialidade ideal.</p><div class="row"><a class="btn" href="agendamento.html">Agendar Consulta</a><a class="btn outline" href="triagem.html">Fazer Triagem</a></div></div>`;
  const tile = (href, ic, small, titulo, cls = "") => `<a class="tile ${cls}" href="${href}"><span class="ti">${ico(ic)}</span><small>${small}</small><b>${titulo}</b></a>`;
  raizPag().innerHTML = `<div class="page-head"><div><h1>Olá, ${esc(c.nome.split(" ")[0])}!</h1><p class="lead">Como podemos ajudar hoje?</p></div></div>
  <div class="two-col"><div class="stack">${hero}
    <div class="tile-grid">${tile("triagem.html", "chat", "Conversar", "Triagem", "main")}${tile("agendamento.html", "calendar", "Agendar", "Nova Consulta")}${tile("consultas.html", "clock", "Acompanhar", "Minhas Consultas")}${tile("documentos.html", "file", "Receitas e exames", "Documentos")}${tile("pagamento.html", "wallet", "Pagar", "Pagamentos", "alt")}${tile("autorizacoes.html", "shield", "Guias", "Autorizações")}</div>
    <h2 class="sec-title" style="margin-bottom:0">Agendar por especialidade</h2><div class="chips">${espLista().map((e) => `<a class="chip" href="agendamento.html?especialidade=${e.id}">${esc(e.nome)}</a>`).join("")}</div></div>
  <div class="stack"><div class="card stack"><div class="card-h"><h2>Avisos</h2><a class="link" href="notificacoes.html">Ver todos</a></div>${avisos.length ? avisos.slice(0, 4).map(([i, t, d, h]) => `<a class="item" href="${h}">${ico(i)}<span class="grow"><b>${esc(t)}</b><small>${esc(d)}</small></span></a>`).join("") : '<p class="muted">Tudo em dia por aqui.</p>'}</div>
  <a class="banner" href="carteirinha.html"><span><b>Sua Carteirinha Digital</b><br><small>Mostre o QR Code na recepção.</small></span><span class="btn sm">Ver Cartão</span></a></div></div>`;
  $("#home-checkin")?.addEventListener("click", () => abrirCheckin(prox.id));
}

// ---------- C06 Check-in online ----------
function abrirCheckin(id) {
  const c = eu();
  abrirModal({ titulo: "Check-in Online", corpo: `<p>Confirme sua presença e confira seus dados antes de chegar.</p><div class="field" style="margin-top:12px"><label for="ck-tel">Telefone para contato</label><input id="ck-tel" type="tel" value="${esc(c.telefone || "")}"></div><div class="field"><label for="ck-doc">Anexar documento (opcional)</label><input id="ck-doc" type="file" accept="image/*,application/pdf"></div><label class="check"><input type="checkbox" id="ck-ok"> Confirmo que estou a caminho e meus dados estão corretos</label>`,
    botoes: [{ rotulo: "Voltar", classe: "outline" }, { rotulo: "Fazer Check-in", aoClicar: () => { if (!$("#ck-ok").checked) { toast("Marque a confirmação para continuar.", "err"); return false; } DB.upd("clientes", c.id, { telefone: $("#ck-tel").value }); fazerCheckin(id, () => setTimeout(() => location.reload(), 500)); } }] });
  ligarMascaras($(".modal"));
}

// ---------- C04 Minhas consultas ----------
function consultas() {
  const mine = minhasConsultas(), hoje = hojeISO();
  const prox = mine.filter((c) => ["sugerida", "agendada", "aguardando", "em_atendimento"].includes(c.status) && (!c.data || c.data >= hoje)).sort((a, b) => (a.data || "9").localeCompare(b.data || "9") || (a.horario || "").localeCompare(b.horario || ""));
  const hist = mine.filter((c) => !prox.includes(c)).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  const lista = (l, msg) => (l.length ? l.map((c) => itemConsulta(c, c.status === "sugerida" ? `agendamento.html?remarcar=${c.id}` : `consulta.html?id=${c.id}`)).join("") : vazio(msg));
  raizPag().innerHTML = `<div class="page-head"><h1>Minhas Consultas</h1><a class="btn" href="agendamento.html">${ico("plus")} Marcar Nova Consulta</a></div>
  <div class="tabs" id="abas"><button class="tab-btn active" data-tab="p-prox" type="button">Próximas (${prox.length})</button><button class="tab-btn" data-tab="p-hist" type="button">Histórico (${hist.length})</button></div>
  <div class="tab-panel active g2 grid" id="p-prox">${lista(prox, "Você não tem consultas marcadas.")}</div><div class="tab-panel g2 grid" id="p-hist">${lista(hist, "Ainda não há consultas no histórico.")}</div>`;
  ligarAbas(raizPag());
}

// ---------- C04/C05/C06/C17 Detalhe da consulta ----------
function consultaDetalhe() {
  const id = new URLSearchParams(location.search).get("id"); const c = DB.find("consultas", id);
  if (!c || c.pacienteId !== Sessao.id) { raizPag().innerHTML = vazio("Consulta Não Encontrada", "Ela pode ter sido removida.", '<a class="btn sm" href="consultas.html">Voltar às Consultas</a>'); return; }
  const m = c.medicoId ? medicoPorId(c.medicoId) : null, un = unidadePorId(c.unidadeId), hoje = hojeISO();
  const ativa = ["agendada", "aguardando"].includes(c.status);
  const exame = c.tipo === "exame" ? DB.find("exames", c.exame) : null;
  const docs = DB.get("documentos").filter((d) => d.consultaId === c.id);
  raizPag().innerHTML = `<div class="page-head"><div><h1>${esc(nomeServico(c))}</h1><p class="lead">${esc(c.paciente)}</p></div>${badgeStatus(c.status)}</div>
  <div class="two-col"><div class="stack"><div class="card"><div class="kv"><span>Data</span><span>${fmtDataLonga(c.data)}</span></div><div class="kv"><span>Horário</span><span>${esc(c.horario)}</span></div>${m ? `<div class="kv"><span>Médico</span><span>${esc(m.nome)}</span></div>` : ""}<div class="kv"><span>Local</span><span>${c.tipo === "teleconsulta" ? "Online" : esc(un ? `${un.nome}, ${un.endereco}` : "—")}</span></div><div class="kv"><span>Valor</span><span>${brl(c.valor)} ${c.pago ? '<span class="badge ok">Pago</span>' : '<span class="badge warn">A pagar</span>'}</span></div>${exame ? `<div class="kv"><span>Preparo</span><span>${esc(exame.preparo)}</span></div>` : ""}</div>
  <div class="actions" style="margin:0">${c.status === "agendada" && c.data === hoje ? `<button class="btn" id="b-ck" type="button">Fazer Check-in</button>` : ""}${c.tipo === "teleconsulta" && ativa ? `<a class="btn ${c.data === hoje ? "" : "outline"}" href="teleconsulta.html?id=${c.id}">Entrar na Sala</a>` : ""}${ativa ? `<a class="btn outline" href="agendamento.html?remarcar=${c.id}">Remarcar</a><button class="btn danger outline" id="b-cancel" type="button">Cancelar</button>` : ""}${un ? `<a class="btn outline" target="_blank" rel="noopener" href="${mapaURL(un)}">${ico("pin")} Ver Local</a>` : ""}${c.status === "finalizada" && !c.avaliacao ? `<button class="btn" id="b-aval" type="button">${ico("star")} Avaliar Atendimento</button>` : ""}</div>
  ${c.avaliacao ? `<div class="card pale"><b>Sua avaliação: ${"★".repeat(c.avaliacao.nota)}${"☆".repeat(5 - c.avaliacao.nota)}</b><p class="muted">${esc(c.avaliacao.comentario || "")}</p></div>` : ""}</div>
  <div class="stack">${docs.length ? `<div class="card stack"><h2>Documentos desta consulta</h2>${docs.map((d) => `<a class="item" href="documentos.html">${ico("file")}<span class="grow"><b>${esc(d.titulo)}</b></span></a>`).join("")}</div>` : ""}<div class="card"><h2 style="margin-bottom:8px">Histórico</h2>${(c.historico || []).slice().reverse().map((h) => `<div class="kv"><span class="small">${fmtHora(h.quando)}</span><span class="small">${esc(h.texto)}</span></div>`).join("") || '<p class="muted">Sem registros.</p>'}</div></div></div>`;
  $("#b-ck")?.addEventListener("click", () => abrirCheckin(c.id));
  $("#b-cancel")?.addEventListener("click", () => {
    abrirModal({ titulo: "Cancelar Consulta", corpo: `<p class="muted">O cancelamento online é permitido até ${cfg().cancelarAteHoras} horas antes do horário.</p><div class="field" style="margin-top:12px"><label for="motivo">Motivo</label><select id="motivo"><option>Imprevisto pessoal</option><option>Problema de saúde</option><option>Conflito de horário</option><option>Vou remarcar para outro dia</option><option>Outro motivo</option></select></div>`,
      botoes: [{ rotulo: "Voltar", classe: "outline" }, { rotulo: "Cancelar Consulta", classe: "danger", aoClicar: () => { const r = cancelarConsulta(c.id, $("#motivo").value, "cliente"); if (!r.ok) { toast(r.erro, "err"); return false; } toast("Consulta cancelada.", "ok"); setTimeout(() => (location.href = "consultas.html"), 600); } }] });
  });
  $("#b-aval")?.addEventListener("click", () => {
    let nota = 0;
    abrirModal({ titulo: "Avaliar Atendimento", corpo: `<p>Como foi sua consulta com ${esc(m?.nome || "a equipe")}?</p><div class="chips" id="estrelas" style="margin:12px 0">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="chip" data-n="${n}" aria-pressed="false" aria-label="${n} estrela(s)">${ico("star", 'style="width:20px;height:20px"')} ${n}</button>`).join("")}</div><div class="field"><label for="coment">Comentário (opcional)</label><textarea id="coment"></textarea></div>`,
      aoAbrir: (ov) => $$("#estrelas .chip", ov).forEach((b) => b.addEventListener("click", () => { nota = +b.dataset.n; $$("#estrelas .chip", ov).forEach((o) => o.setAttribute("aria-pressed", String(+o.dataset.n <= nota))); })),
      botoes: [{ rotulo: "Enviar Avaliação", aoClicar: () => { if (!nota) { toast("Escolha de 1 a 5 estrelas.", "err"); return false; } DB.upd("consultas", c.id, { avaliacao: { nota, comentario: $("#coment").value, quando: new Date().toISOString() } }); toast("Obrigado pela avaliação!", "ok"); setTimeout(() => location.reload(), 500); } }] });
  });
}

// ---------- Confirmação do agendamento (C02 passo 7) ----------
function agendamentoConfirmado() {
  const c = DB.find("consultas", new URLSearchParams(location.search).get("id")); if (!c) { location.replace("consultas.html"); return; }
  const un = unidadePorId(c.unidadeId), m = c.medicoId ? medicoPorId(c.medicoId) : null;
  raizPag().innerHTML = `<div class="state-box" style="margin-top:2vh"><span class="big" style="background:var(--ok-bg);color:var(--ok)">${ico("check")}</span><h1>Agendamento Confirmado</h1><p class="lead">Enviamos um aviso para a sua central de notificações.</p></div>
  <div class="card" style="max-width:560px;margin:0 auto"><div class="kv"><span>Atendimento</span><span>${esc(nomeServico(c))}</span></div><div class="kv"><span>Data</span><span>${fmtDataLonga(c.data)} às ${esc(c.horario)}</span></div>${m ? `<div class="kv"><span>Médico</span><span>${esc(m.nome)}</span></div>` : ""}<div class="kv"><span>Local</span><span>${c.tipo === "teleconsulta" ? "Online" : esc(un ? un.nome + ", " + un.endereco : "—")}</span></div><div class="kv"><span>Valor</span><span>${brl(c.valor)}</span></div></div>
  <div class="actions" style="max-width:560px;margin:18px auto 0"><button class="btn" id="ics" type="button">${ico("calendar")} Adicionar ao Calendário</button>${un ? `<a class="btn outline" target="_blank" rel="noopener" href="${mapaURL(un)}">${ico("pin")} Como Chegar</a>` : ""}<a class="btn outline" href="consultas.html">Minhas Consultas</a><a class="btn outline" href="home.html">Voltar ao Início</a></div>`;
  $("#ics").addEventListener("click", () => {
    const ini = c.data.replace(/-/g, "") + "T" + c.horario.replace(":", "") + "00", fim = c.data.replace(/-/g, "") + "T" + hmStr(hm(c.horario) + 30).replace(":", "") + "00";
    baixarArquivo("consulta-caismed.ics", ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CaisMed//PT", "BEGIN:VEVENT", `UID:${c.id}@caismed`, `DTSTAMP:${ini}`, `DTSTART:${ini}`, `DTEND:${fim}`, `SUMMARY:${nomeServico(c)} - CaisMed`, `LOCATION:${un ? un.endereco + ", " + un.cidade : "Online"}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n"), "text/calendar");
  });
}

// ---------- C07 Teleconsulta (sala) ----------
function teleconsulta() {
  const c = DB.find("consultas", new URLSearchParams(location.search).get("id")); if (!c || c.pacienteId !== Sessao.id) { raizPag().innerHTML = vazio("Teleconsulta Não Encontrada"); return; }
  const m = medicoPorId(c.medicoId); let stream = null, poll = null;
  const parar = () => { stream?.getTracks().forEach((t) => t.stop()); clearInterval(poll); };
  const etapa = (html) => (raizPag().innerHTML = `<div class="page-head"><div><h1>Sala de Teleconsulta</h1><p class="lead">${esc(m?.nome || "")}, ${fmtDataLonga(c.data)} às ${esc(c.horario)}</p></div></div><div style="max-width:720px">${html}</div>`);
  const teste = () => {
    etapa(`<div class="card stack"><h2>Teste sua câmera e microfone</h2><video id="v" autoplay muted playsinline style="width:100%;border-radius:14px;background:#000;aspect-ratio:16/9"></video><div><span class="label">Microfone</span><div style="height:10px;background:var(--pale2);border-radius:99px;overflow:hidden;margin-top:6px"><div id="nivel" style="height:100%;width:0;background:var(--blue)"></div></div></div><p class="muted" id="msg-cam">Permita o acesso quando o navegador pedir.</p><div class="actions"><button class="btn outline" id="b-teste" type="button">Ligar Câmera e Microfone</button><button class="btn" id="b-entrar" type="button">Entrar na Sala de Espera</button></div></div>`);
    $("#b-teste").addEventListener("click", async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); $("#v").srcObject = stream; $("#msg-cam").textContent = "Tudo certo. Fale algo e veja a barra mexer.";
        const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(), src = ac.createMediaStreamSource(stream); src.connect(an); const d = new Uint8Array(an.frequencyBinCount);
        const loop = () => { if (!$("#nivel")) return; an.getByteFrequencyData(d); $("#nivel").style.width = Math.min(100, d.reduce((a, b) => a + b, 0) / d.length * 2) + "%"; requestAnimationFrame(loop); }; loop();
      } catch (e) { $("#msg-cam").textContent = "Não foi possível acessar câmera ou microfone. Libere a permissão no navegador e tente de novo."; }
    });
    $("#b-entrar").addEventListener("click", espera);
  };
  const espera = () => {
    DB.upd("consultas", c.id, { status: "aguardando", chegouEm: new Date().toISOString() });
    if (c.medicoId) notificar("medico:" + c.medicoId, "Paciente na Sala de Espera", `${c.paciente} aguarda a teleconsulta.`, "medico-painel.html");
    etapa(`<div class="card stack" style="text-align:center"><h2>Sala de espera</h2><p class="lead">Aguarde. ${esc(m?.nome || "O médico")} vai iniciar o atendimento em instantes.</p><div class="skel" style="height:90px"></div><button class="btn outline" id="b-sair" type="button">Sair da Sala</button></div>`);
    $("#b-sair").addEventListener("click", () => { parar(); location.href = "consulta.html?id=" + c.id; });
    poll = setInterval(() => { const x = DB.find("consultas", c.id); if (x?.teleIniciada) { clearInterval(poll); sala(); } }, 1500);
  };
  const sala = async () => {
    etapa(`<div class="card stack"><h2>Em atendimento com ${esc(m?.nome || "")}</h2><video id="v" autoplay muted playsinline style="width:100%;border-radius:14px;background:#000;aspect-ratio:16/9"></video><p class="muted">O vídeo do médico chega pelo serviço de videochamada do back-end. Aqui aparece só a sua câmera.</p><button class="btn danger" id="b-fim" type="button">Encerrar Chamada</button></div>`);
    try { stream = stream || await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); $("#v").srcObject = stream; } catch (e) {}
    $("#b-fim").addEventListener("click", () => { parar(); location.href = "consulta.html?id=" + c.id; });
  };
  if (c.teleIniciada) sala(); else teste();
  window.addEventListener("pagehide", parar);
}

// ---------- C08/C09 Exames e receitas ----------
const TIPO_DOC = { receita: "Receitas", exame_pedido: "Pedidos de Exame", resultado: "Resultados", atestado: "Atestados" };
function documentos() {
  let filtro = "";
  const desenhar = () => {
    const l = DB.get("documentos").filter((d) => d.clienteId === Sessao.id && (!filtro || d.tipo === filtro)).sort((a, b) => b.data.localeCompare(a.data));
    $("#lista-docs").innerHTML = l.length ? l.map((d) => `<button type="button" class="item" data-id="${d.id}">${ico("file")}<span class="grow"><b>${esc(d.titulo)}</b><small>${fmtData(d.data)}${d.medicoId ? `, ${esc(medicoPorId(d.medicoId)?.nome || "")}` : ""}</small></span>${d.tipo === "resultado" && !d.visto ? '<span class="badge warn">Novo</span>' : `<span class="badge info">${esc((TIPO_DOC[d.tipo] || "").replace(/s$/, ""))}</span>`}</button>`).join("") : vazio("Nenhum Documento", "Receitas, pedidos e resultados aparecem aqui depois das consultas.");
    $$("#lista-docs .item").forEach((b) => b.addEventListener("click", () => abrirDoc(DB.find("documentos", b.dataset.id))));
  };
  raizPag().innerHTML = `<div class="page-head"><h1>Exames e Receitas</h1></div><div class="chips" id="filtros" style="margin-bottom:14px"><button class="chip" type="button" data-t="" aria-pressed="true">Todos</button>${Object.entries(TIPO_DOC).map(([k, v]) => `<button class="chip" type="button" data-t="${k}" aria-pressed="false">${v}</button>`).join("")}</div><div class="grid g2" id="lista-docs"></div>`;
  $$("#filtros .chip").forEach((b) => b.addEventListener("click", () => { filtro = b.dataset.t; $$("#filtros .chip").forEach((o) => o.setAttribute("aria-pressed", String(o === b))); desenhar(); }));
  desenhar();
  function abrirDoc(d) {
    if (d.tipo === "resultado" && !d.visto) { DB.upd("documentos", d.id, { visto: true }); }
    const m = d.medicoId ? medicoPorId(d.medicoId) : null, c = eu();
    const corpo = `<h1>${esc(d.titulo)}</h1><p class="m">Paciente: ${esc(c.nome)} (CPF ${fmtCPF(c.cpf)})<br>Data: ${fmtData(d.data)}${m ? `<br>${esc(m.nome)}, ${esc(m.crm)}` : ""}</p>${d.laudo ? `<h3>Laudo</h3><p>${esc(d.laudo)}</p>` : ""}${(d.itens || []).length ? `<ul>${d.itens.map((i) => `<li><b>${esc(i.nome)}</b>${i.posologia ? `<br>${esc(i.posologia)}` : ""}</li>`).join("")}</ul>` : ""}${d.texto ? `<p>${esc(d.texto)}</p>` : ""}${m ? `<div class="sig">${esc(m.nome)}<br>${esc(m.crm)}<br>Assinatura digital (simulada)</div>` : ""}`;
    abrirModal({ titulo: d.titulo, corpo: `<div class="stack"><p class="muted">${fmtData(d.data)}${m ? `, ${esc(m.nome)}` : ""}</p>${d.laudo ? `<div class="card pale"><b>Laudo</b><p>${esc(d.laudo)}</p></div>` : ""}${(d.itens || []).map((i) => `<div class="card"><b>${esc(i.nome)}</b><p class="muted">${esc(i.posologia || "")}</p></div>`).join("")}${d.texto ? `<p>${esc(d.texto)}</p>` : ""}</div>`,
      botoes: [{ rotulo: "Baixar ou Imprimir PDF", aoClicar: () => { imprimirDoc(d.titulo, corpo); return false; } }, { rotulo: "Compartilhar", classe: "outline", aoClicar: async () => { const t = `${d.titulo} - ${fmtData(d.data)}`; try { navigator.share ? await navigator.share({ title: t, text: t }) : (await navigator.clipboard.writeText(t), toast("Texto copiado.", "ok")); } catch (e) {} return false; } }, ...(d.tipo === "exame_pedido" ? [{ rotulo: "Agendar Este Exame", classe: "outline", aoClicar: () => { const x = DB.get("exames", EXAMES_PADRAO).find((e) => (d.titulo || "").includes(e.nome)); location.href = "agendamento.html?tipo=exame" + (x ? "&exame=" + x.id : ""); } }] : [])] });
    desenhar();
  }
}

// ---------- C10 Carteirinha digital ----------
function carteirinha() {
  const c = eu(); const pessoas = [{ id: "", nome: c.nome, rot: "Titular" }, ...(c.dependentes || []).filter((x) => idade(x.nascimento) < 18 || x.acesso).map((d) => ({ id: d.id, nome: d.nome, rot: d.parentesco }))];
  let sel = pessoas[0];
  const num = (cpf) => ("0000" + soDigitos(cpf).slice(-9)).replace(/(\d{4})(\d{4})(\d{5})/, "$1 $2 $3");
  const desenhar = () => {
    $("#cart").innerHTML = `<div class="cart"><div class="info"><div class="top"><b class="display" style="font-size:1.3rem">CaisMed</b><span class="plano">${esc((PLANOS[c.plano] || {}).nome || "Sem Plano")}</span></div><div class="num">${num(c.cpf + sel.id)}</div><div><div class="nome">${esc(sel.nome)}</div><small>${sel.rot}</small></div></div><div class="qr" aria-label="QR Code da carteirinha">${qrSVG(`CAISMED:${sel.id ? "DEP" : "CLI"}:${c.id}:${sel.id || soDigitos(c.cpf)}`)}</div></div>`;
    $$("#pick .chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === sel.id)));
  };
  raizPag().innerHTML = `<div class="page-head"><h1>Minha Carteirinha</h1><a class="btn outline" href="dependentes.html">${ico("users")} Gerenciar Dependentes</a></div>${pessoas.length > 1 ? `<div class="chips" id="pick" style="margin-bottom:14px">${pessoas.map((p) => `<button class="chip" type="button" data-id="${p.id}" aria-pressed="false">${esc(p.nome.split(" ")[0])} (${esc(p.rot)})</button>`).join("")}</div>` : ""}<div id="cart" style="max-width:640px"></div><p class="aviso" style="max-width:640px;margin-top:12px">Apresente este cartão na recepção. O atendente lê o QR Code para fazer seu check-in.</p>`;
  $$("#pick .chip").forEach((b) => b.addEventListener("click", () => { sel = pessoas.find((p) => p.id === b.dataset.id); desenhar(); }));
  desenhar();
}

// ---------- C15 Dependentes ----------
function dependentes() {
  const desenhar = () => {
    const c = eu();
    $("#lista-dep").innerHTML = (c.dependentes || []).length ? c.dependentes.map((d) => { const adulto = idade(d.nascimento) >= 18; return `<div class="card stack sm"><div class="row between"><b>${esc(d.nome)}</b><span class="badge info">${esc(d.parentesco)}, ${idade(d.nascimento)} anos</span></div>${adulto ? `<label class="check"><input type="checkbox" data-acesso="${d.id}" ${d.acesso ? "checked" : ""}> Tenho autorização deste dependente adulto para ver e agendar consultas dele</label>` : '<p class="muted">Menor de idade: você, como titular, acompanha as consultas.</p>'}<div class="row"><button class="btn outline sm" data-edit="${d.id}" type="button">${ico("edit")} Editar</button><button class="btn danger outline sm" data-del="${d.id}" type="button">${ico("trash")} Remover</button></div></div>`; }).join("") : vazio("Nenhum Dependente", "Adicione familiares para agendar e usar a carteirinha por eles.");
    $$("[data-acesso]").forEach((el) => el.addEventListener("change", () => { DB.upd("clientes", c.id, (x) => ({ dependentes: x.dependentes.map((d) => (d.id === el.dataset.acesso ? { ...d, acesso: el.checked } : d)) })); audit(el.checked ? "Concedeu acesso a dependente adulto" : "Revogou acesso a dependente adulto"); toast(el.checked ? "Acesso concedido." : "Acesso revogado.", "ok"); }));
    $$("[data-edit]").forEach((b) => b.addEventListener("click", () => form(c.dependentes.find((d) => d.id === b.dataset.edit))));
    $$("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (await confirmar("Remover este dependente? As consultas já feitas continuam no histórico.", { perigo: true, ok: "Remover" })) { DB.upd("clientes", c.id, (x) => ({ dependentes: x.dependentes.filter((d) => d.id !== b.dataset.del) })); desenhar(); } }));
  };
  const form = (d) => abrirModal({ titulo: d ? "Editar Dependente" : "Adicionar Dependente", corpo: `<div class="field"><label for="d-nome">Nome completo</label><input id="d-nome" value="${esc(d?.nome || "")}" required></div><div class="field"><label for="d-nasc">Data de nascimento</label><input id="d-nasc" type="date" max="${hojeISO()}" value="${d?.nascimento || ""}"></div><div class="field"><label for="d-par">Parentesco</label><select id="d-par">${["Filho", "Filha", "Cônjuge", "Pai", "Mãe", "Outro"].map((p) => `<option ${d?.parentesco === p ? "selected" : ""}>${p}</option>`).join("")}</select></div><p class="hint">O Plano Família cobre até 4 pessoas.</p>`,
    botoes: [{ rotulo: "Cancelar", classe: "outline" }, { rotulo: "Salvar", aoClicar: () => { const nome = $("#d-nome").value.trim(), nasc = $("#d-nasc").value; if (!nome || !nasc) { toast("Preencha nome e data de nascimento.", "err"); return false; } const c = eu(); const novo = { id: d?.id || "d" + uid(), nome, nascimento: nasc, parentesco: $("#d-par").value, acesso: d?.acesso ?? false }; DB.upd("clientes", c.id, (x) => ({ dependentes: d ? x.dependentes.map((y) => (y.id === d.id ? novo : y)) : [...x.dependentes, novo] })); audit(d ? "Editou dependente" : "Adicionou dependente"); setTimeout(desenhar, 0); } }] });
  raizPag().innerHTML = `<div class="page-head"><h1>Dependentes</h1><button class="btn" id="add" type="button">${ico("plus")} Adicionar Dependente</button></div><div class="grid g2" id="lista-dep"></div>`;
  $("#add").addEventListener("click", () => form()); desenhar();
}

// ---------- C11 / A10 Autorizações ----------
const STATUS_AUT = { em_analise: ["Em Análise", "warn"], aprovada: ["Aprovada", "ok"], negada: ["Negada", "err"] };
function autorizacoes() {
  const staff = Sessao.perfil !== "cliente";
  const desenhar = () => {
    let l = DB.get("autorizacoes").sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)); if (!staff) l = l.filter((a) => a.clienteId === Sessao.id);
    $("#lista-aut").innerHTML = l.length ? l.map((a) => { const cl = DB.find("clientes", a.clienteId); return `<div class="card stack sm"><div class="row between"><b>${esc(a.titulo)}</b><span class="badge ${STATUS_AUT[a.status][1]}">${STATUS_AUT[a.status][0]}</span></div>${staff ? `<p>${esc(cl?.nome || "—")}</p>` : ""}<p class="muted">Guia: ${esc(a.guiaNome || "não anexada")}, enviada em ${fmtHora(a.criadoEm)}</p>${a.obs ? `<p class="small"><b>Observação da clínica:</b> ${esc(a.obs)}</p>` : ""}${staff && a.status === "em_analise" ? `<div class="row"><button class="btn sm" data-ap="${a.id}" type="button">Aprovar</button><button class="btn danger outline sm" data-ng="${a.id}" type="button">Negar</button></div>` : ""}</div>`; }).join("") : vazio("Nenhuma Autorização", staff ? "Quando um paciente enviar uma guia, ela aparece aqui." : "Envie a guia do seu convênio ou pedido para a clínica analisar.");
    if (!staff) l.forEach((a) => !a.visto && a.status !== "em_analise" && DB.upd("autorizacoes", a.id, { visto: true }));
    const mudar = (id, status) => abrirModal({ titulo: status === "aprovada" ? "Aprovar Autorização" : "Negar Autorização", corpo: `<div class="field"><label for="obs">Observação para o paciente</label><textarea id="obs"></textarea></div>`, botoes: [{ rotulo: "Voltar", classe: "outline" }, { rotulo: "Confirmar", aoClicar: () => { const a = DB.upd("autorizacoes", id, { status, obs: $("#obs").value, atualizadoEm: new Date().toISOString() }); notificar("cliente:" + a.clienteId, "Autorização " + (status === "aprovada" ? "Aprovada" : "Negada"), a.titulo, "autorizacoes.html"); audit("Atualizou autorização", a.titulo); setTimeout(desenhar, 0); } }] });
    $$("[data-ap]").forEach((b) => b.addEventListener("click", () => mudar(b.dataset.ap, "aprovada"))); $$("[data-ng]").forEach((b) => b.addEventListener("click", () => mudar(b.dataset.ng, "negada")));
  };
  raizPag().innerHTML = `<div class="page-head"><h1>Autorizações</h1>${staff ? "" : `<button class="btn" id="nova" type="button">${ico("plus")} Solicitar Autorização</button>`}</div><div class="grid g2" id="lista-aut"></div>`;
  $("#nova")?.addEventListener("click", () => abrirModal({ titulo: "Solicitar Autorização", corpo: `<div class="field"><label for="a-tit">Exame ou procedimento</label><select id="a-tit">${DB.get("exames", EXAMES_PADRAO).map((e) => `<option>${esc(e.nome)}</option>`).join("")}<option>Outro procedimento</option></select></div><div class="field"><label for="a-guia">Foto ou PDF da guia</label><input id="a-guia" type="file" accept="image/*,application/pdf"></div>`,
    botoes: [{ rotulo: "Cancelar", classe: "outline" }, { rotulo: "Enviar Solicitação", aoClicar: () => { const f = $("#a-guia").files[0]; if (!f) { toast("Anexe a guia para enviar.", "err"); return false; } DB.add("autorizacoes", { clienteId: Sessao.id, titulo: $("#a-tit").value, guiaNome: f.name, status: "em_analise", obs: "", criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }); notificar("atendente", "Nova Autorização", `${eu().nome} enviou uma guia: ${$("#a-tit").value}.`, "autorizacoes.html"); toast("Solicitação enviada.", "ok"); setTimeout(desenhar, 0); } }] }));
  desenhar();
}

// ---------- C12 Financeiro ----------
function pagamento() {
  const c = eu();
  const desenhar = () => {
    const pend = pendencias(c), pags = DB.get("pagamentos").filter((p) => p.clienteId === c.id).sort((a, b) => b.quando.localeCompare(a.quando));
    const fin = DB.get("consultas").filter((x) => x.pacienteId === c.id && x.status === "finalizada").sort((a, b) => b.data.localeCompare(a.data));
    const pl = PLANOS[c.plano];
    raizPag().innerHTML = `<div class="page-head"><h1>Pagamentos</h1></div><div class="two-col"><div class="stack">
    <div class="card stack"><h2>Em aberto</h2>${pend.length ? pend.map((p, i) => `<div class="item" style="cursor:default"><span class="grow"><b>${esc(p.descricao)}</b><small>${p.tipo === "mensalidade" ? "Mensalidade do plano" : "Coparticipação"}</small></span><b>${brl(p.valor)}</b><button class="btn sm" data-pagar="${i}" type="button">Pagar</button></div>`).join("") : '<p class="muted">Nada em aberto. Obrigado!</p>'}</div>
    <div class="card stack"><h2>Histórico de pagamentos</h2>${pags.length ? pags.map((p) => `<div class="item" style="cursor:default"><span class="grow"><b>${esc(p.descricao)}</b><small>${fmtData(p.data)}, ${esc(p.metodo)}</small></span><b>${brl(p.valor)}</b><span class="badge ok">Pago</span></div>`).join("") : '<p class="muted">Nenhum pagamento ainda.</p>'}</div></div>
    <div class="stack"><div class="card"><h2 style="margin-bottom:8px">Meu plano</h2>${pl ? `<div class="kv"><span>Plano</span><span>${esc(pl.nome)}</span></div><div class="kv"><span>Mensalidade</span><span>${brl(pl.valor)}</span></div><div class="kv"><span>Coparticipação</span><span>${pl.copart}% por atendimento</span></div>` : '<p class="muted">Você não tem plano. Os atendimentos são particulares.</p>'}</div>
    <div class="card"><h2 style="margin-bottom:8px">Extrato de utilização</h2>${fin.length ? `<div class="table-wrap" style="border:0"><table style="min-width:0"><thead><tr><th>Data</th><th>Serviço</th><th>Valor</th></tr></thead><tbody>${fin.map((x) => `<tr><td>${fmtData(x.data)}</td><td>${esc(nomeServico(x))}</td><td>${brl(x.valor)} ${x.pago ? "" : '<span class="badge warn">Aberto</span>'}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Sem atendimentos finalizados.</p>'}</div></div></div>`;
    $$("[data-pagar]").forEach((b) => b.addEventListener("click", () => pagar(pend[+b.dataset.pagar])));
  };
  function pagar(p) {
    abrirModal({ titulo: "Pagar " + brl(p.valor), corpo: `<p class="muted">${esc(p.descricao)}</p><div class="field" style="margin-top:12px"><label for="met">Forma de pagamento</label><select id="met"><option>Pix</option><option>Cartão de Crédito</option><option>Boleto</option></select></div><div id="met-box"></div>`,
      aoAbrir: (ov) => { const box = $("#met-box", ov), met = $("#met", ov); const mostra = () => { box.innerHTML = met.value === "Pix" ? `<div class="stack" style="align-items:center;text-align:center"><div style="background:#fff;padding:10px;border-radius:12px;width:180px">${qrSVG("00020126CAISMED-PIX-SIMULADO-" + p.valor)}</div><code class="small" style="word-break:break-all">00020126CAISMED-PIX-SIMULADO</code><p class="hint">QR Code ilustrativo. A cobrança real vem do back-end.</p></div>` : met.value === "Boleto" ? `<div class="card pale"><b>Linha digitável (simulada)</b><p class="small" style="word-break:break-all">23790.00000 00000.000000 00000.000000 0 00000000000000</p></div>` : `<div class="field"><label for="cn">Número do cartão</label><input id="cn" inputmode="numeric" maxlength="19" autocomplete="cc-number"></div><div class="form-grid"><div class="field"><label for="cv">Validade</label><input id="cv" placeholder="MM/AA" maxlength="5" autocomplete="cc-exp"></div><div class="field"><label for="cc">CVV</label><input id="cc" maxlength="4" inputmode="numeric" autocomplete="cc-csc"></div></div><p class="hint">Os dados do cartão não ficam salvos neste app.</p>`; }; met.addEventListener("change", mostra); mostra(); },
      botoes: [{ rotulo: "Voltar", classe: "outline" }, { rotulo: "Confirmar Pagamento", aoClicar: () => { if ($("#met").value === "Cartão de Crédito" && (soDigitos($("#cn").value).length < 13 || !/^\d{2}\/\d{2}$/.test($("#cv").value) || soDigitos($("#cc").value).length < 3)) { toast("Confira os dados do cartão.", "err"); return false; } registrarPagamento(c, p, $("#met").value, "paciente"); toast("Pagamento confirmado! Obrigado.", "ok"); setTimeout(desenhar, 0); } }] });
  }
  desenhar();
}

// ---------- C14 Perfil ----------
function perfil() {
  const c = eu();
  raizPag().innerHTML = `<div class="page-head"><h1>Meu Perfil</h1><a class="btn outline" href="perfil-editar.html">${ico("edit")} Editar Dados</a></div><div class="two-col"><div class="card"><div class="row" style="margin-bottom:10px"><span class="avatar lg">${esc(iniciais(c.nome))}</span><div><b>${esc(c.nome)}</b><br><span class="muted">${esc((PLANOS[c.plano] || {}).nome || "Sem plano")}</span></div></div><div class="kv"><span>CPF</span><span>${fmtCPF(c.cpf)}</span></div><div class="kv"><span>Nascimento</span><span>${fmtData(c.nascimento)}</span></div><div class="kv"><span>Telefone</span><span>${esc(c.telefone || "—")}</span></div><div class="kv"><span>E-mail</span><span>${esc(c.email || "—")}</span></div><div class="kv"><span>Cidade</span><span>${esc(c.cidade || "—")}</span></div></div>
  <div class="stack"><a class="item" href="dependentes.html">${ico("users")}<span class="grow"><b>Dependentes</b><small>${(c.dependentes || []).length} cadastrado(s)</small></span>${ico("right")}</a><a class="item" href="pagamento.html">${ico("wallet")}<span class="grow"><b>Pagamentos</b><small>Faturas, histórico e extrato</small></span>${ico("right")}</a><a class="item" href="autorizacoes.html">${ico("shield")}<span class="grow"><b>Autorizações</b><small>Guias e pedidos</small></span>${ico("right")}</a><a class="item" href="privacidade.html">${ico("lock")}<span class="grow"><b>Privacidade e Consentimentos</b><small>Seus dados e a LGPD</small></span>${ico("right")}</a><a class="item" href="ajuda.html">${ico("help")}<span class="grow"><b>Ajuda e Ouvidoria</b><small>Perguntas frequentes e contato</small></span>${ico("right")}</a><button class="btn danger outline" id="sair" type="button">${ico("logout")} Sair da Conta</button></div></div>`;
  $("#sair").addEventListener("click", sair);
}
function perfilEditar() {
  const c = eu();
  raizPag().innerHTML = `<div class="page-head"><h1>Editar Meus Dados</h1></div><form id="f" class="card" style="max-width:720px" novalidate><div class="form-grid"><div class="field full"><label for="nome">Nome completo</label><input id="nome" value="${esc(c.nome)}" required></div><div class="field"><label for="cpf-ro">CPF</label><input id="cpf-ro" value="${fmtCPF(c.cpf)}" disabled><span class="hint">Para corrigir o CPF, fale com a recepção.</span></div><div class="field"><label for="plano-ro">Plano</label><input id="plano-ro" value="${esc((PLANOS[c.plano] || {}).nome || "Sem plano")}" disabled><span class="hint">Mudança de plano é feita pela recepção.</span></div><div class="field"><label for="telefone">Telefone</label><input id="telefone" type="tel" data-valida="tel" value="${esc(c.telefone || "")}" required></div><div class="field"><label for="email">E-mail</label><input id="email" type="email" data-valida="email" value="${esc(c.email || "")}" required></div><div class="field"><label for="cidade">Cidade</label><input id="cidade" value="${esc(c.cidade || "")}" required></div><div class="field"><label for="senha-nova">Nova senha (opcional)</label><input id="senha-nova" type="password" minlength="6" autocomplete="new-password"></div></div>
  <label class="check"><input type="checkbox" id="pref" ${c.consentimentos?.notificacoes !== false ? "checked" : ""}> Receber lembretes e avisos por notificação</label><div class="actions"><button class="btn" type="submit">Salvar Alterações</button><a class="btn outline" href="perfil.html">Cancelar</a></div></form>`;
  ligarMascaras($("#f"));
  $("#f").addEventListener("submit", (e) => { e.preventDefault(); if (!formularioValido(e.target)) return; const sn = $("#senha-nova").value; if (sn && sn.length < 6) return toast("A senha precisa de pelo menos 6 caracteres.", "err");
    // TODO: PUT /clientes/:id (back-end)
    DB.upd("clientes", c.id, (x) => ({ nome: $("#nome").value.trim(), telefone: $("#telefone").value, email: $("#email").value, cidade: $("#cidade").value.trim(), ...(sn ? { senha: sn } : {}), consentimentos: { ...x.consentimentos, notificacoes: $("#pref").checked } })); audit("Editou o próprio perfil"); toast("Dados atualizados!", "ok"); setTimeout(() => (location.href = "perfil.html"), 600); });
}

// ---------- C16 Privacidade ----------
function privacidade() {
  const c = eu(), cs = c.consentimentos || {};
  raizPag().innerHTML = `<div class="page-head"><h1>Privacidade e Consentimentos</h1><p class="lead">Veja o que você autorizou e controle seus dados, conforme a LGPD.</p></div><div class="two-col"><div class="card stack"><h2>Consentimentos</h2><label class="check"><input type="checkbox" checked disabled> Termos de uso (obrigatório para usar o serviço)</label><label class="check"><input type="checkbox" checked disabled> Tratamento de dados de saúde (obrigatório para atendimento)</label><label class="check"><input type="checkbox" id="c-not" ${cs.notificacoes !== false ? "checked" : ""}> Lembretes e avisos por notificação</label><label class="check"><input type="checkbox" id="c-mkt" ${cs.marketing ? "checked" : ""}> Receber novidades e campanhas de saúde</label><p class="hint">Aceito em ${fmtHora(cs.aceitoEm || c.criadoEm)}.</p></div>
  <div class="stack"><div class="card stack"><h2>Meus dados</h2><p class="muted">Baixe uma cópia de tudo o que a clínica guarda sobre você.</p><button class="btn outline" id="baixar" type="button">${ico("download")} Baixar Meus Dados</button></div><div class="card stack"><h2>Excluir minha conta</h2><p class="muted">Seus dados de acesso e cadastro são removidos. O prontuário das consultas já feitas é mantido pela clínica pelo prazo exigido em lei.</p><button class="btn danger outline" id="excluir" type="button">${ico("trash")} Excluir Minha Conta</button></div></div></div>`;
  const salvar = () => { DB.upd("clientes", c.id, (x) => ({ consentimentos: { ...x.consentimentos, notificacoes: $("#c-not").checked, marketing: $("#c-mkt").checked } })); toast("Preferência salva.", "ok"); };
  $("#c-not").addEventListener("change", salvar); $("#c-mkt").addEventListener("change", salvar);
  $("#baixar").addEventListener("click", () => { const { senha, ...cad } = c; baixarArquivo("meus-dados-caismed.json", JSON.stringify({ cadastro: cad, consultas: minhasConsultas(), documentos: DB.get("documentos").filter((d) => d.clienteId === c.id), pagamentos: DB.get("pagamentos").filter((p) => p.clienteId === c.id), autorizacoes: DB.get("autorizacoes").filter((a) => a.clienteId === c.id) }, null, 2), "application/json"); audit("Baixou os próprios dados"); });
  $("#excluir").addEventListener("click", () => abrirModal({ titulo: "Excluir Conta", corpo: `<p>Esta ação não pode ser desfeita. Digite <b>EXCLUIR</b> para confirmar.</p><div class="field" style="margin-top:10px"><input id="conf" aria-label="Digite EXCLUIR" autocomplete="off"></div>`, botoes: [{ rotulo: "Voltar", classe: "outline" }, { rotulo: "Excluir Conta", classe: "danger", aoClicar: () => { if ($("#conf").value.trim().toUpperCase() !== "EXCLUIR") { toast("Digite EXCLUIR para confirmar.", "err"); return false; } audit("Excluiu a própria conta", c.nome); /* TODO: DELETE /clientes/:id */ DB.del("clientes", c.id); Sessao.sair(); location.href = "login.html"; } }] }));
}

// ---------- G08 Triagem (chatbot) ----------
function triagem() {
  const msgs = $("#chat-messages"), area = $("#chat-input-area");
  const perguntas = [
    { id: "motivo", tipo: "texto", pergunta: "Oi! Antes da sua consulta, vou fazer algumas perguntas rápidas. Qual o motivo que te trouxe até aqui?", placeholder: "Ex.: dor de cabeça, retorno, exame..." },
    { id: "sintomas", tipo: "multipla", pergunta: "Você está sentindo algum desses sintomas? Pode marcar mais de um.", opcoes: [["febre", "Febre"], ["tosse", "Tosse"], ["dor_cabeca", "Dor de cabeça"], ["dor_corpo", "Dor no corpo"], ["falta_ar", "Falta de ar"], ["nausea", "Náusea"]] },
    { id: "urgencia", tipo: "unica", pergunta: "Como você classificaria a urgência disso?", opcoes: [["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]] },
    { id: "observacoes", tipo: "texto-opcional", pergunta: "Quer contar mais algum detalhe? Se não tiver nada, é só pular.", placeholder: "Observações (opcional)" },
  ];
  const respostas = {}; let passo = 0;
  const bolha = (t, a) => { const el = document.createElement("div"); el.className = `msg msg-${a}`; el.textContent = t; msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight; };
  const audio = (url) => { const el = document.createElement("div"); el.className = "msg msg-user"; el.innerHTML = `<audio controls src="${url}"></audio>`; msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight; };
  const avancar = (txt) => { bolha(txt, "user"); passo++; render(); };
  const mic = (onAudio) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "chat-mic"; b.title = "Enviar áudio"; b.setAttribute("aria-label", "Gravar áudio"); b.innerHTML = ico("mic");
    let rec, chunks = [], t0, timer;
    b.addEventListener("click", async () => {
      if (rec && rec.state === "recording") { rec.stop(); return; }
      try {
        const st = await navigator.mediaDevices.getUserMedia({ audio: true }); rec = new MediaRecorder(st); chunks = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () => { clearInterval(timer); st.getTracks().forEach((t) => t.stop()); b.classList.remove("rec"); b.innerHTML = ico("mic"); onAudio(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }))); };
        rec.start(); t0 = Date.now(); b.classList.add("rec"); timer = setInterval(() => (b.textContent = Math.floor((Date.now() - t0) / 1000) + "s"), 500);
      } catch (e) { toast("Não foi possível acessar o microfone. Libere a permissão no navegador.", "err"); }
    });
    return b;
  };
  // TODO: trocar por chamada à IA do chatbot (back-end). Por enquanto é uma regra simples.
  const escolher = (r) => {
    const t = (r.motivo || "").toLowerCase(), s = r.sintomas || [];
    if (/crian|filh|beb[eê]/.test(t)) return "pediatria";
    if (/pele|mancha|alergi|coceira/.test(t)) return "dermatologia";
    if (/joelho|coluna|osso|fratura|tornozelo|ombro/.test(t)) return "ortopedia";
    if (/gravidez|gestante|menstrua|ginecolog/.test(t)) return "ginecologia";
    if (/peito|cora[cç][aã]o|press[aã]o/.test(t) || s.includes("falta_ar")) return "cardiologia";
    return "clinico_geral";
  };
  function render() {
    area.innerHTML = "";
    if (passo >= perguntas.length) {
      const esp = escolher(respostas);
      bolha(`Com base no que você me contou, o mais indicado é uma consulta de ${espNome(esp)}. Já deixei essa sugestão registrada em "Minhas Consultas".`, "bot");
      if (respostas.urgencia === "alta" || (respostas.sintomas || []).includes("falta_ar")) bolha("Atenção: se os sintomas forem fortes ou piorarem, não espere a consulta. Procure um pronto-socorro ou ligue 192 (SAMU).", "bot");
      const c = eu();
      const nova = DB.add("consultas", { pacienteId: c.id, paciente: c.nome, tipo: "consulta", especialidade: esp, data: "", horario: "", status: "sugerida", origem: "triagem", preTriagem: respostas, valor: valorCliente(c, "consulta", esp).valor, pago: false, criadoEm: new Date().toISOString(), historico: [{ quando: new Date().toISOString(), texto: "Sugerida pela triagem" }] });
      audit("Concluiu triagem", espNome(esp)); // TODO: POST /triagem (multipart: audio)
      area.innerHTML = `<div class="actions" style="margin:0"><a class="btn" href="agendamento.html?remarcar=${nova.id}">Marcar Horário Agora</a><a class="btn outline" href="consultas.html">Ver Minhas Consultas</a></div>`;
      return;
    }
    const p = perguntas[passo]; bolha(p.pergunta, "bot");
    if (p.tipo === "texto" || p.tipo === "texto-opcional") {
      const row = document.createElement("div"); row.className = "chat-send-row";
      const input = document.createElement("input"); input.type = "text"; input.className = "chat-text-input"; input.placeholder = p.placeholder; input.setAttribute("aria-label", p.placeholder);
      const enviar = () => { const v = input.value.trim(); if (!v && p.tipo === "texto") return; respostas[p.id] = v; avancar(v || "Pular"); };
      input.addEventListener("keydown", (e) => e.key === "Enter" && enviar());
      const send = document.createElement("button"); send.type = "button"; send.className = "chat-send-btn"; send.setAttribute("aria-label", "Enviar"); send.innerHTML = ico("send"); send.addEventListener("click", enviar);
      row.append(input, mic((url) => { respostas[p.id] = "[Áudio enviado]"; audio(url); passo++; render(); }), send); area.appendChild(row);
      if (p.tipo === "texto-opcional") { const pular = document.createElement("button"); pular.type = "button"; pular.className = "link"; pular.textContent = "Pular"; pular.addEventListener("click", () => { respostas[p.id] = ""; avancar("Pular"); }); area.appendChild(pular); }
      input.focus();
    }
    if (p.tipo === "multipla") {
      const sel = new Set(), chips = document.createElement("div"); chips.className = "chat-chips";
      p.opcoes.forEach(([v, l]) => { const b = document.createElement("button"); b.type = "button"; b.className = "chat-chip"; b.textContent = l; b.setAttribute("aria-pressed", "false"); b.addEventListener("click", () => { sel.has(v) ? sel.delete(v) : sel.add(v); b.classList.toggle("selected"); b.setAttribute("aria-pressed", String(sel.has(v))); }); chips.appendChild(b); });
      const ok = document.createElement("button"); ok.type = "button"; ok.className = "btn"; ok.textContent = "Confirmar"; ok.addEventListener("click", () => { respostas[p.id] = [...sel]; avancar(sel.size ? p.opcoes.filter(([v]) => sel.has(v)).map(([, l]) => l).join(", ") : "Nenhum sintoma"); });
      area.append(chips, ok);
    }
    if (p.tipo === "unica") { const chips = document.createElement("div"); chips.className = "chat-chips"; p.opcoes.forEach(([v, l]) => { const b = document.createElement("button"); b.type = "button"; b.className = "chat-chip"; b.textContent = l; b.addEventListener("click", () => { respostas[p.id] = v; avancar(l); }); chips.appendChild(b); }); area.appendChild(chips); }
  }
  render();
}

// ---------- G07 Notificações (todos os perfis) ----------
function notificacoes() {
  const desenhar = () => {
    const l = minhasNotifs();
    $("#lista-not").innerHTML = l.length ? l.map((n) => `<a class="item" href="${n.link || "#"}" data-id="${n.id}" style="${n.lida ? "" : "border-color:var(--blue-text)"}">${ico("bell")}<span class="grow"><b>${esc(n.titulo)}</b><small>${esc(n.texto)}</small><small>${fmtHora(n.quando)}</small></span>${n.lida ? "" : '<span class="badge info">Nova</span>'}</a>`).join("") : vazio("Sem Notificações", "Lembretes, avisos e mensagens aparecem aqui.");
    $$("#lista-not a").forEach((a) => a.addEventListener("click", () => DB.upd("notificacoes", a.dataset.id, { lida: true })));
  };
  raizPag().innerHTML = `<div class="page-head"><h1>Notificações</h1><button class="btn outline" id="ler" type="button">${ico("check")} Marcar Todas Como Lidas</button></div><div class="stack" id="lista-not" style="max-width:760px"></div>`;
  $("#ler").addEventListener("click", () => { minhasNotifs().forEach((n) => DB.upd("notificacoes", n.id, { lida: true })); location.reload(); });
  desenhar();
}

// ---------- C18 / G09 Ajuda e ouvidoria ----------
function ajuda() {
  const logado = !!(Sessao.perfil && eu()), c = logado && Sessao.perfil === "cliente" ? eu() : null;
  const faq = [["Como agendo uma consulta?", "Toque em Nova Consulta, escolha o tipo, a especialidade, a unidade, o médico e o horário. No fim, confirme."], ["Posso cancelar ou remarcar?", `Sim, pelo app até ${cfg().cancelarAteHoras} horas antes. Depois disso, ligue para a unidade.`], ["Como faço check-in?", "No dia da consulta, abra a consulta e toque em Fazer Check-in, ou mostre o QR Code da carteirinha na recepção."], ["Esqueci minha senha.", "Na tela de login, toque em Esqueceu a Senha? e informe seu CPF."], ["Como recebo receitas e resultados?", "Eles ficam em Documentos assim que o médico finaliza o atendimento ou o laudo é liberado."], ["A triagem substitui a consulta?", "Não. Ela só ajuda a escolher a especialidade e adianta informações para o médico."]];
  raizPag().innerHTML = `<div class="page-head"><h1>Ajuda e Ouvidoria</h1></div><div class="two-col"><div class="stack"><h2>Perguntas frequentes</h2>${faq.map(([q, a]) => `<details class="card"><summary style="font-weight:800;cursor:pointer;min-height:32px">${q}</summary><p class="muted" style="margin-top:8px">${a}</p></details>`).join("")}<h2 style="margin-top:10px">Telefones das unidades</h2>${DB.get("unidades").map((u) => `<div class="kv"><span>${esc(u.nome)}</span><span>${esc(u.fone)}</span></div>`).join("")}</div>
  <form id="ouv" class="card stack" novalidate><h2>Fale com a ouvidoria</h2>${logado ? "" : `<div class="field"><label for="o-nome">Seu nome</label><input id="o-nome" required></div><div class="field"><label for="o-mail">E-mail</label><input id="o-mail" type="email" data-valida="email" required></div>`}<div class="field"><label for="o-tipo">Tipo</label><select id="o-tipo"><option>Dúvida</option><option>Elogio</option><option>Sugestão</option><option>Reclamação</option></select></div><div class="field"><label for="o-ass">Assunto</label><input id="o-ass" required></div><div class="field"><label for="o-msg">Mensagem</label><textarea id="o-msg" required></textarea></div><button class="btn" type="submit">Enviar Mensagem</button></form></div>`;
  ligarMascaras($("#ouv"));
  $("#ouv").addEventListener("submit", (e) => { e.preventDefault(); if (!formularioValido(e.target)) return; const u = logado ? eu() : null; if (!$("#o-ass").value.trim() || !$("#o-msg").value.trim() || (!logado && (!$("#o-nome").value.trim() || !$("#o-mail").value.trim()))) return toast("Preencha todos os campos.", "err");
    DB.add("ouvidoria", { tipo: $("#o-tipo").value, assunto: $("#o-ass").value.trim(), mensagem: $("#o-msg").value.trim(), clienteId: c?.id || null, nome: u?.nome || $("#o-nome").value.trim(), email: u?.email || $("#o-mail")?.value || "", perfil: Sessao.perfil || "visitante", status: "nova", criadoEm: new Date().toISOString() });
    notificar("admin", "Nova Mensagem na Ouvidoria", $("#o-ass").value.trim(), "admin-ouvidoria.html"); toast("Mensagem enviada. Respondemos em até 5 dias úteis.", "ok"); e.target.reset(); });
}

ready(() => {
  ({ home, consultas, "consulta": consultaDetalhe, "agendamento-confirmado": agendamentoConfirmado, teleconsulta, documentos, carteirinha, dependentes, autorizacoes, pagamento, perfil, "perfil-editar": perfilEditar, privacidade, triagem, notificacoes, ajuda,
    agendamento: () => iniciarWizard("cliente") })[document.body.dataset.pagina]?.();
});
