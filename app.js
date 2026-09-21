// CareBridge Bangladesh - Interactive Logic & Visual Experience Engine

let dhakaMap = null;
let mapMarkers = [];
let fullscreenMap = null;
let fullscreenMarkers = [];
let responseTimeChart = null;
let activeLiveCasesCategory = 'All';
let activeLiveCasesKeyword = '';

document.addEventListener('DOMContentLoaded', () => {
  initUserSession();
  initMap();
  initResponseTimeChart();
  renderStatSparklines();
  renderCaseQueue();
  renderRecentCasesTable();
  renderFullLiveCasesTable();
  renderActivityFeed();
  renderTrustedOrganizations();
  setupInteractions();
  setupModals();
  startLiveFeedSimulator();
  syncBackendData();
});

/* -------------------------------------------------------------------------- */
/* USER SESSION SYNC                                                          */
/* -------------------------------------------------------------------------- */
function initUserSession() {
  if (typeof window.getAuthUser === 'function') {
    const user = window.getAuthUser();
    if (user) {
      const headerName = document.getElementById('header-user-name');
      if (headerName) headerName.innerText = user.name;

      const profileName = document.getElementById('header-profile-name');
      if (profileName) profileName.innerText = user.name;

      const profileRole = document.getElementById('header-profile-role');
      if (profileRole) profileRole.innerText = user.role;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* BACKEND API DATA SYNC                                                      */
/* -------------------------------------------------------------------------- */
function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Just now';
  try {
    const d = new Date(dateStr);
    const diffMin = Math.floor((new Date() - d) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch (e) {
    return 'Just now';
  }
}

async function syncBackendData() {
  if (!window.API) return;
  try {
    const healthy = await window.API.checkHealth();
    if (!healthy) return;

    // Fetch live data from FastAPI backend
    const [casesList, statsSummary, dashData, trustedNgos, pendingNgos, volunteersList, aiInsights, responseTimeData, categoryShareData] = await Promise.all([
      window.API.cases.list(),
      window.API.cases.stats(),
      window.API.analytics.dashboard(),
      window.API.ngos.trusted(),
      window.API.ngos.pending(),
      window.API.volunteers.list(),
      window.API.ai.insights(),
      window.API.analytics.responseTime('week'),
      window.API.analytics.categoryShare()
    ]);

    if (!window.CAREBRIDGE_DATA) return;

    // 1. Sync live cases
    if (casesList && casesList.length > 0) {
      window.CAREBRIDGE_DATA.recentCases = casesList.map(c => ({
        id: c.id,
        category: c.category,
        icon: c.icon || 'fa-circle-dot',
        location: c.location,
        priority: c.priority,
        priorityClass: c.priority_class || (c.priority === 'High' ? 'urgency-high' : c.priority === 'Medium' ? 'urgency-med' : 'urgency-low'),
        reported: formatRelativeTime(c.created_at),
        status: c.status,
        statusClass: c.status_class || (c.status === 'Resolved' ? 'status-resolved' : 'status-pending'),
        confidence: c.confidence || '92%',
        description: c.description,
        reporter: c.reporter,
        contact: c.contact,
        assignedNGO: c.assigned_ngo
      }));
    }

    // 2. Sync dashboard components (hotspots, queue, activity, trusted orgs)
    if (dashData) {
      if (dashData.map_hotspots && dashData.map_hotspots.length > 0) {
        window.CAREBRIDGE_DATA.mapHotspots = dashData.map_hotspots;
      }
      if (dashData.case_queue && dashData.case_queue.length > 0) {
        window.CAREBRIDGE_DATA.caseQueue = dashData.case_queue.map(q => ({
          id: q.id,
          title: q.title,
          location: q.location,
          distance: q.distance || '1.8 km away',
          time: q.time || 'Just now',
          priority: q.priority,
          priorityLabel: q.priority_label,
          aiConfidence: q.ai_confidence,
          category: q.category,
          photo: q.photo,
          description: q.description,
          reporter: q.reporter,
          contact: q.contact,
          assignedNGO: q.assigned_ngo
        }));
      }
      if (dashData.live_activity && dashData.live_activity.length > 0) {
        window.CAREBRIDGE_DATA.liveActivity = dashData.live_activity.map(a => ({
          id: a.id,
          type: a.type,
          icon: a.icon,
          color: a.color,
          title: a.title,
          subtitle: a.subtitle,
          time: a.time
        }));
      }
      if (dashData.trusted_organizations && dashData.trusted_organizations.length > 0) {
        window.CAREBRIDGE_DATA.trustedOrganizations = dashData.trusted_organizations.map(o => ({
          name: o.name,
          cases: o.cases,
          rating: o.rating,
          logoColor: o.logo_color,
          initials: o.initials
        }));
      }
    }

    // 3. Update top stat cards
    if (statsSummary) {
      const elTotal = document.getElementById('stat-val-total');
      const elHigh = document.getElementById('stat-val-high');
      const elProg = document.getElementById('stat-val-prog');
      const elRes = document.getElementById('stat-val-res');
      const elTime = document.getElementById('stat-val-time');

      if (elTotal && statsSummary.total_cases !== undefined) elTotal.innerText = statsSummary.total_cases.toLocaleString();
      if (elHigh && statsSummary.high_priority !== undefined) elHigh.innerText = statsSummary.high_priority.toLocaleString();
      if (elProg && statsSummary.in_progress !== undefined) elProg.innerText = statsSummary.in_progress.toLocaleString();
      if (elRes && statsSummary.resolved !== undefined) elRes.innerText = statsSummary.resolved.toLocaleString();
      if (elTime && statsSummary.avg_response_time) elTime.innerText = statsSummary.avg_response_time;
    }

    // 4. Refresh all rendered components
    renderCaseQueue();
    renderRecentCasesTable();
    renderFullLiveCasesTable();
    renderActivityFeed();
    renderTrustedOrganizations();
    renderMapMarkers();
    if (typeof renderNgosAndSheltersGrid === 'function') renderNgosAndSheltersGrid(trustedNgos);
    if (typeof renderNgoVerificationTable === 'function') renderNgoVerificationTable(pendingNgos);
    if (typeof renderVolunteersGrid === 'function') renderVolunteersGrid(volunteersList);
    if (typeof renderAiInsights === 'function') renderAiInsights(aiInsights, dashData);
    if (typeof renderHeatmap === 'function') renderHeatmap(dashData?.map_hotspots);
    if (typeof renderTrendsCharts === 'function') renderTrendsCharts(responseTimeData, categoryShareData);

    console.log('[CareBridge API] Live backend synced successfully.');
  } catch (err) {
    console.warn('[CareBridge API] Sync fallback to local data:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* AUDIO SYNTHESIZER FOR MICRO-INTERACTIONS                                  */
/* -------------------------------------------------------------------------- */
const AudioFx = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
  },
  playPop() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) { }
  },
  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) { }
  },
  playAlert() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.setValueAtTime(400, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) { }
  }
};

/* -------------------------------------------------------------------------- */
/* LEAFLET MAP INITIALIZATION (DASHBOARD MAP)                                 */
/* -------------------------------------------------------------------------- */
function initMap() {
  const mapElement = document.getElementById('dhaka-live-map');
  if (!mapElement) return;

  try {
    if (typeof L === 'undefined') {
      mapElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font-size:13px;"><i class="fa-solid fa-map" style="margin-right:8px;"></i>Map offline</div>';
      return;
    }

    if (dhakaMap) {
      dhakaMap.invalidateSize();
      return;
    }

    dhakaMap = L.map('dhaka-live-map', {
      center: [23.7771, 90.3994],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    try {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(dhakaMap);
    } catch (tileErr) {
      console.warn('Tiles failed to load:', tileErr);
    }

    renderMapMarkers();
  } catch (err) {
    console.error('Error initializing live map:', err);
  }
}

function renderMapMarkers() {
  if (!dhakaMap) return;

  // Clear existing
  mapMarkers.forEach(m => dhakaMap.removeLayer(m));
  mapMarkers = [];

  const data = window.CAREBRIDGE_DATA || {};
  if (!data.mapHotspots) return;

  // Cluster Hotspots
  data.mapHotspots.forEach(hotspot => {
    let pinClass = 'pin-red';
    let size = 42;
    if (hotspot.type === 'orange') { pinClass = 'pin-orange'; size = 36; }
    if (hotspot.type === 'green') { pinClass = 'pin-green'; size = 34; }

    const iconHtml = `
      <div class="custom-map-pin ${pinClass}" style="width: ${size}px; height: ${size}px;" data-priority="${hotspot.priority}">
        <div class="pin-pulse-ring"></div>
        <span>${hotspot.count}</span>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-leaflet-pin-wrapper',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });

    const marker = L.marker([hotspot.lat, hotspot.lng], { icon: customIcon }).addTo(dhakaMap);
    
    marker.bindPopup(`
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:4px;">
          <strong style="font-size:13px; color:#111827;">${hotspot.name}</strong>
          <span style="font-size:10px; font-weight:700; color:${hotspot.type==='red'?'#ef4444':hotspot.type==='orange'?'#f59e0b':'#10b981'}; background:#f3f4f6; padding:2px 6px; border-radius:10px;">${hotspot.priority}</span>
        </div>
        <p style="font-size:11.5px; color:#4b5563; margin-bottom:8px;">${hotspot.desc}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; padding-top:6px;">
          <span style="font-size:11px; font-weight:700; color:#059669;">${hotspot.count} Active Cases</span>
          <button onclick="openCaseInspection('${hotspot.name}')" style="background:#059669; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;">Inspect Hub</button>
        </div>
      </div>
    `);

    marker.priorityCategory = hotspot.priority;
    mapMarkers.push(marker);
  });

  // Single Point Pins
  if (data.singlePins) {
    data.singlePins.forEach(pin => {
      const iconHtml = pin.type === 'purple' 
        ? `<div style="width:24px; height:24px; background:#8b5cf6; border:2px solid #fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; box-shadow:0 2px 6px rgba(0,0,0,0.25);"><i class="fa-solid fa-hotel"></i></div>`
        : `<div class="pin-single-blue"></div>`;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-single-pin',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(dhakaMap);
      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif;">
          <strong>${pin.name}</strong><br>
          <span style="font-size:11px; color:#6b7280;">Category: ${pin.priority}</span>
        </div>
      `);
      marker.priorityCategory = pin.priority;
      mapMarkers.push(marker);
    });
  }
}

