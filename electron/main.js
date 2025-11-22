const { app, BrowserWindow, powerMonitor, ipcMain, screen, Tray, Menu, Notification } = require('electron')
const { GlobalKeyboardListener } = require('node-global-key-listener')
const robot = require('robotjs')
const path = require("path")
const Store = require('electron-store')
const { systemNotify }=require(path.join(__dirname,'utils/notification.js'))
const { createMenu, settingsStore } = require(path.join(__dirname, 'menu.js'))
const { desktopCapturer } = require('electron')

// 创建全局键盘监听器
const keyboard = new GlobalKeyboardListener()
// const { bluetooth }=require('node-ble')




// 获取系统最上层窗口
async function getTopWindow() {
  const sources = await desktopCapturer.getSources({ types: ['window'] })
  
  return sources[0].name
}

// const ble=bluetooth()
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
let notificationWindow
let tray = null
let lastActivityTime = Date.now()
let lastMousePosition = robot.getMousePos()
let activityCheckInterval
let isIdle = true
let reminderWindows = []
let reminderTimer = null
let isTimerRunning = true
let isFirstCheck = true

// 添加通知节流相关变量
let lastIdleWarningTime = 0
const IDLE_WARNING_COOLDOWN = 20 * 1000 // 20s冷却时间

// 获取应用锁
const gotTheLock = app.requestSingleInstanceLock()

// 如果获取锁失败，说明已经有一个实例在运行
if (!gotTheLock) {
    app.quit()
    return
}

const isWindows = process.platform === 'win32';
let needsFocusFix = false;
let triggeringProgrammaticBlur = false;

app.on('blur', (event) => {
    if (!triggeringProgrammaticBlur) {
        needsFocusFix = true;
    }
})


