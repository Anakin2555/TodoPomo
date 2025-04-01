const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron')
const { GlobalKeyboardListener } = require('node-global-key-listener')
const robot = require('robotjs')
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
let lastActivityTime = Date.now()
let lastMousePosition = robot.getMousePos()
let activityCheckInterval
let isIdle = false




// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  // 加载应用

  // 开发模式
  mainWindow.loadURL("http://localhost:3002")

  // 生产模式
  // mainWindow.loadURL(`file://${path.join(__dirname, "../dist/index.html")}`);
  
  // 创建系统托盘
  createTray()
  
  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  setupActivityMonitoring()
}








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
      isIdle = true
      console.log('休息结束进入idle状态')
    }
  }, duration * 1000)
}

// 检查用户活动
function checkUserActivity() {
  try {
    // 获取当前鼠标位置
    const currentMousePos = robot.getMousePos()
    
    // 检查屏幕是否处于活动状态
    const displays = screen.getAllDisplays()
    const isScreenActive = displays.some(display => !display.internal || display.powerState === 'on')
    
    // 检查鼠标是否移动
    const hasMouseMoved = 
      currentMousePos.x !== lastMousePosition.x || 
      currentMousePos.y !== lastMousePosition.y
    
    // 更新最后鼠标位置
    lastMousePosition = currentMousePos
    
    const currentTime = Date.now()
    const idleTime = currentTime - lastActivityTime
    
    // 如果检测到活动，更新时间
    if (hasMouseMoved) {
      updateLastActivity()
      return
    }
    
    // 如果超过2分钟无活动且之前不是idle状态
    if (idleTime > 6 * 60 * 1000 || !isScreenActive) {
      isIdle = true
      lastActivityTime = Date.now() // 防止idle后一直发送消息
      console.log('进入idle状态')
      // 通知渲染进程
      mainWindow?.webContents.send('system-idle', true)
    }
    
  } catch (error) {
    console.error('Error checking user activity:', error)
  }
}

// 更新最后活动时间
function updateLastActivity() {
  const previousState = isIdle
  lastActivityTime = Date.now()
  isIdle = false
  
  // 如果状态从idle变为active，通知渲染进程
  if (previousState) {
    console.log('从idle状态恢复')
    mainWindow?.webContents.send('system-idle', false)
  }
}

// 设置活动监控
function setupActivityMonitoring() {
  try {

    // // 创建全局键盘监听器
    const keyboard = new GlobalKeyboardListener()
    
    // 监听键盘事件
    keyboard.addListener(function(e) {
      updateLastActivity()
      
    })


    // 初始化最后鼠标位置
    lastMousePosition = robot.getMousePos()
    lastActivityTime = Date.now()
    
    // 设置检查间隔（每十秒检查一次）
    activityCheckInterval = setInterval(checkUserActivity, 10000)
    
  } catch (error) {
    console.error('Failed to setup activity monitoring:', error)
  }
}

// 清理监控
function cleanupActivityMonitoring() {
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval)
    activityCheckInterval = null
  }
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
  // console.log(event,data)
})

// 获取当天日期字符串
function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取或创建当天的记录
function getTodayRecord() {
  const today = getTodayString()
  console.log(today)
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
  cleanupActivityMonitoring()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
