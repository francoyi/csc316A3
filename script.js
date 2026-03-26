const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

const tooltip = d3.select("#tooltip");

// =========================
// 1. Two chart layouts
// =========================
const categoryChart = {
  left: 108,
  top: 275,
  right: width - 380,
  bottom: height - 162
};
categoryChart.width = categoryChart.right - categoryChart.left;
categoryChart.height = categoryChart.bottom - categoryChart.top;

const eventChart = {
  left: 138,
  top: 345,             // 往下压，避免冲进标题区
  right: width - 450,   // 往左收一点
  bottom: height - 185
};
eventChart.width = eventChart.right - eventChart.left;
eventChart.height = eventChart.bottom - eventChart.top;

// 默认轴线仍以大图为准
const chart = categoryChart;

// =========================
// 2. Data
// =========================
const categories = [
  {
    id: "chat",
    name: "Chat Notifications",
    color: "#38e7ff",
    avgDuration: 3,
    avgRefocus: 44,
    totalLoss: 63,
    dailyCount: 40,
    desc: "Frequent pings that feel tiny but repeatedly shatter focus.",
    eventDuration: [1.6, 2.0, 2.4, 2.8, 3.0, 3.2, 3.6, 4.0, 4.4, 5.0],
    eventRefocus: [28, 31, 34, 36, 39, 42, 45, 48, 50, 54]
  },
  {
    id: "email",
    name: "Urgent Emails",
    color: "#f14dff",
    avgDuration: 6,
    avgRefocus: 36,
    totalLoss: 49,
    dailyCount: 18,
    desc: "Brief interruptions with a high cognitive restart cost.",
    eventDuration: [3, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8, 9],
    eventRefocus: [20, 24, 26, 28, 30, 34, 36, 39, 42, 46]
  },
  {
    id: "bio",
    name: "Biological Needs",
    color: "#ffc34d",
    avgDuration: 10,
    avgRefocus: 26,
    totalLoss: 34,
    dailyCount: 8,
    desc: "Water, fatigue, and bathroom breaks interrupt flow in embodied ways.",
    eventDuration: [6, 7, 8, 9, 10, 11, 12, 13, 14],
    eventRefocus: [12, 14, 16, 19, 21, 24, 27, 31, 35]
  },
  {
    id: "task",
    name: "Task Switching",
    color: "#71f2ba",
    avgDuration: 16,
    avgRefocus: 30,
    totalLoss: 41,
    dailyCount: 11,
    desc: "Jumping between tabs and tasks stretches recovery time.",
    eventDuration: [9, 11, 13, 14, 16, 17, 18, 20, 22],
    eventRefocus: [15, 18, 21, 24, 27, 31, 35, 39, 43]
  },
  {
    id: "meeting",
    name: "Meetings / In-person",
    color: "#ff8f6b",
    avgDuration: 22,
    avgRefocus: 18,
    totalLoss: 21,
    dailyCount: 4,
    desc: "Longer interruptions happen less often and are easier to anticipate.",
    eventDuration: [16, 18, 20, 23, 25, 28, 30],
    eventRefocus: [10, 12, 14, 16, 18, 21, 25]
  }
];

function buildEventData() {
  const events = [];
  let idx = 0;
  categories.forEach(cat => {
    for (let i = 0; i < cat.dailyCount; i++) {
      const duration = cat.eventDuration[i % cat.eventDuration.length] + ((i % 3) - 1) * 0.35;
      const refocus = cat.eventRefocus[i % cat.eventRefocus.length] + (((i + 1) % 4) - 1.5) * 1.3;
      const lost = Math.max(4, duration * 0.25 + refocus * 0.9);
      events.push({
        id: `event-${idx++}`,
        type: cat.name,
        color: cat.color,
        duration: +duration.toFixed(1),
        refocus: +refocus.toFixed(1),
        lost: +lost.toFixed(1),
        parent: cat.name,
        label: `${cat.name} #${i + 1}`
      });
    }
  });
  return events;
}

const eventData = buildEventData();

const summaryData = categories.map((d, i) => ({
  id: `summary-${i}`,
  type: d.name,
  color: d.color,
  duration: d.avgDuration,
  refocus: d.avgRefocus,
  lost: d.totalLoss,
  count: d.dailyCount,
  desc: d.desc
}));

let currentView = "summary";
let activeCategory = null;