app.on('focus', (event) => {
    if (isWindows && needsFocusFix) {
        needsFocusFix = false;
        triggeringProgrammaticBlur = true;
        setTimeout(function() {
            win.blur();
            win.focus();
            setTimeout(function() {
                triggeringProgrammaticBlur = false;
            }, 100);
        }, 100);
    }
})


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
app.whenReady().then(async() => {
    if (BrowserWindow.getAllWindows().length === 0) {
        console.log('createWindow')
        createWindow()
    }

    // 监听屏幕解锁事件
    powerMonitor.on('unlock-screen', () => {
        console.log('屏幕亮屏')

        

        // 恢复活动监控
        setupActivityMonitoring()

        // 如果还在强制休息中则不
        if(reminderTimer||reminderWindows.length>0){
            return
        }
        
        mainWindow?.webContents.send('refresh-data')
        // setTimeout(() => {
        //     // 暂停番茄钟计时器
        //     isIdle = true
        //     mainWindow?.webContents.send('system-idle', true, 'unlock-screen')
        //     console.log('系统唤醒重置计时器')
        // }, 2000)
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
        mainWindow?.webContents.send('system-idle', true, 'lock-screen')
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

    //   // // 关闭提醒窗口
    //   // if (reminderTimer) {
    //   //   clearTimeout(reminderTimer)
    //   //   reminderTimer = null
    //   // }

    //   // if (reminderWindows.length > 0) {
    //   //   reminderWindows.forEach(window => {
    //   //     if (!window.isDestroyed()) {
    //   //       window.close()
    //   //     }
    //   //   })
    //   // }

    //   isIdle = true
    //   mainWindow?.webContents.send('system-idle', true)
    //   console.log('睡眠发送idle信号')



    //   // 停止活动监控
    //   cleanupActivityMonitoring()
    // })

    createTray()

     // 监听 menu 发过来的事件
    ipcMain.on('menu-setting-changed', (event, { key, value }) => {
        console.log('主进程收到设置更新:', key, value);
        if(key === 'activityMonitoring'){
            if(value){
                setupActivityMonitoring()
            }else{
                cleanupActivityMonitoring()
            }
        }
    });
})

// === 蓝牙事件处理 ===
ipcMain.handle('ble:scan', async () => {
    const adapter = await ble.defaultAdapter();
    await adapter.open();

    const devices = [];

    adapter.on('device', device => {
        devices.push({
        address: device.address,
        name: device.name,
        });
    });

    await adapter.startDiscovery();
    console.log('Scanning for BLE devices...');
    await new Promise(r => setTimeout(r, 5000)); // 扫描5秒
    await adapter.stopDiscovery();
    console.log('Scan complete.');

    return devices;
});

ipcMain.handle('ble:connect', async (event, address) => {
    const adapter = await ble.defaultAdapter();
    const device = await adapter.waitDevice(address);
    await device.connect();
    console.log(`Connected to ${address}`);
    return { connected: true };
});

ipcMain.handle('ble:disconnect', async (event, address) => {
    const adapter = await ble.defaultAdapter();
    const device = await adapter.waitDevice(address);
    await device.disconnect();
    console.log(`Disconnected from ${address}`);
    return { disconnected: true };
});
  

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
    createMenu(mainWindow)

    setTimeout(() => {
        setupActivityMonitoring()
    }, 5000)
}

// 创建提醒窗口的函数 - 支持多屏幕
function createReminderWindow(text, duration, breakType) {
    // 获取所有显示器
    const displays = screen.getAllDisplays()
    reminderWindows = []

    // 在每个显示器上创建提醒窗口
    displays.forEach((display) => {
        const { bounds } = display
        const fullScreen = settingsStore.get('fullScreen')
        console.log('fullScreen', fullScreen)

        const fullscreenOptions = {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            frame: false,
            autoHideMenuBar: true,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false, // 禁止调整窗口大小
            movable: false, // 禁止移动窗口
            backgroundColor: breakType === 'long' ? '#ffffff' : '#00f2ea',
            fullscreenable: true,
            kiosk: true, // 启用kiosk模式，可以帮助禁用某些系统快捷键
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                devTools: false // 禁用开发者工具
            }
        }
        const windowScreenOptions = {
                width: 1200,
                height: 800,
                alwaysOnTop: true,
                autoHideMenuBar: true,
                icon: path.join(__dirname, 'assets/icon.png'),
                backgroundColor: breakType === 'long' ? '#ffffff' : '#00f2ea',
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    devTools: false // 禁用开发者工具
                }
            }
            // 创建窗口，位置和大小与显示器匹配
        const reminderWindow = new BrowserWindow(fullScreen ? fullscreenOptions : windowScreenOptions)


        // 加载提醒页面
        reminderWindow.loadFile(path.join(__dirname, 'reminder.html'))


        // 在页面加载完成后，注册全局快捷键拦截
        reminderWindow.webContents.on('did-finish-load', () => {
            // 发送数据到渲染进程
            reminderWindow.webContents.send('reminder-data', {
                text,
                duration,
                breakType,
                startAudioPath: path.join(__dirname, 'assets', 'break-start-new.wav'),
                endAudioPath: path.join(__dirname, 'assets', 'break-end.wav'),
                displayId: display.id
            })

            // 监听窗口获取焦点事件，确保窗口始终保持焦点
            reminderWindow.on('blur', () => {
                reminderWindow.focus()
            })

            if (fullScreen) {
                // 禁用窗口的最大化、最小化和关闭按钮
                reminderWindow.setMinimizable(false)
                reminderWindow.setMaximizable(false)
                reminderWindow.setResizable(false)
                    // 设置窗口为全屏
                reminderWindow.setFullScreen(true)
                    // 设置窗口始终保持在最顶层
                reminderWindow.setAlwaysOnTop(true, 'screen-saver')
                    // 注入JavaScript来捕获和阻止键盘事件
                    // reminderWindow.webContents.executeJavaScript(`
                    //   // document.addEventListener('keydown', (e) => {
                    //   //   // 阻止所有键盘事件
                    //   //   e.preventDefault();
                    //   //   e.stopPropagation();
                    //   //   return false;
                    //   // }, true);

                //   // 禁用右键菜单
                //   document.addEventListener('contextmenu', (e) => {
                //     e.preventDefault();
                //     return false;
                //   }, true);
                // `)
            }
        })
        reminderWindows.push(reminderWindow)
    })

    // 指定时间后关闭所有窗口
    reminderTimer = setTimeout(() => {
        reminderWindows.forEach(window => {
            if (!window.isDestroyed()) {
                window.close()
            }
        })
        systemNotify('休息结束！','选择任务开始专注啦！',false,3000)

        isIdle = true
        console.log('休息结束进入idle状态')
        setupActivityMonitoring()
    }, duration * 1000 + 4000)
}

