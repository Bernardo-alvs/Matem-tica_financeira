const NUMERO_BANCADAS = 10;
const TUBOS_POR_BANCADA = 6;
const COMPRIMENTO_TUBO = 9;
const DIAMETRO_TUBO = 100;
const ESPACAMENTO_PLANTAS = 0.35;
const ESPACAMENTO_TUBOS = 0.30;
const ALTURA_BANCADA = 0.80;
const COMPRIMENTO_BANCADA = 18;
const CICLO_PADRAO = 70;
const CONSUMO_SOLUCAO = 1.2;
const INVESTIMENTO_PADRAO = 125700;
const PLANTAS_POR_TUBO = Math.floor(COMPRIMENTO_TUBO / ESPACAMENTO_PLANTAS);
const PRODUCAO_TOTAL_PADRAO = PLANTAS_POR_TUBO * TUBOS_POR_BANCADA * NUMERO_BANCADAS;
const SOLUCAO_DIARIA_PADRAO = PRODUCAO_TOTAL_PADRAO * CONSUMO_SOLUCAO;
const PAYBACK_CICLOS = 18;

const CUSTOS_BASE = [
  { nome: "Sementes", valor: 288 },
  { nome: "Nutrientes / Solução nutritiva", valor: 480 },
  { nome: "Energia elétrica", valor: 655 },
  { nome: "Água", valor: 120 },
  { nome: "Embalagens", valor: 432 },
  { nome: "Manutenção", valor: 300 }
];

const STORAGE_KEY = "simuladorHidroponia";

let graficoCustos = null;
let graficoResultado = null;
let graficoPayback = null;
let custos = [...CUSTOS_BASE];

function parseNumeroBR(valor) {
  if (valor === null || valor === undefined) return 0;

  let texto = String(valor).trim();

  if (texto === "") return 0;

  texto = texto.replace(/\s/g, "");
  texto = texto.replace(/[R$]/g, "");

  if (texto.includes(",") && texto.includes(".")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    texto = texto.replace(",", ".");
  }

  return Number.parseFloat(texto) || 0;
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor || 0);
}

function el(id) {
  return document.getElementById(id);
}

function valor(id) {
  return parseNumeroBR(el(id)?.value);
}

