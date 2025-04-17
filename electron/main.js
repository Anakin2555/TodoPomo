const { app, BrowserWindow, powerMonitor, ipcMain, screen, Tray, Menu, Notification } = require('electron')
const { GlobalKeyboardListener } = require('node-global-key-listener')
const robot = require('robotjs')
const path = require("path")
const Store = require('electron-store')
const { createMenu } = require(path.join(__dirname, 'menu.js'))

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


console.log(store.store)
let mainWindow
let tray = null
let lastActivityTime = Date.now()
let lastMousePosition = robot.getMousePos()
let activityCheckInterval
let isIdle = false
let reminderWindows = []
let reminderTimer=null

// 获取应用锁
const gotTheLock = app.requestSingleInstanceLock()

// 如果获取锁失败，说明已经有一个实例在运行
if (!gotTheLock) {
  app.quit()
  return
}

// 监听第二个实例的启动
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // 如果存在主窗口，则显示并聚焦它
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
  }
})

// 确保在app准备就绪后再设置监听器
app.whenReady().then(() => {
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log('createWindow')
    createWindow()
  }

  // 监听屏幕解锁事件
  powerMonitor.on('unlock-screen', () => {
    console.log('屏幕亮屏')

    // 恢复活动监控
    setupActivityMonitoring()

    setTimeout(() => {
      // 暂停番茄钟计时器
      isIdle = true
      mainWindow?.webContents.send('system-idle', true)
      console.log('系统唤醒重置计时器')
    }, 2000)
  })

  // 监听屏幕锁定事件
  powerMonitor.on('lock-screen', () => {
    console.log('屏幕息屏')

    // 关闭提醒窗口，息屏时不能关闭，否则有漏洞跳过休息
    // if (reminderTimer) {
    //   clearTimeout(reminderTimer)
    //   reminderTimer = null
    // }

    // if (reminderWindows.length > 0) {
    //   reminderWindows.forEach(window => {
    //     if (!window.isDestroyed()) {
    //       window.close()
    //     }
    //   })
    // }
    
    // 例如：暂停番茄钟计时器
    isIdle = true
    mainWindow?.webContents.send('system-idle', true)
    console.log('息屏发送idle信号')

    // 停止活动监控
    cleanupActivityMonitoring()

  })

  // // 监听系统唤醒事件
  // powerMonitor.on('resume', () => {
  //   console.log('系统唤醒')
    
  //   // 恢复活动监控
  //   setupActivityMonitoring()

  //   setTimeout(() => {
  //     // 暂停番茄钟计时器
  //     isIdle = true
  //     mainWindow?.webContents.send('system-idle', true)
  //     console.log('系统唤醒重置计时器')
  //   }, 3000)
  // })

  // // 监听系统睡眠事件
  // powerMonitor.on('suspend', () => {
  //   console.log('系统睡眠')
    
  //   // 关闭提醒窗口
  //   if (reminderTimer) {
  //     clearTimeout(reminderTimer)
  //     reminderTimer = null
  //   }

  //   if (reminderWindows.length > 0) {
  //     reminderWindows.forEach(window => {
  //       if (!window.isDestroyed()) {
  //         window.close()
  //       }
  //     })
  //   }
    
    

  //   // 停止活动监控
  //   cleanupActivityMonitoring()
  // })

  

  
  
  createTray()
})

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

  // 根据环境动态设置加载URL
  if (process.env.NODE_ENV === 'development') {
    // 开发模式
    mainWindow.loadURL("http://localhost:3002")
    // 可选：自动打开开发者工具
    // mainWindow.webContents.openDevTools()
  } else {
    // 生产模式
    mainWindow.loadURL(`file://${path.join(__dirname, "../dist/index.html")}`)
  }
  
  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })


  // 创建菜单并传入参数
  createMenu(mainWindow, {
    getAutoLaunchStatus: () => {
      return app.getLoginItemSettings().openAtLogin
    },
    setAutoLaunch: (enable) => {
      app.setLoginItemSettings({
        openAtLogin: enable,
        path: process.execPath
      })
      return app.getLoginItemSettings().openAtLogin
    }
  })

  setupActivityMonitoring()
}