// 检查用户鼠标活动
function checkUserActivity() {
    try {
        // 获取最上层应用窗口
        // getTopWindow().then(window => {
        //     console.log('topWindow', window)
        // })


        // 获取当前鼠标位置
        const currentMousePos = robot.getMousePos()

        // 如果是首次检查，只记录位置，不判断移动
        if (isFirstCheck) {
            lastMousePosition = currentMousePos
            lastActivityTime = Date.now()
            isFirstCheck = false
            return
        }

        // 检查鼠标是否移动
        const hasMouseMoved =
            Math.abs(currentMousePos.x - lastMousePosition.x) > 3 ||
            Math.abs(currentMousePos.y - lastMousePosition.y) > 3 // 添加阈值，避免微小抖动

        console.log('hasMouseMoved', hasMouseMoved)

        // 更新最后鼠标位置
        lastMousePosition = currentMousePos

        const currentTime = Date.now()
        const idleTime = currentTime - lastActivityTime

        // 如果检测到活动，更新时间
        if (hasMouseMoved) {
            updateLastActivity()
            return
        }

        // 如果超过4分钟无活动并且之前不是idle状态则提醒即将进入idle
        if (idleTime >= 4 * 60 * 1000 && idleTime < 5 * 60 * 1000) {
            if (!isIdle) {
                const currentTime = Date.now()
                    // 检查是否在冷却期内
                if (currentTime - lastIdleWarningTime > IDLE_WARNING_COOLDOWN) {
                    // 发送系统通知提醒用户
                    systemNotify('即将进入空闲状态！','检测到很久没有活动，即将暂停计时器。',false,6000)
                    lastIdleWarningTime = currentTime
                }
            }
        }

        // 如果超过5分钟无活动且之前不是idle状态
        if (idleTime > 5 * 60 * 1000) {
            isIdle = true
            lastActivityTime = Date.now() // 防止idle后一直发送消息
            console.log('5分钟无活动进入idle状态')
                // 通知渲染进程
            mainWindow?.webContents.send('system-idle', true, 'check-user-activity')
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
        console.log('从idle状态恢复，当前时间:', new Date().toLocaleTimeString())
        mainWindow?.webContents.send('system-idle', false, 'check-user-activity')
    }
}

// 设置活动监控
function setupActivityMonitoring() {
    if (!settingsStore.get('activityMonitoring')) {
        console.log('activityMonitoring is false,不进行活动监控')
        return
    }
    try {
        // 未解锁时不进行活动监控
        if (powerMonitor.getSystemIdleState(1) === 'locked') {
            console.log('系统被锁定，不进行活动监控')
            return
        }

        isFirstCheck = true

        // 监听键盘事件
        keyboard.addListener(function(e) {
            updateLastActivity()

        })

        // 初始化最后鼠标位置
        lastMousePosition = robot.getMousePos()
        lastActivityTime = Date.now()

        // 设置检查间隔（建议改为更短的间隔，比如5秒）
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
    // 取消键盘监听
    keyboard.removeListener(function(e) {
        updateLastActivity()
    })

}

function createTray() {
    tray = new Tray(path.join(__dirname, 'assets/icon.png'))

    // 添加点击事件处理
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore()
            }
            mainWindow.show()
            mainWindow.focus()
        }
    })

    updateTrayMenu()
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
    console.log('show-break-reminder', data)
    createReminderWindow(data.text, data.duration, data.breakType)

    // console.log(event,data)
})