function salvarEstado() {
  const estado = {
    investimento: el("investimento")?.value || "",
    plantas: el("plantas")?.value || "",
    preco: el("preco")?.value || "",
    duracaoCiclo: el("duracaoCiclo")?.value || "",
    custos
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function carregarEstado() {
  const salvo = localStorage.getItem(STORAGE_KEY);

  if (!salvo) return false;

  try {
    const estado = JSON.parse(salvo);

    if (el("investimento")) el("investimento").value = estado.investimento ?? INVESTIMENTO_PADRAO;
    if (el("plantas")) el("plantas").value = estado.plantas ?? PRODUCAO_TOTAL_PADRAO;
    if (el("preco")) el("preco").value = estado.preco ?? 2.5;
    if (el("duracaoCiclo")) el("duracaoCiclo").value = estado.duracaoCiclo ?? CICLO_PADRAO;

    if (Array.isArray(estado.custos)) {
      custos = estado.custos.map(item => ({
        nome: item.nome,
        valor: parseNumeroBR(item.valor)
      }));
    }

    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function calcular() {
  const investimento = valor("investimento");
  const plantas = valor("plantas");
  const preco = valor("preco");
  const duracaoCiclo = valor("duracaoCiclo") || CICLO_PADRAO;

  const custoTotal = custos.reduce((soma, item) => {
    return soma + parseNumeroBR(item.valor);
  }, 0);

  const receitaBruta = plantas * preco;
  const custoPorPlanta = plantas > 0 ? custoTotal / plantas : 0;
  const lucroLiquido = receitaBruta - custoTotal;
  const margemLucro = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
  const roi = investimento > 0 ? (lucroLiquido / investimento) * 100 : 0;
  const payback = lucroLiquido > 0 ? investimento / lucroLiquido : 0;
  const paybackDias = payback * duracaoCiclo;
  const solucaoDiaria = plantas * CONSUMO_SOLUCAO;

  if (el("receita")) el("receita").textContent = formatarMoeda(receitaBruta);
  if (el("custoTotal")) el("custoTotal").textContent = formatarMoeda(custoTotal);
  if (el("custoPlanta")) el("custoPlanta").textContent = formatarMoeda(custoPorPlanta);
  if (el("lucro")) el("lucro").textContent = formatarMoeda(lucroLiquido);
  if (el("margem")) el("margem").textContent = `${margemLucro.toFixed(2)}%`;
  if (el("roi")) el("roi").textContent = `${roi.toFixed(2)}%`;
  if (el("payback")) {
    el("payback").textContent = lucroLiquido > 0 ? `${payback.toFixed(2)} ciclos` : "Sem retorno";
  }
  if (el("paybackDias")) {
    el("paybackDias").textContent = lucroLiquido > 0 ? `${Math.ceil(paybackDias)} dias` : "0 dias";
  }

  atualizarListaCustos();
  atualizarInterpretacao(plantas, receitaBruta, custoTotal, lucroLiquido, roi, margemLucro, payback, paybackDias, solucaoDiaria);
  atualizarGraficos(receitaBruta, custoTotal, lucroLiquido, investimento);

  salvarEstado();
}

function adicionarCusto(evento) {
  if (evento) evento.preventDefault();

  const nome = el("nomeCusto")?.value.trim() || "";
  const valorCusto = parseNumeroBR(el("valorCusto")?.value);

  if (!nome || valorCusto <= 0) {
    alert("Informe o tipo de custo e um valor maior que zero.");
    return;
  }

  custos.push({ nome, valor: valorCusto });

  el("nomeCusto").value = "";
  el("valorCusto").value = "";

  calcular();
}

function removerCusto(index) {
  custos.splice(index, 1);
  calcular();
}

function atualizarListaCustos() {
  const lista = el("listaCustos");
  if (!lista) return;

  lista.innerHTML = "";

  custos.forEach((item, index) => {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = `${item.nome} — ${formatarMoeda(item.valor)}`;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = "Remover";
    botao.addEventListener("click", () => removerCusto(index));

    li.appendChild(span);
    li.appendChild(botao);
    lista.appendChild(li);
  });
}

function atualizarInterpretacao(plantas, receita, custo, lucro, roi, margem, payback, paybackDias, solucaoDiaria) {
  const interpretacao = el("interpretacao");
  if (!interpretacao) return;

  const solucaoTexto = `${solucaoDiaria.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} litros/dia`;

  if (lucro > 0) {
    interpretacao.textContent =
      `Com base nos dados inseridos, o custo operacional total foi de ${formatarMoeda(custo)} por ciclo. ` +
      `A receita bruta estimada foi de ${formatarMoeda(receita)}, resultando em lucro líquido de ${formatarMoeda(lucro)}. ` +
      `A margem de lucro foi de ${margem.toFixed(2)}% e o ROI foi de ${roi.toFixed(2)}% por ciclo. ` +
      `O investimento inicial será recuperado em aproximadamente ${payback.toFixed(2)} ciclos, equivalentes a ${Math.ceil(paybackDias)} dias de produção. ` +
      `Produção padrão: ${PRODUCAO_TOTAL_PADRAO} plantas por ciclo. ` +
      `Solução nutritiva padrão: ${SOLUCAO_DIARIA_PADRAO} litros/dia. ` +
      `Ciclo médio: ${CICLO_PADRAO} dias. ` +
      `Sistema composto por ${NUMERO_BANCADAS} bancadas e ${TUBOS_POR_BANCADA} tubos por bancada. ` +
      `Produção atual: ${plantas} plantas por ciclo e estimativa de ${solucaoTexto}.`;
  } else {
    interpretacao.textContent =
      "Com os dados inseridos, o sistema apresenta prejuízo ou lucro insuficiente. " +
      "É necessário revisar preço de venda, produtividade ou custos operacionais.";
  }
}

function atualizarGraficos(receita, custo, lucro, investimento) {
  const status = el("graficoStatus");

  if (typeof Chart === "undefined") {
    if (status) status.textContent = "Chart.js não carregou. Abra com Live Server e verifique a internet.";
    return;
  }

  atualizarGraficoResultado(receita, custo, lucro);
  atualizarGraficoCustos();
  atualizarGraficoPayback(lucro, investimento);

  if (status) status.textContent = "Gráficos atualizados automaticamente.";
}

function atualizarGraficoResultado(receita, custo, lucro) {
  const canvas = el("graficoResultado");
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
          ticks: { callback: value => formatarMoeda(value) }
        }
      }
    }
  });
}

