const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron')
const path = require("path")
const Store = require('electron-store').default

const store = new Store({
  name: 'todo-pomodoro',
  defaults: {
    dailyRecords: {
      // '2024-01-20': {
      //   tasks: [],
      //   totalFocusTime: 0,
      //   focusHistory: [
      //     {
      //       taskName: "任务1",
      //       startTime: "14:30",
      //       endTime: "15:00",
      //       duration: 30
      //     }
      //   ]
      // }
    }
  }
})

let mainWindow
let tray = null

// 创建提醒窗口的函数
function createReminderWindow(text, duration) {
  // 获取主显示器
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  // 创建全屏窗口
  const reminderWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 加载本地HTML文件
  reminderWindow.loadFile(path.join(__dirname, 'reminder.html'))

  // 等待页面加载完成后发送数据
  reminderWindow.webContents.on('did-finish-load', () => {
    reminderWindow.webContents.send('reminder-data', { 
      text, 
      duration,
      audioPath: path.join(__dirname, 'assets', 'break-end.wav')
    })
    reminderWindow.setFullScreen(true)
  })

  // 指定时间后关闭窗口
  setTimeout(() => {
    if (!reminderWindow.isDestroyed()) {
      reminderWindow.close()
    }
  }, duration * 1000)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  // 加载应用
  mainWindow.loadURL("http://localhost:3002")
  
  // 创建系统托盘
  createTray()
  
  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  // 创建托盘图标
  tray = new Tray(path.join(__dirname, 'assets/icon.png'))
  
  // 托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示',
      click: () => {
        mainWindow.show()
      }
    },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])
  
  // 设置托盘提示文字
  tray.setToolTip('番茄工作法')
  
  // 设置托盘菜单
  tray.setContextMenu(contextMenu)
  
  // 点击托盘图标显示窗口
  tray.on('click', () => {
    mainWindow.show()
  })
}

// 保持应用活跃
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-background-networking')

// 监听计时器状态
ipcMain.on('update-tray', (event, { time, isRunning }) => {
  if (tray) {
    tray.setToolTip(`番茄工作法 ${isRunning ? '- ' + time : ''}`)
  }
})

// 监听渲染进程的消息
ipcMain.on('show-break-reminder', (event, data) => {
  createReminderWindow(data.text, data.duration)
  console.log(event,data)
})

// 获取当天日期字符串
function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

// 获取或创建当天的记录
function getTodayRecord() {
  const today = getTodayString()
  const dailyRecords = store.get('dailyRecords', {})
  if (!dailyRecords[today]) {
    dailyRecords[today] = {
      tasks: [],
      totalFocusTime: 0
    }
    store.set('dailyRecords', dailyRecords)
  }
  return dailyRecords[today]
}

// 处理任务相关的IPC
ipcMain.handle('add-task', (event, task) => {
  const today = getTodayString()
  const dailyRecords = store.get('dailyRecords', {})
  if (!dailyRecords[today]) {
    dailyRecords[today] = { tasks: [], totalFocusTime: 0 }
  }
  dailyRecords[today].tasks.push(task)
  store.set('dailyRecords', dailyRecords)
  return task
})

ipcMain.handle('update-task', (event, task) => {
  const today = getTodayString()
  const dailyRecords = store.get('dailyRecords', {})
  if (dailyRecords[today]) {
    const index = dailyRecords[today].tasks.findIndex(t => t.id === task.id)
    if (index !== -1) {
      dailyRecords[today].tasks[index] = task
      store.set('dailyRecords', dailyRecords)
    }
  }
  return task
})

ipcMain.handle('delete-task', (event, taskId) => {
  const today = getTodayString()
  const dailyRecords = store.get('dailyRecords', {})
  if (dailyRecords[today]) {
    dailyRecords[today].tasks = dailyRecords[today].tasks.filter(t => t.id !== taskId)
    store.set('dailyRecords', dailyRecords)
  }
  return taskId
})

ipcMain.handle('load-tasks', () => {
  const todayRecord = getTodayRecord()
  return todayRecord.tasks
})

ipcMain.handle('update-total-focus-time', (event, time) => {
  const today = getTodayString()
  const dailyRecords = store.get('dailyRecords', {})
  if (!dailyRecords[today]) {
    dailyRecords[today] = { tasks: [], totalFocusTime: 0 }
  }
  dailyRecords[today].totalFocusTime = time
  store.set('dailyRecords', dailyRecords)
  return time
})

ipcMain.handle('load-total-focus-time', () => {
  const todayRecord = getTodayRecord()
  return todayRecord.totalFocusTime
})

// 添加历史记录相关的IPC处理
ipcMain.handle('add-focus-record', (event, record) => {
  const today = getTodayString()
  const dailyRecords = store.get('dailyRecords', {})
  if (!dailyRecords[today]) {
    dailyRecords[today] = { tasks: [], totalFocusTime: 0, focusHistory: [] }
  }
  dailyRecords[today].focusHistory = dailyRecords[today].focusHistory || []
  dailyRecords[today].focusHistory.push(record)
  store.set('dailyRecords', dailyRecords)
  return record
})

// 获取历史记录
ipcMain.handle('load-focus-history', () => {
  const todayRecord = getTodayRecord()
  return todayRecord.focusHistory || []
})

// 在应用准备就绪时调用函数
app.whenReady().then(() => {
  createWindow()
})

// 证书的链接验证失败时，触发该事件 
app.on(
  "certificate-error",
  function (event, webContents, url, error, certificate, callback) {
    event.preventDefault();
    callback(true);
  }
);

// 处理窗口全部关闭事件
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