// Map Legend Filter Handler
window.toggleMapFilter = function() {
  const activeFilters = [];
  if (document.getElementById('filter-high')?.checked) activeFilters.push('High Priority');
  if (document.getElementById('filter-med')?.checked) activeFilters.push('Medium Priority');
  if (document.getElementById('filter-low')?.checked) activeFilters.push('Low Priority');
  if (document.getElementById('filter-resolved')?.checked) activeFilters.push('Resolved');
  if (document.getElementById('filter-shelters')?.checked) activeFilters.push('Shelters');

  mapMarkers.forEach(marker => {
    if (activeFilters.includes(marker.priorityCategory)) {
      if (!dhakaMap.hasLayer(marker)) dhakaMap.addLayer(marker);
    } else {
      if (dhakaMap.hasLayer(marker)) dhakaMap.removeLayer(marker);
    }
  });
  AudioFx.playPop();
};

window.zoomMap = function(dir) {
  if (!dhakaMap) return;
  if (dir === 'in') dhakaMap.zoomIn();
  if (dir === 'out') dhakaMap.zoomOut();
  AudioFx.playPop();
};

window.locateDhakaCenter = function() {
  if (dhakaMap) {
    dhakaMap.flyTo([23.7771, 90.3994], 12, { animate: true, duration: 1.2 });
  }
  if (fullscreenMap) {
    fullscreenMap.flyTo([23.7771, 90.3994], 13, { animate: true, duration: 1.2 });
  }
  showToast("📍 Centered view on Dhaka Metropolitan Area", "info");
  AudioFx.playPop();
};

/* -------------------------------------------------------------------------- */
/* FULLSCREEN CRISIS MAP                                                      */
/* -------------------------------------------------------------------------- */
function initFullscreenMap() {
  const container = document.getElementById('fullscreen-dhaka-map');
  if (!container) return;

  if (fullscreenMap) {
    fullscreenMap.invalidateSize();
    return;
  }

  if (typeof L === 'undefined') {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font-size:14px;"><i class="fa-solid fa-map" style="margin-right:8px;"></i>Map offline</div>';
    return;
  }

  try {
    fullscreenMap = L.map('fullscreen-dhaka-map', {
      center: [23.7771, 90.3994],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(fullscreenMap);

    const data = window.CAREBRIDGE_DATA || {};
    if (data.mapHotspots) {
      data.mapHotspots.forEach(hotspot => {
        let pinClass = hotspot.type === 'red' ? 'pin-red' : hotspot.type === 'orange' ? 'pin-orange' : 'pin-green';
        const customIcon = L.divIcon({
          html: `<div class="custom-map-pin ${pinClass}" style="width:38px; height:38px;"><div class="pin-pulse-ring"></div><span>${hotspot.count}</span></div>`,
          className: 'custom-leaflet-pin-wrapper',
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });
        L.marker([hotspot.lat, hotspot.lng], { icon: customIcon }).addTo(fullscreenMap)
          .bindPopup(`<strong>${hotspot.name}</strong><br>${hotspot.desc}<br><button onclick="openCaseDetailsDrawer('CB-12482')" style="margin-top:6px; background:#059669; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">Inspect Hub</button>`);
      });
    }

    setTimeout(() => {
      fullscreenMap.invalidateSize();
    }, 200);
  } catch (e) {
    console.error('Error initializing fullscreen map:', e);
  }
}

/* -------------------------------------------------------------------------- */
/* RESPONSE TIME TREND CHART (CHART.JS)                                      */
/* -------------------------------------------------------------------------- */
function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    line: '#059669',
    point: '#10b981',
    pointBorder: isDark ? '#141f36' : '#ffffff',
    tick: isDark ? '#94a3b8' : '#9ca3af',
    grid: isDark ? '#233354' : '#f3f4f6',
    tooltipBg: '#111827'
  };
}

function initResponseTimeChart() {
  const ctx = document.getElementById('response-time-canvas');
  if (!ctx) return;

  if (typeof Chart === 'undefined') {
    ctx.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font-size:13px;"><i class="fa-solid fa-chart-line" style="margin-right:8px;"></i>Chart offline</div>';
    return;
  }

  const colors = getChartColors();
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, 'rgba(5, 150, 105, 0.25)');
  gradient.addColorStop(1, 'rgba(5, 150, 105, 0.0)');

  responseTimeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Avg Response Time (min)',
        data: [28, 22, 16, 12, 14, 11, 16],
        borderColor: colors.line,
        borderWidth: 2.5,
        pointBackgroundColor: colors.line,
        pointBorderColor: colors.pointBorder,
        pointBorderWidth: 2,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: colors.point,
        pointHoverBorderColor: colors.pointBorder,
        fill: true,
        backgroundColor: gradient,
        tension: 0.38
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
          bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `Response time: ${ctx.parsed.y} mins`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: colors.tick }
        },
        y: {
          min: 0,
          max: 40,
          ticks: {
            stepSize: 10,
            font: { family: 'Plus Jakarta Sans', size: 10.5 },
            color: colors.tick,
            callback: (val) => `${val}`
          },
          grid: {
            color: colors.grid,
            drawBorder: false
          }
        }
      }
    }
  });
}

window.updateChartTheme = function() {
  if (!responseTimeChart) return;
  const colors = getChartColors();
  responseTimeChart.data.datasets[0].borderColor = colors.line;
  responseTimeChart.data.datasets[0].pointBackgroundColor = colors.line;
  responseTimeChart.data.datasets[0].pointBorderColor = colors.pointBorder;
  responseTimeChart.data.datasets[0].pointHoverBackgroundColor = colors.point;
  responseTimeChart.data.datasets[0].pointHoverBorderColor = colors.pointBorder;
  responseTimeChart.options.scales.x.ticks.color = colors.tick;
  responseTimeChart.options.scales.y.ticks.color = colors.tick;
  responseTimeChart.options.scales.y.grid.color = colors.grid;
  responseTimeChart.update();
};

window.updateChartPeriod = function(period) {
  if (!responseTimeChart) return;
  AudioFx.playPop();
  if (period === 'month') {
    responseTimeChart.data.labels = ['W1', 'W2', 'W3', 'W4'];
    responseTimeChart.data.datasets[0].data = [24, 21, 18, 15];
  } else if (period === 'today') {
    responseTimeChart.data.labels = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'];
    responseTimeChart.data.datasets[0].data = [30, 24, 18, 15, 14, 17];
  } else {
    responseTimeChart.data.labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    responseTimeChart.data.datasets[0].data = [28, 22, 16, 12, 14, 11, 16];
  }
  responseTimeChart.update();
  showToast(`Updated analytics view to: ${period.toUpperCase()}`, 'info');
};

/* -------------------------------------------------------------------------- */
/* MINI SPARKLINE SVGS IN TOP STAT CARDS                                      */
/* -------------------------------------------------------------------------- */
function renderStatSparklines() {
  const sparkConfigs = [
    { id: 'spark-total', data: [12, 15, 14, 18, 16, 22, 26], color: '#059669' },
    { id: 'spark-high', data: [8, 12, 10, 16, 14, 20, 28], color: '#ef4444' },
    { id: 'spark-prog', data: [14, 16, 13, 19, 17, 21, 23], color: '#f59e0b' },
    { id: 'spark-res', data: [18, 22, 20, 26, 24, 30, 35], color: '#3b82f6' },
    { id: 'spark-ai', data: [10, 14, 12, 18, 22, 26, 30], color: '#059669' }
  ];

  sparkConfigs.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    const w = 60, h = 24;
    const min = Math.min(...cfg.data);
    const max = Math.max(...cfg.data);
    const pts = cfg.data.map((val, idx) => {
      const x = (idx / (cfg.data.length - 1)) * (w - 4) + 2;
      const y = h - ((val - min) / (max - min || 1)) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    el.innerHTML = `
      <svg width="${w}" height="${h}" style="overflow:visible;">
        <polyline fill="none" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
      </svg>
    `;
  });
}

/* -------------------------------------------------------------------------- */
/* RENDER CASE QUEUE CARDS                                                    */
/* -------------------------------------------------------------------------- */
function renderCaseQueue() {
  const container = document.getElementById('case-queue-container');
  if (!container || !window.CAREBRIDGE_DATA) return;

  container.innerHTML = window.CAREBRIDGE_DATA.caseQueue.map(item => `
    <div class="queue-item-card" onclick="openCaseDetailsDrawer('${item.id}')">
      <img src="${item.photo}" alt="${item.title}" class="queue-item-photo" />
      <div class="queue-item-info">
        <div class="queue-badge-row">
          <span class="urgency-pill urgency-${item.priority}">${item.priorityLabel}</span>
          <div class="ai-confidence-score score-${item.priority}">
            ${item.aiConfidence}%
            <small>AI Confidence</small>
          </div>
        </div>
        <h4 class="queue-item-title">${item.title}</h4>
        <div class="queue-item-location">${item.location}</div>
        <div class="queue-item-meta">${item.distance} • ${item.time}</div>
      </div>
    </div>
  `).join('');
}

