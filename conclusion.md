# TodoPomo 番茄工作法工具项目总结

## 项目概述

TodoPomo 是一个基于 Electron + Vue 3 开发的桌面番茄工作法工具，旨在帮助用户提高工作效率，通过科学的番茄工作法来管理时间和任务。该工具结合了番茄计时器和任务管理功能，提供了完整的专注工作解决方案。

## 需求功能

### 1. 核心功能

#### 1.1 番茄计时器
- **专注时间设置**：默认40分钟，支持自定义时长（25分钟、45分钟、60分钟、90分钟、120分钟）
- **短休息提醒**：每15分钟自动提醒短休息（30秒）
- **长休息提醒**：专注结束后自动提醒长休息（5分钟）
- **计时器控制**：开始、暂停、重置功能
- **可视化进度**：环形进度条显示剩余时间

#### 1.2 任务管理
- **任务创建**：支持添加新任务，可设置任务时长（番茄钟数量）
- **任务编辑**：修改任务名称、时长等属性
- **任务删除**：删除不需要的任务
- **任务状态**：显示任务完成进度和状态
- **任务选择**：点击选择当前专注任务
- **任务导入**：支持批量导入任务

#### 1.3 专注记录
- **实时统计**：显示当日专注总时长
- **历史记录**：查看历史专注记录
- **进度追踪**：任务完成进度可视化
- **数据持久化**：本地存储专注数据

### 2. 智能功能

#### 2.1 系统监控
- **用户活动检测**：监控鼠标和键盘活动
- **空闲状态检测**：5分钟无活动自动暂停计时器
- **屏幕锁定检测**：息屏时自动暂停计时器
- **系统唤醒处理**：唤醒后恢复活动监控

#### 2.2 提醒系统
- **休息提醒**：全屏/窗口化休息提醒界面
- **系统通知**：任务到时、空闲提醒等
- **托盘显示**：显示当前任务和剩余时间
- **音频提醒**：休息开始和结束音频提示

#### 2.3 用户体验
- **深色主题**：统一的深色UI设计
- **响应式布局**：支持不同屏幕尺寸
- **快捷键支持**：全局快捷键控制
- **单实例运行**：防止多开应用

## 技术实现架构

### 1. 整体架构

```
TodoPomo/
├── electron/                 # Electron 主进程
│   ├── main.js              # 主进程入口
│   ├── preload.js           # 预加载脚本
│   ├── menu.js              # 菜单配置
│   └── assets/              # 资源文件
├── src/                     # Vue 渲染进程
│   ├── components/          # Vue 组件
│   ├── assets/              # 样式资源
│   └── main.js              # Vue 应用入口
├── public/                  # 静态资源
└── package.json             # 项目配置
```

### 2. 技术栈

#### 2.1 前端技术
- **Vue 3**：使用 Composition API 构建用户界面
- **Vite**：现代化的构建工具，提供快速开发体验
- **CSS3**：自定义样式，实现深色主题和响应式设计

#### 2.2 桌面应用技术
- **Electron**：跨平台桌面应用框架
- **electron-store**：本地数据持久化
- **robotjs**：系统级鼠标键盘监控
- **node-global-key-listener**：全局键盘监听

#### 2.3 开发工具
- **electron-builder**：应用打包和分发
- **concurrently**：并行运行开发服务器
- **cross-env**：跨平台环境变量设置

## 关键技术实现方式

### 1. 计时器实现

#### 1.1 核心计时逻辑
```javascript
// 计时器状态管理
const timeLeft = ref(FOCUS_TIME.value)
const isRunning = ref(false)
const timer = ref(null)

// 计时器控制
const startTimer = () => {
  if (!isRunning.value) {
    isRunning.value = true
    timer.value = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--
        // 检查短休息提醒
        checkShortBreak()
      } else {
        handleTimerComplete()
      }
    }, 1000)
  }
}
```

#### 1.2 进度可视化
```javascript
// 环形进度条计算
const radius = 145
const circumference = computed(() => 2 * Math.PI * radius)
const progressOffset = computed(() => {
  const progress = timeLeft.value / FOCUS_TIME.value
  return circumference.value * (1 - progress)
})
```