// 创建提醒窗口的函数 - 支持多屏幕
function createReminderWindow(text, duration) {
  // 获取所有显示器
  const displays = screen.getAllDisplays()
  reminderWindows = []

  // 在每个显示器上创建提醒窗口
  displays.forEach((display) => {
    const { bounds } = display
    
    // 创建窗口，位置和大小与显示器匹配
    const reminderWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      frame: false,
      autoHideMenuBar: true,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,  // 禁止调整窗口大小
      movable: false,    // 禁止移动窗口
      fullscreenable: true,
      kiosk: true,       // 启用kiosk模式，可以帮助禁用某些系统快捷键
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: false  // 禁用开发者工具
      }
    })

    
    
    // 加载提醒页面
    reminderWindow.loadFile(path.join(__dirname, 'reminder.html'))

    // 设置窗口为全屏
    reminderWindow.setFullScreen(true)
    
    // 禁用窗口的最大化、最小化和关闭按钮
    reminderWindow.setMinimizable(false)
    reminderWindow.setMaximizable(false)
    
    // 设置窗口始终保持在最顶层
    reminderWindow.setAlwaysOnTop(true, 'screen-saver')
    
    // 监听窗口获取焦点事件，确保窗口始终保持焦点
    reminderWindow.on('blur', () => {
      reminderWindow.focus()
    })
    
    // 在页面加载完成后，注册全局快捷键拦截
    reminderWindow.webContents.on('did-finish-load', () => {
      // 发送数据到渲染进程
      reminderWindow.webContents.send('reminder-data', { 
        text, 
        duration,
        startAudioPath: path.join(__dirname, 'assets', 'break-start.wav'),
        endAudioPath: path.join(__dirname, 'assets', 'break-end.wav'),
        displayId: display.id
      })
      
      // 注入JavaScript来捕获和阻止键盘事件
      reminderWindow.webContents.executeJavaScript(`
        document.addEventListener('keydown', (e) => {
          // 阻止所有键盘事件
          e.preventDefault();
          e.stopPropagation();
          return false;
        }, true);
        
        // 禁用右键菜单
        document.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          return false;
        }, true);
      `)
    })
    
    // // 注册全局快捷键拦截器
    // const { globalShortcut } = require('electron')
    
    // // 根据操作系统确定要拦截的快捷键
    // const isMac = process.platform === 'darwin'
    
    // // 尝试拦截常见的系统快捷键
    // const shortcutsToBlock = [
    //   'Alt+Tab', 'Alt+F4', 
    //   'F11', 'Ctrl+Esc', 'Alt+Esc'
    // ]
    
    // // 添加特定于操作系统的快捷键
    // if (isMac) {
    //   // macOS 特定快捷键
    //   shortcutsToBlock.push(
    //     'Command+Tab', 'Command+Space', 'Command+Q',
    //     'Command+H', 'Command+M', 'Command+`',
    //     'Command+W', 'Command+Option+Esc'
    //   )
    // } else {
    //   // Windows 特定快捷键
    //   shortcutsToBlock.push(
    //     'CommandOrControl+Tab', 
    //     'CommandOrControl+Alt+Delete', 'CommandOrControl+Shift+Esc'
    //   )
    // }
    
    // shortcutsToBlock.forEach(shortcut => {
    //   try {
    //     globalShortcut.register(shortcut, () => {
    //       // 不执行任何操作，只是拦截快捷键
    //       console.log(`Blocked shortcut: ${shortcut}`)
    //       return false
    //     })
    //   } catch (error) {
    //     console.log(`Failed to register shortcut: ${shortcut}`, error)
    //   }
    // })
    
    // // 确保在窗口关闭时取消注册所有快捷键
    // reminderWindow.on('closed', () => {
    //   globalShortcut.unregisterAll()
    // })

    reminderWindows.push(reminderWindow)
  })

  // 指定时间后关闭所有窗口
  reminderTimer = setTimeout(() => {
    reminderWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close()
      }
    })
    isIdle = true
    console.log('休息结束进入idle状态')
    setupActivityMonitoring()
  }, duration * 1000+4000)

  // 返回窗口数组，以便在需要时可以从外部控制
  
}

// 检查用户活动
function checkUserActivity() {
  try {
    // 获取当前鼠标位置
    const currentMousePos = robot.getMousePos()
    // 检查鼠标是否移动
    const hasMouseMoved = 
      currentMousePos.x !== lastMousePosition.x || 
      currentMousePos.y !== lastMousePosition.y
    
    // 更新最后鼠标位置
    lastMousePosition = currentMousePos
    
    const currentTime = Date.now()
    const idleTime = currentTime - lastActivityTime
    // console.log('idleTime',idleTime)
    
    // 如果检测到活动，更新时间
    if (hasMouseMoved) {
      updateLastActivity()
      return
    }

    // 如果超过4.5分钟无活动并且之前不是idle状态则提醒即将进入idle
    if(idleTime >= 4.5 * 60 * 1000 && idleTime < 5 * 60 * 1000){
      if(!isIdle){
        // 发送系统通知提醒用户
        new Notification({
          title: '即将进入空闲状态！',
          body: '检测到很久没有活动，即将暂停计时器',
          silent: false
        }).show()
      }
    }
    
    // 如果超过5分钟无活动且之前不是idle状态
    if (idleTime > 5 * 60 * 1000) {
      isIdle = true
      lastActivityTime = Date.now() // 防止idle后一直发送消息
      console.log('5分钟无活动进入idle状态')
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
    console.log('检测到活动，从idle状态恢复')
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
    cleanupActivityMonitoring()
    activityCheckInterval = setInterval(checkUserActivity, 10000)
    console.log('setup activity monitoring')
    
  } catch (error) {
    console.error('Failed to setup activity monitoring:', error)
  }
}

// 清理监控
function cleanupActivityMonitoring() {
  console.log('cleanupActivityMonitoring')
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval)
    activityCheckInterval = null
  }
}

