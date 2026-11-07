// Front-end da Zolin Acabamentos. JavaScript puro, sem dependências.
// Fala com a API do Spring Boot (/api/relatorios, /api/cadastros, /api/movimentacoes).

(() => {
  "use strict";

  const API = String(window.ZOLIN_API_BASE || "").replace(/\/$/, "");

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

  /** Cria elementos sem usar innerHTML: os textos vêm do banco e nunca são tratados como HTML. */
  function el(tag, attrs = {}, ...filhos) {
    const no = document.createElement(tag);
    for (const [chave, valor] of Object.entries(attrs)) {
      if (valor == null || valor === false) continue;
      if (chave === "class") no.className = valor;
      else if (chave.startsWith("on")) no.addEventListener(chave.slice(2), valor);
      else no.setAttribute(chave, valor === true ? "" : valor);
    }
    for (const filho of filhos.flat()) {
      if (filho == null || filho === false) continue;
      no.append(filho.nodeType ? filho : document.createTextNode(String(filho)));
    }
    return no;
  }

  // ---------- Formatação ----------

  const nInt = new Intl.NumberFormat("pt-BR");
  const nPct = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const fmtInt = (n) => nInt.format(Number(n) || 0);
  const fmtPct = (n) => `${nPct.format(Number(n) || 0)}%`;

  function fmtData(valor) {
    if (!valor) return "";
    const d = new Date(valor);
    if (isNaN(d)) return "";
    // Datas sem hora chegam como meia-noite UTC: formatar em UTC evita voltar um dia.
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }

  function fmtDataHora(valor) {
    if (!valor) return "";
    const d = new Date(valor);
    if (isNaN(d)) return "";
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function humanizar(codigo) {
    if (!codigo) return "";
    const texto = String(codigo).replace(/_/g, " ").toLowerCase()
      .replace(/\bsaida\b/g, "saída")
      .replace(/\bmovimentacao\b/g, "movimentação")
      .replace(/\bproducao\b/g, "produção");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  const plural = (n, um, varios) => `${fmtInt(n)} ${Number(n) === 1 ? um : varios}`;

  // ---------- API ----------

  const conexao = $("#conexao");
  function marcarConexao(estado, texto) {
    conexao.dataset.estado = estado;
    $("#conexao-texto").textContent = texto;
  }

  class ErroApi extends Error {
    constructor(mensagem, { semResposta = false } = {}) {
      super(mensagem);
      this.semResposta = semResposta;
    }
  }

  async function api(caminho, opcoes = {}) {
    let resposta;
    try {
      resposta = await fetch(API + caminho, {
        headers: { Accept: "application/json", ...(opcoes.body ? { "Content-Type": "application/json" } : {}) },
        ...opcoes,
      });
    } catch (_) {
      marcarConexao("falha", "API sem resposta");
      throw new ErroApi("Não foi possível falar com o servidor.", { semResposta: true });
    }
    marcarConexao("ok", "API conectada");

    let corpo = null;
    try { corpo = await resposta.json(); } catch (_) { /* resposta sem JSON */ }

    if (!resposta.ok) {
      const motivo = (corpo && (corpo.erro || corpo.message)) || `O servidor respondeu com erro ${resposta.status}.`;
      throw new ErroApi(motivo);
    }
    return corpo;
  }

  // ---------- Estados de tela ----------

  function carregando() {
    return el("div", { class: "esqueleto", "aria-label": "Carregando", role: "status" }, el("i"), el("i"), el("i"));
  }

  function vazio(titulo, texto) {
    return el("div", { class: "estado" }, el("h2", {}, titulo), el("p", {}, texto));
  }

  function falha(erro, tentarDeNovo) {
    const dica = erro.semResposta
      ? "Confira se o servidor está rodando e se as variáveis DB_URL, DB_USER e DB_PASSWORD estão definidas."
      : "Se o problema continuar, veja o log do servidor.";
    return el("div", { class: "estado erro", role: "alert" },
      el("h2", {}, "Não foi possível carregar os dados"),
      el("p", {}, `${/[.!?]$/.test(erro.message) ? erro.message : `${erro.message}.`} ${dica}`),
      el("button", { type: "button", class: "btn sec", onclick: tentarDeNovo }, "Tentar de novo"));
  }

  // ---------- Andamento (fichas de OP) ----------

  const CONCLUIDA = /conclu|finaliz|entreg|encerr/i;
  const ALERTA = /atras|cancel|parad|bloque/i;

  function tomDoStatus(status) {
    if (!status) return "neutro";
    if (CONCLUIDA.test(status)) return "ok";
    if (ALERTA.test(status)) return "alerta";
    return "andamento";
  }

  function diasDeAtraso(previsao, status) {
    if (!previsao || CONCLUIDA.test(status || "")) return 0;
    const alvo = new Date(previsao);
    if (isNaN(alvo)) return 0;
    const hoje = new Date();
    const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const alvoUtc = Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), alvo.getUTCDate());
    return Math.max(0, Math.round((hojeUtc - alvoUtc) / 86400000));
  }

  function fichaDaOp(op) {
    const atraso = diasDeAtraso(op.previsaoEntrega, op.statusAtualOp);
    const movimentacao = op.ultimaMovimentacao
      ? [
          `Última movimentação: ${humanizar(op.ultimaMovimentacao)}`,
          op.ultimoParceiro ? ` com ${op.ultimoParceiro}` : " (processo interno)",
          op.dataMovimentacao ? `, em ${fmtDataHora(op.dataMovimentacao)}` : "",
        ].join("")
      : "Ainda sem movimentação registrada.";

    return el("li", { class: "ficha" },
      el("div", { class: "stub" },
        el("span", { class: "op-numero" }, op.numeroOp ?? "Sem número"),
        el("small", {}, op.quantidadePlanejada != null ? plural(op.quantidadePlanejada, "peça", "peças") : "Quantidade não informada")),
      el("div", { class: "ficha-corpo" },
        el("div", { class: "ficha-titulo" },
          el("span", { class: "ref" }, op.codigoReferencia ?? ""),
          op.descricaoPeca ?? ""),
        el("p", { class: "ficha-mov" }, movimentacao)),
      el("div", { class: "ficha-lado" },
        op.statusAtualOp ? el("span", { class: "status", "data-tom": tomDoStatus(op.statusAtualOp) }, humanizar(op.statusAtualOp)) : null,
        op.previsaoEntrega
          ? el("span", { class: atraso ? "prazo atraso" : "prazo" },
              atraso
                ? `Previsão ${fmtData(op.previsaoEntrega)}, venceu há ${plural(atraso, "dia", "dias")}`
                : `Entrega prevista em ${fmtData(op.previsaoEntrega)}`)
          : null));
  }

  function renderAndamento(corpo, lista) {
    if (!lista.length) {
      corpo.replaceChildren(vazio("Nenhuma ordem de produção ainda", "Quando houver OPs cadastradas, elas aparecem aqui com a última movimentação de cada uma."));
      return;
    }

    const campoBusca = el("input", { id: "busca-op", type: "search", autocomplete: "off", placeholder: "OP, referência, peça ou parceiro" });
    const contagem = el("p", { class: "contagem", "aria-live": "polite" });
    const fichas = el("ul", { class: "fichas" });

    function desenhar() {
      const termo = campoBusca.value.trim().toLowerCase();
      const filtradas = lista.filter((op) =>
        !termo || [op.numeroOp, op.codigoReferencia, op.descricaoPeca, op.ultimoParceiro, op.statusAtualOp]
          .some((campo) => String(campo ?? "").toLowerCase().includes(termo)));
      contagem.textContent = termo
        ? `${plural(filtradas.length, "ordem encontrada", "ordens encontradas")} de ${fmtInt(lista.length)}`
        : plural(lista.length, "ordem de produção", "ordens de produção");
      fichas.replaceChildren(...(filtradas.length
        ? filtradas.map(fichaDaOp)
        : [el("li", {}, vazio("Nada encontrado", "Nenhuma OP combina com essa busca. Tente outro número ou nome."))]));
    }

    campoBusca.addEventListener("input", desenhar);
    desenhar();
    corpo.replaceChildren(
      el("div", { class: "busca" }, el("label", { for: "busca-op" }, "Buscar"), campoBusca),
      contagem,
      fichas);
  }

  // ---------- Estoque (grade por tamanho) ----------

  const ORDEM_TAMANHOS = ["PPP", "PP", "P", "M", "G", "GG", "XG", "XGG", "EG", "EGG", "G1", "G2", "G3", "U", "UNICO", "ÚNICO"];

  function chaveTamanho(t) {
    const s = String(t ?? "").trim().toUpperCase();
    const i = ORDEM_TAMANHOS.indexOf(s);
    if (i >= 0) return [0, i, s];
    const n = parseFloat(s.replace(",", "."));
    if (!isNaN(n)) return [1, n, s];
    return [2, 0, s];
  }

  function compararTamanhos(a, b) {
    const ka = chaveTamanho(a), kb = chaveTamanho(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2], "pt-BR");
  }

  function renderEstoque(corpo, lista) {
    if (!lista.length) {
      corpo.replaceChildren(vazio("Estoque acabado zerado", "Não há saldo disponível. Ele aparece aqui assim que entrar peça aprovada no acabamento."));
      return;
    }

    const tamanhos = [...new Set(lista.map((l) => l.tamanho))].sort(compararTamanhos);
    const linhas = new Map();
    for (const item of lista) {
      const chave = [item.codigoReferencia, item.peca, item.cor].join("\u0000");
      if (!linhas.has(chave)) linhas.set(chave, { ref: item.codigoReferencia, peca: item.peca, cor: item.cor, porTamanho: new Map() });
      const linha = linhas.get(chave);
      linha.porTamanho.set(item.tamanho, (linha.porTamanho.get(item.tamanho) || 0) + (Number(item.saldoDisponivel) || 0));
    }

    const totalPorTamanho = new Map(tamanhos.map((t) => [t, 0]));
    let totalGeral = 0;

    const corpoTabela = [...linhas.values()].map((linha) => {
      let totalLinha = 0;
      const celulas = tamanhos.map((t) => {
        const v = linha.porTamanho.get(t) || 0;
        totalLinha += v;
        totalPorTamanho.set(t, totalPorTamanho.get(t) + v);
        return el("td", { class: v ? "num" : "num zero" }, v ? fmtInt(v) : "–");
      });
      totalGeral += totalLinha;
      return el("tr", {},
        el("td", { class: "ref-cel" }, el("strong", {}, linha.ref ?? ""), el("span", {}, linha.peca ?? "")),
        el("td", {}, linha.cor ?? ""),
        celulas,
        el("td", { class: "num" }, el("strong", {}, fmtInt(totalLinha))));
    });

    const tabela = el("table", {},
      el("caption", { class: "sr-only", style: "position:absolute;left:-9999px" }, "Saldo disponível por referência, cor e tamanho"),
      el("thead", {}, el("tr", {},
        el("th", { scope: "col" }, "Referência"),
        el("th", { scope: "col" }, "Cor"),
        tamanhos.map((t) => el("th", { scope: "col", class: "num" }, t ?? "")),
        el("th", { scope: "col", class: "num" }, "Total"))),
      el("tbody", {}, corpoTabela),
      el("tfoot", {}, el("tr", {},
        el("td", { colspan: 2 }, "Total disponível"),
        tamanhos.map((t) => el("td", { class: "num" }, fmtInt(totalPorTamanho.get(t)))),
        el("td", { class: "num" }, fmtInt(totalGeral)))));

    const referencias = new Set(lista.map((l) => l.codigoReferencia)).size;
    corpo.replaceChildren(
      el("p", { class: "contagem" }, `${plural(totalGeral, "peça disponível", "peças disponíveis")} em ${plural(referencias, "referência", "referências")}`),
      el("div", { class: "folha tabela-wrap" }, tabela));
  }

  // ---------- Qualidade ----------

  const LIMITE_TAXA_ALTA = 5; // a partir de 5% a taxa fica em destaque

  function renderQualidade(corpo, lista) {
    if (!lista.length) {
      corpo.replaceChildren(vazio("Sem dados de qualidade", "Os números aparecem aqui depois do primeiro retorno de peças registrado."));
      return;
    }

    const legenda = el("ul", { class: "legenda", "aria-label": "Legenda das barras" },
      el("li", {}, el("span", { class: "chip c-aprovado" }), "Aprovado"),
      el("li", {}, el("span", { class: "chip c-rebolado" }), "Rebolado"),
      el("li", {}, el("span", { class: "chip c-segunda" }), "Segunda qualidade"),
      el("li", {}, el("span", { class: "chip c-resto" }), "Sem classificação"));

    const cartoes = lista.map((r) => {
      const enviado = Number(r.totalEnviado) || 0;
      const aprovado = Number(r.totalAprovado) || 0;
      const rebolado = Number(r.totalRebolado) || 0;
      const segunda = Number(r.totalSegundaQualidade) || 0;
      const resto = Math.max(enviado - aprovado - rebolado - segunda, 0);
      const base = Math.max(enviado, aprovado + rebolado + segunda) || 1;
      const pct = (v) => `${((v / base) * 100).toFixed(2)}%`;

      const barra = el("div", {
        class: "barra", role: "img",
        "aria-label": `Aprovado ${fmtInt(aprovado)}, rebolado ${fmtInt(rebolado)}, segunda qualidade ${fmtInt(segunda)}, sem classificação ${fmtInt(resto)}`,
      },
        el("span", { class: "c-aprovado", style: `width:${pct(aprovado)}` }),
        el("span", { class: "c-rebolado", style: `width:${pct(rebolado)}` }),
        el("span", { class: "c-segunda", style: `width:${pct(segunda)}` }),
        el("span", { class: "c-resto", style: `width:${pct(resto)}` }));

      const taxaReb = Number(r.taxaConsertoReboladoPct) || 0;
      const taxaSeg = Number(r.taxaDefeitoSegundaQualidadePct) || 0;

      return el("li", { class: "parceiro" },
        el("div", { class: "parceiro-topo" },
          el("h2", { class: "parceiro-nome" }, r.parceiro ?? "Processo interno",
            r.tipoParceiro ? el("span", { class: "parceiro-tipo" }, humanizar(r.tipoParceiro)) : null),
          el("span", { class: "parceiro-enviado" }, `${plural(enviado, "peça enviada", "peças enviadas")}`)),
        barra,
        el("div", { class: "numeros" },
          el("span", {}, "Aprovadas ", el("b", {}, fmtInt(aprovado))),
          el("span", {}, "Rebolado ", el("b", {}, fmtInt(rebolado))),
          el("span", {}, "Segunda qualidade ", el("b", {}, fmtInt(segunda))),
          el("span", { class: taxaReb >= LIMITE_TAXA_ALTA ? "taxa-alta" : "" }, "Taxa de rebolado ", el("b", {}, fmtPct(taxaReb))),
          el("span", { class: taxaSeg >= LIMITE_TAXA_ALTA ? "taxa-alta" : "" }, "Taxa de segunda qualidade ", el("b", {}, fmtPct(taxaSeg)))));
    });

    corpo.replaceChildren(legenda, el("ul", { class: "parceiros" }, cartoes));
  }

  // ---------- Vistas e navegação ----------

  const RELATORIOS = {
    andamento: { url: "/api/relatorios/wip", render: renderAndamento },
    estoque: { url: "/api/relatorios/estoque", render: renderEstoque },
    qualidade: { url: "/api/relatorios/qualidade", render: renderQualidade },
  };
  const NOMES = ["andamento", "estoque", "qualidade", "movimentacao"];
  const carregadas = new Set();

  async function abrirRelatorio(nome, forcar = false) {
    if (carregadas.has(nome) && !forcar) return;
    const corpo = $(`#corpo-${nome}`);
    corpo.replaceChildren(carregando());
    try {
      const dados = await api(RELATORIOS[nome].url);
      RELATORIOS[nome].render(corpo, Array.isArray(dados) ? dados : []);
      carregadas.add(nome);
    } catch (erro) {
      carregadas.delete(nome);
      corpo.replaceChildren(falha(erro, () => abrirRelatorio(nome, true)));
    }
  }

  function mostrar(nome) {
    if (!NOMES.includes(nome)) nome = "andamento";
    for (const aba of $$(".aba")) {
      const ativa = aba.dataset.vista === nome;
      aba.setAttribute("aria-selected", ativa ? "true" : "false");
      aba.tabIndex = ativa ? 0 : -1;
    }
    for (const painel of $$(".painel")) painel.hidden = painel.id !== `painel-${nome}`;
    document.title = `${$(`#aba-${nome}`).textContent} | Zolin Acabamentos`;

    if (nome === "movimentacao") prepararFormulario();
    else abrirRelatorio(nome);
  }

  window.addEventListener("hashchange", () => mostrar(location.hash.slice(1)));

  $$(".aba").forEach((aba, i, todas) => {
    aba.addEventListener("click", () => { location.hash = aba.dataset.vista; });
    aba.addEventListener("keydown", (e) => {
      const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!passo) return;
      const destino = todas[(i + passo + todas.length) % todas.length];
      destino.focus();
      location.hash = destino.dataset.vista;
      e.preventDefault();
    });
  });

  $$("[data-atualizar]").forEach((botao) =>
    botao.addEventListener("click", () => abrirRelatorio(botao.dataset.atualizar, true)));

  // ---------- Formulário de movimentação ----------

  const form = $("#form-mov");
  const selOp = $("#f-op");
  const selParceiro = $("#f-parceiro");
  const inTipo = $("#f-tipo");
  const listaTipos = $("#tipos");
  const areaItens = $("#itens");
  const aviso = $("#aviso-form");
  const botaoEnviar = $("#enviar");

  const TIPOS_CONHECIDOS = ["ENTRADA_ACABAMENTO", "RETORNO_LAVANDERIA", "SAIDA_ESTOQUE_FINAL"];
  let cadastros = null; // { ops, parceiros, skus }
  let carregandoCadastros = null;

  const rotuloSku = (s) => [s.referencia, s.descricao, s.cor, s.tamanho].filter((x) => x != null && x !== "").join(", ");

  function mostrarAviso(tipo, ...conteudo) {
    aviso.replaceChildren(el("div", { class: `aviso ${tipo}`, role: tipo === "erro" ? "alert" : null }, conteudo));
  }

  function preencherListas() {
    const { ops, parceiros } = cadastros;
    selOp.replaceChildren(
      el("option", { value: "" }, ops.length ? "Escolha a OP" : "Nenhuma OP cadastrada"),
      ...ops.map((op) => el("option", { value: op.id }, `${op.numero}: ${[op.referencia, op.descricao].filter(Boolean).join(" ")}`)));
    selParceiro.replaceChildren(
      el("option", { value: "" }, "Processo interno, sem parceiro"),
      ...parceiros.map((p) => el("option", { value: p.id }, p.tipo ? `${p.nome} (${humanizar(p.tipo)})` : p.nome)));
    $$(".sel-sku", areaItens).forEach(preencherSku);
  }

  function preencherSku(select) {
    const atual = select.value;
    select.replaceChildren(
      el("option", { value: "" }, cadastros.skus.length ? "Escolha a peça" : "Nenhum SKU cadastrado"),
      ...cadastros.skus.map((s) => el("option", { value: s.id }, rotuloSku(s))));
    select.value = atual;
  }

  async function carregarTiposSugeridos() {
    const tipos = new Set(TIPOS_CONHECIDOS);
    try {
      const wip = await api(RELATORIOS.andamento.url);
      for (const op of wip) if (op.ultimaMovimentacao) tipos.add(op.ultimaMovimentacao);
    } catch (_) { /* as sugestões básicas já bastam */ }
    listaTipos.replaceChildren(...[...tipos].sort().map((t) => el("option", { value: t }, humanizar(t))));
  }

  function prepararFormulario() {
    if (!areaItens.children.length) adicionarItem();
    if (cadastros || carregandoCadastros) return;

    carregandoCadastros = (async () => {
      try {
        const [ops, parceiros, skus] = await Promise.all([
          api("/api/cadastros/ops"), api("/api/cadastros/parceiros"), api("/api/cadastros/skus"),
        ]);
        cadastros = { ops, parceiros, skus };
        preencherListas();
        carregarTiposSugeridos();
        aviso.replaceChildren();
      } catch (erro) {
        selOp.replaceChildren(el("option", { value: "" }, "Não foi possível carregar"));
        mostrarAviso("erro",
          `Não foi possível carregar as OPs, os parceiros e as peças. ${erro.message} `,
          el("a", { href: "#movimentacao", onclick: (e) => { e.preventDefault(); recarregarCadastros(); } }, "Tentar de novo"));
      } finally {
        carregandoCadastros = null;
      }
    })();
  }

  function recarregarCadastros() {
    cadastros = null;
    selOp.replaceChildren(el("option", { value: "" }, "Carregando…"));
    aviso.replaceChildren();
    prepararFormulario();
  }

  function campoQtd(nome, rotulo) {
    const id = `q-${nome}-${Math.random().toString(36).slice(2, 8)}`;
    return el("div", {},
      el("label", { class: "cell-label", for: id }, rotulo),
      el("input", { id, type: "number", min: "0", step: "1", inputmode: "numeric", "data-campo": nome, "aria-label": rotulo, placeholder: "0" }));
  }

  function adicionarItem() {
    const id = `sku-${Math.random().toString(36).slice(2, 8)}`;
    const select = el("select", { id, class: "sel-sku", "data-campo": "skuId", "aria-label": "Peça (SKU)" }, el("option", { value: "" }, "Carregando…"));
    if (cadastros) preencherSku(select);

    const linha = el("div", { class: "item" },
      el("div", { class: "sku-cell" }, el("label", { class: "cell-label", for: id }, "Peça (SKU)"), select),
      campoQtd("qtdEnviada", "Enviada"),
      campoQtd("qtdAprovada", "Aprovada"),
      campoQtd("qtdRebolado", "Rebolado"),
      campoQtd("qtdSegundaQualidade", "2ª qualidade"),
      el("div", { class: "remover-cell" },
        el("button", {
          type: "button", class: "btn remover", "aria-label": "Remover este item",
          onclick: () => {
            if (areaItens.children.length > 1) linha.remove();
            else mostrarAviso("erro", "A movimentação precisa de pelo menos um item.");
          },
        }, "Remover")));
    areaItens.append(linha);
    return linha;
  }

  $("#add-item").addEventListener("click", () => adicionarItem().querySelector("select").focus());

  // Ao corrigir um campo, a marca de erro e o aviso antigo saem da tela.
  function limparErroAoEditar(e) {
    if (e.target.getAttribute("aria-invalid")) e.target.removeAttribute("aria-invalid");
    if (aviso.querySelector(".aviso.erro")) aviso.replaceChildren();
  }
  form.addEventListener("input", limparErroAoEditar);
  form.addEventListener("change", limparErroAoEditar);

  function marcarInvalido(no, invalido) {
    if (invalido) no.setAttribute("aria-invalid", "true");
    else no.removeAttribute("aria-invalid");
  }

  function lerFormulario() {
    const problemas = [];
    marcarInvalido(selOp, !selOp.value);
    if (!selOp.value) problemas.push("Escolha a ordem de produção.");

    const tipo = inTipo.value.trim();
    marcarInvalido(inTipo, !tipo);
    if (!tipo) problemas.push("Informe o tipo de movimentação.");

    const itens = [];
    for (const linha of $$(".item", areaItens)) {
      const sku = $("[data-campo=skuId]", linha);
      marcarInvalido(sku, !sku.value);
      if (!sku.value) { problemas.push("Escolha a peça em todos os itens."); continue; }

      const item = { skuId: Number(sku.value) };
      for (const campo of ["qtdEnviada", "qtdAprovada", "qtdRebolado", "qtdSegundaQualidade"]) {
        const entrada = $(`[data-campo=${campo}]`, linha);
        const texto = entrada.value.trim();
        const numero = texto === "" ? 0 : Number(texto);
        const erro = !Number.isInteger(numero) || numero < 0;
        marcarInvalido(entrada, erro);
        if (erro) problemas.push("As quantidades precisam ser números inteiros, zero ou maiores.");
        item[campo] = erro ? 0 : numero;
      }
      itens.push(item);
    }
    if (!itens.length && !problemas.length) problemas.push("Adicione pelo menos um item.");

    if (problemas.length) return { problemas: [...new Set(problemas)] };
    return {
      payload: {
        opId: Number(selOp.value),
        parceiroId: selParceiro.value ? Number(selParceiro.value) : null,
        tipoMovimentacao: tipo,
        numeroNotaRemessa: $("#f-nota").value.trim() || null,
        observacoes: $("#f-obs").value.trim() || null,
        itens,
      },
    };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { payload, problemas } = lerFormulario();
    if (problemas) {
      mostrarAviso("erro", el("strong", {}, "Revise o formulário. "), problemas.join(" "));
      return;
    }

    botaoEnviar.disabled = true;
    botaoEnviar.textContent = "Registrando…";
    try {
      const resposta = await api("/api/movimentacoes", { method: "POST", body: JSON.stringify(payload) });
      carregadas.clear(); // os relatórios mudaram: recarregam na próxima visita
      mostrarAviso("ok",
        el("strong", {}, `Movimentação ${resposta.movimentacao_id != null ? `#${resposta.movimentacao_id} ` : ""}registrada. `),
        "Os relatórios já refletem os novos números. ",
        el("a", { href: "#andamento" }, "Ver andamento"));
      areaItens.replaceChildren();
      adicionarItem();
      $("#f-nota").value = "";
      $("#f-obs").value = "";
      inTipo.value = "";
    } catch (erro) {
      mostrarAviso("erro", el("strong", {}, "A movimentação não foi registrada. "), erro.message);
    } finally {
      botaoEnviar.disabled = false;
      botaoEnviar.textContent = "Registrar movimentação";
    }
  });

  // ---------- Início ----------

  mostrar(location.hash.slice(1) || "andamento");
})();
