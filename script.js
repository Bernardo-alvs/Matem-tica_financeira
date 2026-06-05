const CUSTOS_BASE = [
  { nome: "Sementes", valor: 288 },
  { nome: "Nutrientes / Solução nutritiva", valor: 480 },
  { nome: "Energia elétrica", valor: 655 },
  { nome: "Água", valor: 120 },
  { nome: "Embalagens", valor: 432 },
  { nome: "Manutenção", valor: 300 }
];

let graficoCustos = null;
let graficoResultado = null;
let graficoPayback = null;
let custos = [...CUSTOS_BASE];

function debug(...mensagens) {
  console.log("[Simulador Hidroponia]", ...mensagens);
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function pegarElemento(id) {
  const elemento = document.getElementById(id);
  if (!elemento) {
    console.warn(`[Simulador Hidroponia] Elemento não encontrado: #${id}`);
  }
  return elemento;
}

function valor(id) {
  const elemento = pegarElemento(id);
  return elemento ? Number(elemento.value) || 0 : 0;
}

function calcular() {
  debug("Executando calcular()", { custoBase: custos.length });

  const investimento = valor("investimento");
  const plantas = valor("plantas");
  const preco = valor("preco");
  const duracaoCiclo = valor("duracaoCiclo") || 35;

  const custoTotal = custos.reduce((soma, item) => soma + Number(item.valor || 0), 0);
  const receitaBruta = plantas * preco;
  const custoPorPlanta = plantas > 0 ? custoTotal / plantas : 0;
  const lucroLiquido = receitaBruta - custoTotal;
  const margemLucro = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
  const roi = investimento > 0 ? (lucroLiquido / investimento) * 100 : 0;
  const payback = lucroLiquido > 0 ? investimento / lucroLiquido : 0;
  const paybackDias = payback * duracaoCiclo;

  const receitaEl = pegarElemento("receita");
  const custoTotalEl = pegarElemento("custoTotal");
  const custoPlantaEl = pegarElemento("custoPlanta");
  const lucroEl = pegarElemento("lucro");
  const margemEl = pegarElemento("margem");
  const roiEl = pegarElemento("roi");
  const paybackEl = pegarElemento("payback");
  const paybackDiasEl = pegarElemento("paybackDias");

  if (receitaEl) receitaEl.textContent = formatarMoeda(receitaBruta);
  if (custoTotalEl) custoTotalEl.textContent = formatarMoeda(custoTotal);
  if (custoPlantaEl) custoPlantaEl.textContent = formatarMoeda(custoPorPlanta);
  if (lucroEl) lucroEl.textContent = formatarMoeda(lucroLiquido);
  if (margemEl) margemEl.textContent = `${margemLucro.toFixed(2)}%`;
  if (roiEl) roiEl.textContent = `${roi.toFixed(2)}%`;
  if (paybackEl) paybackEl.textContent = lucroLiquido > 0 ? `${payback.toFixed(2)} ciclos` : "Sem retorno";
  if (paybackDiasEl) paybackDiasEl.textContent = lucroLiquido > 0 ? `${Math.ceil(paybackDias)} dias` : "0 dias";

  atualizarListaCustos();
  atualizarInterpretacao(receitaBruta, custoTotal, lucroLiquido, roi, margemLucro, payback, paybackDias);
  atualizarGraficos(receitaBruta, custoTotal, lucroLiquido, investimento);

  debug("Resultado calculado", { receitaBruta, custoTotal, lucroLiquido, margemLucro, roi, paybackDias });
}

function adicionarCusto(evento) {
  if (evento && typeof evento.preventDefault === "function") evento.preventDefault();

  const nomeInput = pegarElemento("nomeCusto");
  const valorInput = pegarElemento("valorCusto");
  const nome = nomeInput ? nomeInput.value.trim() : "";
  const valorCusto = Number(valorInput ? valorInput.value : 0) || 0;

  if (!nome || valorCusto <= 0) {
    console.warn("[Simulador Hidroponia] Adição de custo inválida", { nome, valorCusto });
    alert("Informe o tipo de custo e um valor maior que zero.");
    return;
  }

  custos.push({ nome, valor: valorCusto });
  debug("Custo adicionado", { nome, valorCusto });

  if (nomeInput) nomeInput.value = "";
  if (valorInput) valorInput.value = "";

  calcular();
}

function removerCusto(index) {
  if (typeof index !== "number" || index < 0 || index >= custos.length) {
    console.warn("[Simulador Hidroponia] Índice de remoção inválido", { index });
    return;
  }

  const removido = custos[index];
  custos.splice(index, 1);
  debug("Custo removido", removido);
  calcular();
}

function atualizarListaCustos() {
  const lista = pegarElemento("listaCustos");
  if (!lista) return;

  lista.innerHTML = "";
  custos.forEach((item, index) => {
    const li = document.createElement("li");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = "Remover";
    botao.addEventListener("click", () => removerCusto(index));

    const span = document.createElement("span");
    span.textContent = `${item.nome} — ${formatarMoeda(item.valor)}`;

    li.appendChild(span);
    li.appendChild(botao);
    lista.appendChild(li);
  });
}

function atualizarInterpretacao(receita, custo, lucro, roi, margem, payback, paybackDias) {
  const interpretacao = pegarElemento("interpretacao");
  if (!interpretacao) return;

  if (lucro > 0) {
    interpretacao.textContent =
      `Com base nos dados inseridos, o custo operacional total foi de ${formatarMoeda(custo)} por ciclo. ` +
      `A receita bruta estimada foi de ${formatarMoeda(receita)}, resultando em lucro líquido de ${formatarMoeda(lucro)}. ` +
      `A margem de lucro foi de ${margem.toFixed(2)}% e o ROI foi de ${roi.toFixed(2)}% por ciclo. ` +
      `O investimento inicial será recuperado em aproximadamente ${payback.toFixed(2)} ciclos, equivalentes a ${Math.ceil(paybackDias)} dias de produção.`;
  } else {
    interpretacao.textContent =
      "Com os dados inseridos, o sistema apresenta prejuízo ou lucro insuficiente. " +
      "É necessário revisar o preço de venda, a produtividade ou os custos operacionais.";
  }
}

function atualizarGraficos(receita, custo, lucro, investimento) {
  const status = pegarElemento("graficoStatus");
  if (typeof Chart === "undefined") {
    if (status) status.textContent = "Chart.js não carregou. Verifique a internet ou abra o projeto com Live Server.";
    console.warn("[Simulador Hidroponia] Chart.js indisponível.");
    return;
  }

  try {
    atualizarGraficoResultado(receita, custo, lucro);
    atualizarGraficoCustos();
    atualizarGraficoPayback(lucro, investimento);
    if (status) status.textContent = "Gráficos atualizados automaticamente.";
  } catch (erro) {
    console.error("[Simulador Hidroponia] Erro ao renderizar gráficos", erro);
    if (status) status.textContent = "Falha ao montar os gráficos. Consulte o console para detalhes.";
  }
}

function atualizarGraficoResultado(receita, custo, lucro) {
  const canvas = pegarElemento("graficoResultado");
  if (!canvas) return;
  if (graficoResultado) graficoResultado.destroy();

  graficoResultado = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Receita bruta", "Custos operacionais", "Lucro líquido"],
      datasets: [{
        label: "Valor em R$",
        data: [receita, custo, lucro],
        backgroundColor: ["#2e7d32", "#ef5350", "#66bb6a"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => formatarMoeda(value) }
        }
      }
    }
  });
}

