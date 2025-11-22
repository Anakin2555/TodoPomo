const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 蓝牙通信
  scan: () => ipcRenderer.invoke('ble:scan'),
  connect: (address) => ipcRenderer.invoke('ble:connect', address),
  disconnect: (address) => ipcRenderer.invoke('ble:disconnect', address),

  
  showBreakReminder: (data) => ipcRenderer.send('show-break-reminder', data),
  addTask: (task) => ipcRenderer.invoke('add-task', task),
  updateTask: (task) => ipcRenderer.invoke('update-task', task),
  deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),
  loadTasks: () => ipcRenderer.invoke('load-tasks'),
  loadTotalFocusTime:(date) => ipcRenderer.invoke('load-total-focus-time',date),
  updateTray: (data) => ipcRenderer.send('update-tray', data),
  addFocusRecord: (record) => ipcRenderer.invoke('add-focus-record', record),
  loadFocusHistory: (date) => ipcRenderer.invoke('load-focus-history',date),
  loadMonthRecords: (year, month) => ipcRenderer.invoke('load-month-records', year, month), 
  loadTasksByDate: (date) => ipcRenderer.invoke('load-tasks-by-date', date),
  setIdleStatus: (status) => ipcRenderer.invoke('set-idle-status', status),
  onSystemIdle: (callback) => {
    ipcRenderer.on('system-idle', callback)
  },
  onRefreshData: (callback) => {
    ipcRenderer.on('refresh-data', callback)
  },
  removeRefreshDataListener: (callback) => {
    ipcRenderer.removeListener('refresh-data', callback)
  },
  removeSystemIdleListener: (callback) => {
    ipcRenderer.removeListener('system-idle', callback)
  },
  onShortBreakIntervalChanged: (callback) =>
    ipcRenderer.on('short-break-interval-changed', (_, value) => callback(value)),
  
  onFocusDurationChanged: (callback) =>
    ipcRenderer.on('focus-duration-changed', (_, value) => callback(value)),
  
  onShortBreakDurationChanged: (callback) =>
    ipcRenderer.on('short-break-duration-changed', (_, value) => callback(value)),
  
  onBreakDurationChanged: (callback) =>
    ipcRenderer.on('break-duration-changed', (_, value) => callback(value)),
  
  onDailyFocusTargetChanged: (callback)=>
    ipcRenderer.on('daily-focus-target-changed',(_,value)=>callback(value)),
  
  onTaskSelectionReminderChanged: (callback)=>
    ipcRenderer.on('task-selection-reminder-changed',(_,value)=>callback(value)),

  showNotification: (options) => ipcRenderer.send('show-notification', options),

  showNotificationExplicit: (options) => ipcRenderer.send('show-notification-explicit', options),

  updateTimerStatus: (status, needCleanupActivity) => {
    ipcRenderer.send('update-timer-status', status, needCleanupActivity)
  },
  onToggleTimer: (callback) => {
    ipcRenderer.on('toggle-timer', () => callback())
  },
  removeToggleTimer: () => {
    ipcRenderer.removeAllListeners('toggle-timer')
  }
}) 