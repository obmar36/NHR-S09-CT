(() => {
  "use strict";

  const CONFIG = window.S09CT_CONFIG || {};
  const SOURCE_DATA = window.S09CT_DATA || {};
  const state = {
    data: JSON.parse(JSON.stringify(SOURCE_DATA)),
    route: "dashboard",
    siteFilter: "all",
    charts: [],
    map: null,
    refreshTimer: null,
    selectedDeviceId: "S09CT-QS03-INV02",
    alertFilter: { severity: "all", status: "open", query: "" }
  };

  const routeMeta = {
    dashboard: ["SOLAR OPERATIONS", "戰情總覽"],
    sites: ["SITE MANAGEMENT", "場站監控"],
    generation: ["ENERGY ANALYTICS", "發電分析"],
    current: ["S09-CT MONITORING", "電流監控"],
    alerts: ["ALARM WORKFLOW", "告警中心"],
    devices: ["DEVICE HEALTH", "裝置診斷"],
    reports: ["REPORTING & ESG", "報表與 ESG"],
    settings: ["SYSTEM CONTROL", "系統設定"]
  };

  const statusText = {
    normal: "正常",
    warning: "警告",
    critical: "嚴重",
    online: "在線",
    offline: "離線",
    new: "待確認",
    acknowledged: "已確認",
    assigned: "已指派",
    in_progress: "處理中",
    closed: "已結案",
    info: "資訊"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const fmt = (n, digits = 1) => Number(n).toLocaleString("zh-TW", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const fmtInt = n => Math.round(Number(n)).toLocaleString("zh-TW");
  const sum = arr => arr.reduce((a, b) => a + Number(b || 0), 0);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const siteById = id => state.data.sites.find(s => s.id === id);
  const currentSites = () => state.siteFilter === "all" ? state.data.sites : state.data.sites.filter(s => s.id === state.siteFilter);
  const currentDevices = () => state.siteFilter === "all" ? state.data.devices : state.data.devices.filter(d => d.siteId === state.siteFilter);
  const currentAlerts = () => state.siteFilter === "all" ? state.data.alerts : state.data.alerts.filter(a => a.siteId === state.siteFilter);
  const openAlerts = () => currentAlerts().filter(a => a.status !== "closed");
  const criticalAlerts = () => openAlerts().filter(a => a.severity === "critical");

  function badge(value, label = statusText[value] || value) {
    return `<span class="badge badge-${esc(value)}">${esc(label)}</span>`;
  }

  function sourceBadge(type) {
    const map = {
      measured: ["source-measured", "S09-CT 量測"],
      calculated: ["source-calculated", "平台計算"],
      external: ["source-external", "外部資料"]
    };
    const item = map[type] || map.measured;
    return `<span class="source-badge ${item[0]}">${item[1]}</span>`;
  }

  function panel(title, subtitle, body, actions = "", cls = "") {
    return `<section class="panel ${cls}">
      <div class="panel-header">
        <div><h3 class="panel-title">${title}</h3>${subtitle ? `<p class="panel-subtitle">${subtitle}</p>` : ""}</div>
        ${actions ? `<div class="panel-actions">${actions}</div>` : ""}
      </div>
      <div class="panel-body">${body}</div>
    </section>`;
  }

  function kpiCard({ label, value, unit, footLeft, footRight, icon, tone = "", progress }) {
    return `<article class="kpi-card ${tone}">
      <div>
        <div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-icon">${icon}</span></div>
        <div class="kpi-value">${value}${unit ? `<span class="kpi-unit">${unit}</span>` : ""}</div>
        ${progress != null ? `<div class="progress"><div class="progress-fill" style="width:${clamp(progress,0,100)}%"></div></div>` : ""}
      </div>
      <div class="kpi-foot"><span>${footLeft || ""}</span><span>${footRight || ""}</span></div>
    </article>`;
  }

  function intro(title, description, actions = "") {
    return `<div class="page-intro"><div><h2>${title}</h2><p>${description}</p></div>${actions ? `<div class="intro-actions">${actions}</div>` : ""}</div>`;
  }

  function filteredSummary() {
    const sites = currentSites();
    const totalCapacity = sum(sites.map(s => s.capacity));
    const power = sum(sites.map(s => s.currentPower));
    const today = sum(sites.map(s => s.todayEnergy));
    const expected = sum(sites.map(s => s.expectedEnergy));
    const target = expected ? today / expected * 100 : 0;
    const loss = Math.max(0, expected - today);
    const online = sites.filter(s => s.status !== "critical").length;
    return { sites, totalCapacity, power, today, expected, target, loss, online };
  }

  function syncSiteFilters() {
    const desktop = $("#global-site-filter");
    const mobile = $("#mobile-site-filter");
    if (desktop) desktop.value = state.siteFilter;
    if (mobile) mobile.value = state.siteFilter;
  }

  function setSiteFilter(value, notify = true) {
    state.siteFilter = value || "all";
    syncSiteFilters();
    renderRoute();
    if (notify) {
      showToast("篩選條件已更新", state.siteFilter === "all" ? "目前顯示全部場站。" : `目前僅顯示 ${siteById(state.siteFilter)?.name || state.siteFilter}。`);
    }
  }

  function setupShell() {
    syncSiteFilters();
    [$("#global-site-filter"), $("#mobile-site-filter")].filter(Boolean).forEach(select => {
      select.addEventListener("change", e => setSiteFilter(e.target.value));
    });

    $("#mobile-menu").addEventListener("click", openSidebar);
    $("#mobile-more").addEventListener("click", openSidebar);
    $("#sidebar-close").addEventListener("click", closeSidebar);
    $("#sidebar-backdrop").addEventListener("click", closeSidebar);
    $("#mobile-refresh").addEventListener("click", refreshData);
    $("#notification-btn").addEventListener("click", () => {
      location.hash = "#/alerts";
    });

    window.addEventListener("hashchange", handleRoute);
    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) closeSidebar();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { closeSidebar(); closeModal(); }
    });

    updateAlertCounts();
    handleRoute();
    scheduleRefresh();
  }

  function openSidebar() {
    $("#sidebar").classList.add("open");
    $("#sidebar-backdrop").classList.add("show");
    $("#mobile-menu").setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
  }
  function closeSidebar() {
    $("#sidebar").classList.remove("open");
    $("#sidebar-backdrop").classList.remove("show");
    $("#mobile-menu").setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  function handleRoute() {
    const route = (location.hash.replace(/^#\/?/, "") || "dashboard").split("?")[0];
    state.route = routeMeta[route] ? route : "dashboard";
    renderRoute();
    closeSidebar();
  }

  function renderRoute() {
    destroyVisuals();
    const [eyebrow, title] = routeMeta[state.route];
    $("#page-eyebrow").textContent = eyebrow;
    $("#page-title").textContent = title;
    $$('[data-route]').forEach(el => el.classList.toggle("active", el.dataset.route === state.route));
    document.title = `${title}｜S09-CT 太陽能監測管理平台`;
    const content = $("#page-content");
    content.innerHTML = `<div class="loading"></div>`;

    const renderers = {
      dashboard: renderDashboard,
      sites: renderSites,
      generation: renderGeneration,
      current: renderCurrent,
      alerts: renderAlerts,
      devices: renderDevices,
      reports: renderReports,
      settings: renderSettings
    };

    window.requestAnimationFrame(() => {
      content.innerHTML = renderers[state.route]();
      bindRouteEvents();
      initRouteVisuals();
      content.scrollTop = 0;
      updateAlertCounts();
    });
  }

  function destroyVisuals() {
    state.charts.forEach(chart => {
      try { chart.destroy(); } catch (_) {}
    });
    state.charts = [];
    if (state.map) {
      try { state.map.remove(); } catch (_) {}
      state.map = null;
    }
  }

  function chartDefaults() {
    if (!window.Chart) return;
    Chart.defaults.color = "#91a6bf";
    Chart.defaults.borderColor = "rgba(151,177,210,.12)";
    Chart.defaults.font.family = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
    Chart.defaults.font.size = 10;
  }

  function renderDashboard() {
    const s = filteredSummary();
    const revenueLoss = s.loss * 1000 * state.data.organization.tariff;
    const urgent = openAlerts().filter(a => a.severity !== "info").slice(0, 4);
    const actions = urgent.map(a => `<div class="action-card" data-alert-id="${a.id}">
      <span class="action-level ${a.severity === "warning" ? "warning" : ""}"></span>
      <div>
        <div class="action-title">${esc(a.site)} · ${esc(a.type)}</div>
        <div class="action-meta"><span>${esc(a.device)}</span><span>${esc(a.duration)}</span><span>${statusText[a.status]}</span><span>${esc(a.assignee)}</span></div>
      </div>
      <div class="action-loss"><strong>${fmt(a.loss,1)} kWh</strong><small>估計發電損失</small></div>
    </div>`).join("") || `<div class="empty-state"><strong>目前沒有待處理事項</strong>所有場站均在正常範圍內。</div>`;

    return `<div class="page-stack">
      ${intro("太陽能營運狀態", "以管理者視角整合發電、電流、告警與設備健康，優先顯示需要採取行動的異常。", `<button class="btn" data-action="refresh">↻ 立即更新</button><button class="btn btn-primary" data-action="export-dashboard">⇩ 匯出營運摘要</button>`)}
      <div class="kpi-grid">
        ${kpiCard({ label:"即時總發電功率", value:fmtInt(s.power), unit:"kW", footLeft:`裝置容量 ${fmt(s.totalCapacity/1000,2)} MWp`, footRight:"即時", icon:"⚡", tone:"tone-yellow" })}
        ${kpiCard({ label:"今日累計發電量", value:fmt(s.today,2), unit:"MWh", footLeft:`預期 ${fmt(s.expected,2)} MWh`, footRight:`差異 ${fmt(s.today-s.expected,2)} MWh`, icon:"☀", tone:"tone-cyan" })}
        ${kpiCard({ label:"今日目標達成率", value:fmt(s.target,1), unit:"%", footLeft:"實際 / 預期", footRight:s.target >= 95 ? "達標" : "低於目標", icon:"◎", tone:s.target >= 95 ? "tone-green" : "tone-orange", progress:s.target })}
        ${kpiCard({ label:"預估發電損失", value:fmt(s.loss,2), unit:"MWh", footLeft:`收益影響 NT$ ${fmtInt(revenueLoss)}`, footRight:"平台估算", icon:"↓", tone:"tone-red" })}
        ${kpiCard({ label:"在線場站", value:`${s.online}/${s.sites.length}`, unit:"站", footLeft:`在線裝置 ${sum(currentDevices().filter(d=>d.status!=="offline").map(()=>1))}/${currentDevices().length}`, footRight:"可用率 97.6%", icon:"●", tone:"tone-green" })}
        ${kpiCard({ label:"待處理嚴重告警", value:criticalAlerts().length, unit:"件", footLeft:`全部未結案 ${openAlerts().length} 件`, footRight:"需維運確認", icon:"!", tone:"tone-red" })}
      </div>

      <div class="dashboard-grid">
        ${panel("即時發電與日照趨勢", "實際功率、預期功率與日照輻射；告警時段可用於判斷是環境因素或設備異常。", `<div class="chart-wrap"><canvas id="dashboard-power-chart"></canvas></div>`, `${sourceBadge("external")}${sourceBadge("calculated")}`)}
        ${panel("待處理事項", "依嚴重度與預估發電損失排序。", `<div class="action-list">${actions}</div>`, `<button class="btn btn-sm" data-action="go-alerts">查看全部</button>`)}
      </div>

      <div class="dashboard-bottom">
        ${panel("場站績效排行", "以今日目標達成率與開放告警快速辨識低績效場站。", stationTable(s.sites), `<button class="btn btn-sm" data-action="go-sites">場站監控</button>`)}
        ${panel("場站位置與狀態", "綠色正常、橘色警告、紅色嚴重。", `<div id="dashboard-map" class="map-container"></div>`, `<span class="source-badge source-external">地圖服務</span>`)}
      </div>
    </div>`;
  }

  function stationTable(sites) {
    const rows = [...sites].sort((a,b) => (a.todayEnergy/a.expectedEnergy) - (b.todayEnergy/b.expectedEnergy)).map(s => {
      const target = s.expectedEnergy ? s.todayEnergy / s.expectedEnergy * 100 : 0;
      return `<tr data-site-id="${s.id}">
        <td><span class="table-main">${esc(s.name)}</span><span class="table-sub">${s.id} · ${esc(s.region)}</span></td>
        <td class="numeric">${fmt(s.capacity/1000,2)} MWp</td>
        <td class="numeric">${fmtInt(s.currentPower)} kW</td>
        <td class="numeric">${fmt(s.todayEnergy,2)} MWh</td>
        <td><span class="numeric ${target < 80 ? "trend-down" : target >= 95 ? "trend-up" : ""}">${fmt(target,1)}%</span></td>
        <td class="numeric">${fmt(s.pr,1)}%</td>
        <td>${s.openAlerts ? badge(s.status, `${s.openAlerts} 件`) : badge("normal", "0 件")}</td>
        <td>${esc(s.lastReport)}</td>
      </tr>`;
    }).join("");
    return `<div class="table-wrap"><table><thead><tr><th>場站</th><th>容量</th><th>即時功率</th><th>今日發電</th><th>達成率</th><th>PR</th><th>告警</th><th>最後更新</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderSites() {
    const sites = currentSites();
    const cards = sites.map(s => {
      const target = s.todayEnergy / s.expectedEnergy * 100;
      return `<article class="site-card" data-site-id="${s.id}">
        <div class="site-card-head"><div><h3>${esc(s.name)}</h3><p>${s.id} · ${esc(s.region)} · ${fmt(s.capacity/1000,2)} MWp</p></div>${badge(s.status)}</div>
        <div class="site-power">${fmtInt(s.currentPower)} <span>kW</span></div>
        <div class="progress"><div class="progress-fill" style="width:${clamp(target,0,100)}%"></div></div>
        <div class="site-metrics">
          <div class="site-metric"><small>今日發電</small><strong>${fmt(s.todayEnergy,2)} MWh</strong></div>
          <div class="site-metric"><small>目標達成率</small><strong>${fmt(target,1)}%</strong></div>
          <div class="site-metric"><small>開放告警</small><strong>${s.openAlerts} 件</strong></div>
        </div>
      </article>`;
    }).join("");

    return `<div class="page-stack">
      ${intro("場站集中管理", "從地圖、績效與異常三個角度掌握分散式太陽能場站，並向下查看 S09-CT 裝置與 CT 通道。", `<button class="btn" data-action="export-sites">⇩ 匯出場站清單</button><button class="btn btn-primary" data-action="add-site">＋ 新增場站</button>`)}
      <div class="site-cards">${cards}</div>
      <div class="dashboard-grid">
        ${panel("場站地圖", "標記顏色依目前最高嚴重度呈現。", `<div id="sites-map" class="map-container"></div>`)}
        ${panel("管理摘要", "場站容量、裝置狀態與告警分布。", `<div class="data-quality-grid">
          <div class="quality-card"><small>總裝置容量</small><strong>${fmt(sum(sites.map(s=>s.capacity))/1000,2)} MWp</strong></div>
          <div class="quality-card"><small>在線裝置</small><strong>${currentDevices().filter(d=>d.status!=="offline").length}/${currentDevices().length}</strong></div>
          <div class="quality-card"><small>平均可用率</small><strong>${fmt(sum(sites.map(s=>s.availability))/sites.length,1)}%</strong></div>
          <div class="quality-card"><small>開放告警</small><strong>${openAlerts().length}</strong></div>
        </div>
        <div style="margin-top:12px">${stationTable(sites)}</div>`)}
      </div>
    </div>`;
  }

  function renderGeneration() {
    const s = filteredSummary();
    const monthEnergy = 548.6;
    const co2 = monthEnergy * 1000 * state.data.organization.emissionFactor / 1000;
    return `<div class="page-stack">
      ${intro("發電績效與損失分析", "比較實際發電、預期基準與日照條件，避免僅以單一發電量判斷設備健康。", `<button class="btn" data-action="export-generation">⇩ 匯出發電資料</button>`)}
      <div class="filter-bar">
        <div class="field"><label>時間範圍</label><select id="generation-range"><option>今日</option><option>昨日</option><option selected>近 7 日</option><option>近 30 日</option></select></div>
        <div class="field"><label>資料粒度</label><select><option>15 分鐘</option><option selected>1 小時</option><option>1 日</option></select></div>
        <div class="field"><label>比較基準</label><select><option selected>預期發電</option><option>昨日同時段</option><option>前 7 日平均</option></select></div>
        <div class="field"><label>資料完整率</label><input value="98.7%" readonly /></div>
      </div>
      <div class="kpi-grid">
        ${kpiCard({ label:"今日發電量", value:fmt(s.today,2), unit:"MWh", footLeft:`預期 ${fmt(s.expected,2)} MWh`, footRight:"外部電表 / 逆變器", icon:"☀", tone:"tone-yellow" })}
        ${kpiCard({ label:"即時功率", value:fmtInt(s.power), unit:"kW", footLeft:`容量 ${fmt(s.totalCapacity/1000,2)} MWp`, footRight:"功率資料", icon:"⚡", tone:"tone-cyan" })}
        ${kpiCard({ label:"平均 PR", value:fmt(sum(s.sites.map(x=>x.pr))/s.sites.length,1), unit:"%", footLeft:"需日照與額定容量", footRight:"平台計算", icon:"◎", tone:"tone-green" })}
        ${kpiCard({ label:"本月發電量", value:fmt(monthEnergy,1), unit:"MWh", footLeft:"較預期 -4.2%", footRight:"截至今日", icon:"▥", tone:"tone-blue" })}
        ${kpiCard({ label:"本月碳減量", value:fmt(co2,1), unit:"tCO₂e", footLeft:`係數 ${state.data.organization.emissionFactor}`, footRight:"平台計算", icon:"♧", tone:"tone-green" })}
        ${kpiCard({ label:"發電損失", value:fmt(s.loss,2), unit:"MWh", footLeft:"依預期基準估算", footRight:"需確認模型", icon:"↓", tone:"tone-red" })}
      </div>
      <div class="dashboard-grid">
        ${panel("今日功率曲線", "實際、預期與日照輻射的時序比較。", `<div class="chart-wrap"><canvas id="generation-power-chart"></canvas></div>`, `${sourceBadge("external")}${sourceBadge("calculated")}`)}
        ${panel("近七日發電量", "實際與預期發電量比較。", `<div class="chart-wrap"><canvas id="generation-week-chart"></canvas></div>`)}
      </div>
      ${panel("場站發電績效", "依目標達成率、PR、可用率與開放告警排序。", stationTable(s.sites))}
    </div>`;
  }

  function renderCurrent() {
    const devices = currentDevices();
    let selected = devices.find(d => d.id === state.selectedDeviceId) || devices[0] || state.data.devices[0];
    state.selectedDeviceId = selected.id;
    const [l1,l2,l3] = selected.channels;
    const avg = (l1+l2+l3)/3;
    const imbalance = avg ? Math.max(Math.abs(l1-avg), Math.abs(l2-avg), Math.abs(l3-avg))/avg*100 : 0;
    const phaseCard = (name, value, status="normal") => `<article class="phase-card ${status}">
      <div class="phase-head"><span class="phase-name">${name}</span>${sourceBadge("measured")}</div>
      <div class="phase-value">${fmt(value,1)} <span>A</span></div>
      <div class="phase-bar"><i style="width:${clamp(value/30*100,0,100)}%"></i></div>
      <div class="phase-foot"><span>量程 0–30 A</span><span>${statusText[status]}</span></div>
    </article>`;

    const opts = devices.map(d => `<option value="${d.id}" ${d.id===selected.id?"selected":""}>${d.id} · ${esc(d.location)}</option>`).join("");
    return `<div class="page-stack">
      ${intro("S09-CT 電流監控", "核心頁面直接呈現三路 CT 電流、相間差異、趨勢與異常門檻。", `<button class="btn" data-action="device-detail" data-device-id="${selected.id}">裝置詳細資料</button><button class="btn btn-primary" data-action="export-current">⇩ 匯出 CT 資料</button>`)}
      <div class="filter-bar">
        <div class="field" style="min-width:min(420px,100%);flex:1"><label>S09-CT 裝置</label><select id="current-device-select">${opts}</select></div>
        <div class="field"><label>監測模式</label><input value="${esc(selected.mode)}" readonly /></div>
        <div class="field"><label>安裝位置</label><input value="${esc(selected.location)}" readonly /></div>
        <div class="field"><label>最後回報</label><input value="${esc(selected.lastReport)}" readonly /></div>
      </div>
      <div class="current-hero">
        ${phaseCard("L1", l1, l1===0?"critical":"normal")}
        ${phaseCard("L2", l2, l2===0?"critical":"normal")}
        ${phaseCard("L3", l3, l3 < avg*.88 ? "critical" : l3 < avg*.94 ? "warning" : "normal")}
        <article class="phase-card ${imbalance>15?"critical":imbalance>10?"warning":""}">
          <div class="phase-head"><span class="phase-name">CURRENT IMBALANCE</span>${sourceBadge("calculated")}</div>
          <div class="phase-value">${fmt(imbalance,1)} <span>%</span></div>
          <div class="phase-bar"><i style="width:${clamp(imbalance/20*100,0,100)}%"></i></div>
          <div class="phase-foot"><span>警告 10% / 嚴重 15%</span><span>${imbalance>15?"嚴重":imbalance>10?"警告":"正常"}</span></div>
        </article>
      </div>
      <div class="dashboard-grid">
        ${panel("三相電流趨勢", "可與昨日同時段或同組設備比較；目前展示 15 分鐘粒度。", `<div class="chart-wrap"><canvas id="current-trend-chart"></canvas></div>`, sourceBadge("measured"))}
        ${panel("裝置與資料品質", "用於區分感測異常、供電問題或行動網路問題。", `<div class="data-quality-grid">
          <div class="quality-card"><small>網路</small><strong>${esc(selected.network)}</strong></div>
          <div class="quality-card"><small>RSRP</small><strong>${selected.rsrp} dBm</strong></div>
          <div class="quality-card"><small>資料完整率</small><strong>${fmt(selected.completeness,1)}%</strong></div>
          <div class="quality-card"><small>韌體</small><strong>${esc(selected.firmware)}</strong></div>
        </div>
        <div style="margin-top:14px" class="table-wrap"><table><thead><tr><th>通道</th><th>即時值</th><th>與平均差異</th><th>門檻</th><th>狀態</th></tr></thead><tbody>
          ${[["L1",l1],["L2",l2],["L3",l3]].map(([n,v])=>{const diff=avg?(v-avg)/avg*100:0; const st=Math.abs(diff)>15?"critical":Math.abs(diff)>10?"warning":"normal"; return `<tr><td class="table-main">${n}</td><td class="numeric">${fmt(v,1)} A</td><td class="numeric ${diff<0?"trend-down":""}">${diff>0?"+":""}${fmt(diff,1)}%</td><td>偏差 10% / 15%</td><td>${badge(st)}</td></tr>`}).join("")}
        </tbody></table></div>`)}
      </div>
      ${panel("異常判斷規則", "S09-CT 可依量測值與平台規則產生告警；功率與發電量仍需外部電表或逆變器資料。", `<div class="data-source-list">
        <div class="data-source-row"><div><strong>過電流／低電流／零電流</strong><small>以 CT 即時量測值、上下限與持續時間判斷。</small></div>${sourceBadge("measured")}</div>
        <div class="data-source-row"><div><strong>三相不平衡</strong><small>以 L1、L2、L3 與三相平均值計算偏差。</small></div>${sourceBadge("calculated")}</div>
        <div class="data-source-row"><div><strong>日照正常但輸出偏低</strong><small>需整合日照、逆變器或智慧電表資料。</small></div>${sourceBadge("external")}</div>
        <div class="data-source-row"><div><strong>裝置離線與資料中斷</strong><small>依最後回報時間、遺失封包與通訊診斷判斷。</small></div>${sourceBadge("measured")}</div>
      </div>`)}
    </div>`;
  }

  function renderAlerts() {
    let alerts = currentAlerts();
    if (state.alertFilter.severity !== "all") alerts = alerts.filter(a => a.severity === state.alertFilter.severity);
    if (state.alertFilter.status === "open") alerts = alerts.filter(a => a.status !== "closed");
    else if (state.alertFilter.status !== "all") alerts = alerts.filter(a => a.status === state.alertFilter.status);
    if (state.alertFilter.query) {
      const q = state.alertFilter.query.toLowerCase();
      alerts = alerts.filter(a => [a.id,a.site,a.device,a.type,a.assignee].join(" ").toLowerCase().includes(q));
    }

    const rows = alerts.map(a => `<tr>
      <td>${badge(a.severity, a.severity === "critical" ? "嚴重" : a.severity === "warning" ? "警告" : "資訊")}</td>
      <td><span class="table-main">${esc(a.type)}</span><span class="table-sub">${esc(a.id)} · ${esc(a.occurredAt)}</span></td>
      <td><span class="table-main">${esc(a.site)}</span><span class="table-sub">${esc(a.device)} · ${esc(a.channel)}</span></td>
      <td><span class="numeric">${esc(a.value)}</span><span class="table-sub">基準 ${esc(a.baseline)}</span></td>
      <td>${esc(a.duration)}</td>
      <td class="numeric trend-down">${fmt(a.loss,1)} kWh</td>
      <td>${badge(a.status)}</td>
      <td>${esc(a.assignee)}</td>
      <td><button class="btn btn-sm" data-action="open-alert" data-alert-id="${a.id}">查看／處理</button></td>
    </tr>`).join("");

    const allOpen = currentAlerts().filter(a => a.status !== "closed");
    return `<div class="page-stack">
      ${intro("告警與維運工作流", "把異常轉換為可追蹤的確認、指派、處理與結案流程，避免告警只停留在通知層級。", `<button class="btn" data-action="export-alerts">⇩ 匯出告警</button><button class="btn btn-primary" data-action="ack-all">✓ 確認全部新告警</button>`)}
      <div class="alert-summary">
        <div class="mini-stat"><small>待確認</small><strong class="trend-down">${allOpen.filter(a=>a.status==="new").length}</strong></div>
        <div class="mini-stat"><small>已指派／處理中</small><strong>${allOpen.filter(a=>["assigned","in_progress"].includes(a.status)).length}</strong></div>
        <div class="mini-stat"><small>今日預估損失</small><strong class="trend-down">${fmt(sum(allOpen.map(a=>a.loss)),1)} kWh</strong></div>
        <div class="mini-stat"><small>平均未結案時間</small><strong>29 min</strong></div>
      </div>
      <div class="filter-bar">
        <div class="field"><label>嚴重度</label><select id="alert-severity-filter"><option value="all">全部</option><option value="critical">嚴重</option><option value="warning">警告</option><option value="info">資訊</option></select></div>
        <div class="field"><label>處理狀態</label><select id="alert-status-filter"><option value="open">未結案</option><option value="new">待確認</option><option value="acknowledged">已確認</option><option value="assigned">已指派</option><option value="in_progress">處理中</option><option value="closed">已結案</option><option value="all">全部</option></select></div>
        <div class="field search-field"><label>搜尋</label><input id="alert-query" placeholder="告警編號、場站、裝置、類型或負責人" value="${esc(state.alertFilter.query)}" /></div>
      </div>
      ${panel("告警清單", `目前顯示 ${alerts.length} 筆；依嚴重度與發生時間排序。`, `<div class="table-wrap"><table><thead><tr><th>嚴重度</th><th>告警</th><th>場站／設備</th><th>量測值</th><th>持續時間</th><th>預估損失</th><th>狀態</th><th>負責人</th><th>操作</th></tr></thead><tbody>${rows || `<tr><td colspan="9"><div class="empty-state"><strong>沒有符合條件的告警</strong>請調整篩選條件。</div></td></tr>`}</tbody></table></div>`)}
    </div>`;
  }

  function signalBars(signal) {
    const cls = signal > -80 ? "good" : signal > -100 ? "mid" : "weak";
    return `<span class="signal-bars ${cls}" title="RSSI ${signal} dBm"><i></i><i></i><i></i><i></i></span>`;
  }

  function renderDevices() {
    const devices = currentDevices();
    const cards = devices.map(d => `<article class="device-card">
      <div class="device-card-head"><div><h3>${esc(d.id)}</h3><p>${esc(d.site)} · ${esc(d.location)}</p></div>${badge(d.status)}</div>
      <div class="device-card-grid">
        <div><small>通訊</small><strong>${esc(d.network)} ${signalBars(d.signal)}</strong></div>
        <div><small>最後回報</small><strong>${esc(d.lastReport)}</strong></div>
        <div><small>資料完整率</small><strong>${fmt(d.completeness,1)}%</strong></div>
        <div><small>韌體</small><strong>${esc(d.firmware)}</strong></div>
      </div>
      <button class="btn btn-sm" style="margin-top:12px" data-action="device-detail" data-device-id="${d.id}">查看診斷</button>
    </article>`).join("");

    const rows = devices.map(d => `<tr>
      <td><span class="table-main numeric">${esc(d.id)}</span><span class="table-sub">${esc(d.location)}</span></td>
      <td>${esc(d.site)}</td><td>${esc(d.mode)}</td><td>${esc(d.network)} / ${esc(d.operator)}</td>
      <td>${signalBars(d.signal)} <span class="numeric">${d.signal} dBm</span><span class="table-sub">RSRP ${d.rsrp} dBm</span></td>
      <td class="numeric">${fmt(d.completeness,1)}%</td><td>${esc(d.firmware)}</td><td>${esc(d.lastReport)}</td><td>${badge(d.status)}</td>
      <td><button class="btn btn-sm" data-action="device-detail" data-device-id="${d.id}">詳細</button></td>
    </tr>`).join("");
    return `<div class="page-stack">
      ${intro("裝置與通訊診斷", "判斷異常來源是 CT 通道、裝置供電、韌體、資料品質或行動網路。", `<button class="btn" data-action="export-devices">⇩ 匯出裝置清單</button><button class="btn btn-primary" data-action="add-device">＋ 新增 S09-CT</button>`)}
      <div class="device-grid">${cards}</div>
      ${panel("裝置診斷清單", "正式串接後可加入 SIM、IMEI、封包遺失、重新連線及遠端設定欄位。", `<div class="table-wrap"><table><thead><tr><th>Device ID</th><th>場站</th><th>模式</th><th>網路</th><th>訊號</th><th>完整率</th><th>韌體</th><th>最後回報</th><th>狀態</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`)}
    </div>`;
  }

  function renderReports() {
    const monthEnergy = 548.6;
    const carbon = monthEnergy * state.data.organization.emissionFactor;
    const revenue = monthEnergy * 1000 * state.data.organization.tariff;
    const reports = state.data.reports.map((r,i) => `<article class="report-card">
      <div class="report-type">${esc(r.type)}</div><h3>${esc(r.name)}</h3><p>${esc(r.period)}<br>產生時間：${esc(r.generated)}</p>
      <button class="btn btn-sm ${i===0?"btn-primary":""}" data-action="generate-report" data-report-index="${i}">${i===0?"產生報表":"下載 CSV"}</button>
    </article>`).join("");
    return `<div class="page-stack">
      ${intro("營運、財務與 ESG 報表", "所有衍生指標均需保留計算期間、排放係數、電價與資料來源，確保可稽核。", `<button class="btn btn-primary" data-action="generate-monthly">產生本月營運報表</button>`)}
      <div class="kpi-grid">
        ${kpiCard({label:"本月發電量",value:fmt(monthEnergy,1),unit:"MWh",footLeft:"外部電表／逆變器",footRight:"截至今日",icon:"☀",tone:"tone-yellow"})}
        ${kpiCard({label:"估計售電／節省收益",value:fmtInt(revenue),unit:"TWD",footLeft:`電價 ${fmt(state.data.organization.tariff,2)} 元/kWh`,footRight:"平台計算",icon:"$",tone:"tone-green"})}
        ${kpiCard({label:"碳減量",value:fmt(carbon,1),unit:"tCO₂e",footLeft:`係數 ${state.data.organization.emissionFactor} kg/kWh`,footRight:"平台計算",icon:"♧",tone:"tone-green"})}
        ${kpiCard({label:"場站可用率",value:"97.6",unit:"%",footLeft:"排除計畫性維護",footRight:"平台計算",icon:"◎",tone:"tone-cyan"})}
        ${kpiCard({label:"MTTA",value:"12",unit:"min",footLeft:"平均告警確認時間",footRight:"維運 KPI",icon:"↗",tone:"tone-blue"})}
        ${kpiCard({label:"MTTR",value:"1.8",unit:"hr",footLeft:"平均恢復時間",footRight:"維運 KPI",icon:"✓",tone:"tone-orange"})}
      </div>
      <div class="dashboard-grid">
        ${panel("月度發電與目標", "以日為單位呈現實際發電及預期基準。", `<div class="chart-wrap"><canvas id="reports-generation-chart"></canvas></div>`)}
        ${panel("數據與計算依據", "正式報告需在頁尾保留資料來源與計算方法。", `<div class="data-source-list">
          <div class="data-source-row"><div><strong>發電量</strong><small>逆變器或收益級智慧電表。</small></div>${sourceBadge("external")}</div>
          <div class="data-source-row"><div><strong>收益估算</strong><small>發電量 × 系統設定電價。</small></div>${sourceBadge("calculated")}</div>
          <div class="data-source-row"><div><strong>碳減量</strong><small>發電量 × 系統設定排放係數。</small></div>${sourceBadge("calculated")}</div>
          <div class="data-source-row"><div><strong>CT 電流與通訊</strong><small>S09-CT 直接量測及回報。</small></div>${sourceBadge("measured")}</div>
        </div>`)}
      </div>
      <div class="report-grid">${reports}</div>
    </div>`;
  }

  function renderSettings() {
    const org = state.data.organization;
    return `<div class="page-stack">
      ${intro("平台設定與資料治理", "將告警門檻、資料來源與計算參數集中管理，避免介面顯示與實際硬體能力不一致。", `<button class="btn btn-primary" data-action="save-settings">儲存設定</button>`)}
      <div class="settings-layout">
        <section class="panel"><div class="panel-header"><div><h3 class="panel-title">營運與告警設定</h3><p class="panel-subtitle">以下為示範設定；正式版需由工程與維運人員確認。</p></div></div><div class="panel-body">
          <div class="settings-section"><h3>組織與計算參數</h3><p>用於收益及 ESG 報表，需保留版本與生效日期。</p>
            <div class="form-grid">
              <div class="field"><label>組織名稱</label><input id="setting-org-name" value="${esc(org.name)}" /></div>
              <div class="field"><label>幣別</label><select id="setting-currency"><option value="TWD" selected>TWD</option><option value="USD">USD</option><option value="MYR">MYR</option></select></div>
              <div class="field"><label>電價／售電費率（每 kWh）</label><input id="setting-tariff" type="number" step="0.01" value="${org.tariff}" /></div>
              <div class="field"><label>電網排放係數（kgCO₂e/kWh）</label><input id="setting-emission" type="number" step="0.001" value="${org.emissionFactor}" /></div>
            </div>
          </div>
          <div class="settings-section"><h3>電流異常門檻</h3><p>建議門檻搭配持續時間，避免瞬時波動造成大量誤報。</p>
            <div class="form-grid">
              <div class="field"><label>三相不平衡警告（%）</label><input type="number" value="10" /></div>
              <div class="field"><label>三相不平衡嚴重（%）</label><input type="number" value="15" /></div>
              <div class="field"><label>低電流相對偏差（%）</label><input type="number" value="15" /></div>
              <div class="field"><label>告警持續時間（分鐘）</label><input type="number" value="15" /></div>
              <div class="field"><label>裝置離線門檻（分鐘）</label><input type="number" value="20" /></div>
              <div class="field"><label>資料固定值判斷（分鐘）</label><input type="number" value="60" /></div>
            </div>
          </div>
          <div class="settings-section"><h3>通知與工作流</h3><p>通知管道需依正式後端與帳號權限設定。</p>
            <div class="toggle-row"><div><strong>嚴重告警立即通知</strong><small>發送 Email、LINE 或 Webhook。</small></div><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
            <div class="toggle-row"><div><strong>未確認告警升級</strong><small>超過 30 分鐘仍未確認時通知主管。</small></div><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
            <div class="toggle-row"><div><strong>每日營運摘要</strong><small>每日 18:00 產生發電與異常摘要。</small></div><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
          </div>
        </div></section>

        <section class="panel"><div class="panel-header"><div><h3 class="panel-title">資料來源與系統模式</h3><p class="panel-subtitle">清楚區分直接量測、平台計算與外部整合資料。</p></div></div><div class="panel-body">
          <div class="data-source-list">
            <div class="data-source-row"><div><strong>L1／L2／L3 電流</strong><small>S09-CT 4–20 mA CT 通道。</small></div>${sourceBadge("measured")}</div>
            <div class="data-source-row"><div><strong>電流不平衡率</strong><small>三相電流與平均值計算。</small></div>${sourceBadge("calculated")}</div>
            <div class="data-source-row"><div><strong>電壓、功率、發電量</strong><small>逆變器、智慧電表或 API。</small></div>${sourceBadge("external")}</div>
            <div class="data-source-row"><div><strong>PR 與預期發電</strong><small>日照、容量、溫度與模型。</small></div>${sourceBadge("calculated")}</div>
          </div>
          <div class="settings-section" style="margin-top:12px"><h3>執行模式</h3><p>此交付版本預設使用模擬資料，可直接上傳 Vercel。</p>
            <div class="field"><label>模式</label><select id="setting-mode"><option value="mock" ${CONFIG.mode!=="api"?"selected":""}>Mock 展示資料</option><option value="api" ${CONFIG.mode==="api"?"selected":""}>API 正式串接</option></select></div>
            <div class="field" style="margin-top:10px"><label>API Base URL</label><input id="setting-api-url" value="${esc(CONFIG.apiBaseUrl||"")}" placeholder="https://api.example.com/s09ct" /></div>
          </div>
          <div class="settings-section"><h3>權限建議</h3><p>正式版建議至少區分以下角色。</p>
            <div class="toggle-row"><div><strong>System Admin</strong><small>全部設定、帳號、場站與設備。</small></div><span class="source-badge source-external">完整權限</span></div>
            <div class="toggle-row"><div><strong>O&M Manager</strong><small>告警指派、結案與報表。</small></div><span class="source-badge source-calculated">管理權限</span></div>
            <div class="toggle-row"><div><strong>Viewer</strong><small>僅查看儀表板與報表。</small></div><span class="source-badge source-measured">唯讀</span></div>
          </div>
        </div></section>
      </div>
    </div>`;
  }

  function bindRouteEvents() {
    $$('[data-action="refresh"]').forEach(btn => btn.addEventListener("click", refreshData));
    $$('[data-action="go-alerts"]').forEach(btn => btn.addEventListener("click", () => location.hash = "#/alerts"));
    $$('[data-action="go-sites"]').forEach(btn => btn.addEventListener("click", () => location.hash = "#/sites"));
    $$('[data-alert-id]').forEach(el => el.addEventListener("click", () => openAlertModal(el.dataset.alertId)));
    $$('[data-action="open-alert"]').forEach(btn => btn.addEventListener("click", () => openAlertModal(btn.dataset.alertId)));
    $$('[data-action="device-detail"]').forEach(btn => btn.addEventListener("click", () => openDeviceModal(btn.dataset.deviceId)));
    $$('[data-site-id]').forEach(el => el.addEventListener("click", e => {
      if (e.target.closest("button")) return;
      const site = siteById(el.dataset.siteId);
      if (site) openSiteModal(site.id);
    }));

    const deviceSelect = $("#current-device-select");
    if (deviceSelect) deviceSelect.addEventListener("change", e => { state.selectedDeviceId = e.target.value; renderRoute(); });

    const sev = $("#alert-severity-filter");
    const sta = $("#alert-status-filter");
    const query = $("#alert-query");
    if (sev) { sev.value = state.alertFilter.severity; sev.addEventListener("change", e => { state.alertFilter.severity=e.target.value; renderRoute(); }); }
    if (sta) { sta.value = state.alertFilter.status; sta.addEventListener("change", e => { state.alertFilter.status=e.target.value; renderRoute(); }); }
    if (query) query.addEventListener("input", debounce(e => { state.alertFilter.query=e.target.value; renderRoute(); }, 250));

    $$('[data-action="export-dashboard"]').forEach(b => b.addEventListener("click", exportDashboard));
    $$('[data-action="export-sites"]').forEach(b => b.addEventListener("click", exportSites));
    $$('[data-action="export-generation"]').forEach(b => b.addEventListener("click", exportGeneration));
    $$('[data-action="export-current"]').forEach(b => b.addEventListener("click", exportCurrent));
    $$('[data-action="export-alerts"]').forEach(b => b.addEventListener("click", exportAlerts));
    $$('[data-action="export-devices"]').forEach(b => b.addEventListener("click", exportDevices));
    $$('[data-action="generate-report"], [data-action="generate-monthly"]').forEach(b => b.addEventListener("click", exportMonthlyReport));
    $$('[data-action="save-settings"]').forEach(b => b.addEventListener("click", saveSettings));
    $$('[data-action="ack-all"]').forEach(b => b.addEventListener("click", acknowledgeAll));
    $$('[data-action="add-site"]').forEach(b => b.addEventListener("click", () => showToast("展示版本", "新增場站功能需串接正式後端與帳號權限。")));
    $$('[data-action="add-device"]').forEach(b => b.addEventListener("click", () => showToast("展示版本", "新增裝置需由工程端定義註冊流程、IMEI 與 Payload。")));
  }

  function initRouteVisuals() {
    chartDefaults();
    if (state.route === "dashboard") {
      makePowerChart("dashboard-power-chart");
      makeMap("dashboard-map", currentSites());
    }
    if (state.route === "sites") makeMap("sites-map", currentSites());
    if (state.route === "generation") {
      makePowerChart("generation-power-chart");
      makeWeekChart("generation-week-chart");
    }
    if (state.route === "current") makeCurrentChart("current-trend-chart");
    if (state.route === "reports") makeMonthlyChart("reports-generation-chart");
  }

  function makePowerChart(id) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    const d = state.data.dashboardSeries;
    const chart = new Chart(el, {
      type: "line",
      data: { labels: d.labels, datasets: [
        { label:"實際功率 kW", data:d.actual, borderColor:"#f6c445", backgroundColor:"rgba(246,196,69,.12)", fill:true, tension:.35, pointRadius:0, borderWidth:2 },
        { label:"預期功率 kW", data:d.expected, borderColor:"#3ed7e6", borderDash:[6,5], tension:.35, pointRadius:0, borderWidth:1.5 },
        { label:"日照 W/m²", data:d.irradiance, borderColor:"#64a7ff", yAxisID:"y1", tension:.35, pointRadius:0, borderWidth:1.2 }
      ]},
      options: baseChartOptions({ yTitle:"Power (kW)", y1Title:"Irradiance (W/m²)" })
    });
    state.charts.push(chart);
  }

  function makeWeekChart(id) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    const d = state.data.dailyGeneration;
    const chart = new Chart(el, {
      type:"bar",
      data:{ labels:d.labels, datasets:[
        {label:"實際 MWh",data:d.actual,backgroundColor:"rgba(246,196,69,.78)",borderRadius:5},
        {label:"預期 MWh",data:d.expected,backgroundColor:"rgba(62,215,230,.32)",borderColor:"#3ed7e6",borderWidth:1,borderRadius:5}
      ]},
      options: baseChartOptions({ yTitle:"Energy (MWh)", noY1:true })
    });
    state.charts.push(chart);
  }

  function makeCurrentChart(id) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    const d = state.data.currentSeries;
    const chart = new Chart(el, {
      type:"line",
      data:{labels:d.labels,datasets:[
        {label:"L1",data:d.L1,borderColor:"#3ed7e6",backgroundColor:"rgba(62,215,230,.08)",tension:.25,pointRadius:2,borderWidth:2},
        {label:"L2",data:d.L2,borderColor:"#f6c445",backgroundColor:"rgba(246,196,69,.08)",tension:.25,pointRadius:2,borderWidth:2},
        {label:"L3",data:d.L3,borderColor:"#ff667a",backgroundColor:"rgba(255,102,122,.08)",tension:.25,pointRadius:2,borderWidth:2}
      ]},
      options: baseChartOptions({ yTitle:"Current (A)", noY1:true, suggestedMin:10, suggestedMax:22 })
    });
    state.charts.push(chart);
  }

  function makeMonthlyChart(id) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    const labels = Array.from({length:24},(_,i)=>`${i+1}`);
    const actual = [18,21,24,23,25,26,20,22,27,28,26,25,24,29,30,28,26,25,27,23,22,29,27,20];
    const expected = actual.map((v,i)=>Math.round(v*(1.04+(i%4)*.01)));
    const chart = new Chart(el,{type:"bar",data:{labels,datasets:[
      {label:"實際 MWh",data:actual,backgroundColor:"rgba(246,196,69,.72)",borderRadius:4},
      {label:"預期 MWh",data:expected,type:"line",borderColor:"#3ed7e6",pointRadius:1.5,tension:.28,borderWidth:1.8}
    ]},options:baseChartOptions({yTitle:"Energy (MWh)",noY1:true})});
    state.charts.push(chart);
  }

  function baseChartOptions({ yTitle, y1Title, noY1=false, suggestedMin, suggestedMax }={}) {
    const scales = {
      x: { grid:{ color:"rgba(151,177,210,.06)" }, ticks:{ maxRotation:0, autoSkip:true, maxTicksLimit:10 } },
      y: { beginAtZero: suggestedMin == null, suggestedMin, suggestedMax, grid:{ color:"rgba(151,177,210,.09)" }, title:{display:!!yTitle,text:yTitle,color:"#6e849f",font:{size:9}} }
    };
    if (!noY1) scales.y1 = { position:"right", beginAtZero:true, grid:{drawOnChartArea:false}, title:{display:!!y1Title,text:y1Title,color:"#6e849f",font:{size:9}} };
    return {
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:"index",intersect:false},
      plugins:{
        legend:{position:"top",align:"end",labels:{boxWidth:9,boxHeight:9,usePointStyle:true,padding:15}},
        tooltip:{backgroundColor:"#11263f",borderColor:"rgba(151,177,210,.22)",borderWidth:1,titleColor:"#fff",bodyColor:"#c6d7e8",padding:10}
      },
      scales
    };
  }

  function makeMap(id, sites) {
    const el = document.getElementById(id);
    if (!el || !window.L) return;
    const map = L.map(el, { zoomControl:true, attributionControl:true }).setView([23.63,120.62], 7);
    L.tileLayer(CONFIG.mapTileUrl || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: CONFIG.mapAttribution || "&copy; OpenStreetMap contributors",
      maxZoom: 18
    }).addTo(map);
    sites.forEach(s => {
      const icon = L.divIcon({ className:"", html:`<div class="site-marker ${s.status}"></div>`, iconSize:[18,18], iconAnchor:[9,9] });
      L.marker([s.lat,s.lng],{icon}).addTo(map).bindPopup(`<strong>${esc(s.name)}</strong><br>${fmtInt(s.currentPower)} kW · ${fmt(s.todayEnergy,2)} MWh<br>告警 ${s.openAlerts} 件 · ${statusText[s.status]}`);
    });
    if (sites.length === 1) map.setView([sites[0].lat, sites[0].lng], 11);
    state.map = map;
    setTimeout(() => map.invalidateSize(), 80);
  }

  function openAlertModal(id) {
    const a = state.data.alerts.find(x => x.id === id);
    if (!a) return;
    openModal(`
      <div class="modal-header"><div><h2>${esc(a.type)}</h2><p>${esc(a.id)} · ${esc(a.occurredAt)}</p></div><button class="modal-close" data-modal-close>×</button></div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${badge(a.severity,a.severity==="critical"?"嚴重":a.severity==="warning"?"警告":"資訊")}${badge(a.status)}</div>
        <div class="detail-grid">
          <div class="detail-item"><small>場站</small><strong>${esc(a.site)}</strong></div>
          <div class="detail-item"><small>裝置／通道</small><strong>${esc(a.device)} · ${esc(a.channel)}</strong></div>
          <div class="detail-item"><small>目前值</small><strong>${esc(a.value)}</strong></div>
          <div class="detail-item"><small>基準／門檻</small><strong>${esc(a.baseline)}</strong></div>
          <div class="detail-item"><small>持續時間</small><strong>${esc(a.duration)}</strong></div>
          <div class="detail-item"><small>預估發電損失</small><strong class="trend-down">${fmt(a.loss,1)} kWh</strong></div>
          <div class="detail-item"><small>負責人</small><strong>${esc(a.assignee)}</strong></div>
          <div class="detail-item"><small>目前狀態</small><strong>${statusText[a.status]}</strong></div>
        </div>
        <div class="settings-section" style="margin-top:14px"><h3>異常說明</h3><p style="margin-bottom:0">${esc(a.description)}</p></div>
        <div class="form-grid" style="margin-top:14px">
          <div class="field"><label>處理狀態</label><select id="modal-alert-status"><option value="new">待確認</option><option value="acknowledged">已確認</option><option value="assigned">已指派</option><option value="in_progress">處理中</option><option value="closed">已結案</option></select></div>
          <div class="field"><label>負責人</label><select id="modal-alert-assignee"><option>未指派</option><option>林維運</option><option>陳工程師</option><option>王技師</option><option>Omar</option></select></div>
          <div class="field" style="grid-column:1/-1"><label>處理紀錄</label><textarea id="modal-alert-note" placeholder="輸入檢查結果、處置內容或結案原因"></textarea></div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn" data-modal-close>取消</button><button class="btn btn-primary" id="save-alert-workflow">儲存處理進度</button></div>
    `);
    $("#modal-alert-status").value = a.status;
    $("#modal-alert-assignee").value = ["未指派","林維運","陳工程師","王技師","Omar"].includes(a.assignee) ? a.assignee : "未指派";
    $("#save-alert-workflow").addEventListener("click", () => {
      a.status = $("#modal-alert-status").value;
      a.assignee = $("#modal-alert-assignee").value;
      closeModal();
      updateAlertCounts();
      renderRoute();
      showToast("告警處理進度已更新", `${a.id} 已變更為「${statusText[a.status]}」。`, "success");
    });
  }

  function openDeviceModal(id) {
    const d = state.data.devices.find(x => x.id === id);
    if (!d) return;
    openModal(`
      <div class="modal-header"><div><h2>${esc(d.id)}</h2><p>${esc(d.site)} · ${esc(d.location)}</p></div><button class="modal-close" data-modal-close>×</button></div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${badge(d.status)}${sourceBadge("measured")}</div>
        <div class="detail-grid">
          <div class="detail-item"><small>監測模式</small><strong>${esc(d.mode)}</strong></div>
          <div class="detail-item"><small>電源</small><strong>${esc(d.power)}</strong></div>
          <div class="detail-item"><small>網路／電信商</small><strong>${esc(d.network)} / ${esc(d.operator)}</strong></div>
          <div class="detail-item"><small>RSSI / RSRP</small><strong>${d.signal} / ${d.rsrp} dBm</strong></div>
          <div class="detail-item"><small>韌體版本</small><strong>${esc(d.firmware)}</strong></div>
          <div class="detail-item"><small>資料完整率</small><strong>${fmt(d.completeness,1)}%</strong></div>
          <div class="detail-item"><small>最後回報</small><strong>${esc(d.lastReport)}</strong></div>
          <div class="detail-item"><small>CT 通道</small><strong>L1 ${fmt(d.channels[0],1)} A / L2 ${fmt(d.channels[1],1)} A / L3 ${fmt(d.channels[2],1)} A</strong></div>
        </div>
        <div class="settings-section" style="margin-top:14px"><h3>診斷建議</h3><p style="margin-bottom:0">${d.status === "offline" ? "優先確認裝置供電、SIM 狀態與行動網路覆蓋；若現場正常，再確認 APN 與後端接收服務。" : d.status === "critical" ? "CT 通道數值偏差明顯，建議確認 CT 方向、接線、量程及被測導線狀況。" : "目前裝置通訊與資料品質在可接受範圍。"}</p></div>
      </div>
      <div class="modal-footer"><button class="btn" data-modal-close>關閉</button><button class="btn btn-primary" data-modal-close data-action="go-current-from-modal">查看電流監控</button></div>
    `);
    const jump = $('[data-action="go-current-from-modal"]');
    if (jump) jump.addEventListener("click", () => { state.selectedDeviceId = d.id; location.hash = "#/current"; });
  }

  function openSiteModal(id) {
    const s = siteById(id);
    if (!s) return;
    const target = s.todayEnergy/s.expectedEnergy*100;
    const devices = state.data.devices.filter(d=>d.siteId===id);
    openModal(`
      <div class="modal-header"><div><h2>${esc(s.name)}</h2><p>${s.id} · ${esc(s.region)} · ${fmt(s.capacity/1000,2)} MWp</p></div><button class="modal-close" data-modal-close>×</button></div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${badge(s.status)}${sourceBadge("external")}</div>
        <div class="detail-grid">
          <div class="detail-item"><small>即時功率</small><strong>${fmtInt(s.currentPower)} kW</strong></div>
          <div class="detail-item"><small>今日發電量</small><strong>${fmt(s.todayEnergy,2)} MWh</strong></div>
          <div class="detail-item"><small>今日達成率</small><strong>${fmt(target,1)}%</strong></div>
          <div class="detail-item"><small>PR</small><strong>${fmt(s.pr,1)}%</strong></div>
          <div class="detail-item"><small>裝置</small><strong>${s.onlineDevices}/${s.totalDevices} 在線</strong></div>
          <div class="detail-item"><small>開放告警</small><strong>${s.openAlerts} 件</strong></div>
        </div>
        <div class="settings-section" style="margin-top:14px"><h3>S09-CT 裝置</h3><p>${devices.length ? devices.map(d=>`${esc(d.id)} · ${esc(d.location)} · ${statusText[d.status]}`).join("<br>") : "目前沒有示範裝置資料。"}</p></div>
      </div>
      <div class="modal-footer"><button class="btn" data-modal-close>關閉</button><button class="btn btn-primary" data-modal-close id="site-filter-button">僅查看此場站</button></div>
    `);
    $("#site-filter-button").addEventListener("click", () => setSiteFilter(id, false));
  }

  function openModal(html) {
    const root = $("#modal-root");
    root.className = "modal-root active";
    root.innerHTML = `<div class="modal">${html}</div>`;
    $$('[data-modal-close]', root).forEach(btn => btn.addEventListener("click", closeModal));
    root.onclick = e => { if (e.target === root) closeModal(); };
  }
  function closeModal() {
    const root = $("#modal-root");
    root.className = "modal-root";
    root.innerHTML = "";
  }

  function showToast(title, message, type="success") {
    const container = $("#toast-container");
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.innerHTML = `<span>${type === "error" ? "!" : "✓"}</span><div><strong>${esc(title)}</strong><small>${esc(message)}</small></div>`;
    container.appendChild(node);
    setTimeout(() => node.remove(), 3600);
  }

  function updateAlertCounts() {
    const count = state.data.alerts.filter(a => a.status !== "closed").length;
    const navCount = $("#nav-alert-count");
    if (navCount) navCount.textContent = count;
    const mobileCount = $("#mobile-alert-count");
    if (mobileCount) mobileCount.textContent = count;
    const bell = $("#notification-btn b");
    if (bell) bell.textContent = count;
  }

  function refreshData() {
    const jitter = () => (Math.random()-.5)*8;
    state.data.sites.forEach(s => {
      if (s.status !== "critical") s.currentPower = Math.max(0, Math.round(s.currentPower + jitter()));
    });
    state.data.generatedAt = new Date().toISOString();
    $("#side-last-sync").textContent = "剛剛";
    const mobileSync = $("#mobile-last-sync");
    if (mobileSync) mobileSync.textContent = "剛剛更新";
    renderRoute();
    showToast("資料已更新", "已重新整理場站、裝置與告警資料。", "success");
  }

  function scheduleRefresh() {
    clearInterval(state.refreshTimer);
    const seconds = Number(CONFIG.refreshSeconds || 30);
    state.refreshTimer = setInterval(() => {
      $("#side-last-sync").textContent = "剛剛";
      const mobileSync = $("#mobile-last-sync");
      if (mobileSync) mobileSync.textContent = "即時資料";
    }, Math.max(10, seconds) * 1000);
  }

  function acknowledgeAll() {
    let changed = 0;
    currentAlerts().forEach(a => { if (a.status === "new") { a.status = "acknowledged"; changed++; } });
    renderRoute();
    showToast("新告警已確認", changed ? `共更新 ${changed} 筆告警。` : "目前沒有待確認的新告警。", "success");
  }

  function saveSettings() {
    const orgName = $("#setting-org-name")?.value.trim();
    const tariff = Number($("#setting-tariff")?.value);
    const emission = Number($("#setting-emission")?.value);
    if (orgName) state.data.organization.name = orgName;
    if (Number.isFinite(tariff)) state.data.organization.tariff = tariff;
    if (Number.isFinite(emission)) state.data.organization.emissionFactor = emission;
    showToast("設定已儲存於本次展示階段", "重新載入頁面後會恢復 data.js 預設值；正式版需寫入後端資料庫。", "success");
  }

  function toCSV(rows) {
    return rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  }
  function downloadCSV(filename, rows) {
    const blob = new Blob(["\uFEFF" + toCSV(rows)], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast("CSV 已產生", filename, "success");
  }
  function exportDashboard() {
    const s = filteredSummary();
    downloadCSV("S09-CT_營運摘要.csv", [["指標","數值","單位","資料來源"],["即時總功率",s.power,"kW","外部資料"],["今日發電量",s.today,"MWh","外部資料"],["預期發電量",s.expected,"MWh","平台模型"],["目標達成率",s.target,"%","平台計算"],["預估損失",s.loss,"MWh","平台計算"],["開放告警",openAlerts().length,"件","平台告警"]]);
  }
  function exportSites() { downloadCSV("S09-CT_場站清單.csv", [["場站ID","場站名稱","地區","容量kWp","即時功率kW","今日發電MWh","預期發電MWh","PR%","可用率%","告警數","狀態"],...currentSites().map(s=>[s.id,s.name,s.region,s.capacity,s.currentPower,s.todayEnergy,s.expectedEnergy,s.pr,s.availability,s.openAlerts,statusText[s.status]])]); }
  function exportGeneration() { downloadCSV("S09-CT_發電趨勢.csv", [["日期","實際發電MWh","預期發電MWh"],...state.data.dailyGeneration.labels.map((x,i)=>[x,state.data.dailyGeneration.actual[i],state.data.dailyGeneration.expected[i]])]); }
  function exportCurrent() {
    const d = state.data.devices.find(x=>x.id===state.selectedDeviceId) || currentDevices()[0];
    downloadCSV(`S09-CT_${d.id}_電流資料.csv`, [["時間","L1(A)","L2(A)","L3(A)"],...state.data.currentSeries.labels.map((x,i)=>[x,state.data.currentSeries.L1[i],state.data.currentSeries.L2[i],state.data.currentSeries.L3[i]])]);
  }
  function exportAlerts() { downloadCSV("S09-CT_告警清單.csv", [["告警ID","嚴重度","場站","裝置","通道","類型","目前值","基準","持續時間","預估損失kWh","狀態","負責人","發生時間"],...currentAlerts().map(a=>[a.id,statusText[a.severity],a.site,a.device,a.channel,a.type,a.value,a.baseline,a.duration,a.loss,statusText[a.status],a.assignee,a.occurredAt])]); }
  function exportDevices() { downloadCSV("S09-CT_裝置清單.csv", [["Device ID","場站","安裝位置","模式","網路","電信商","RSSI","RSRP","韌體","電源","資料完整率","最後回報","狀態"],...currentDevices().map(d=>[d.id,d.site,d.location,d.mode,d.network,d.operator,d.signal,d.rsrp,d.firmware,d.power,d.completeness,d.lastReport,statusText[d.status]])]); }
  function exportMonthlyReport() {
    const org=state.data.organization;
    const monthEnergy=548.6;
    downloadCSV("S09-CT_2026-06_營運與ESG報表.csv", [["S09-CT 太陽能營運與 ESG 報表"],["組織",org.name],["期間","2026/06/01-2026/06/24"],[],["指標","數值","單位","計算依據"],["本月發電量",monthEnergy,"MWh","逆變器／智慧電表"],["估計收益",monthEnergy*1000*org.tariff,org.currency,`發電量 × ${org.tariff}/kWh`],["碳減量",monthEnergy*org.emissionFactor,"tCO2e",`發電量 × ${org.emissionFactor} kgCO2e/kWh`],["場站可用率",97.6,"%","平台事件時間計算"],["MTTA",12,"min","告警發生至確認"],["MTTR",1.8,"hr","告警發生至恢復"]]);
  }

  function debounce(fn, wait=200) {
    let t; return (...args) => { clearTimeout(t); t=setTimeout(()=>fn(...args),wait); };
  }

  async function bootstrap() {
    let apiError = null;
    if (CONFIG.mode === "api" && CONFIG.apiBaseUrl) {
      try {
        const endpoint = `${String(CONFIG.apiBaseUrl).replace(/\/$/, "")}/snapshot`;
        const response = await fetch(endpoint, { headers: { "Accept": "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!payload || !Array.isArray(payload.sites) || !Array.isArray(payload.devices)) {
          throw new Error("API payload structure is invalid");
        }
        state.data = payload;
      } catch (error) {
        apiError = error;
        state.data = JSON.parse(JSON.stringify(SOURCE_DATA));
      }
    }
    setupShell();
    if (apiError) showToast("API 連線失敗，已切換展示資料", apiError.message || "無法取得資料。", "error");
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
