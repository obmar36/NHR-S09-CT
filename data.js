window.S09CT_DATA = {
  generatedAt: "2026-06-24T11:32:00+08:00",
  organization: {
    name: "Nietzsche Enterprise Co., Ltd.",
    shortName: "NHR",
    tariff: 3.5,
    emissionFactor: 0.494,
    currency: "TWD"
  },
  sites: [
    { id: "STN-01", name: "西湖服務區", region: "苗栗縣", capacity: 1200, currentPower: 842, todayEnergy: 6.32, expectedEnergy: 6.86, pr: 86.4, availability: 99.2, irradiation: 824, openAlerts: 0, onlineDevices: 8, totalDevices: 8, lat: 24.561, lng: 120.760, status: "normal", lastReport: "12 秒前" },
    { id: "STN-02", name: "泰安服務區", region: "台中市", capacity: 900, currentPower: 615, todayEnergy: 4.78, expectedEnergy: 5.10, pr: 83.1, availability: 98.8, irradiation: 798, openAlerts: 1, onlineDevices: 6, totalDevices: 6, lat: 24.324, lng: 120.728, status: "warning", lastReport: "24 秒前" },
    { id: "STN-03", name: "清水服務區", region: "台中市", capacity: 1500, currentPower: 611, todayEnergy: 5.10, expectedEnergy: 7.18, pr: 71.2, availability: 94.6, irradiation: 836, openAlerts: 2, onlineDevices: 9, totalDevices: 10, lat: 24.277, lng: 120.601, status: "critical", lastReport: "41 秒前" },
    { id: "STN-04", name: "西螺服務區", region: "雲林縣", capacity: 750, currentPower: 486, todayEnergy: 3.82, expectedEnergy: 4.16, pr: 82.9, availability: 97.7, irradiation: 779, openAlerts: 1, onlineDevices: 5, totalDevices: 5, lat: 23.787, lng: 120.466, status: "warning", lastReport: "18 秒前" },
    { id: "STN-05", name: "南投服務區", region: "南投縣", capacity: 980, currentPower: 704, todayEnergy: 5.46, expectedEnergy: 5.72, pr: 85.7, availability: 99.0, irradiation: 812, openAlerts: 0, onlineDevices: 7, totalDevices: 7, lat: 23.906, lng: 120.685, status: "normal", lastReport: "16 秒前" }
  ],
  dashboardSeries: {
    labels: ["05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"],
    actual: [0,75,280,680,1350,1960,2315,2554,2480,2240,1850,1280,610,90],
    expected: [0,90,330,760,1490,2110,2520,2760,2710,2410,2010,1420,720,120],
    irradiance: [0,85,250,510,690,810,895,940,910,820,690,480,250,30]
  },
  dailyGeneration: {
    labels: ["06/18","06/19","06/20","06/21","06/22","06/23","06/24"],
    actual: [25.8,27.4,23.1,29.2,28.6,26.9,20.0],
    expected: [27.0,28.0,27.6,29.7,29.1,28.4,23.3]
  },
  currentSeries: {
    labels: ["09:00","09:15","09:30","09:45","10:00","10:15","10:30","10:45","11:00","11:15","11:30"],
    L1: [16.2,16.8,17.4,18.1,18.5,18.7,18.9,18.6,18.4,18.3,18.4],
    L2: [15.9,16.5,17.1,17.7,18.0,18.3,18.5,18.3,18.2,18.0,18.1],
    L3: [16.1,16.6,17.2,17.8,18.1,17.9,16.8,15.9,15.2,14.8,14.9]
  },
  alerts: [
    { id: "ALT-260624-004", severity: "critical", siteId: "STN-03", site: "清水服務區", device: "S09CT-QS03-INV02", channel: "L3", type: "電流異常偏低", value: "14.9 A", baseline: "18.2 A", duration: "24 分鐘", loss: 42.8, status: "new", assignee: "未指派", occurredAt: "2026-06-24 11:08", description: "L3 電流低於同組平均 18.1%，且持續超過 15 分鐘。" },
    { id: "ALT-260624-003", severity: "critical", siteId: "STN-03", site: "清水服務區", device: "S09CT-QS03-INV05", channel: "DEV", type: "裝置離線", value: "41 分鐘", baseline: "回報間隔 5 分鐘", duration: "41 分鐘", loss: 31.4, status: "assigned", assignee: "林維運", occurredAt: "2026-06-24 10:51", description: "裝置連續遺失 8 次回報，需確認供電與行動網路。" },
    { id: "ALT-260624-002", severity: "warning", siteId: "STN-02", site: "泰安服務區", device: "S09CT-TA02-DB01", channel: "L1/L2/L3", type: "三相電流不平衡", value: "11.8%", baseline: "門檻 10%", duration: "17 分鐘", loss: 9.6, status: "in_progress", assignee: "陳工程師", occurredAt: "2026-06-24 10:42", description: "三相不平衡率超過門檻，建議檢查交流盤與負載分配。" },
    { id: "ALT-260624-001", severity: "warning", siteId: "STN-04", site: "西螺服務區", device: "S09CT-XL04-INV01", channel: "L2", type: "長時間低電流", value: "12.7 A", baseline: "同組 15.1 A", duration: "36 分鐘", loss: 18.2, status: "acknowledged", assignee: "王技師", occurredAt: "2026-06-24 09:56", description: "日照正常，L2 電流相較同組低 15.9%。" },
    { id: "ALT-260623-021", severity: "info", siteId: "STN-01", site: "西湖服務區", device: "S09CT-XH01-INV04", channel: "DEV", type: "通訊恢復", value: "已恢復", baseline: "—", duration: "9 分鐘", loss: 0, status: "closed", assignee: "系統", occurredAt: "2026-06-23 16:18", description: "NB-IoT 通訊已自動恢復。" }
  ],
  devices: [
    { id: "S09CT-XH01-INV01", siteId: "STN-01", site: "西湖服務區", location: "INV-01 交流盤", mode: "三相交流", network: "NB-IoT", operator: "Chunghwa", signal: -72, rsrp: -94, firmware: "1.3.8", power: "24V DC", completeness: 99.8, lastReport: "12 秒前", status: "online", channels: [18.4,18.1,17.9] },
    { id: "S09CT-XH01-INV02", siteId: "STN-01", site: "西湖服務區", location: "INV-02 交流盤", mode: "三相交流", network: "NB-IoT", operator: "Chunghwa", signal: -76, rsrp: -98, firmware: "1.3.8", power: "24V DC", completeness: 99.5, lastReport: "18 秒前", status: "online", channels: [17.6,17.5,17.8] },
    { id: "S09CT-TA02-DB01", siteId: "STN-02", site: "泰安服務區", location: "主配電盤 DB-01", mode: "三相交流", network: "LTE-M", operator: "FarEasTone", signal: -81, rsrp: -102, firmware: "1.3.7", power: "12V DC", completeness: 98.7, lastReport: "24 秒前", status: "warning", channels: [19.2,17.8,16.9] },
    { id: "S09CT-QS03-INV02", siteId: "STN-03", site: "清水服務區", location: "INV-02 交流盤", mode: "三相交流", network: "NB-IoT", operator: "Taiwan Mobile", signal: -87, rsrp: -108, firmware: "1.3.7", power: "24V DC", completeness: 97.2, lastReport: "41 秒前", status: "critical", channels: [18.4,18.1,14.9] },
    { id: "S09CT-QS03-INV05", siteId: "STN-03", site: "清水服務區", location: "INV-05 交流盤", mode: "三相交流", network: "NB-IoT", operator: "Taiwan Mobile", signal: -112, rsrp: -126, firmware: "1.3.5", power: "24V DC", completeness: 84.1, lastReport: "41 分鐘前", status: "offline", channels: [0,0,0] },
    { id: "S09CT-XL04-INV01", siteId: "STN-04", site: "西螺服務區", location: "INV-01 交流盤", mode: "三相交流", network: "LTE-M", operator: "Chunghwa", signal: -79, rsrp: -101, firmware: "1.3.8", power: "24V DC", completeness: 98.9, lastReport: "18 秒前", status: "warning", channels: [15.4,12.7,15.1] },
    { id: "S09CT-NT05-INV01", siteId: "STN-05", site: "南投服務區", location: "INV-01 交流盤", mode: "三相交流", network: "NB-IoT", operator: "Chunghwa", signal: -74, rsrp: -96, firmware: "1.3.8", power: "24V DC", completeness: 99.4, lastReport: "16 秒前", status: "online", channels: [16.8,16.6,16.9] }
  ],
  reports: [
    { name: "2026 年 6 月太陽能營運月報", type: "月報", period: "2026/06/01–2026/06/24", generated: "尚未產生" },
    { name: "場站告警與維運處置報告", type: "維運", period: "2026/06/01–2026/06/24", generated: "2026/06/24 09:00" },
    { name: "再生能源與碳減量摘要", type: "ESG", period: "2026 Q2", generated: "2026/06/23 17:30" }
  ]
};