// 监听清理活动监控的消息
ipcMain.on('change-activity-monitoring', (event, checked) => {
    console.log('Received change-activity-monitoring request')
    if (checked) {
        setupActivityMonitoring()
    } else {
        cleanupActivityMonitoring()
    }
})

// 获取当天日期字符串
function getTodayString() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// function getYesterdayString() {
//     const yesterday = new Date();
//     yesterday.setDate(yesterday.getDate() - 1); // 设置为昨天
//     const year = yesterday.getFullYear();
//     const month = String(yesterday.getMonth() + 1).padStart(2, '0'); // 月份从0开始
//     const day = String(yesterday.getDate()).padStart(2, '0');

//     return `${year}-${month}-${day}`; // 返回格式为 YYYY-MM-DD
// }


// 获取或创建某天的记录
function getSomeDayRecord(date) {
    console.log('getSomeDayRecord', date)
    const dailyRecords = store.get('dailyRecords', {})
    if (!dailyRecords[date]) {
        dailyRecords[date] = {
            tasks: [],
            totalFocusTime: 0,
            focusHistory: []
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
    console.log('update-task', task)
    const dailyRecords = store.get('dailyRecords', {})
    if (dailyRecords[today]) {
        const index = dailyRecords[today].tasks.findIndex(t => t.id === task.id)
        if (index !== -1) {
            const records = dailyRecords[today].focusHistory || []
            task.completedTime = records.reduce((acc, record) => {
                if (record.taskId === task.id) {
                    acc += record.duration
                }
                return acc
            }, 0)
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
    console.log('delete-task', taskId)
    return taskId
})

ipcMain.handle('load-tasks', () => {
    const today = getTodayString()
    const record = getSomeDayRecord(today)
    console.log('load-tasks', record)
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
ipcMain.handle('set-idle-status', (event, status) => {
    isIdle = status
    console.log('set-idle-status', status)
})
ipcMain.handle('load-total-focus-time', (event, date) => {
    const record = getSomeDayRecord(date)
        // console.log(todayRecord)
    return record.totalFocusTime
})

// 添加历史记录相关的IPC处理
ipcMain.handle('add-focus-record', (event, record) => {
    // const today = getTodayString()
    // const yesterday = getYesterdayString()
    const dailyRecords = store.get('dailyRecords', {})

    // 判断是否跨天（结束时间小于开始时间）
    //const isOvernight = record.endTime < record.startTime

    // 确定记录应该保存到哪一天
    //const targetDate = isOvernight ? yesterday : today】
    const targetDate = record.date

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
    return record
})

// 获取当月有记录的日期
ipcMain.handle('load-month-records', (event, year, month) => {
    // 获取所有日期记录
    const dailyRecords = store.get('dailyRecords', {})

    // 过滤出指定年月的日期，且总专注时长不为0
    const datesWithRecords = Object.keys(dailyRecords).filter(dateStr => {
        // 日期格式为 YYYY-MM-DD
        const parts = dateStr.split('-')
        const recordYear = parseInt(parts[0])
        const recordMonth = parseInt(parts[1])

        // 增加判断条件：总专注时长必须大于0才算有记录
        return recordYear === year &&
            recordMonth === month &&
            dailyRecords[dateStr].totalFocusTime > 0
    })

    // 返回有记录的日期
    return datesWithRecords
})

// 获取指定日期的任务
ipcMain.handle('load-tasks-by-date', (event, date) => {
    const record = getSomeDayRecord(date)
    console.log('load-tasks-by-date', record)
    return record.tasks
})

// 创建系统自带提醒
ipcMain.on('show-notification', (event, options) => {
    console.log('show-notification', options)
    systemNotify(options.title||'提醒',options.body||'',false,'TodoPomo',path.join(__dirname,'assets/icon.png'))
    
    // if (mainWindow) {
    //   if (mainWindow.isMinimized()) {
    //     mainWindow.restore()
    //   }
    //   mainWindow.show()
    //   mainWindow.focus()
    // }

    // 添加点击事件处理
    // n.on('click', () => {
    //     // 确保主窗口存在
    //     if (mainWindow) {
    //         // 如果窗口最小化了，恢复它
    //         if (mainWindow.isMinimized()) {
    //             mainWindow.restore()
    //         }
    //         // 显示并聚焦窗口
    //         mainWindow.show()
    //         mainWindow.focus()
    //     }
    // })

})

ipcMain.on('show-notification-explicit', (event, options) => {
    console.log('show-notification-explicit', options)
        // 获取主屏幕尺寸
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize


    // 创建通知窗口
    if (notificationWindow && !notificationWindow.isDestroyed()) {
        return
    }
    notificationWindow = new BrowserWindow({
        width: 400,
        height: 120,
        x: Math.floor(width / 2 - 200), // 居中显示
        y: Math.floor(height / 2 - 60),
        frame: false, // 无边框
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        backgroundColor: '#252525',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    // 加载通知HTML内容
    notificationWindow.loadFile(path.join(__dirname, 'notification.html'))

    // 在页面加载完成后发送通知数据
    notificationWindow.webContents.on('did-finish-load', () => {
        notificationWindow.webContents.send('notification-data', {
            title: options.title || '提醒',
            body: options.body || '',
        })
    })
})

// 添加处理打开主窗口的IPC监听器
ipcMain.on('open-main-window', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
    }
})

// 监听渲染进程发来的状态更新
ipcMain.on('update-timer-status', (_, running, needCleanupActivity) => {
    isTimerRunning = running
        // console.log(isTimerRunning)
    if (!isTimerRunning) {
        tray.setToolTip(`已暂停`)
        console.log('tooltip已设为已暂停')
            // 空闲导致的暂停计时器则不清理用户动作监控
        if (needCleanupActivity) {
            cleanupActivityMonitoring()
        }
    } else {
        tray.setToolTip(`运行中`)
        console.log('tooltip已设为运行中')
        setupActivityMonitoring()
    }
    updateTrayMenu()
})

// 证书的链接验证失败时，触发该事件 
app.on(
    "certificate-error",
    function(event, webContents, url, error, certificate, callback) {
        event.preventDefault();
        callback(true);
    }
);

// 处理窗口全部关闭事件
app.on('window-all-closed', () => {
    console.log('window-all-closed')
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
app.on('before-quit', async() => {
    console.log('before-quit')
    app.isQuitting = true

    // 发送 idle 信号给渲染进程，触发保存操作
    mainWindow?.webContents.send('system-idle', true, 'before-quit')
        // 等待一小段时间确保渲染进程有足够时间保存数据
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 清理活动监控
    cleanupActivityMonitoring()

    // 销毁所有窗口
    if (mainWindow) {
        mainWindow.destroy()
    }

    // 清理提醒窗口
    if (reminderWindows.length > 0) {
        reminderWindows.forEach(window => {
            if (!window.isDestroyed()) {
                window.destroy()
            }
        })
    }

    // 清理提醒计时器
    if (reminderTimer) {
        clearTimeout(reminderTimer)
        reminderTimer = null
    }

    // 销毁托盘
    if (tray) {
        tray.destroy()
        tray = null
    }

})

// 更新托盘菜单项
function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([{
            label: isTimerRunning ? '暂停' : '开始',
            click: () => {
                isTimerRunning = !isTimerRunning
                mainWindow.webContents.send('toggle-timer')
                updateTrayMenu()
            }
        },
        { type: 'separator' },
        {
            label: '主界面',
            click: () => {
                mainWindow.show()
            }
        },
        {
            label: '退出',
            click: async() => {

                console.log('托盘手动退出')

                // 触发beforequit
                app.quit()
                    // 强制退出应用
                setTimeout(() => {
                    app.exit(0)
                }, 5000)
            }
        }
    ])
    tray.setContextMenu(contextMenu)
}

if (process.platform === 'win32') {
    // app.setAppUserModelId(process.execPath) // 打包后使用
    // 或者使用固定的应用ID
    app.setAppUserModelId('TodoPomo')
}

app.setName('TodoPomo') // 设置应用名称