function createTray() {
  // 确保只创建一次托盘图标
  if (!tray) {
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
      },
      {
        label:'暂停',
        click:()=>{
          
        }
      }

    ])
    
    // 设置托盘提示文字
    tray.setToolTip('TodoPomo')
    
    // 设置托盘菜单
    tray.setContextMenu(contextMenu)
    
    // 点击托盘图标显示窗口
    tray.on('click', () => {
      mainWindow.show()
    })
  }
}

// 保持应用活跃
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-background-networking')

// 监听计时器状态
ipcMain.on('update-tray', (event, { time, taskName, shortBreakTime }) => {
  if (tray) {
    tray.setToolTip(`${taskName}中：\n\n${shortBreakTime}分钟后小憩 \n${time}分钟后休息`)
  }
})

// 监听渲染进程的消息
ipcMain.on('show-break-reminder', (event, data) => {

  // 休息时，更新最后活动时间，防止休息途中被判定为idle
  cleanupActivityMonitoring()

  lastActivityTime = Date.now() 
  console.log('show-break-reminder',data)
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

function getYesterdayString() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1); // 设置为昨天
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0'); // 月份从0开始
  const day = String(yesterday.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`; // 返回格式为 YYYY-MM-DD
}


// 获取或创建某天的记录
function getSomeDayRecord(date) {
  console.log('getSomeDayRecord',date)
  const dailyRecords = store.get('dailyRecords', {})
  if (!dailyRecords[date]) {
    dailyRecords[date] = {
      tasks: [],
      totalFocusTime: 0
    }
    store.set('dailyRecords', dailyRecords)
  }
  return dailyRecords[date]
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
  const today = getTodayString()
  const record = getSomeDayRecord(today)
  console.log('load-tasks',record)
  return record.tasks
})

// ipcMain.handle('update-total-focus-time', (event, startTime,time) => {
//   const today = getTodayString();
//   const now = new Date();
//   const startDate = new Date(startTime); // 👈 时间戳转 Date
//   const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
//   const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

//   console.log(startTime,startDateOnly,nowDateOnly)
//   // 检查开始时间是否为前一天
//   if (startDateOnly.getTime() < nowDateOnly.getTime()) {
//     const yesterday = getYesterdayString();
//     const dailyRecords = store.get('dailyRecords', {});
    
//     // 确保昨天的记录存在
//     if (!dailyRecords[yesterday]) {
//       dailyRecords[yesterday] = { tasks: [], totalFocusTime: 0 };
//     }
//     dailyRecords[yesterday].totalFocusTime += time; // 增加到昨天的记录
//     store.set('dailyRecords', dailyRecords);
//   } else {
//     const dailyRecords = store.get('dailyRecords', {});
//     if (!dailyRecords[today]) {
//       dailyRecords[today] = { tasks: [], totalFocusTime: 0 };
//     }
//     dailyRecords[today].totalFocusTime += time; // 增加到今天的记录
//     store.set('dailyRecords', dailyRecords);
//   }
//   return time;
// })

ipcMain.handle('load-total-focus-time', (event, date) => {
  const record = getSomeDayRecord(date)
  // console.log(todayRecord)
  return record.totalFocusTime
})

// 添加历史记录相关的IPC处理
ipcMain.handle('add-focus-record', (event, record) => {
  const today = getTodayString()
  const yesterday = getYesterdayString()
  const dailyRecords = store.get('dailyRecords', {})

  // 判断是否跨天（结束时间小于开始时间）
  const isOvernight = record.endTime < record.startTime

  // 确定记录应该保存到哪一天
  const targetDate = isOvernight ? yesterday : today

  // 确保目标日期的记录存在
  if (!dailyRecords[targetDate]) {
    dailyRecords[targetDate] = { 
      tasks: [], 
      totalFocusTime: 0, 
      focusHistory: [] 
    }
  }
  
  dailyRecords[targetDate].focusHistory = dailyRecords[targetDate].focusHistory || []
  dailyRecords[targetDate].focusHistory.push(record)
  dailyRecords[targetDate].totalFocusTime += record.duration
  
  store.set('dailyRecords', dailyRecords)
  return record
})

// 获取历史记录
ipcMain.handle('load-focus-history', (event, date) => {

  const record = getSomeDayRecord(date)
  return record.focusHistory || []
})

// 添加 IPC 处理程序
ipcMain.on('show-notification', (event, options) => {
  console.log('show-notification',options)
  new Notification({
    title: options.title || '提醒',  // 添加默认标题
    body: options.body || '',        // 添加默认内容
    silent: false
  }).show()
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

// 处理应用激活事件
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 确保在应用退出时清理托盘图标
app.on('before-quit', () => {
  if (tray) {
    tray.destroy()
    tray = null
  }
})