function atualizarGraficoCustos() {
  const canvas = el("graficoCustos");
  if (!canvas) return;

  if (graficoCustos) graficoCustos.destroy();

  graficoCustos = new Chart(canvas, {
    type: "pie",
    data: {
      labels: custos.map(item => item.nome),
      datasets: [{
        data: custos.map(item => item.valor)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function atualizarGraficoPayback(lucro, investimento) {
  const canvas = el("graficoPayback");
  if (!canvas) return;

  if (graficoPayback) graficoPayback.destroy();

  const ciclos = [];
  const lucroAcumulado = [];
  const investimentoInicial = [];

  for (let i = 1; i <= PAYBACK_CICLOS; i++) {
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
          ticks: { callback: value => formatarMoeda(value) }
        }
      }
    }
  });
}

function aplicarCenario(evento) {
  const precoInput = el("preco");
  if (!precoInput) return;

  precoInput.value = evento.currentTarget.dataset.preco || "0";

  document.querySelectorAll(".cenario-btn").forEach(botao => {
    botao.classList.remove("ativo");
  });

  evento.currentTarget.classList.add("ativo");

  calcular();
}

function usarValoresProjeto() {
  if (el("investimento")) el("investimento").value = INVESTIMENTO_PADRAO;
  if (el("plantas")) el("plantas").value = PRODUCAO_TOTAL_PADRAO;
  if (el("preco")) el("preco").value = 2.50;
  if (el("duracaoCiclo")) el("duracaoCiclo").value = CICLO_PADRAO;

  custos = [...CUSTOS_BASE];

  calcular();
}

function resetarFormulario() {
  localStorage.removeItem(STORAGE_KEY);

  if (el("investimento")) el("investimento").value = 0;
  if (el("plantas")) el("plantas").value = 0;
  if (el("preco")) el("preco").value = 0;
  if (el("duracaoCiclo")) el("duracaoCiclo").value = CICLO_PADRAO;

  custos = [];

  calcular();
}

function inicializar() {
  const estadoCarregado = carregarEstado();

  if (!estadoCarregado) {
    usarValoresProjeto();
    return;
  }

  el("btnAdicionarCusto")?.addEventListener("click", adicionarCusto);
  el("btnValoresProjeto")?.addEventListener("click", usarValoresProjeto);
  el("btnResetar")?.addEventListener("click", resetarFormulario);

  el("nomeCusto")?.addEventListener("keydown", evento => {
    if (evento.key === "Enter") adicionarCusto(evento);
  });

  el("valorCusto")?.addEventListener("keydown", evento => {
    if (evento.key === "Enter") adicionarCusto(evento);
  });

  document.querySelectorAll(".cenario-btn").forEach(botao => {
    botao.addEventListener("click", aplicarCenario);
  });

  ["investimento", "plantas", "preco", "duracaoCiclo"].forEach(id => {
    el(id)?.addEventListener("input", calcular);
    el(id)?.addEventListener("change", calcular);
  });

  calcular();
}

document.addEventListener("DOMContentLoaded", inicializar);