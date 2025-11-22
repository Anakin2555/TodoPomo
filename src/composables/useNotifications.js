import { ref } from 'vue'

/**
 * 通知管理 Composable
 * 管理系统通知、休息提醒和消息提示
 */
export function useNotifications() {
  // ======================================================================
  // 状态管理
  // ======================================================================
  const showMessage = ref(false)
  const messageText = ref('')
  const messageType = ref('error') // 'error' | 'success'

  // ======================================================================
  // 系统通知
  // ======================================================================

  /**
   * 显示系统通知
   * @param {Object} options - 通知选项
   * @param {String} options.title - 通知标题
   * @param {String} options.body - 通知内容
   */
  const showNotification = (options) => {
    if (!window.electronAPI?.showNotification) {
      console.warn('Notification API not available')
      return
    }

    window.electronAPI.showNotification({
      title: options.title || '提醒',
      body: options.body || ''
    })
  }

  /**
   * 显示任务到时提醒
   * @param {Object} task - 任务对象
   * @param {Number} minutesLeft - 剩余分钟数
   */
  const showTaskDueNotification = (task, minutesLeft) => {
    if (minutesLeft === 15) {
      showNotification({
        title: '任务即将到时',
        body: `距离任务到时 "${task.text}" 还有15分钟`
      })
    } else if (minutesLeft === 5) {
      showNotification({
        title: '任务即将到时',
        body: `距离任务到时 "${task.text}" 还有5分钟`
      })
    } else if (minutesLeft === 1) {
      showNotification({
        title: '任务即将到时',
        body: `距离任务到时 "${task.text}" 还有1分钟`
      })
    } else if (minutesLeft === 0) {
      showNotification({
        title: '任务到时提醒',
        body: `任务 "${task.text}" 到时了!`
      })
    }
  }

  /**
   * 显示任务选择提醒
   */
  const showTaskSelectionReminder = () => {
    showNotification({
      title: '任务选择提醒',
      body: '请选择或新建一个任务'
    })
  }

  /**
   * 显示休息结束提醒
   */
  const showBreakEndNotification = () => {
    showNotification({
      title: '休息结束!',
      body: '选择任务开始专注啦!'
    })
  }

  // ======================================================================
  // 休息提醒
  // ======================================================================

  /**
   * 显示休息提醒窗口
   * @param {String} breakType - 休息类型 'short' | 'long'
   * @param {Number} duration - 休息时长(秒)
   */
  const showBreakReminder = (breakType, duration) => {
    if (!window.electronAPI?.showBreakReminder) {
      console.warn('Break reminder API not available')
      return
    }

    window.electronAPI.showBreakReminder({
      text: '',
      duration: duration,
      breakType: breakType
    })
  }

  // ======================================================================
  // 页面消息提示
  // ======================================================================

  /**
   * 显示页面提示消息
   * @param {String} text - 提示文本
   * @param {String} type - 提示类型 'error' | 'success'
   * @param {Number} duration - 显示时长(毫秒),默认3000
   */
  const showTip = (text, type = 'error', duration = 3000) => {
    messageText.value = text
    messageType.value = type
    showMessage.value = true

    setTimeout(() => {
      showMessage.value = false
    }, duration)
  }

  /**
   * 显示成功提示
   * @param {String} text - 提示文本
   */
  const showSuccess = (text) => {
    showTip(text, 'success')
  }

  /**
   * 显示错误提示
   * @param {String} text - 提示文本
   */
  const showError = (text) => {
    showTip(text, 'error')
  }

  /**
   * 隐藏提示消息
   */
  const hideTip = () => {
    showMessage.value = false
  }

  // ======================================================================
  // 托盘更新
  // ======================================================================

  /**
   * 更新托盘信息
   * @param {Object} data - 托盘数据
   * @param {Number} data.time - 剩余时间(分钟)
   * @param {String} data.taskName - 任务名称
   * @param {Number|String} data.shortBreakTime - 距离小憩时间(分钟)
   */
  const updateTray = (data) => {
    if (!window.electronAPI?.updateTray) {
      return
    }

    window.electronAPI.updateTray({
      time: data.time,
      taskName: data.taskName || '专注',
      shortBreakTime: data.shortBreakTime
    })
  }

  /**
   * 计算距离下次小憩时间
   * @param {Number} timeLeftMinutes - 剩余时间(分钟)
   * @param {Number} focusTimeMinutes - 总专注时间(分钟)
   * @param {Number} shortBreakIntervalMinutes - 小憩间隔(分钟)
   * @returns {Number|String} 距离小憩时间(分钟)或'--'
   */
  const calculateShortBreakTime = (timeLeftMinutes, focusTimeMinutes, shortBreakIntervalMinutes) => {
    let shortBreakTime = shortBreakIntervalMinutes - (focusTimeMinutes - timeLeftMinutes) % shortBreakIntervalMinutes
    
    // 剩余小憩时间大于剩余总时间,则不显示
    if (shortBreakTime > timeLeftMinutes) {
      return '--'
    }
    
    return shortBreakTime
  }

  // ======================================================================
  // 返回公共接口
  // ======================================================================
  return {
    // 状态
    showMessage,
    messageText,
    messageType,

    // 系统通知
    showNotification,
    showTaskDueNotification,
    showTaskSelectionReminder,
    showBreakEndNotification,

    // 休息提醒
    showBreakReminder,

    // 页面提示
    showTip,
    showSuccess,
    showError,
    hideTip,

    // 托盘更新
    updateTray,
    calculateShortBreakTime
  }
}
