const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  showBreakReminder: (data) => ipcRenderer.send('show-break-reminder', data),
  addTask: (task) => ipcRenderer.invoke('add-task', task),
  updateTask: (task) => ipcRenderer.invoke('update-task', task),
  deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),
  loadTasks: () => ipcRenderer.invoke('load-tasks'),
  loadTotalFocusTime:() => ipcRenderer.invoke('load-total-focus-time'),
  updateTotalFocusTime: (time) => ipcRenderer.invoke('update-total-focus-time', time),
  updateTray: (data) => ipcRenderer.send('update-tray', data),
  addFocusRecord: (record) => ipcRenderer.invoke('add-focus-record', record),
  loadFocusHistory: () => ipcRenderer.invoke('load-focus-history'),
  onSystemIdle: (callback) => {
    ipcRenderer.on('system-idle', callback)
  },
  removeSystemIdleListener: (callback) => {
    ipcRenderer.removeListener('system-idle', callback)
  }
}) 