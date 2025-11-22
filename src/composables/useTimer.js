import { ref, computed } from 'vue'

/**
 * 番茄计时器 Composable
 * 管理计时器状态和核心逻辑
 */
export function useTimer(config = {}) {
  // ======================================================================
  // 配置项
  // ======================================================================
  const FOCUS_TIME = ref(config.focusTime || 40 * 60)          // 专注时长(秒)
  const SHORT_BREAK_TIME = ref(config.shortBreakTime || 30)    // 短休息时长(秒)
  const LONG_BREAK_TIME = ref(config.longBreakTime || 5 * 60)  // 长休息时长(秒)
  const SHORT_BREAK_INTERVAL = ref(config.shortBreakInterval || 15 * 60) // 短休息间隔(秒)

  // ======================================================================
  // 状态管理
  // ======================================================================
  const timeLeft = ref(FOCUS_TIME.value)    // 剩余时间
  const isStart = ref(false)                // 是否已开始
  const isPause = ref(false)                // 用户是否暂停
  const isRunning = ref(false)              // 是否正在运行
  const timer = ref(null)                   // 定时器实例
  const lastBreakTime = ref(0)              // 上次休息时间点
  const focusStartTime = ref(null)          // 专注开始时间

  // ======================================================================
  // 计算属性
  // ======================================================================
  
  // 剩余分钟数
  const timeLeftMinutes = computed(() => Math.floor((timeLeft.value - 1) / 60))

  // 环形进度条参数
  const radius = 145
  const circumference = computed(() => 2 * Math.PI * radius)
  
  // 进度偏移量
  const progressOffset = computed(() => {
    const progress = timeLeft.value / FOCUS_TIME.value
    return circumference.value * (1 - progress)
  })

  // 格式化时间显示 (MM:SS)
  const formattedTime = computed(() => {
    const minutes = Math.floor(timeLeft.value / 60)
    const seconds = timeLeft.value % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  // ======================================================================
  // 核心方法
  // ======================================================================

  /**
   * 开始计时器
   * @param {Function} onTick - 每秒回调
   * @param {Function} onShortBreak - 短休息回调
   * @param {Function} onComplete - 完成回调
   */
  const startTimer = (callbacks = {}) => {
    const { onTick, onShortBreak, onComplete } = callbacks

    if (!isRunning.value) {
      // 记录开始时间
      if (!isStart.value) {
        focusStartTime.value = new Date()
      }

      isRunning.value = true
      isStart.value = true
      isPause.value = false

      // 通知主进程更新状态
      if (window.electronAPI?.updateTimerStatus) {
        window.electronAPI.updateTimerStatus(true)
      }

      timer.value = setInterval(() => {
        if (timeLeft.value > 0) {
          timeLeft.value--

          // 执行每秒回调
          if (onTick) {
            onTick(timeLeft.value)
          }

          // 检查是否需要短休息
          // 剩余时间大于短休息间隔的60%时才检查
          if (timeLeft.value >= SHORT_BREAK_INTERVAL.value * 0.6) {
            const timePassed = FOCUS_TIME.value - timeLeft.value
            if (timePassed - lastBreakTime.value >= SHORT_BREAK_INTERVAL.value) {
              lastBreakTime.value = timePassed
              
              // 触发短休息
              if (onShortBreak) {
                onShortBreak()
              }
              
              pauseTimer(true)
            }
          }
        } else {
          // 计时完成
          if (onComplete) {
            onComplete()
          }
          resetTimer()
        }
      }, 1000)
    }
  }

  /**
   * 暂停计时器
   * @param {Boolean} needCleanupActivity - 是否需要清理活动监控
   */
  const pauseTimer = (needCleanupActivity = true) => {
    clearInterval(timer.value)
    isRunning.value = false

    // 通知主进程状态变化
    if (window.electronAPI?.updateTimerStatus) {
      window.electronAPI.updateTimerStatus(false, needCleanupActivity)
    }
  }

  /**
   * 重置计时器
   * @param {Boolean} isIdle - 是否因空闲重置
   * @returns {Object} 专注记录数据
   */
  const resetTimer = (isIdle = false) => {
    pauseTimer(false)

    // 准备返回的专注记录数据
    let focusRecord = null
    if (focusStartTime.value) {
      const endTime = new Date(isIdle ? Date.now() - 1000 * 60 * 5 : Date.now())
      const duration = 
        endTime.getHours() * 60 + endTime.getMinutes() -
        focusStartTime.value.getHours() * 60 - focusStartTime.value.getMinutes()

      focusRecord = {
        startTime: focusStartTime.value,
        endTime: endTime,
        duration: duration,
        isIdle: isIdle
      }
    }

    // 重置所有状态
    focusStartTime.value = null
    lastBreakTime.value = 0
    timeLeft.value = FOCUS_TIME.value
    isStart.value = false

    return focusRecord
  }

  /**
   * 控制计时器(开始/暂停切换)
   * @param {Object} callbacks - 回调函数
   */
  const controlTimer = (callbacks = {}) => {
    if (isRunning.value && !isPause.value) {
      isPause.value = true
      pauseTimer(true)
      resetTimer()
    } else {
      startTimer(callbacks)
    }
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  const updateConfig = (newConfig) => {
    if (newConfig.focusTime !== undefined) {
      FOCUS_TIME.value = newConfig.focusTime * 60
      if (!isStart.value) {
        timeLeft.value = FOCUS_TIME.value
      }
    }
    if (newConfig.shortBreakTime !== undefined) {
      SHORT_BREAK_TIME.value = newConfig.shortBreakTime
    }
    if (newConfig.longBreakTime !== undefined) {
      LONG_BREAK_TIME.value = newConfig.longBreakTime * 60
    }
    if (newConfig.shortBreakInterval !== undefined) {
      SHORT_BREAK_INTERVAL.value = newConfig.shortBreakInterval * 60
    }
  }

  /**
   * 处理系统空闲状态
   * @param {Boolean} idle - 是否空闲
   * @param {Object} callbacks - 回调函数
   */
  const handleSystemIdle = (idle, callbacks = {}) => {
    const { onIdle, onActive } = callbacks

    if (idle) {
      // 进入空闲状态
      const record = resetTimer(true)
      if (onIdle) {
        onIdle(record)
      }
    } else if (!idle && !isRunning.value && !isPause.value) {
      // 从空闲恢复
      if (onActive) {
        onActive()
      }
      // 可以选择自动开始或等待用户操作
      // startTimer(callbacks)
    }
  }

  // ======================================================================
  // 返回公共接口
  // ======================================================================
  return {
    // 状态
    timeLeft,
    isStart,
    isPause,
    isRunning,
    focusStartTime,
    
    // 配置
    FOCUS_TIME,
    SHORT_BREAK_TIME,
    LONG_BREAK_TIME,
    SHORT_BREAK_INTERVAL,
    
    // 计算属性
    timeLeftMinutes,
    circumference,
    progressOffset,
    formattedTime,
    radius,
    
    // 方法
    startTimer,
    pauseTimer,
    resetTimer,
    controlTimer,
    updateConfig,
    handleSystemIdle
  }
}