### 2. 系统监控实现

#### 2.1 用户活动检测
```javascript
// 鼠标活动监控
function checkUserActivity() {
  const currentMousePos = robot.getMousePos()
  const hasMouseMoved = 
    Math.abs(currentMousePos.x - lastMousePosition.x) > 3 || 
    Math.abs(currentMousePos.y - lastMousePosition.y) > 3
  
  if (hasMouseMoved) {
    updateLastActivity()
  } else if (idleTime > 5 * 60 * 1000) {
    isIdle = true
    mainWindow?.webContents.send('system-idle', true)
  }
}
```

#### 2.2 屏幕锁定检测
```javascript
// 监听屏幕锁定事件
powerMonitor.on('lock-screen', () => {
  isIdle = true
  mainWindow?.webContents.send('system-idle', true)
  cleanupActivityMonitoring()
})

// 监听屏幕解锁事件
powerMonitor.on('unlock-screen', () => {
  setupActivityMonitoring()
  setTimeout(() => {
    isIdle = true
    mainWindow?.webContents.send('system-idle', true)
  }, 2000)
})
```

### 3. 数据持久化实现

#### 3.1 本地存储结构
```javascript
const store = new Store({
  name: 'todo-pomodoro',
  defaults: {
    dailyRecords: {
      '2024-01-20': {
        tasks: [],
        totalFocusTime: 0,
        focusHistory: [
          {
            taskName: "任务1", 
            startTime: "14:30",
            endTime: "15:00",
            duration: 30
          }
        ]
      }
    }
  }
})
```

#### 3.2 IPC 通信
```javascript
// 主进程处理
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

// 渲染进程调用
const addTask = async () => {
  await window.electronAPI.addTask(task)
}
```

### 4. 休息提醒实现

#### 4.1 多屏幕支持
```javascript
function createReminderWindow(text, duration, breakType) {
  const displays = screen.getAllDisplays()
  reminderWindows = []

  displays.forEach((display) => {
    const { bounds } = display
    const reminderWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      frame: false,
      alwaysOnTop: true,
      backgroundColor: breakType === 'long' ? '#ffffff' : '#00f2ea'
    })
    reminderWindows.push(reminderWindow)
  })
}
```

#### 4.2 全屏模式
```javascript
if(fullScreen){
  reminderWindow.setMinimizable(false)
  reminderWindow.setMaximizable(false)
  reminderWindow.setResizable(false)
  reminderWindow.setFullScreen(true)
  reminderWindow.setAlwaysOnTop(true, 'screen-saver')
  
  // 注入JavaScript来捕获和阻止键盘事件
  reminderWindow.webContents.executeJavaScript(`
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      return false
    }, true)
  `)
}
```

### 5. 托盘功能实现

#### 5.1 托盘创建
```javascript
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/icon.png'))
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  updateTrayMenu()
}
```

#### 5.2 托盘菜单更新
```javascript
function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
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
      click: () => mainWindow.show()
    },
    {
      label: '退出',
      click: () => app.quit()
    }
  ])
  tray.setContextMenu(contextMenu)
}
```

## 未来优化方向

根据TODO文件中的记录，以下是需要优化的方向：

1. **时间管理优化**
   - 跨日重置问题：零点时强制重置
   - 暂停后提醒恢复功能
   - 任务到时提前提醒：5分钟、15分钟、30分钟

2. **用户体验改进**
   - 休息弹窗用户自定义选择：全屏或窗口化
   - 休息和小憩前的预告
   - 开始专注时的任务选择通知
   - Windows平台通知显示问题修复

3. **系统监控优化**
   - 手动暂停时的idle检测逻辑优化
   - 编辑正在执行的任务时长导致的计时问题修复

## 总结

TodoPomo是一个功能完整、用户体验良好的番茄工作法工具。通过Electron和Vue 3的结合，实现了桌面端的高效开发。项目在系统监控、数据持久化、多屏幕支持等方面都有深入的实现，为用户提供了专业的时间管理解决方案。未来将继续优化用户体验，增强系统稳定性，提供更好的工作效率提升工具。