// =========================
// 3. Scales
// =========================
function getScales(view = "summary") {
  const activeChart = view === "events" ? eventChart : categoryChart;

  return {
    chart: activeChart,
    x: d3.scaleLinear()
        .domain([0, 30])
        .range([activeChart.left, activeChart.right]),
    y: d3.scaleLinear()
        .domain([0, 50])
        .range([activeChart.bottom, activeChart.top])
  };
}

const summaryR = d3.scaleSqrt()
    .domain([0, d3.max(summaryData, d => d.lost)])
    .range([44, 98]);

const eventR = d3.scaleSqrt()
    .domain([0, d3.max(eventData, d => d.lost)])
    .range([4, 11]); // 以前太大了，现在缩小

const defs = svg.append("defs");

function addDefs() {
  categories.forEach((cat, i) => {
    const glow = defs.append("filter")
        .attr("id", `glow-${i}`)
        .attr("x", "-250%")
        .attr("y", "-250%")
        .attr("width", "600%")
        .attr("height", "600%");

    glow.append("feGaussianBlur")
        .attr("stdDeviation", 10)
        .attr("result", "blur");

    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const grad = defs.append("radialGradient")
        .attr("id", `grad-${i}`)
        .attr("cx", "35%")
        .attr("cy", "30%");

    grad.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#ffffff")
        .attr("stop-opacity", 0.92);

    grad.append("stop")
        .attr("offset", "34%")
        .attr("stop-color", cat.color)
        .attr("stop-opacity", 0.95);

    grad.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", cat.color)
        .attr("stop-opacity", 0.16);
  });

  const danger = defs.append("radialGradient").attr("id", "danger-grad");
  danger.append("stop").attr("offset", "0%").attr("stop-color", "#cf60ff").attr("stop-opacity", 0.24);
  danger.append("stop").attr("offset", "54%").attr("stop-color", "#38e7ff").attr("stop-opacity", 0.12);
  danger.append("stop").attr("offset", "100%").attr("stop-color", "#38e7ff").attr("stop-opacity", 0);
}
addDefs();

const bgLayer = svg.append("g");
const axisLayer = svg.append("g");
const hintLayer = svg.append("g");
const bubbleLayer = svg.append("g");
const fxLayer = svg.append("g");

