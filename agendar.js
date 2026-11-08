"use strict";
/* C02 / C03 / A03: agendamento em etapas. Serve o paciente (agendamento.html) e o atendente (agendar-paciente.html). */

const kmEntre = (a, b) => { const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 6371 * 2 * Math.asin(Math.sqrt(x)); };
const ROT_ETAPA = { paciente: "Paciente", tipo: "Tipo de Atendimento", esp: "Especialidade", exame: "Exame", unidade: "Unidade", medico: "Médico", horario: "Dia e Horário", revisar: "Revisar e Confirmar" };

function iniciarWizard(modo) {
  const q = new URLSearchParams(location.search);
  const raiz = $("#etapa");
  const S = { tipo: q.get("tipo") || "consulta", especialidade: q.get("especialidade") || "", exame: q.get("exame") || "", unidadeId: q.get("unidade") || "", qualquer: false, medicoId: q.get("medico") || "", data: q.get("data") || "", horario: q.get("horario") || "", dependenteId: "", clienteId: modo === "cliente" ? Sessao.id : q.get("cliente") || "", idExistente: "", pedidoNome: "", i: 0, pos: null };
  const idRem = q.get("remarcar") || q.get("consultaId");
  let preset = ["especialidade", "medico", "unidade", "exame", "data", "cliente"].some((k) => q.get(k)) || q.get("tipo");
  if (idRem) {
    const c = DB.find("consultas", idRem);
    if (c) { Object.assign(S, { tipo: c.tipo, especialidade: c.especialidade, exame: c.exame, unidadeId: c.tipo === "teleconsulta" || !c.data ? "" : c.unidadeId, medicoId: c.medicoId || "", clienteId: c.pacienteId, dependenteId: c.dependenteId || "", idExistente: c.id, data: "", horario: "" }); S.remarcando = !!c.data; preset = true; if (c.data) S.unidadeId = c.unidadeId; if (!c.data) S.medicoId = ""; }
  }
  if (S.medicoId && !S.especialidade) S.especialidade = (medicoPorId(S.medicoId)?.especialidades || [])[0] || "";
  if (S.unidadeId && S.especialidade === "" && S.tipo === "exame") S.especialidade = "";
  const cliente = () => DB.find("clientes", S.clienteId);
  const passos = () => (modo === "atendente" ? ["paciente"] : []).concat(["tipo"], S.tipo === "exame" ? ["exame", "unidade", "horario", "revisar"] : S.tipo === "teleconsulta" ? ["esp", "medico", "horario", "revisar"] : ["esp", "unidade", "medico", "horario", "revisar"]);
  const completo = (p) => ({ paciente: !!S.clienteId, tipo: !!preset, esp: !!S.especialidade, exame: !!S.exame, unidade: !!(S.unidadeId || S.qualquer), medico: !!S.medicoId, horario: !!(S.data && S.horario), revisar: false })[p];
  const primeiroIncompleto = () => { const ps = passos(); const i = ps.findIndex((p) => !completo(p)); return i < 0 ? ps.length - 1 : i; };
  if (idRem && S.remarcando) { S.i = passos().indexOf("horario"); } else S.i = primeiroIncompleto();
  const ir = (p) => { S.i = Math.max(0, passos().indexOf(p)); desenhar(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const proximo = () => { const ps = passos(); S.i = Math.min(S.i + 1, ps.length - 1); while (S.i < ps.length - 1 && completo(ps[S.i]) && ps[S.i] !== "horario" && ps[S.i] !== "revisar" && ps[S.i] !== "tipo" && ps[S.i] !== "paciente") S.i++; desenhar(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const opt = (id, ic, titulo, sub, sel, extra = "") => `<button type="button" class="opt" data-id="${esc(id)}" aria-pressed="${sel}">${ico(ic)}<span class="grow"><b>${titulo}</b><small>${sub}</small></span>${extra}</button>`;
  const unidadeId = () => (S.tipo === "teleconsulta" ? "online" : S.qualquer ? null : S.unidadeId || null);

  const E = {
    paciente() {
      raiz.innerHTML = `<div class="field"><label for="busca-pac">Buscar paciente por nome ou CPF</label><input id="busca-pac" type="search" placeholder="Digite pelo menos 3 letras ou números" autocomplete="off"></div><div class="stack" id="res-pac"></div><div id="dep-box"></div>`;
      const lista = () => {
        const t = $("#busca-pac").value.trim().toLowerCase(), d = soDigitos(t);
        const sel = DB.find("clientes", S.clienteId);
        const itens = DB.get("clientes").filter((c) => (t.length >= 3 && (c.nome.toLowerCase().includes(t) || (d.length >= 3 && c.cpf.includes(d)))) || c.id === S.clienteId);
        $("#res-pac").innerHTML = itens.length ? itens.slice(0, 8).map((c) => opt(c.id, "user", esc(c.nome), `CPF ${fmtCPF(c.cpf)}`, c.id === S.clienteId)).join("") : t.length >= 3 ? vazio("Paciente Não Encontrado", "Cadastre o paciente antes de agendar.", `<a class="btn sm" href="cliente-form.html">Cadastrar Paciente</a>`) : "";
        $$("#res-pac .opt").forEach((b) => b.addEventListener("click", () => { S.clienteId = b.dataset.id; S.dependenteId = ""; lista(); }));
        const deps = (sel?.dependentes || []).filter((x) => idade(x.nascimento) < 18 || x.acesso);
        $("#dep-box").innerHTML = sel ? `<div class="field" style="margin-top:14px"><label for="dep">Atendimento para</label><select id="dep"><option value="">${esc(sel.nome)} (titular)</option>${deps.map((x) => `<option value="${x.id}" ${x.id === S.dependenteId ? "selected" : ""}>${esc(x.nome)} (${esc(x.parentesco)})</option>`).join("")}</select></div><button class="btn block" type="button" id="seguir">Continuar</button>` : "";
        $("#dep")?.addEventListener("change", (e) => (S.dependenteId = e.target.value));
        $("#seguir")?.addEventListener("click", proximo);
      };
      $("#busca-pac").addEventListener("input", lista); lista();
    },
    tipo() {
      const deps = (cliente()?.dependentes || []).filter((x) => idade(x.nascimento) < 18 || x.acesso);
      raiz.innerHTML = `${deps.length && modo === "cliente" ? `<div class="field"><label for="dep">Para quem é o atendimento?</label><select id="dep"><option value="">Para mim</option>${deps.map((x) => `<option value="${x.id}" ${x.id === S.dependenteId ? "selected" : ""}>${esc(x.nome)} (${esc(x.parentesco)})</option>`).join("")}</select></div>` : ""}
      <div class="stack">${opt("consulta", "calendar", "Consulta Presencial", "Escolha a unidade, o médico e o horário", S.tipo === "consulta")}${opt("exame", "file", "Exame", "Laboratório e imagem, com orientação de preparo", S.tipo === "exame")}${opt("teleconsulta", "video", "Teleconsulta", "Atendimento por vídeo, sem sair de casa", S.tipo === "teleconsulta")}</div>`;
      $("#dep")?.addEventListener("change", (e) => (S.dependenteId = e.target.value));
      $$(".opt", raiz).forEach((b) => b.addEventListener("click", () => { if (S.tipo !== b.dataset.id) Object.assign(S, { medicoId: "", unidadeId: "", qualquer: false, data: "", horario: "", especialidade: "", exame: "" }); S.tipo = b.dataset.id; preset = true; proximo(); }));
    },
    esp() {
      const meds = medicosAtivos().filter((m) => (S.tipo !== "teleconsulta" || m.tele) && (!S.unidadeId || m.unidades.includes(S.unidadeId)));
      const ids = new Set(meds.flatMap((m) => m.especialidades));
      const l = espLista().filter((e) => ids.has(e.id));
      raiz.innerHTML = `<div class="stack">${l.map((e) => { const v = valorCliente(cliente(), "consulta", e.id); return opt(e.id, "heart", esc(e.nome), `${v.plano ? `Seu valor: ${brl(v.valor)} (coparticipação de ${v.pct}%)` : `Particular: ${brl(v.base)}`}`, e.id === S.especialidade); }).join("") || vazio("Sem Médicos Disponíveis", "Não há médicos para esse tipo de atendimento no momento.")}</div>`;
      $$(".opt", raiz).forEach((b) => b.addEventListener("click", () => { if (S.especialidade !== b.dataset.id) Object.assign(S, { medicoId: "", data: "", horario: "" }); S.especialidade = b.dataset.id; proximo(); }));
    },
    exame() {
      const pend = DB.get("documentos").filter((d) => d.clienteId === S.clienteId && d.tipo === "exame_pedido");
      raiz.innerHTML = `${pend.length ? `<p class="muted" style="margin-bottom:8px">Você tem pedidos de exame feitos pelo seu médico. Toque em um exame abaixo para agendar.</p>` : ""}
      <div class="stack">${DB.get("exames", EXAMES_PADRAO).map((x) => { const v = valorCliente(cliente(), "exame", x.id); return opt(x.id, "file", esc(x.nome), `${esc(x.preparo)} · ${v.plano ? `Seu valor: ${brl(v.valor)}` : brl(v.base)}`, x.id === S.exame); }).join("")}</div><div id="exame-det"></div>`;
      const det = () => { const x = DB.find("exames", S.exame); $("#exame-det").innerHTML = x ? `<div class="card pale stack" style="margin-top:14px"><b>Preparo: ${esc(x.preparo)}</b><div class="field" style="margin:0"><label for="pedido">Pedido médico (foto ou PDF)</label><input id="pedido" type="file" accept="image/*,application/pdf"><span class="hint">Leve o pedido original no dia do exame.</span></div><button type="button" class="btn block" id="seguir">Continuar</button></div>` : ""; $("#pedido")?.addEventListener("change", (e) => (S.pedidoNome = e.target.files[0]?.name || "")); $("#seguir")?.addEventListener("click", proximo); };
      $$(".opt", raiz).forEach((b) => b.addEventListener("click", () => { S.exame = b.dataset.id; $$(".opt", raiz).forEach((o) => o.setAttribute("aria-pressed", String(o === b))); det(); $("#exame-det").scrollIntoView({ behavior: "smooth", block: "nearest" }); }));
      det();
    },
    unidade() {
      let us = DB.get("unidades").filter((u) => u.ativa !== false && (S.tipo === "exame" || u.especialidades.includes(S.especialidade)));
      if (S.pos) us = us.map((u) => ({ ...u, km: u.lat ? kmEntre(S.pos, u) : 999 })).sort((a, b) => a.km - b.km);
      raiz.innerHTML = `<div class="stack">${S.tipo !== "exame" ? opt("qualquer", "pin", "Qualquer Unidade", "Mostra o primeiro horário livre em toda a rede", S.qualquer) : ""}${us.map((u) => opt(u.id, "building", esc(u.nome), `${esc(u.endereco)}, ${esc(u.bairro)}${u.km != null ? ` · a ${u.km.toFixed(1).replace(".", ",")} km de você` : ""}`, u.id === S.unidadeId && !S.qualquer)).join("")}</div>
      <button type="button" class="link" id="loc">${ico("pin", 'style="width:18px;height:18px;vertical-align:-3px"')} Usar minha localização para ver a distância</button>`;
      $("#loc").addEventListener("click", () => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => { S.pos = { lat: p.coords.latitude, lng: p.coords.longitude }; E.unidade(); }, () => toast("Não foi possível pegar sua localização.", "err")) : toast("Seu navegador não permite localização.", "err"));
      $$(".opt", raiz).forEach((b) => b.addEventListener("click", () => { const id = b.dataset.id; Object.assign(S, { medicoId: S.tipo === "exame" ? "" : "", data: "", horario: "" }); S.qualquer = id === "qualquer"; S.unidadeId = S.qualquer ? "" : id; proximo(); }));
    },
    medico() {
      const ms = medicosAtivos().filter((m) => m.especialidades.includes(S.especialidade) && (S.tipo !== "teleconsulta" || m.tele) && (!S.unidadeId || S.tipo === "teleconsulta" || m.unidades.includes(S.unidadeId)));
      raiz.innerHTML = ms.length ? `<div class="stack">${ms.map((m) => { const p = proximoLivre(m, unidadeId()); return `<button type="button" class="doc-card" data-id="${m.id}" aria-pressed="${m.id === S.medicoId}"><span class="avatar lg">${esc(iniciais(m.nome))}</span><span class="grow"><b>${esc(m.nome)}</b><small>${esc(m.crm)} · <span class="rating">★ ${m.nota.toFixed(1)}</span></small><small>${p ? `Próximo horário livre: <b>${rotuloDia(p.data)} às ${p.h}</b>` : "Sem horários nos próximos dias"}</small></span></button>`; }).join("")}</div>`
        : vazio("Sem Médicos Para Essa Escolha", "Você pode entrar na lista de espera e avisamos quando abrir um horário.", `<button class="btn sm" id="espera" type="button">Entrar na Lista de Espera</button>`);
      $("#espera")?.addEventListener("click", () => { DB.add("espera", { clienteId: S.clienteId, especialidade: S.especialidade, unidadeId: S.unidadeId, criadoEm: new Date().toISOString(), avisado: false }); notificar("atendente", "Lista de Espera", `${cliente()?.nome} aguarda vaga de ${espNome(S.especialidade)}.`, "espera.html"); toast("Você está na lista de espera. Vamos avisar quando abrir um horário.", "ok"); });
      $$(".doc-card", raiz).forEach((b) => b.addEventListener("click", () => { if (S.medicoId !== b.dataset.id) Object.assign(S, { data: "", horario: "" }); S.medicoId = b.dataset.id; proximo(); }));
    },
    horario() {
      const m = medicoPorId(S.medicoId), exame = S.tipo === "exame";
      const slotsDia = (iso) => (exame ? slotsExame(S.unidadeId, iso) : m ? slotsDoMedico(m, iso, unidadeId()) : []);
      const dias = Array.from({ length: 21 }, (_, i) => addDias(hojeISO(), i));
      const livres = (iso) => slotsDia(iso).filter((s) => s.livre).length;
      if (!S.data || livres(S.data) === 0) { const d = dias.find((x) => livres(x) > 0); if (d && !(S.data && S.horario && livres(S.data))) S.data = d; }
      raiz.innerHTML = `<div class="card pale row" style="margin-bottom:14px">${m ? `<span class="avatar">${esc(iniciais(m.nome))}</span><span><b>${esc(m.nome)}</b><br><small class="muted">${esc(espNome(S.especialidade))}</small></span>` : `<span class="avatar">${ico("file", 'style="width:22px"')}</span><span><b>${esc((DB.find("exames", S.exame) || {}).nome || "Exame")}</b><br><small class="muted">${esc(nomeUnidade(S.unidadeId))}</small></span>`}</div>
      <div class="label" style="margin-bottom:6px">Escolha o dia</div><div class="date-strip" id="datas">${dias.map((d) => { const n = livres(d); return `<button type="button" data-d="${d}" ${n ? "" : "disabled"} aria-pressed="${d === S.data}" aria-label="${fmtDataLonga(d)}${n ? "" : ", sem horários"}"><small>${DIAS[diaSemana(d)].slice(0, 3)}</small><b>${d.slice(8)}</b><small>${MESES[+d.slice(5, 7) - 1]}</small></button>`; }).join("")}</div>
      <div class="label" style="margin:10px 0 6px">Escolha o horário em ${fmtDataLonga(S.data)}</div><div id="slots"></div>
      <div class="actions"><button type="button" class="btn" id="seguir" disabled>Continuar</button></div>`;
      const slots = () => {
        const l = slotsDia(S.data); const grupos = {}; l.forEach((s) => (grupos[s.unidadeId] ||= []).push(s));
        const multi = Object.keys(grupos).length > 1;
        $("#slots").innerHTML = l.length ? Object.entries(grupos).map(([u, ss]) => `${multi ? `<div class="muted" style="margin:10px 0 6px"><b>${esc(nomeUnidade(u))}</b></div>` : ""}<div class="slot-grid">${ss.map((s) => `<button type="button" class="slot" data-h="${s.h}" data-u="${s.unidadeId}" ${s.livre ? "" : "disabled"} aria-pressed="${s.h === S.horario && (!multi || s.unidadeId === S.unidadeId)}">${s.h}</button>`).join("")}</div>`).join("") : vazio("Sem Horários Neste Dia", "Escolha outro dia na lista acima.");
        $$(".slot", raiz).forEach((b) => b.addEventListener("click", () => { S.horario = b.dataset.h; if (S.tipo !== "teleconsulta") S.unidadeId = b.dataset.u; S.qualquer = false; $$(".slot", raiz).forEach((o) => o.setAttribute("aria-pressed", String(o === b))); $("#seguir").disabled = false; }));
        $("#seguir").disabled = !(S.horario && l.some((s) => s.h === S.horario && s.livre));
      };
      $$("#datas button", raiz).forEach((b) => b.addEventListener("click", () => { S.data = b.dataset.d; S.horario = ""; $$("#datas button").forEach((o) => o.setAttribute("aria-pressed", String(o === b))); desenhar(); }));
      $("#seguir").addEventListener("click", proximo);
      slots();
      $("#datas [aria-pressed=true]")?.scrollIntoView({ inline: "center", block: "nearest" });
    },
    revisar() {
      const m = medicoPorId(S.medicoId), c = cliente(), exame = S.tipo === "exame";
      const v = valorCliente(c, exame ? "exame" : "consulta", exame ? S.exame : S.especialidade);
      const un = unidadePorId(S.unidadeId), dep = (c?.dependentes || []).find((x) => x.id === S.dependenteId);
      raiz.innerHTML = `<div class="review"><div class="kv"><span>Paciente</span><span>${esc(dep ? dep.nome : c?.nome)}</span></div><div class="kv"><span>Atendimento</span><span>${TIPOS[S.tipo]}: ${esc(exame ? (DB.find("exames", S.exame) || {}).nome : espNome(S.especialidade))}</span></div>${m ? `<div class="kv"><span>Médico</span><span>${esc(m.nome)}</span></div>` : ""}<div class="kv"><span>Local</span><span>${S.tipo === "teleconsulta" ? "Online (link na hora)" : esc(un ? `${un.nome}, ${un.endereco}` : "—")}</span></div><div class="kv"><span>Data e hora</span><span>${fmtDataLonga(S.data)} às ${S.horario}</span></div>${S.pedidoNome ? `<div class="kv"><span>Pedido médico</span><span>${esc(S.pedidoNome)}</span></div>` : ""}<div class="kv"><span>Valor</span><span><b>${brl(v.valor)}</b>${v.plano ? `<br><small class="muted">Coparticipação de ${v.pct}% sobre ${brl(v.base)}</small>` : '<br><small class="muted">Atendimento particular</small>'}</span></div></div>
      <p class="muted" style="margin-top:12px">${exame ? "Siga o preparo do exame e chegue 15 minutos antes. " : ""}Cancelamento ou remarcação grátis até ${cfg().cancelarAteHoras} horas antes.</p>
      ${modo === "atendente" ? `<label class="check"><input type="checkbox" id="zap" checked> Enviar confirmação por WhatsApp/SMS ao paciente</label>` : ""}
      <div class="actions"><button type="button" class="btn outline" id="trocar">Alterar Horário</button><button type="button" class="btn" id="confirmar">${S.idExistente && S.remarcando ? "Confirmar Remarcação" : "Confirmar Agendamento"}</button></div>`;
      $("#trocar").addEventListener("click", () => ir("horario"));
      $("#confirmar").addEventListener("click", (e) => {
        e.target.disabled = true;
        const por = modo === "cliente" ? "paciente" : `atendente ${eu().nome}`;
        // TODO: trocar por POST /consultas (ou PATCH /consultas/:id ao remarcar)
        if (S.idExistente && S.remarcando && modo === "cliente") { const c0 = DB.find("consultas", S.idExistente); if (c0?.data && horasAte(c0.data, c0.horario) < cfg().cancelarAteHoras) { e.target.disabled = false; return toast(`A remarcação online só é possível com ${cfg().cancelarAteHoras} horas de antecedência. Ligue para a clínica.`, "err"); } }
        const r = agendar({ clienteId: S.clienteId, dependenteId: S.dependenteId, tipo: S.tipo, especialidade: S.especialidade, exame: S.exame, unidadeId: S.unidadeId, medicoId: S.medicoId, data: S.data, horario: S.horario, por, origem: modo === "cliente" ? "app" : "recepção", idExistente: S.idExistente, pedidoNome: S.pedidoNome });
        if (!r.ok) { e.target.disabled = false; toast(r.erro, "err"); return ir("horario"); }
        if (modo === "atendente") { if ($("#zap")?.checked) toast("Confirmação enviada ao paciente (simulada).", "ok"); sessionStorage.setItem("agendaData", S.data); setTimeout(() => (location.href = "agenda.html?ok=1"), 600); }
        else location.href = `agendamento-confirmado.html?id=${r.consulta.id}`;
      });
    },
  };
  function desenhar() {
    const ps = passos(); S.i = Math.min(S.i, ps.length - 1); const p = ps[S.i];
    $("#steps").innerHTML = ps.map((_, k) => `<li class="${k < S.i ? "done" : k === S.i ? "now" : ""}"></li>`).join("");
    $("#step-label").textContent = `Etapa ${S.i + 1} de ${ps.length}: ${ROT_ETAPA[p]}`;
    $("#wiz-voltar").hidden = S.i === 0;
    E[p]();
  }
  $("#wiz-voltar").addEventListener("click", () => { S.i = Math.max(0, S.i - 1); const ps = passos(); if (ps[S.i] === "tipo" && modo === "cliente" && S.i === 0) { /* primeira */ } desenhar(); });
  desenhar();
}