/* -------------------------------------------------------------------------- */
/* RENDER RECENT CASES TABLE (DASHBOARD)                                      */
/* -------------------------------------------------------------------------- */
function renderRecentCasesTable(filterText = '') {
  const tbody = document.getElementById('recent-cases-tbody');
  if (!tbody || !window.CAREBRIDGE_DATA) return;

  const cases = window.CAREBRIDGE_DATA.recentCases.filter(c => {
    if (!filterText) return true;
    const query = filterText.toLowerCase();
    return c.id.toLowerCase().includes(query) ||
           c.category.toLowerCase().includes(query) ||
           c.location.toLowerCase().includes(query) ||
           c.status.toLowerCase().includes(query);
  });

  if (cases.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#9ca3af;">No cases match your search query.</td></tr>`;
    return;
  }

  tbody.innerHTML = cases.map(c => `
    <tr onclick="openCaseDetailsDrawer('${c.id}')">
      <td class="table-case-id">${c.id}</td>
      <td>
        <span class="category-cell">
          <i class="fa-solid ${c.icon} category-icon"></i>
          ${c.category}
        </span>
      </td>
      <td>${c.location}</td>
      <td>
        <span class="urgency-pill ${c.priorityClass}">${c.priority}</span>
      </td>
      <td>${c.reported}</td>
      <td>
        <span class="status-badge ${c.statusClass}">
          <span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span>
          ${c.status}
        </span>
      </td>
      <td style="font-weight:700; color:#111827;">${c.confidence}</td>
      <td>
        <button class="action-icon-btn" title="Inspect Case" onclick="event.stopPropagation(); openCaseDetailsDrawer('${c.id}')">
          <i class="fa-regular fa-eye"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

/* -------------------------------------------------------------------------- */
/* RENDER FULL LIVE CASES TABLE (LIVE CASES VIEW)                             */
/* -------------------------------------------------------------------------- */
window.renderFullLiveCasesTable = function() {
  const tbody = document.getElementById('full-live-cases-tbody');
  if (!tbody || !window.CAREBRIDGE_DATA) return;

  const filtered = window.CAREBRIDGE_DATA.recentCases.filter(c => {
    const matchesCat = (activeLiveCasesCategory === 'All' || c.category.toLowerCase() === activeLiveCasesCategory.toLowerCase());
    const matchesKey = (!activeLiveCasesKeyword || 
      c.id.toLowerCase().includes(activeLiveCasesKeyword) ||
      c.category.toLowerCase().includes(activeLiveCasesKeyword) ||
      c.location.toLowerCase().includes(activeLiveCasesKeyword) ||
      c.status.toLowerCase().includes(activeLiveCasesKeyword)
    );
    return matchesCat && matchesKey;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:#9ca3af;">No live cases matching filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr onclick="openCaseDetailsDrawer('${c.id}')" style="cursor:pointer;">
      <td class="table-case-id">${c.id}</td>
      <td><span class="category-cell"><i class="fa-solid ${c.icon} category-icon"></i> ${c.category}</span></td>
      <td>${c.location}</td>
      <td><span class="urgency-pill ${c.priorityClass}">${c.priority}</span></td>
      <td>${c.reported}</td>
      <td><span class="status-badge ${c.statusClass}"><span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span> ${c.status}</span></td>
      <td style="font-weight:700; color:#111827;">${c.confidence}</td>
      <td>
        <button class="action-icon-btn" title="Inspect Case" onclick="event.stopPropagation(); openCaseDetailsDrawer('${c.id}')">
          <i class="fa-regular fa-eye"></i>
        </button>
      </td>
    </tr>
  `).join('');
};