function atualizarGraficoCustos() {
  const canvas = pegarElemento("graficoCustos");
  if (!canvas) return;
  if (graficoCustos) graficoCustos.destroy();

  graficoCustos = new Chart(canvas, {
    type: "pie",
    data: {
      labels: custos.map((item) => item.nome),
      datasets: [{ data: custos.map((item) => item.valor) }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function atualizarGraficoPayback(lucro, investimento) {
  const canvas = pegarElemento("graficoPayback");
  if (!canvas) return;
  if (graficoPayback) graficoPayback.destroy();

  const ciclos = [];
  const lucroAcumulado = [];
  const investimentoInicial = [];

  for (let i = 1; i <= 18; i += 1) {
    ciclos.push(`Ciclo ${i}`);
    lucroAcumulado.push(Math.max(lucro, 0) * i);
    investimentoInicial.push(investimento);
  }

  graficoPayback = new Chart(canvas, {
    type: "line",
    data: {
      labels: ciclos,
      datasets: [
        {
          label: "Lucro acumulado",
          data: lucroAcumulado,
          borderColor: "#2e7d32",
          backgroundColor: "rgba(46, 125, 50, 0.15)",
          fill: true,
          tension: 0.3
        },
        {
          label: "Investimento inicial",
          data: investimentoInicial,
          borderColor: "#c62828",
          borderDash: [8, 6],
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => formatarMoeda(value) }
        }
      }
    }
  });
}

function aplicarCenario(evento) {
  const precoInput = pegarElemento("preco");
  if (!precoInput) return;

  precoInput.value = evento.currentTarget.dataset.preco || "0";
  document.querySelectorAll(".cenario-btn").forEach((botao) => botao.classList.remove("ativo"));
  evento.currentTarget.classList.add("ativo");
  calcular();
}

function usarValoresProjeto() {
  const investimento = pegarElemento("investimento");
  const plantas = pegarElemento("plantas");
  const preco = pegarElemento("preco");
  const duracaoCiclo = pegarElemento("duracaoCiclo");

  if (investimento) investimento.value = 125700;
  if (plantas) plantas.value = 4320;
  if (preco) preco.value = 2.50;
  if (duracaoCiclo) duracaoCiclo.value = 35;

  custos = [...CUSTOS_BASE];
  debug("Valores do projeto aplicados");
  calcular();
}

function resetarFormulario() {
  const investimento = pegarElemento("investimento");
  const plantas = pegarElemento("plantas");
  const preco = pegarElemento("preco");
  const duracaoCiclo = pegarElemento("duracaoCiclo");

  if (investimento) investimento.value = 0;
  if (plantas) plantas.value = 0;
  if (preco) preco.value = 0;
  if (duracaoCiclo) duracaoCiclo.value = 35;

  custos = [];
  debug("Formulário resetado");
  calcular();
}

function inicializar() {
  debug("Inicializando simulador");

  const btnAdicionar = pegarElemento("btnAdicionarCusto");
  const nomeCustoInput = pegarElemento("nomeCusto");
  const valorCustoInput = pegarElemento("valorCusto");
  const btnValoresProjeto = pegarElemento("btnValoresProjeto");
  const btnResetar = pegarElemento("btnResetar");

  if (btnAdicionar) btnAdicionar.addEventListener("click", adicionarCusto);

  if (nomeCustoInput) {
    nomeCustoInput.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") {
        adicionarCusto(evento);
      }
    });
  }

  if (valorCustoInput) {
    valorCustoInput.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") {
        adicionarCusto(evento);
      }
    });
  }

  if (btnValoresProjeto) btnValoresProjeto.addEventListener("click", usarValoresProjeto);
  if (btnResetar) btnResetar.addEventListener("click", resetarFormulario);

  document.querySelectorAll(".cenario-btn").forEach((botao) => {
    botao.addEventListener("click", aplicarCenario);
  });

  ["investimento", "plantas", "preco", "duracaoCiclo"].forEach((id) => {
    const input = pegarElemento(id);
    if (input) input.addEventListener("input", calcular);
  });

  calcular();
}

window.addEventListener("error", (evento) => {
  console.error("[Simulador Hidroponia] Erro global na página", evento.error || evento.message);
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializar);
} else {
  inicializar();
}