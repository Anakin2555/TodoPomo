const { app, Menu } = require('electron')
const Store = require('electron-store')

// 创建 store 实例
const store = new Store({
  name: 'settings',
  defaults: {
    autoLaunch: false,
    focusDuration: 25,
    shortBreakInterval: 15,
    shortBreakDuration: 30,
    longBreakDuration: 5,
    dailyFocusTarget: 8
  }
})

function createMenuItem(label, value, settingKey, eventName, mainWindow) {
  return {
    label,
    type: 'radio',
    checked: store.get(settingKey) === value,
    click: (menuItem, browserWindow) => {
      store.set(settingKey, value)
      mainWindow?.webContents.send(eventName, value)
    }
  }
}

function createMenu(mainWindow) {
  const isMac = process.platform === 'darwin'
  
  // 获取自动启动状态
  function getAutoLaunchStatus() {
    return store.get('autoLaunch')
  }

  // 设置自动启动
  function setAutoLaunch(enable) {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath
    })
    store.set('autoLaunch', enable)
    return enable
  }
  
  const template = [
    // macOS 应用菜单
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    
    // // 文件菜单
    // {
    //   label: 'File',
    //   submenu: [
    //     isMac ? { role: 'close' } : { role: 'quit' }
    //   ]
    // },
    
    // // 编辑菜单
    // {
    //   label: 'Edit',
    //   submenu: [
    //     { role: 'undo' },
    //     { role: 'redo' },
    //     { type: 'separator' },
    //     { role: 'cut' },
    //     { role: 'copy' },
    //     { role: 'paste' }
    //   ]
    // },
    
    // 设置菜单
    {
      label: 'Settings',
      submenu: [
        {
          label: '自动启动',
          type: 'checkbox',
          checked: getAutoLaunchStatus(),
          click: async (menuItem) => {
            const result = await setAutoLaunch(menuItem.checked)
            menuItem.checked = result
            mainWindow?.webContents.send('auto-launch-changed', result)
          }
        },
        { type: 'separator' },
        {
          label: '专注时长（多久长休息一次）',
          submenu: [
            createMenuItem('5分钟', 5, 'focusDuration', 'focus-duration-changed', mainWindow),
            createMenuItem('25分钟', 25, 'focusDuration', 'focus-duration-changed', mainWindow),
            createMenuItem('30分钟', 30, 'focusDuration', 'focus-duration-changed', mainWindow),
            createMenuItem('35分钟', 35, 'focusDuration', 'focus-duration-changed', mainWindow),
            createMenuItem('40分钟', 40, 'focusDuration', 'focus-duration-changed', mainWindow),
            createMenuItem('45分钟', 45, 'focusDuration', 'focus-duration-changed', mainWindow),
            createMenuItem('50分钟', 50, 'focusDuration', 'focus-duration-changed', mainWindow),
            createMenuItem('60分钟', 60, 'focusDuration', 'focus-duration-changed', mainWindow)
          ]
        },
        {
          label: '小憩间隔（多久小憩一次）',
          submenu: [
            createMenuItem('1分钟', 1, 'shortBreakInterval', 'short-break-interval-changed', mainWindow),
            createMenuItem('10分钟', 10, 'shortBreakInterval', 'short-break-interval-changed', mainWindow),
            createMenuItem('15分钟', 15, 'shortBreakInterval', 'short-break-interval-changed', mainWindow),
            createMenuItem('20分钟', 20, 'shortBreakInterval', 'short-break-interval-changed', mainWindow),
            createMenuItem('25分钟', 25, 'shortBreakInterval', 'short-break-interval-changed', mainWindow),
            createMenuItem('30分钟', 30, 'shortBreakInterval', 'short-break-interval-changed', mainWindow)
          ]
        },
        {
          label: '小憩时长',
          submenu: [
            createMenuItem('10秒', 10, 'shortBreakDuration', 'short-break-duration-changed', mainWindow),
            createMenuItem('20秒', 20, 'shortBreakDuration', 'short-break-duration-changed', mainWindow),
            createMenuItem('30秒', 30, 'shortBreakDuration', 'short-break-duration-changed', mainWindow),
            createMenuItem('40秒', 40, 'shortBreakDuration', 'short-break-duration-changed', mainWindow),
            createMenuItem('50秒', 50, 'shortBreakDuration', 'short-break-duration-changed', mainWindow),
            createMenuItem('60秒', 60, 'shortBreakDuration', 'short-break-duration-changed', mainWindow),
            createMenuItem('2分钟', 120, 'shortBreakDuration', 'short-break-duration-changed', mainWindow)
          ]
        },
        {
          label: '长休息时长',
          submenu: [
            createMenuItem('1分钟', 1, 'longBreakDuration', 'break-duration-changed', mainWindow),
            createMenuItem('5分钟', 5, 'longBreakDuration', 'break-duration-changed', mainWindow),
            createMenuItem('10分钟', 10, 'longBreakDuration', 'break-duration-changed', mainWindow),
            createMenuItem('15分钟', 15, 'longBreakDuration', 'break-duration-changed', mainWindow),
            createMenuItem('20分钟', 20, 'longBreakDuration', 'break-duration-changed', mainWindow)
          ]
        },
        {
          label: '目标工作时间',
          submenu: [
            createMenuItem('5小时', 5, 'dailyFocusTarget', 'daily-focus-target-changed', mainWindow),
            createMenuItem('6小时', 6, 'dailyFocusTarget', 'daily-focus-target-changed', mainWindow),
            createMenuItem('7小时', 7, 'dailyFocusTarget', 'daily-focus-target-changed', mainWindow),
            createMenuItem('8小时', 8, 'dailyFocusTarget', 'daily-focus-target-changed', mainWindow),
            createMenuItem('9小时', 9, 'dailyFocusTarget', 'daily-focus-target-changed', mainWindow),
            createMenuItem('10小时', 10, 'dailyFocusTarget', 'daily-focus-target-changed', mainWindow),
            createMenuItem('12小时', 12, 'dailyFocusTarget', 'daily-focus-target-changed', mainWindow),
            createMenuItem('14小时', 14, 'dailyFocusTarget', 'daily-focus-target-changed', mainWindow)
          ]
        }
      ]
    },
    
    // 视图菜单
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // 初始化时发送所有设置到渲染进程
  mainWindow?.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('auto-launch-changed', store.get('autoLaunch'))
    mainWindow.webContents.send('focus-duration-changed', store.get('focusDuration'))
    mainWindow.webContents.send('short-break-interval-changed', store.get('shortBreakInterval'))
    mainWindow.webContents.send('short-break-duration-changed', store.get('shortBreakDuration'))
    mainWindow.webContents.send('break-duration-changed', store.get('longBreakDuration'))
  })
}

module.exports = { createMenu }