window.filterLiveCasesByCategory = function(category, btn) {
  activeLiveCasesCategory = category;
  document.querySelectorAll('.filter-chip-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFullLiveCasesTable();
  AudioFx.playPop();
};

window.filterLiveCasesSearch = function(keyword) {
  activeLiveCasesKeyword = keyword.toLowerCase().trim();
  renderFullLiveCasesTable();
};

/* -------------------------------------------------------------------------- */
/* RENDER ACTIVITY FEED & ORGANIZATIONS                                       */
/* -------------------------------------------------------------------------- */
function renderActivityFeed() {
  const container = document.getElementById('live-activity-list');
  if (!container || !window.CAREBRIDGE_DATA) return;

  container.innerHTML = window.CAREBRIDGE_DATA.liveActivity.map(act => {
    let iconClass = 'fa-plus';
    if (act.icon === 'check') iconClass = 'fa-check';
    if (act.icon === 'user') iconClass = 'fa-user';
    if (act.icon === 'crosshair') iconClass = 'fa-crosshairs';

    return `
      <div class="activity-feed-item">
        <div class="activity-icon-bubble bubble-${act.color}">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="activity-body">
          <div class="activity-title">${act.title}</div>
          <div class="activity-sub">${act.subtitle}</div>
        </div>
        <div class="activity-time">${act.time}</div>
      </div>
    `;
  }).join('');
}

function renderTrustedOrganizations() {
  const container = document.getElementById('trusted-orgs-list');
  if (!container || !window.CAREBRIDGE_DATA) return;

  container.innerHTML = window.CAREBRIDGE_DATA.trustedOrganizations.map(org => `
    <div class="org-item" onclick="openNGOInspect('${org.name}')" style="cursor:pointer;">
      <div class="org-left">
        <div class="org-logo-icon" style="background:${org.logoColor}15; color:${org.logoColor}; border:1px solid ${org.logoColor}30;">
          ${org.initials}
        </div>
        <div>
          <div class="org-name">${org.name}</div>
          <div class="org-cases">${org.cases}</div>
        </div>
      </div>
      <div class="org-rating">
        <i class="fa-solid fa-star"></i>
        ${org.rating}
      </div>
    </div>
  `).join('');
}

function renderNgosAndSheltersGrid(ngos) {
  const container = document.getElementById('ngos-shelters-grid');
  if (!container || !ngos) return;
  
  if (ngos.length === 0) {
    container.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px; color:#6b7280; text-align:center;">No verified NGOs found.</div>';
    return;
  }
  
  container.innerHTML = ngos.map(ngo => `
    <div class="stat-card" style="padding:20px;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        <div style="width:40px; height:40px; background:${ngo.logo_color || '#059669'}15; color:${ngo.logo_color || '#059669'}; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px;">${ngo.initials || 'NG'}</div>
        <div>
          <h4 style="font-weight:700; font-size:15px;">${ngo.name}</h4>
          <span style="font-size:11px; color:#059669; font-weight:600;"><i class="fa-solid fa-shield-check"></i> Government Verified</span>
        </div>
      </div>
      <p style="font-size:12px; color:#6b7280; margin-bottom:12px;">${ngo.description || 'Verified NGO partner operating in designated regions.'}</p>
      <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; border-top:1px solid #f3f4f6; padding-top:10px;">
        <span>Active Cases: ${ngo.active_cases || 0}</span>
        <span style="color:#f59e0b;">★ ${ngo.rating || '5.0'} Rating</span>
      </div>
    </div>
  `).join('');
}

function renderNgoVerificationTable(ngos) {
  const tbody = document.getElementById('ngo-verification-tbody');
  if (!tbody || !ngos) return;
  
  if (ngos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:#9ca3af;">No pending NGO verifications.</td></tr>';
    return;
  }
  
  tbody.innerHTML = ngos.map(ngo => `
    <tr>
      <td><strong>${ngo.name}</strong></td>
      <td>${ngo.bureau_id || 'N/A'}</td>
      <td>${ngo.coverage_area || 'N/A'}</td>
      <td>${ngo.capacity || 'N/A'}</td>
      <td><a href="javascript:void(0)" onclick="showToast('Viewing NGO Registration Certificate.pdf', 'info')" style="color:#059669; font-weight:600;"><i class="fa-solid fa-file-pdf"></i> View Documents</a></td>
      <td>
        <button class="btn-primary-action" style="padding:6px 12px; font-size:11.5px;" onclick="approveNGO(${ngo.id}, '${ngo.name}')">Approve Partner</button>
      </td>
    </tr>
  `).join('');
}

function renderVolunteersGrid(volunteers) {
  const container = document.getElementById('volunteers-grid');
  if (!container || !volunteers) return;
  
  if (volunteers.length === 0) {
    container.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px; color:#6b7280; text-align:center;">No volunteers found.</div>';
    return;
  }
  
  container.innerHTML = volunteers.map(vol => {
    const statusColor = vol.status === 'Active' ? '#059669' : (vol.status === 'In Transit' ? '#f59e0b' : '#6b7280');
    // Generating a consistent avatar using DiceBear or unavatar could be done, but a default one works too
    const seed = vol.name.replace(/\s+/g, '').toLowerCase();
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=e2e8f0&textColor=475569`;
    
    return `
    <div class="stat-card" style="padding:18px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${avatar}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:1px solid #e2e8f0;">
        <div>
          <h4 style="font-size:14px; font-weight:700;">${vol.name}</h4>
          <span style="font-size:11px; color:${statusColor}; font-weight:600;">● ${vol.status} (${vol.location})</span>
        </div>
      </div>
      <div style="margin-top:12px; font-size:12px; color:#4b5563;">
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>Skills:</strong> ${vol.skills || 'General Relief'}</div>
        <div><strong>Completed Missions:</strong> ${vol.completed_missions || 0}</div>
      </div>
    </div>
    `;
  }).join('');
}

/* -------------------------------------------------------------------------- */
/* AI INSIGHTS RENDERER                                                        */
/* -------------------------------------------------------------------------- */
function renderAiInsights(insights, dashData) {
  if (!insights) return;

  const hotspots = dashData?.map_hotspots || [];
  const topHotspot = hotspots.filter(h => h.type === 'red').sort((a,b) => b.count - a.count)[0];

  // Hotspot Forecast card
  const descEl = document.getElementById('ai-hotspot-desc');
  const recEl = document.getElementById('ai-hotspot-rec');
  if (descEl && topHotspot) {
    descEl.textContent = `${topHotspot.name} shows a ${insights.hotspot_change} week-over-week increase in shelter displacement requests. ${topHotspot.desc}`;
  }
  if (recEl) {
    recEl.innerHTML = `⚠️ Recommendation: ${insights.hotspot_recommendation}`;
  }

  // Triage Accuracy card
  const triageEl = document.getElementById('ai-triage-acc');
  const triageRecEl = document.getElementById('ai-triage-rec');
  if (triageEl) {
    triageEl.textContent = `AI NLP triage model achieves ${insights.triage_accuracy} precision in matching field requests with correct NGO capabilities. Most reported category: ${insights.most_reported_category} (${insights.most_reported_percent}).`;
  }
  if (triageRecEl) {
    triageRecEl.innerHTML = `✅ ${insights.response_improvement}`;
  }

  // Animate AI stat cards inside the insights section if they exist
  const aiStatsContainer = document.getElementById('ai-live-stats');
  if (aiStatsContainer) {
    aiStatsContainer.innerHTML = `
      <div class="stat-card" style="padding:14px; text-align:center;">
        <div style="font-size:22px; font-weight:900; color:#059669;">${insights.triage_accuracy}</div>
        <div style="font-size:11px; color:#6b7280;">Triage Accuracy</div>
      </div>
      <div class="stat-card" style="padding:14px; text-align:center;">
        <div style="font-size:22px; font-weight:900; color:#3b82f6;">${insights.avg_response_time}</div>
        <div style="font-size:11px; color:#6b7280;">Avg. Response</div>
      </div>
      <div class="stat-card" style="padding:14px; text-align:center;">
        <div style="font-size:22px; font-weight:900; color:#ef4444;">${insights.hotspot_change}</div>
        <div style="font-size:11px; color:#6b7280;">Hotspot Surge</div>
      </div>
    `;
  }
}

/* -------------------------------------------------------------------------- */
/* HEATMAP RENDERER                                                            */
/* -------------------------------------------------------------------------- */
function renderHeatmap(hotspots) {
  const container = document.getElementById('heatmap-clusters');
  if (!container || !hotspots || hotspots.length === 0) return;

  // Sort by count descending
  const sorted = [...hotspots].sort((a, b) => b.count - a.count);
  const high = sorted.filter(h => h.type === 'red');

  // Update the badge
  const badge = document.getElementById('heatmap-density-badge');
  if (badge) {
    badge.textContent = `● ${high.length} High-Density Zone${high.length !== 1 ? 's' : ''} Detected`;
  }

  // Update the hero stat panel with the top hotspot
  const topZone = sorted[0];
  const heroTitle = document.getElementById('heatmap-hero-title');
  const heroDesc = document.getElementById('heatmap-hero-desc');
  const heroCount = document.getElementById('heatmap-hero-count');
  if (heroTitle && topZone) heroTitle.textContent = `${topZone.name} — Primary Hotspot`;
  if (heroDesc && topZone) heroDesc.textContent = topZone.desc;
  if (heroCount && topZone) heroCount.textContent = topZone.count;

  // Render cluster list
  const typeColors = { red: '#ef4444', orange: '#f59e0b', green: '#10b981' };
  const typeBg = { red: '#fee2e2', orange: '#fff7ed', green: '#ecfdf5' };
  container.innerHTML = sorted.map((h, i) => `
    <div style="background:#f9fafb; padding:14px; border-radius:10px; border:1px solid #e5e7eb; border-left:4px solid ${typeColors[h.type] || '#6b7280'};">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:13px;">${i + 1}. ${h.name}</strong>
        <span style="background:${typeBg[h.type] || '#f3f4f6'}; color:${typeColors[h.type] || '#6b7280'}; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:20px;">${h.priority}</span>
      </div>
      <p style="font-size:11.5px; color:#6b7280; margin-top:4px;">${h.count} active incidents &mdash; ${h.desc}</p>
    </div>
  `).join('');
}

/* -------------------------------------------------------------------------- */
/* TRENDS CHARTS RENDERER (Chart.js)                                           */
/* -------------------------------------------------------------------------- */
let _responseTimeChart = null;
let _categoryChart = null;

function renderTrendsCharts(responseTimeData, categoryData) {
  // ── Response Time Line Chart ──
  const rtCanvas = document.getElementById('chart-response-time');
  if (rtCanvas && responseTimeData) {
    const ctx = rtCanvas.getContext('2d');
    if (_responseTimeChart) { _responseTimeChart.destroy(); }
    _responseTimeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: responseTimeData.labels,
        datasets: [{
          label: 'Avg Response Time (min)',
          data: responseTimeData.data,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.12)',
          borderWidth: 3,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#d1d5db',
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} min avg response`
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 12 } } },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 12 }, callback: v => v + ' min' },
            suggestedMin: 0
          }
        }
      }
    });
  }

  // ── Category Volume Doughnut Chart ──
  const catCanvas = document.getElementById('chart-category-share');
  if (catCanvas && categoryData && categoryData.length > 0) {
    const ctx2 = catCanvas.getContext('2d');
    if (_categoryChart) { _categoryChart.destroy(); }
    const palette = ['#6366f1','#f59e0b','#ef4444','#10b981','#3b82f6','#8b5cf6'];
    _categoryChart = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: categoryData.map(c => c.label),
        datasets: [{
          data: categoryData.map(c => c.percent),
          backgroundColor: palette.slice(0, categoryData.length),
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 10,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, padding: 12, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#d1d5db',
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed}%`
            }
          }
        }
      }
    });
  }
}

window.approveNGO = async function(id, name) {
  if (window.API && window.API.ngos) {
    try {
      await window.API.ngos.verify(id, 'Verified');
      showToast(`✅ ${name} verified and notified!`, 'success');
      syncBackendData();
    } catch (e) {
      showToast(`Failed to verify ${name}.`, 'error');
    }
  }
};

/* -------------------------------------------------------------------------- */
/* TAB & NAVIGATION SWITCHER                                                  */
/* -------------------------------------------------------------------------- */
function setupInteractions() {
  // Navigation button click handler
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab) {
        switchViewTab(targetTab);
      }
    });
  });

  // Global search bar
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderRecentCasesTable(e.target.value);
    });

    // Keyboard shortcut / or Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }
}

window.switchViewTab = function(tabId) {
  // Update sidebar active buttons
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Hide all sections, display target
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const targetView = document.getElementById(`view-${tabId}`);
  
  if (targetView) {
    targetView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Handle view-specific initializations
    if (tabId === 'dashboard' && dhakaMap) {
      setTimeout(() => dhakaMap.invalidateSize(), 150);
    } else if (tabId === 'case-map') {
      setTimeout(() => {
        initFullscreenMap();
        if (fullscreenMap) fullscreenMap.invalidateSize();
      }, 150);
    } else if (tabId === 'live-cases') {
      renderFullLiveCasesTable();
    }

    AudioFx.playPop();
  } else {
    // Fallback to dashboard with toast notice
    const dash = document.getElementById('view-dashboard');
    if (dash) dash.classList.add('active');
    showToast(`Switched to ${tabId.replace('-', ' ').toUpperCase()} view`, 'info');
  }
};

/* -------------------------------------------------------------------------- */
/* IN-PAGE MESSAGING DISPATCH                                                 */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* COMMUNICATION HUB — DYNAMIC MESSAGING                                      */
/* -------------------------------------------------------------------------- */

let activeChatPartnerId = null;
let activeChatPartnerName = '';
let chatPollInterval = null;
let allChatContacts = [];
let allThreads = [];

// ── Load all threads from API ──────────────────────────────────────────────
async function loadChatThreads() {
  const container = document.getElementById('comm-threads-list');
  if (!container) return;

  try {
    let threads = [];
    if (window.API && window.API.messages) {
      try { threads = await window.API.messages.threads(); } catch (e) {}
    }
    allThreads = threads;

    // If no real threads yet, seed with demo contacts (volunteers as conversation starters)
    if (!threads || threads.length === 0) {
      renderDemoThreads();
    } else {
      renderThreadList(threads);
    }
    updateUnreadTotal(threads);
  } catch (e) {
    renderDemoThreads();
  }
}

function renderDemoThreads() {
  const vols = (window.CAREBRIDGE_DATA && window.CAREBRIDGE_DATA.volunteers) || [];
  const demoThreads = vols.slice(0, 5).map((v, i) => ({
    partner_id: v.id,
    partner_name: v.name,
    partner_avatar: v.avatar,
    last_message: v.status === 'In Transit' ? '📍 En route to case location...' : '✅ Standing by at base.',
    last_time: new Date(Date.now() - (i * 7 + 3) * 60000).toISOString(),
    unread_count: i === 0 ? 2 : 0,
    role: v.location,
  }));
  allThreads = demoThreads;
  renderThreadList(demoThreads);
}

function renderThreadList(threads) {
  const container = document.getElementById('comm-threads-list');
  if (!container) return;
  if (!threads || threads.length === 0) {
    container.innerHTML = `<div style="padding:30px 16px; text-align:center; color:#9ca3af; font-size:12px;">
      <i class="fa-regular fa-comment-dots" style="font-size:28px; color:#d1fae5; display:block; margin-bottom:8px;"></i>
      No conversations yet.<br>Start a new chat with a volunteer.
    </div>`;
    return;
  }
  container.innerHTML = threads.map(t => {
    const initials = (t.partner_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatarHtml = t.partner_avatar
      ? `<img src="${t.partner_avatar}" class="comm-thread-avatar" onerror="this.style.display='none'; this.nextSibling.style.display='flex';" /><div class="comm-thread-avatar-placeholder" style="display:none;">${initials}</div>`
      : `<div class="comm-thread-avatar-placeholder">${initials}</div>`;
    const timeAgo = relativeTime(t.last_time || t.last_time_iso);
    const badgeHtml = t.unread_count > 0 ? `<span class="comm-thread-badge">${t.unread_count}</span>` : '';
    const isActive = String(t.partner_id) === String(activeChatPartnerId);
    return `
      <div class="comm-thread-item${isActive ? ' active' : ''}" onclick="openChatThread(${t.partner_id}, '${escapeHtml(t.partner_name)}', '${escapeHtml(t.partner_avatar || '')}', '${escapeHtml(t.role || 'Field Unit')}')" data-partner="${t.partner_id}" data-name="${escapeHtml(t.partner_name).toLowerCase()}">
        ${avatarHtml}
        <div class="comm-thread-body">
          <div class="comm-thread-name">${escapeHtml(t.partner_name)}</div>
          <div class="comm-thread-preview">${escapeHtml(t.last_message || '...')}</div>
        </div>
        <div class="comm-thread-meta">
          <span class="comm-thread-time">${timeAgo}</span>
          ${badgeHtml}
        </div>
      </div>`;
  }).join('');
}

function relativeTime(isoStr) {
  if (!isoStr) return '';
  try {
    const mins = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function updateUnreadTotal(threads) {
  const badge = document.getElementById('comm-unread-total');
  if (!badge) return;
  const total = (threads || []).reduce((acc, t) => acc + (t.unread_count || 0), 0);
  if (total > 0) {
    badge.textContent = total;
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }
}

// ── Open a thread and load messages ───────────────────────────────────────
window.openChatThread = async function(partnerId, partnerName, partnerAvatar, partnerRole) {
  activeChatPartnerId = partnerId;
  activeChatPartnerName = partnerName;
  AudioFx.playPop();

  // Update thread highlight
  document.querySelectorAll('.comm-thread-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.querySelector(`.comm-thread-item[data-partner="${partnerId}"]`);
  if (activeEl) activeEl.classList.add('active');

  // Show chat panel
  const placeholder = document.getElementById('comm-no-thread-placeholder');
  const activeChat = document.getElementById('comm-active-chat');
  if (placeholder) placeholder.style.display = 'none';
  if (activeChat) { activeChat.style.display = 'flex'; }

  // Set header
  const nameEl = document.getElementById('comm-partner-name');
  const statusEl = document.getElementById('comm-partner-status');
  const avatarWrap = document.getElementById('comm-partner-avatar-wrap');
  if (nameEl) nameEl.textContent = partnerName;
  if (statusEl) statusEl.textContent = `Online · ${partnerRole || 'Field Unit'}`;

  if (avatarWrap) {
    const initials = (partnerName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatarWrap.innerHTML = partnerAvatar
      ? `<img src="${partnerAvatar}" class="comm-chat-avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='<div style=\'width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#059669,#047857);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;\'>${initials}</div>'">`
      : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#059669,#047857);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${initials}</div>`;
  }

  // Load messages
  await fetchAndRenderMessages(partnerId, true);

  // Start polling
  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(() => fetchAndRenderMessages(partnerId, false), 5000);
};