// =========================
// 4. Axes & static labels
// =========================
function drawAxes() {
  axisLayer.selectAll("*").remove();

  axisLayer.append("line")
      .attr("x1", chart.left)
      .attr("x2", chart.right)
      .attr("y1", chart.bottom)
      .attr("y2", chart.bottom)
      .attr("stroke", "rgba(241,244,252,0.72)")
      .attr("stroke-width", 1.8);

  axisLayer.append("line")
      .attr("x1", chart.left)
      .attr("x2", chart.left)
      .attr("y1", chart.bottom)
      .attr("y2", chart.top)
      .attr("stroke", "rgba(241,244,252,0.72)")
      .attr("stroke-width", 1.8);

  axisLayer.append("path")
      .attr("d", `M ${chart.right - 18} ${chart.bottom - 10} L ${chart.right} ${chart.bottom} L ${chart.right - 18} ${chart.bottom + 10}`)
      .attr("fill", "none")
      .attr("stroke", "rgba(241,244,252,0.72)")
      .attr("stroke-width", 1.8);

  axisLayer.append("path")
      .attr("d", `M ${chart.left - 10} ${chart.top + 18} L ${chart.left} ${chart.top} L ${chart.left + 10} ${chart.top + 18}`)
      .attr("fill", "none")
      .attr("stroke", "rgba(241,244,252,0.72)")
      .attr("stroke-width", 1.8);

  const axisScales = getScales("summary");
  const axisX = axisScales.x;
  const axisY = axisScales.y;

  axisLayer.append("line")
      .attr("x1", axisX(15))
      .attr("x2", axisX(15))
      .attr("y1", chart.bottom)
      .attr("y2", chart.top)
      .attr("stroke", "rgba(255,255,255,0.12)")
      .attr("stroke-dasharray", "4 8");

  axisLayer.append("line")
      .attr("x1", chart.left)
      .attr("x2", chart.right)
      .attr("y1", axisY(25))
      .attr("y2", axisY(25))
      .attr("stroke", "rgba(255,255,255,0.12)")
      .attr("stroke-dasharray", "4 8");

  axisLayer.append("text")
      .attr("x", (chart.left + chart.right) / 2)
      .attr("y", chart.bottom + 42)
      .attr("text-anchor", "middle")
      .attr("fill", "#f2f5fc")
      .attr("font-family", "Cormorant Garamond, serif")
      .attr("font-size", 26)
      .text("Short → Long");

  axisLayer.append("text")
      .attr("x", (chart.left + chart.right) / 2)
      .attr("y", chart.bottom + 69)
      .attr("text-anchor", "middle")
      .attr("fill", "#b4bfd9")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", 14)
      .text("average interruption duration");

  axisLayer.append("text")
      .attr("transform", `translate(${chart.left - 52}, ${(chart.top + chart.bottom) / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("fill", "#f2f5fc")
      .attr("font-family", "Cormorant Garamond, serif")
      .attr("font-size", 26)
      .text("Low → High");

  axisLayer.append("text")
      .attr("transform", `translate(${chart.left - 20}, ${(chart.top + chart.bottom) / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("fill", "#b4bfd9")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", 14)
      .text("average refocus cost");

  const quadrantLabels = [
    { x: axisX(5), y: axisY(34), title: "The Silent Killers", sub: "Short + Frequent" },
    { x: axisX(23.8), y: axisY(34), title: "System Overload", sub: "Long + Frequent" },
    { x: axisX(4.8), y: axisY(4.6), title: "Acceptable Noise", sub: "Short + Rare" },
    { x: axisX(24.2), y: axisY(4.6), title: "Occasional Deep Cuts", sub: "Long + Rare" }
  ];

  quadrantLabels.forEach(q => {
    axisLayer.append("text")
        .attr("x", q.x)
        .attr("y", q.y)
        .attr("text-anchor", "middle")
        .attr("fill", "rgba(245,246,251,0.88)")
        .attr("font-family", "Cormorant Garamond, serif")
        .attr("font-size", 25)
        .text(q.title);

    axisLayer.append("text")
        .attr("x", q.x)
        .attr("y", q.y + 26)
        .attr("text-anchor", "middle")
        .attr("fill", "#b9c2d8")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-size", 15)
        .text(q.sub);
  });
}
drawAxes();

// =========================
// 5. Danger glow & trail
// =========================
const baseScales = getScales("summary");
const dangerGlow = bgLayer.append("ellipse")
    .attr("cx", baseScales.x(5))
    .attr("cy", baseScales.y(34))
    .attr("rx", 245)
    .attr("ry", 175)
    .attr("fill", "url(#danger-grad)")
    .attr("filter", "blur(28px)")
    .attr("opacity", 0.82);

(function animateDanger() {
  dangerGlow
      .transition()
      .duration(2600)
      .attr("rx", 258)
      .attr("ry", 186)
      .attr("opacity", 0.96)
      .transition()
      .duration(2600)
      .attr("rx", 236)
      .attr("ry", 170)
      .attr("opacity", 0.78)
      .on("end", animateDanger);
})();

const trailPoints = [
  [baseScales.x(2.6), baseScales.y(39)],
  [baseScales.x(3.1), baseScales.y(36)],
  [baseScales.x(3.4), baseScales.y(34)],
  [baseScales.x(3.8), baseScales.y(32)],
  [baseScales.x(4.3), baseScales.y(35)],
  [baseScales.x(4.8), baseScales.y(31.5)],
  [baseScales.x(5.3), baseScales.y(29)]
];

const trailLine = d3.line().curve(d3.curveBasis);
const trailPath = hintLayer.append("path")
    .attr("d", trailLine(trailPoints))
    .attr("fill", "none")
    .attr("stroke", "rgba(255,255,255,0.34)")
    .attr("stroke-width", 1.4)
    .attr("stroke-dasharray", "7 7")
    .attr("opacity", 0.7);

(function animateTrail() {
  const len = trailPath.node().getTotalLength();
  trailPath
      .attr("stroke-dasharray", `${len / 10} ${len / 22}`)
      .attr("stroke-dashoffset", 0)
      .transition()
      .duration(2400)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", -len / 5)
      .on("end", animateTrail);
})();

trailPoints.forEach((p, i) => {
  hintLayer.append("circle")
      .attr("cx", p[0])
      .attr("cy", p[1])
      .attr("r", 4 + i * 0.35)
      .attr("fill", "rgba(255,255,255,0.18)")
      .attr("stroke", "rgba(255,255,255,0.3)");
});

// =========================
// 6. Legend
// =========================
const legend = d3.select("#legend");
legend.selectAll("*").remove();
categories.forEach(cat => {
  const item = legend.append("div").attr("class", "legend-item");
  item.append("span")
      .attr("class", "legend-swatch")
      .style("background", cat.color)
      .style("box-shadow", `0 0 12px ${cat.color}`);
  item.append("span").text(cat.name);
});

// =========================
// 7. Metrics
// =========================
function metricUpdate(data) {
  const summary = currentView === "summary"
      ? data
      : categories.map(cat => {
        const subset = data.filter(d => d.type === cat.name);
        return {
          type: cat.name,
          avgDuration: d3.mean(subset, d => d.duration),
          avgRefocus: d3.mean(subset, d => d.refocus),
          totalLoss: d3.sum(subset, d => d.lost),
          count: subset.length
        };
      });

  const mostFrequent = categories.reduce((a, b) => (a.dailyCount > b.dailyCount ? a : b));
  const shortestDanger = categories.reduce((a, b) => (a.avgDuration < b.avgDuration ? a : b));
  const largest = currentView === "summary"
      ? summaryData.reduce((a, b) => (a.lost > b.lost ? a : b))
      : summary.reduce((a, b) => (a.totalLoss > b.totalLoss ? a : b));

  const dangerShare = Math.round(
      (categories.filter(d => d.avgDuration <= 10 && d.avgRefocus >= 25).length / categories.length) * 100
  );

  d3.select("#metric-type").text(activeCategory || mostFrequent.name);
  d3.select("#metric-short").text(`${shortestDanger.avgDuration}s`);
  d3.select("#metric-load").text(`${Math.round(currentView === "summary" ? largest.lost : largest.totalLoss)} min`);
  d3.select("#metric-share").text(`${dangerShare}%`);
}

// =========================
// 8. Pulse
// =========================
function pulseAt(cx, cy, color) {
  fxLayer.append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", 8)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("opacity", 0.9)
      .transition()
      .duration(850)
      .attr("r", 66)
      .attr("opacity", 0)
      .remove();

  fxLayer.append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", 10)
      .attr("fill", color)
      .attr("opacity", 0.18)
      .attr("filter", "blur(6px)")
      .transition()
      .duration(850)
      .attr("r", 46)
      .attr("opacity", 0)
      .remove();
}

// =========================
// 9. Summary view
// =========================
function drawSummary() {
  const { x, y } = getScales("summary");

  const nodes = bubbleLayer.selectAll("g.node")
      .data(summaryData, d => d.id);

  nodes.exit()
      .transition()
      .duration(450)
      .style("opacity", 0)
      .remove();

  const enter = nodes.enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${x(d.duration)}, ${y(d.refocus) + 18})`)
      .style("opacity", 0)
      .style("cursor", "pointer")
      .on("mouseenter", function(event, d) {
        tooltip.style("opacity", 1).html(
            `<strong>${d.type}</strong><br>
         Average interruption: ${d.duration}s<br>
         Average refocus cost: ${d.refocus} points<br>
         Total daily attention loss: ${d.lost} min<br>
         Daily events: ${d.count}`
        );
      })
      .on("mousemove", function(event) {
        tooltip.style("left", `${event.clientX + 16}px`).style("top", `${event.clientY - 10}px`);
      })
      .on("mouseleave", function() {
        tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        activeCategory = d.type;
        metricUpdate(summaryData);
        pulseAt(x(d.duration), y(d.refocus), d.color);
      });

  enter.append("circle")
      .attr("class", "halo")
      .attr("r", d => summaryR(d.lost) * 1.16)
      .attr("fill", d => d.color)
      .attr("opacity", 0.16)
      .attr("filter", d => `url(#glow-${categories.findIndex(c => c.name === d.type)})`);

  enter.append("circle")
      .attr("class", "core")
      .attr("r", d => summaryR(d.lost))
      .attr("fill", d => `url(#grad-${categories.findIndex(c => c.name === d.type)})`)
      .attr("stroke", d => d3.color(d.color).brighter(1.15))
      .attr("stroke-opacity", 0.72)
      .attr("stroke-width", 1.4)
      .attr("opacity", 0.96);

  enter.append("circle")
      .attr("class", "highlight")
      .attr("cx", d => -summaryR(d.lost) * 0.26)
      .attr("cy", d => -summaryR(d.lost) * 0.26)
      .attr("r", d => summaryR(d.lost) * 0.22)
      .attr("fill", "rgba(255,255,255,0.62)")
      .attr("opacity", 0.42);

  const merged = enter.merge(nodes);

  merged.transition()
      .delay((d, i) => i * 40)
      .duration(750)
      .ease(d3.easeCubicOut)
      .style("opacity", 1)
      .attr("transform", d => `translate(${x(d.duration)}, ${y(d.refocus)})`);

  merged.select(".halo")
      .transition().duration(600)
      .attr("r", d => summaryR(d.lost) * 1.16);

  merged.select(".core")
      .transition().duration(600)
      .attr("r", d => summaryR(d.lost));

  merged.select(".highlight")
      .transition().duration(600)
      .attr("cx", d => -summaryR(d.lost) * 0.26)
      .attr("cy", d => -summaryR(d.lost) * 0.26)
      .attr("r", d => summaryR(d.lost) * 0.22);
}

// =========================
// 10. Event view
// =========================
function drawEvents() {
  const { x, y } = getScales("events");

  const nodes = bubbleLayer.selectAll("g.node")
      .data(eventData, d => d.id);

  nodes.exit()
      .transition()
      .duration(300)
      .style("opacity", 0)
      .remove();

  const enter = nodes.enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => {
        const parent = summaryData.find(s => s.type === d.type);
        const startX = getScales("summary").x(parent.duration);
        const startY = getScales("summary").y(parent.refocus);
        return `translate(${startX}, ${startY})`;
      })
      .style("opacity", 0)
      .style("cursor", "pointer")
      .on("mouseenter", function(event, d) {
        tooltip.style("opacity", 1).html(
            `<strong>${d.label}</strong><br>
         Duration: ${d.duration}s<br>
         Refocus cost: ${d.refocus}<br>
         Attention loss: ${Math.round(d.lost)} min`
        );
      })
      .on("mousemove", function(event) {
        tooltip.style("left", `${event.clientX + 16}px`).style("top", `${event.clientY - 10}px`);
      })
      .on("mouseleave", function() {
        tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        activeCategory = d.type;
        metricUpdate(eventData);
        pulseAt(x(d.duration), y(d.refocus), d.color);
      });

  enter.append("circle")
      .attr("class", "halo")
      .attr("r", d => eventR(d.lost) * 1.35)
      .attr("fill", d => d.color)
      .attr("opacity", 0.12)
      .attr("filter", d => `url(#glow-${categories.findIndex(c => c.name === d.type)})`);

  enter.append("circle")
      .attr("class", "core")
      .attr("r", d => eventR(d.lost))
      .attr("fill", d => `url(#grad-${categories.findIndex(c => c.name === d.type)})`)
      .attr("stroke", d => d3.color(d.color).brighter(1.15))
      .attr("stroke-opacity", 0.68)
      .attr("stroke-width", 1.0)
      .attr("opacity", 0.96);

  enter.append("circle")
      .attr("class", "highlight")
      .attr("cx", d => -eventR(d.lost) * 0.23)
      .attr("cy", d => -eventR(d.lost) * 0.23)
      .attr("r", d => eventR(d.lost) * 0.22)
      .attr("fill", "rgba(255,255,255,0.62)")
      .attr("opacity", 0.4);

  const merged = enter.merge(nodes);

  merged.transition()
      .delay((d, i) => (i % 20) * 8)
      .duration(820)
      .ease(d3.easeCubicOut)
      .style("opacity", 1)
      .attr("transform", d => `translate(${x(d.duration)}, ${y(d.refocus)})`);
}

// =========================
// 11. Render
// =========================
function render() {
  bubbleLayer.selectAll("*").remove();
  tooltip.style("opacity", 0);

  if (currentView === "summary") {
    drawSummary();
    d3.select("#toggleView").text("Switch to Event View");
  } else {
    drawEvents();
    d3.select("#toggleView").text("Back to Category View");
  }

  metricUpdate(currentView === "summary" ? summaryData : eventData);
}

render();

d3.select("#toggleView").on("click", () => {
  currentView = currentView === "summary" ? "events" : "summary";
  activeCategory = null;
  render();
});

d3.select("#focusDanger").on("click", () => {
  const { x, y } = getScales("summary");

  fxLayer.append("ellipse")
      .attr("cx", x(5))
      .attr("cy", y(34))
      .attr("rx", 118)
      .attr("ry", 88)
      .attr("fill", "rgba(255,255,255,0)")
      .attr("stroke", "rgba(255,255,255,0.6)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "8 8")
      .attr("opacity", 0.95)
      .transition()
      .duration(1200)
      .attr("rx", 140)
      .attr("ry", 104)
      .attr("opacity", 0)
      .remove();
});

window.addEventListener("resize", () => {
  window.location.reload();
});