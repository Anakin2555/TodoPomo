const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
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
  onSystemIdle: (callback) => {
    ipcRenderer.on('system-idle', callback)
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

  showNotification: (options) => ipcRenderer.send('show-notification', options),

  updateTimerStatus: (status,needCleanupActive) => {
    ipcRenderer.send('update-timer-status', status,needCleanupActive)
  },
  onToggleTimer: (callback) => {
    ipcRenderer.on('toggle-timer', () => callback())
  },
  removeToggleTimer: () => {
    ipcRenderer.removeAllListeners('toggle-timer')
  }
}) 