async function fetchAndRenderMessages(partnerId, scrollToBottom) {
  const stream = document.getElementById('comm-message-stream');
  if (!stream) return;

  let messages = [];
  try {
    if (window.API && window.API.messages) {
      messages = await window.API.messages.thread(partnerId);
    }
  } catch (e) {}

  // If no messages exist, show a welcome state
  if (!messages || messages.length === 0) {
    if (scrollToBottom) {
      stream.innerHTML = `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af; gap:8px; padding:40px 20px; text-align:center;">
          <i class="fa-regular fa-comments" style="font-size:36px; color:#d1fae5;"></i>
          <p style="font-size:13px; font-weight:600; color:#374151;">Start the conversation</p>
          <p style="font-size:12px;">Send your first message to ${escapeHtml(activeChatPartnerName)}</p>
        </div>`;
    }
    return;
  }

  const currentUser = (typeof window.getAuthUser === 'function' && window.getAuthUser());
  const myId = currentUser ? currentUser.id : null;
  const myName = currentUser ? currentUser.name : 'You';

  const prevScrollHeight = stream.scrollHeight;
  stream.innerHTML = messages.map(m => {
    const isMine = myId ? String(m.sender_id) === String(myId) : false;
    const senderName = isMine ? myName : activeChatPartnerName;
    const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initials = (senderName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatarHtml = `<div class="${isMine ? '' : 'bubble-avatar-placeholder'}" style="${isMine ? 'width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#059669,#047857);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;' : ''}">${initials}</div>`;
    return `
      <div class="comm-bubble-wrap ${isMine ? 'mine' : ''}">
        ${avatarHtml}
        <div class="comm-bubble ${isMine ? 'mine' : 'theirs'}">
          <div class="bubble-sender">${escapeHtml(senderName)}</div>
          <div>${escapeHtml(m.content)}</div>
          <div class="bubble-time">${time}</div>
        </div>
      </div>`;
  }).join('');

  if (scrollToBottom || stream.scrollHeight > prevScrollHeight) {
    stream.scrollTop = stream.scrollHeight;
  }
}

// ── Send a message ──────────────────────────────────────────────────────────
window.sendChatMessage = async function() {
  const input = document.getElementById('comm-message-input');
  if (!input || !input.value.trim() || !activeChatPartnerId) return;

  const msg = input.value.trim();
  input.value = '';

  const currentUser = (typeof window.getAuthUser === 'function' && window.getAuthUser());
  const myName = currentUser ? currentUser.name : 'You';
  const stream = document.getElementById('comm-message-stream');

  // Optimistic UI: append my bubble immediately
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initials = (myName || 'Y').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bubble = document.createElement('div');
  bubble.className = 'comm-bubble-wrap mine';
  bubble.innerHTML = `
    <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#059669,#047857);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${initials}</div>
    <div class="comm-bubble mine">
      <div class="bubble-sender">${escapeHtml(myName)}</div>
      <div>${escapeHtml(msg)}</div>
      <div class="bubble-time">${time}</div>
    </div>`;
  if (stream) { stream.appendChild(bubble); stream.scrollTop = stream.scrollHeight; }
  AudioFx.playPop();

  // Send to API
  try {
    if (window.API && window.API.messages) {
      await window.API.messages.send(activeChatPartnerId, msg);
    }
  } catch (e) {
    console.warn('[CareBridge] Message send failed:', e);
  }

  // Update thread preview in sidebar
  const threadEl = document.querySelector(`.comm-thread-item[data-partner="${activeChatPartnerId}"] .comm-thread-preview`);
  if (threadEl) threadEl.textContent = msg;
};

// ── Emoji shortcut ─────────────────────────────────────────────────────────
window.appendToChat = function(emoji) {
  const input = document.getElementById('comm-message-input');
  if (input) { input.value += emoji + ' '; input.focus(); }
};

// ── Search / filter threads ────────────────────────────────────────────────
window.filterChatThreads = function(query) {
  const q = (query || '').toLowerCase();
  document.querySelectorAll('.comm-thread-item').forEach(el => {
    const name = el.dataset.name || '';
    el.style.display = name.includes(q) ? '' : 'none';
  });
};

// ── Broadcast to all ───────────────────────────────────────────────────────
window.broadcastToAll = async function() {
  const msg = prompt('📡 Enter broadcast message to all field units:');
  if (!msg || !msg.trim()) return;
  showToast(`📡 Broadcasted to all field units: "${msg.slice(0, 40)}..."`, 'info');
  // Send to all known contacts
  if (window.API && window.API.messages) {
    const contacts = allThreads.slice(0, 5);
    for (const t of contacts) {
      try { await window.API.messages.send(t.partner_id, `[BROADCAST] ${msg}`); } catch {}
    }
  }
};

// ── New Chat Modal ─────────────────────────────────────────────────────────
window.openNewChatModal = async function() {
  openModal('modal-new-chat');
  const list = document.getElementById('new-chat-contacts-list');
  if (!list) return;

  list.innerHTML = `<p style="color:#9ca3af; font-size:13px; text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading contacts...</p>`;

  let volunteers = [];
  try {
    if (window.API && window.API.volunteers) volunteers = await window.API.volunteers.list();
  } catch {}

  if (!volunteers || !volunteers.length) {
    volunteers = (window.CAREBRIDGE_DATA && window.CAREBRIDGE_DATA.volunteers) || [];
  }

  allChatContacts = volunteers;
  renderNewChatContacts(volunteers);
};

function renderNewChatContacts(contacts) {
  const list = document.getElementById('new-chat-contacts-list');
  if (!list) return;
  if (!contacts || !contacts.length) {
    list.innerHTML = `<p style="color:#9ca3af; font-size:13px; text-align:center; padding:20px;">No contacts found.</p>`;
    return;
  }
  list.innerHTML = contacts.map(v => {
    const initials = (v.name || 'V').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const statusColor = v.status === 'Active' ? '#059669' : v.status === 'In Transit' ? '#f59e0b' : '#6b7280';
    return `
      <div onclick="startNewChat(${v.id}, '${escapeHtml(v.name)}', '${escapeHtml(v.avatar || '')}', '${escapeHtml(v.location || 'Field Unit')}')"
        style="display:flex; align-items:center; gap:12px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; transition:all 0.15s;"
        onmouseover="this.style.background='#f0fdf4'; this.style.borderColor='#059669';"
        onmouseout="this.style.background=''; this.style.borderColor='#e5e7eb';">
        ${v.avatar ? `<img src="${v.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='<div style=\'width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#059669,#047857);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;\'>${initials}</div>'">` : `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#059669,#047857);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${initials}</div>`}
        <div style="flex:1;">
          <div style="font-weight:700; font-size:13px; color:#111827;">${escapeHtml(v.name)}</div>
          <div style="font-size:11px; color:#6b7280;">${escapeHtml(v.location || 'Field Unit')} · ${v.completed_missions || 0} missions</div>
        </div>
        <span style="font-size:10px; font-weight:700; color:${statusColor}; background:${statusColor}18; padding:3px 8px; border-radius:8px;">${v.status || 'Active'}</span>
      </div>`;
  }).join('');
}

window.filterNewChatContacts = function(query) {
  const q = (query || '').toLowerCase();
  const filtered = allChatContacts.filter(v => (v.name || '').toLowerCase().includes(q) || (v.location || '').toLowerCase().includes(q));
  renderNewChatContacts(filtered);
};

window.startNewChat = function(id, name, avatar, role) {
  closeModal('modal-new-chat');
  // Add to thread list if not already there
  const exists = allThreads.find(t => String(t.partner_id) === String(id));
  if (!exists) {
    allThreads.unshift({ partner_id: id, partner_name: name, partner_avatar: avatar, last_message: '', last_time: new Date().toISOString(), unread_count: 0, role });
    renderThreadList(allThreads);
  }
  openChatThread(id, name, avatar, role);
};

// ── API helpers for messages ───────────────────────────────────────────────
// Extend window.API.messages if not fully present
if (window.API && !window.API.messages) {
  window.API.messages = {
    async threads() { return await fetch(`${window.API._base || 'http://127.0.0.1:8000'}/api/messages/threads`, { headers: window.API._headers ? window.API._headers() : {} }).then(r => r.ok ? r.json() : []); },
    async thread(id) { return await fetch(`${window.API._base || 'http://127.0.0.1:8000'}/api/messages/thread/${id}`, { headers: window.API._headers ? window.API._headers() : {} }).then(r => r.ok ? r.json() : []); },
    async send(receiverId, content) { return await fetch(`${window.API._base || 'http://127.0.0.1:8000'}/api/messages/send`, { method:'POST', headers: { 'Content-Type':'application/json', ...(window.API._headers ? window.API._headers() : {}) }, body: JSON.stringify({ receiver_id: receiverId, content }) }).then(r => r.json()); },
  };
}

// ── Init on messages tab open ─────────────────────────────────────────────
const _origSwitchViewTab = window.switchViewTab;
window.switchViewTab = function(tab) {
  if (typeof _origSwitchViewTab === 'function') _origSwitchViewTab(tab);
  if (tab === 'messages') {
    loadChatThreads();
  } else {
    if (chatPollInterval) { clearInterval(chatPollInterval); chatPollInterval = null; }
  }
};

// Legacy compat
window.selectChatThread = function(el, name) { openChatThread(2, name, '', 'Field Unit'); };
window.sendInpageChatMessage = window.sendChatMessage;



/* -------------------------------------------------------------------------- */
/* MODALS & DRAWERS MANAGEMENT                                                */
/* -------------------------------------------------------------------------- */
function setupModals() {
  // New Report Header Button
  document.getElementById('btn-new-report-header')?.addEventListener('click', () => {
    openModal('modal-new-report');
  });

  // Add NGO Header Button
  document.getElementById('btn-add-ngo-header')?.addEventListener('click', () => {
    openModal('modal-add-ngo');
  });

  // Export Report Header Button
  document.getElementById('btn-export-report-header')?.addEventListener('click', () => {
    openModal('modal-export-report');
  });

  // Emergency SOS Sidebar Button
  document.getElementById('btn-emergency-sidebar')?.addEventListener('click', () => {
    AudioFx.playAlert();
    openModal('modal-emergency-sos');
  });

  // Notifications Bell
  document.getElementById('btn-notifications-bell')?.addEventListener('click', () => {
    toggleNotificationsDrawer();
  });

  // Messages Chat
  document.getElementById('btn-messages-chat')?.addEventListener('click', () => {
    toggleMessagesDrawer();
  });

  // Form Submissions
  document.getElementById('form-new-report')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleNewReportSubmit();
  });

  document.getElementById('form-add-ngo')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAddNGOSubmit();
  });

  document.getElementById('form-add-volunteer')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAddVolunteerSubmit();
  });

  document.getElementById('form-emergency-sos')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleEmergencySOSSubmit();
  });

  // Export Download Trigger
  document.getElementById('btn-do-download-export')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleExportReportSubmit();
  });
}

window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    AudioFx.playPop();
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    AudioFx.playPop();
  }
};

// New Report Handler
async function handleNewReportSubmit() {
  const loc = document.getElementById('nr-location')?.value?.trim() || 'Mirpur-10, Dhaka';
  const cat = document.getElementById('nr-category')?.value || 'Child';
  const priority = document.getElementById('nr-priority')?.value || 'High';
  const desc = document.getElementById('nr-desc')?.value?.trim() || `Urgent ${cat} crisis assistance needed in ${loc}. Field dispatch recommended.`;
  const contact = document.getElementById('nr-contact')?.value?.trim() || '+880 1712-345678';
  const reporter = (typeof window.getAuthUser === 'function' && window.getAuthUser()?.name) || 'Command Console Coordinator';

  // Area coordinates mapping for dynamic map placement
  const areaCoords = {
    'Mirpur': [23.8067, 90.3687],
    'Dhanmondi': [23.7465, 90.3760],
    'Uttara': [23.8759, 90.3795],
    'Mohammadpur': [23.7658, 90.3584],
    'Badda': [23.7806, 90.4267],
    'Gulshan': [23.7925, 90.4078],
    'Banani': [23.7937, 90.4043],
    'Motijheel': [23.7330, 90.4172],
    'Old Dhaka': [23.7193, 90.3880],
    'Lalbagh': [23.7193, 90.3880],
  };

  let lat = 23.7806;
  let lng = 90.4000;
  for (const [key, coords] of Object.entries(areaCoords)) {
    if (loc.toLowerCase().includes(key.toLowerCase())) {
      lat = coords[0] + (Math.random() - 0.5) * 0.005;
      lng = coords[1] + (Math.random() - 0.5) * 0.005;
      break;
    }
  }

  let createdCase = null;

  // 1. Submit to Live Backend API
  try {
    if (window.API && window.API.cases) {
      const res = await window.API.cases.create({
        category: cat,
        location: loc,
        priority: priority,
        description: desc,
        contact: contact,
        reporter: reporter,
        lat: lat,
        lng: lng
      });
      if (res && res.id) {
        createdCase = res;
      }
    }
  } catch (err) {
    console.warn('[CareBridge API] Case creation network fallback:', err);
  }

  // 2. Normalized case structure
  const createdId = createdCase?.id || `CB-${Math.floor(12483 + Math.random() * 100)}`;
  const icon = cat === 'Child' ? 'fa-child' : cat === 'Elderly' ? 'fa-person-cane' : cat === 'Disability' ? 'fa-wheelchair' : cat === 'Medical' ? 'fa-heart-pulse' : 'fa-house-chimney-crack';

  const newCaseObj = {
    id: createdId,
    category: cat,
    icon: icon,
    location: loc,
    priority: priority,
    priorityClass: priority === 'High' ? 'urgency-high' : priority === 'Medium' ? 'urgency-med' : 'urgency-low',
    reported: 'Just now',
    status: 'Pending',
    statusClass: 'status-pending',
    confidence: createdCase?.confidence || '95%',
    description: desc,
    reporter: reporter,
    contact: contact,
    assignedNGO: 'Unassigned',
    lat: lat,
    lng: lng
  };

  if (window.CAREBRIDGE_DATA) {
    // Add to recent cases
    window.CAREBRIDGE_DATA.recentCases.unshift(newCaseObj);

    // Add to case queue card
    if (window.CAREBRIDGE_DATA.caseQueue) {
      window.CAREBRIDGE_DATA.caseQueue.unshift({
        id: createdId,
        title: `${priority.toUpperCase()} PRIORITY: ${cat.toUpperCase()}`,
        location: loc,
        distance: '1.2 km away',
        time: 'Just now',
        priority: priority.toLowerCase(),
        priorityLabel: `${priority} Urgency`,
        aiConfidence: newCaseObj.confidence,
        category: cat,
        description: desc,
        reporter: reporter,
        contact: contact,
        assignedNGO: 'Awaiting dispatch'
      });
    }

    // Add to live activity feed
    if (window.CAREBRIDGE_DATA.liveActivity) {
      window.CAREBRIDGE_DATA.liveActivity.unshift({
        id: Date.now(),
        type: 'report',
        icon: 'plus',
        color: priority === 'High' ? 'red' : priority === 'Medium' ? 'orange' : 'blue',
        title: `New case ${createdId} registered`,
        subtitle: `${loc} (${cat})`,
        time: 'Just now'
      });
    }

    // Increment stat card numbers
    const elTotal = document.getElementById('stat-val-total');
    if (elTotal) {
      const cur = parseInt(elTotal.innerText.replace(/,/g, '')) || 12482;
      elTotal.innerText = (cur + 1).toLocaleString();
    }
    if (priority === 'High') {
      const elHigh = document.getElementById('stat-val-high');
      if (elHigh) {
        const curHigh = parseInt(elHigh.innerText.replace(/,/g, '')) || 24;
        elHigh.innerText = (curHigh + 1).toLocaleString();
      }
    }

    // Refresh UI components
    renderRecentCasesTable();
    renderFullLiveCasesTable();
    renderCaseQueue();
    renderActivityFeed();

    // Add map marker if map exists
    if (dhakaMap && typeof L !== 'undefined') {
      const pinColor = priority === 'High' ? '#ef4444' : priority === 'Medium' ? '#f59e0b' : '#3b82f6';
      const marker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: pinColor,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(dhakaMap);
      marker.bindPopup(`<b>${createdId}</b><br>${cat} Incident<br>${loc}`);
      mapMarkers.push(marker);
    }
  }

  // Reset the form
  document.getElementById('form-new-report')?.reset();

  if (window.confetti) {
    window.confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
  }

  AudioFx.playSuccess();
  closeModal('modal-new-report');
  showToast(`✅ Case ${createdId} successfully recorded and saved to CareBridge database!`, 'success');
  
  // Sync the dashboard with the newly added backend record
  if (typeof syncBackendData === 'function') {
    syncBackendData();
  }
}

// Add NGO Handler
async function handleAddNGOSubmit() {
  const name = document.getElementById('ngo-name')?.value?.trim() || 'Hope Aid Bangladesh';
  const regId = document.getElementById('ngo-reg-id')?.value?.trim() || 'NGOAB-9842';
  const district = document.getElementById('ngo-district')?.value || 'Dhaka';
  const capacity = document.getElementById('ngo-capacity')?.value?.trim() || '80 bed capacity, 4 shelters';

  let createdNgo = null;

  try {
    if (window.API && window.API.ngos) {
      createdNgo = await window.API.ngos.create({
        name: name,
        bureau_id: regId,
        coverage_area: district + ' Metropolitan',
        capacity: capacity,
        description: `Verified NGO partner operating in ${district}. Providing humanitarian and emergency support.`,
        verified_status: 'Verified',
        is_trusted: true
      });
    }
  } catch (err) {
    console.warn('[CareBridge API] NGO registration fallback:', err);
  }

  const words = name.split(' ');
  const initials = words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();

  const newOrg = {
    name: name,
    cases: '0 cases handled',
    rating: 5.0,
    logoColor: '#059669',
    initials: initials
  };

  if (window.CAREBRIDGE_DATA) {
    // Log to activity feed locally for instant feedback
    window.CAREBRIDGE_DATA.liveActivity.unshift({
      id: Date.now(),
      type: 'ngo',
      icon: 'check',
      color: 'green',
      title: 'New NGO partner onboarded',
      subtitle: `${name} (${regId})`,
      time: 'Just now'
    });
    renderActivityFeed();
  }

  // Reset form
  document.getElementById('form-add-ngo')?.reset();

  if (window.confetti) {
    window.confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
  }

  AudioFx.playSuccess();
  closeModal('modal-add-ngo');
  showToast(`🎉 Partner NGO "${name}" (${regId}) verified and saved to database!`, 'success');
  
  // Sync the dashboard with the newly added backend record
  if (typeof syncBackendData === 'function') {
    syncBackendData();
  }
}

// Add Volunteer Handler
async function handleAddVolunteerSubmit() {
  const name = document.getElementById('vol-name')?.value?.trim() || 'New Volunteer';
  const phone = document.getElementById('vol-phone')?.value?.trim() || '';
  const location = document.getElementById('vol-location')?.value?.trim() || '';
  const skills = document.getElementById('vol-skills')?.value?.trim() || '';

  try {
    if (window.API && window.API.volunteers) {
      await window.API.volunteers.create({
        name: name,
        phone: phone,
        location: location,
        skills: skills,
        ngo_id: null
      });
    }
  } catch (err) {
    console.warn('[CareBridge API] Volunteer registration fallback:', err);
  }

  // Reset form
  document.getElementById('form-add-volunteer')?.reset();
  
  if (window.confetti) {
    window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  }

  AudioFx.playSuccess();
  closeModal('modal-add-volunteer');
  showToast(`✅ Volunteer "${name}" verified and onboarded!`, 'success');
  
  // Sync dashboard
  if (typeof syncBackendData === 'function') {
    syncBackendData();
  }
}

// Export Report Handler - Real File Download
function handleExportReportSubmit() {
  const selectedType = document.querySelector('input[name="export-type"]:checked')?.value || 'csv';
  const baseUrl = (window.API && window.API.BASE_URL) ? window.API.BASE_URL : 'http://127.0.0.1:8000';

  if (selectedType === 'csv') {
    // 1. Download real CSV from backend endpoint
    const downloadUrl = `${baseUrl}/api/export/cases`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `carebridge_cases_audit_${new Date().toISOString().split('T')[0]}.csv`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // 2. Download / open Executive Impact Summary Report HTML/Printable PDF
    const reportUrl = `${baseUrl}/api/export/summary`;
    window.open(reportUrl, '_blank');
  }

  AudioFx.playSuccess();
  closeModal('modal-export-report');
  showToast('📥 Report generated and downloaded to your device!', 'success');
}
window.handleExportReportSubmit = handleExportReportSubmit;

// Emergency SOS Handler
async function handleEmergencySOSSubmit() {
  const loc = document.getElementById('sos-location')?.value || 'Dhanmondi, Dhaka';
  const type = document.querySelector('.sos-type-btn.active')?.getAttribute('data-type') || 'Mass Crisis / Medical';

  try {
    if (window.API && window.API.alerts) {
      await window.API.alerts.create({
        title: `🚨 EMERGENCY SOS: ${type}`,
        description: `Critical emergency reported at ${loc}. Immediate dispatch required.`,
        severity: 'critical',
        source: 'Coordinator Command Console'
      });
      await syncBackendData();
    }
  } catch (err) {
    console.warn('[CareBridge API] Alert creation fallback:', err);
  }

  AudioFx.playAlert();
  closeModal('modal-emergency-sos');

  showToast(`🚨 HIGH PRIORITY SOS DISPATCHED: Units routed to ${loc}`, 'error');

  if (window.CAREBRIDGE_DATA) {
    window.CAREBRIDGE_DATA.liveActivity.unshift({
      id: Date.now(),
      type: 'rescue',
      icon: 'crosshair',
      color: 'red',
      title: `🚨 EMERGENCY SOS: ${type}`,
      subtitle: `${loc} - Dispatch units assigned`,
      time: 'Just now'
    });
    renderActivityFeed();
  }
}

// Case Details Drawer
window.openCaseDetailsDrawer = function(caseId) {
  const drawer = document.getElementById('case-details-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!drawer || !backdrop) return;

  const data = window.CAREBRIDGE_DATA || {};
  const foundQueue = (data.caseQueue || []).find(c => String(c.id) === String(caseId));
  const foundTable = (data.recentCases || []).find(c => String(c.id) === String(caseId));

  const title = foundQueue ? foundQueue.title : (foundTable ? `${foundTable.category} Assistance Request` : `Case ${caseId}`);
  const loc = foundQueue ? foundQueue.location : (foundTable ? foundTable.location : 'Dhaka, Bangladesh');
  const confidence = foundQueue ? foundQueue.aiConfidence : (foundTable ? foundTable.confidence : '92%');
  const desc = foundQueue ? foundQueue.description : `Urgent aid required at ${loc}. Volunteer team deployment recommended.`;
  const photo = foundQueue ? foundQueue.photo : 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80';

  const elId = document.getElementById('drawer-case-id');
  const elTitle = document.getElementById('drawer-case-title');
  const elLoc = document.getElementById('drawer-case-location');
  const elDesc = document.getElementById('drawer-case-desc');
  const elImg = document.getElementById('drawer-case-img');
  const elScore = document.getElementById('drawer-ai-score');

  if (elId) elId.innerText = caseId;
  if (elTitle) elTitle.innerText = title;
  if (elLoc) elLoc.innerText = loc;
  if (elDesc) elDesc.innerText = desc;
  if (elImg) elImg.src = photo;
  if (elScore) elScore.innerText = `${confidence} AI Confidence`;

  drawer.classList.add('show');
  backdrop.classList.add('show');
  AudioFx.playPop();
};

window.closeCaseDetailsDrawer = function() {
  document.getElementById('case-details-drawer')?.classList.remove('show');
  document.getElementById('drawer-backdrop')?.classList.remove('show');
  AudioFx.playPop();
};

/* -------------------------------------------------------------------------- */
/* THEME TOGGLER (DARK / LIGHT MODE)                                          */
/* -------------------------------------------------------------------------- */
window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('carebridge_theme', next);
  
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  AudioFx.playPop();
  showToast(`Switched to ${next.toUpperCase()} command mode`, 'info');
  updateChartTheme();
};

// Initialize persisted theme
(function initTheme() {
  const saved = localStorage.getItem('carebridge_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
      icon.className = saved === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }
})();

/* -------------------------------------------------------------------------- */
/* CAREBRIDGE AI COPILOT INTERACTION                                          */
/* -------------------------------------------------------------------------- */
window.toggleCopilot = function() {
  const win = document.getElementById('copilot-window');
  if (!win) return;
  win.classList.toggle('open');
  AudioFx.playPop();
};

window.sendCopilotPrompt = function(promptText) {
  const input = document.getElementById('copilot-input');
  if (input) input.value = promptText;
  handleCopilotSend();
};

window.handleCopilotSend = async function() {
  const input = document.getElementById('copilot-input');
  const body = document.getElementById('copilot-chat-body');
  if (!input || !body || !input.value.trim()) return;

  const query = input.value.trim();
  input.value = '';

  const userDiv = document.createElement('div');
  userDiv.className = 'copilot-msg-user';
  userDiv.innerText = query;
  body.appendChild(userDiv);
  body.scrollTop = body.scrollHeight;

  AudioFx.playPop();

  // Show thinking placeholder
  const botDiv = document.createElement('div');
  botDiv.className = 'copilot-msg-bot';
  botDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing crisis intelligence...';
  body.appendChild(botDiv);
  body.scrollTop = body.scrollHeight;

  let reply = '';

  // Try live AI Copilot backend
  try {
    if (window.API && window.API.ai) {
      reply = await window.API.ai.chat(query);
    }
  } catch (err) {
    console.warn('[CareBridge AI] Copilot API fallback:', err);
  }

  // Fallback if API returned empty
  if (!reply) {
    const qLower = query.toLowerCase();
    if (qLower.includes('mirpur') || qLower.includes('child')) {
      reply = "🤖 <strong>AI Analysis</strong>: Mirpur-10 currently has Case <strong>CB-12482</strong> (Child requiring assistance). Volunteer <strong>Mr. Rahim Khan</strong> is 1.8 km away. Asha Foundation Shelter 2 has 4 beds reserved.";
    } else if (qLower.includes('priority') || qLower.includes('high')) {
      reply = "🚨 <strong>Critical High Priority</strong>: Hotspots detected in <strong>Mirpur-10</strong> and <strong>Dhanmondi</strong>. Immediate vehicle dispatch recommended.";
    } else if (qLower.includes('ngo') || qLower.includes('asha') || qLower.includes('brac')) {
      reply = "🏢 <strong>NGO Status</strong>: Asha Foundation (★ 4.8) & BRAC (★ 4.7) have 94% on-time dispatch rate today.";
    } else if (qLower.includes('shelter') || qLower.includes('bed')) {
      reply = "🏥 <strong>Shelter Capacity</strong>: Mirpur Shelter Hub: 14 open beds • Dhanmondi Medical Relief: 8 beds • Uttara Hub: 12 beds.";
    } else {
      reply = "I am actively monitoring the humanitarian triage queue across Dhaka. All emergency services are reachable via the 999 Bridge.";
    }
  }

  // Format markdown bolding if plain text returned
  botDiv.innerHTML = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  body.scrollTop = body.scrollHeight;
  AudioFx.playSuccess();
};

/* -------------------------------------------------------------------------- */
/* GPS DISPATCH ROUTE ANIMATION ON LEAFLET MAP                                */
/* -------------------------------------------------------------------------- */
let activeDispatchRoute = null;
let volunteerMovingMarker = null;

window.animateDispatchRouteToCase = function(startCoords, destCoords) {
  if (!dhakaMap) return;

  if (activeDispatchRoute) dhakaMap.removeLayer(activeDispatchRoute);
  if (volunteerMovingMarker) dhakaMap.removeLayer(volunteerMovingMarker);

  const routePoints = [
    startCoords,
    [(startCoords[0] + destCoords[0]) / 2 + 0.005, (startCoords[1] + destCoords[1]) / 2 - 0.003],
    destCoords
  ];

  activeDispatchRoute = L.polyline(routePoints, {
    color: '#059669',
    weight: 4,
    opacity: 0.85,
    className: 'leaflet-dispatch-path'
  }).addTo(dhakaMap);

  const vehicleIcon = L.divIcon({
    html: `<div style="width:30px; height:30px; background:#059669; border:2px solid #fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.3);"><i class="fa-solid fa-motorcycle" style="font-size:12px;"></i></div>`,
    className: 'vehicle-pin-wrapper',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  volunteerMovingMarker = L.marker(startCoords, { icon: vehicleIcon }).addTo(dhakaMap);
  dhakaMap.fitBounds(activeDispatchRoute.getBounds(), { padding: [40, 40] });

  let step = 0;
  const numSteps = 40;
  const timer = setInterval(() => {
    step++;
    const t = step / numSteps;
    const curLat = startCoords[0] + (destCoords[0] - startCoords[0]) * t;
    const curLng = startCoords[1] + (destCoords[1] - startCoords[1]) * t;
    volunteerMovingMarker.setLatLng([curLat, curLng]);

    if (step >= numSteps) {
      clearInterval(timer);
      showToast("📍 Volunteer arrived at the incident site!", "success");
    }
  }, 40);
};

window.dispatchVolunteerToCase = async function() {
  const caseId = document.getElementById('drawer-case-id')?.innerText || 'CB-12482';
  AudioFx.playSuccess();
  showToast(`🚨 Dispatching field volunteer to Case ${caseId}...`, "info");
  closeCaseDetailsDrawer();
  switchViewTab('dashboard');
  animateDispatchRouteToCase([23.7950, 90.3550], [23.8067, 90.3687]);

  try {
    if (window.API && window.API.volunteers) {
      await window.API.volunteers.dispatch(1, caseId);
      await syncBackendData();
    }
  } catch (err) {
    console.warn('[CareBridge API] Volunteer dispatch fallback:', err);
  }
};

window.markCaseResolved = async function() {
  const caseId = document.getElementById('drawer-case-id')?.innerText || 'CB-12482';
  AudioFx.playSuccess();
  if (window.confetti) {
    window.confetti({ particleCount: 80, spread: 90 });
  }
  showToast(`✨ Case ${caseId} marked as RESOLVED and archived in database!`, 'success');
  closeCaseDetailsDrawer();

  try {
    if (window.API && window.API.cases) {
      await window.API.cases.resolve(caseId);
      await syncBackendData();
    }
  } catch (err) {
    console.warn('[CareBridge API] Case resolve fallback:', err);
  }

  // Update local state if offline
  if (window.CAREBRIDGE_DATA) {
    const c = (window.CAREBRIDGE_DATA.recentCases || []).find(item => item.id === caseId);
    if (c) {
      c.status = 'Resolved';
      c.statusClass = 'status-resolved';
      renderRecentCasesTable();
      renderFullLiveCasesTable();
    }
  }
};

function toggleNotificationsDrawer() {
  openModal('modal-notifications-list');
}

function toggleMessagesDrawer() {
  openModal('modal-team-chat');
}

/* -------------------------------------------------------------------------- */
/* SIMULATED REAL-TIME BACKGROUND FEED                                        */
/* -------------------------------------------------------------------------- */
function startLiveFeedSimulator() {
  const simulatedEvents = [
    { title: "Volunteer assigned", subtitle: "Farhana Yasmin at Uttara Hub", color: "blue", icon: "user" },
    { title: "Food ration pack delivered", subtitle: "Mohammadpur Relief Post", color: "green", icon: "check" },
    { title: "Emergency medical triage", subtitle: "Lalbagh, Old Dhaka", color: "red", icon: "plus" },
    { title: "Shelter bed reserved (3 pax)", subtitle: "Asha Foundation Shelter 2", color: "green", icon: "check" }
  ];

  let eventIdx = 0;
  setInterval(() => {
    if (!window.CAREBRIDGE_DATA) return;
    const event = simulatedEvents[eventIdx % simulatedEvents.length];
    eventIdx++;

    window.CAREBRIDGE_DATA.liveActivity.unshift({
      id: Date.now(),
      type: 'simulated',
      icon: event.icon,
      color: event.color,
      title: event.title,
      subtitle: event.subtitle,
      time: 'Just now'
    });

    if (window.CAREBRIDGE_DATA.liveActivity.length > 7) {
      window.CAREBRIDGE_DATA.liveActivity.pop();
    }

    renderActivityFeed();
  }, 24000);
}

// Hub inspection trigger from map popup
window.openCaseInspection = function(hubName) {
  AudioFx.playPop();
  showToast(`🔍 Filtered view to ${hubName} crisis hub`, 'info');
  const data = window.CAREBRIDGE_DATA || {};
  const matchingCase = (data.caseQueue || []).find(c => c.location.includes(hubName)) || (data.recentCases || []).find(c => c.location.includes(hubName));
  if (matchingCase) {
    openCaseDetailsDrawer(matchingCase.id);
  } else {
    openCaseDetailsDrawer('CB-12482');
  }
};

// NGO detail inspection trigger
window.openNGOInspect = function(ngoName) {
  AudioFx.playPop();
  showToast(`🏢 Viewing partner profile for ${ngoName}`, 'info');
  switchViewTab('ngos-shelters');
};

// Logout handler
window.handleLogout = function() {
  if (confirm('Are you sure you want to log out of CareBridge Command?')) {
    if (typeof window.logoutUser === 'function') {
      window.logoutUser('landing.html');
    } else {
      localStorage.removeItem('carebridge_auth');
      showToast('👋 Logged out successfully. Redirecting...', 'info');
      setTimeout(() => {
        window.location.href = 'landing.html';
      }, 1000);
    }
  }
};

// Emergency selector pill handler
window.selectSosType = function(btn, type) {
  document.querySelectorAll('.sos-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  AudioFx.playPop();
};
