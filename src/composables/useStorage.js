/**
 * 数据存储 Composable
 * 管理专注记录和数据持久化
 */
export function useStorage() {
  // ======================================================================
  // 工具函数
  // ======================================================================

  /**
   * 格式化日期为 YYYY-MM-DD
   * @param {Date} date - 日期对象
   * @returns {String} 格式化的日期字符串
   */
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 格式化时间为 HH:MM
   * @param {Date} date - 日期对象
   * @returns {String} 格式化的时间字符串
   */
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  /**
   * 获取今天的日期字符串
   * @returns {String} YYYY-MM-DD
   */
  const getTodayString = () => {
    return formatDate(new Date())
  }

  // ======================================================================
  // 核心方法
  // ======================================================================

  /**
   * 保存专注记录
   * @param {Object} focusRecord - 专注记录对象
   * @param {Object} task - 关联的任务对象(可选)
   * @returns {Promise<Boolean>} 是否保存成功
   */
  const saveFocusRecord = async (focusRecord, task = null) => {
    if (!focusRecord || !focusRecord.startTime) {
      return false
    }

    const { startTime, endTime, duration, isIdle } = focusRecord

    // 格式化时间
    const startTimeStr = formatTime(startTime)
    const endTimeStr = formatTime(endTime)

    // 如果时长小于5分钟则忽略(除非任务剩余时间也小于5分钟)
    const shouldSave = 
      (duration <= 4 && task && task.totalTime - task.completedTime <= 4) || 
      duration > 4

    if (!shouldSave) {
      return false
    }

    // 构建记录对象
    const record = {
      date: endTime.toISOString().split('T')[0],
      taskId: task?.id || '',
      taskName: task?.text || '专注',
      startTime: startTimeStr,
      endTime: endTimeStr,
      duration: duration
    }

    try {
      // 保存到存储
      if (window.electronAPI?.addFocusRecord) {
        await window.electronAPI.addFocusRecord(record)
      }

      // 如果有关联任务,更新任务
      if (task && window.electronAPI?.updateTask) {
        await window.electronAPI.updateTask({ ...task })
      }

      return true
    } catch (error) {
      console.error('Failed to save focus record:', error)
      return false
    }
  }

  /**
   * 加载专注历史记录
   * @param {String} date - 日期字符串 YYYY-MM-DD
   * @returns {Promise<Object>} 历史记录对象
   */
  const loadFocusHistory = async (date) => {
    try {
      if (window.electronAPI?.loadFocusHistory) {
        return await window.electronAPI.loadFocusHistory(date)
      }
      return null
    } catch (error) {
      console.error('Failed to load focus history:', error)
      return null
    }
  }

  /**
   * 加载总专注时间
   * @param {String} date - 日期字符串 YYYY-MM-DD
   * @returns {Promise<Number>} 总专注时间(分钟)
   */
  const loadTotalFocusTime = async (date) => {
    try {
      if (window.electronAPI?.loadTotalFocusTime) {
        return await window.electronAPI.loadTotalFocusTime(date)
      }
      return 0
    } catch (error) {
      console.error('Failed to load total focus time:', error)
      return 0
    }
  }

  /**
   * 加载月度记录
   * @param {Number} year - 年份
   * @param {Number} month - 月份(1-12)
   * @returns {Promise<Array>} 有记录的日期数组
   */
  const loadMonthRecords = async (year, month) => {
    try {
      if (window.electronAPI?.loadMonthRecords) {
        return await window.electronAPI.loadMonthRecords(year, month)
      }
      return []
    } catch (error) {
      console.error('Failed to load month records:', error)
      return []
    }
  }

  /**
   * 按日期加载任务
   * @param {String} date - 日期字符串 YYYY-MM-DD
   * @returns {Promise<Array>} 任务数组
   */
  const loadTasksByDate = async (date) => {
    try {
      if (window.electronAPI?.loadTasksByDate) {
        return await window.electronAPI.loadTasksByDate(date)
      }
      return []
    } catch (error) {
      console.error('Failed to load tasks by date:', error)
      return []
    }
  }

  /**
   * 设置空闲状态
   * @param {Boolean} status - 空闲状态
   */
  const setIdleStatus = async (status) => {
    try {
      if (window.electronAPI?.setIdleStatus) {
        await window.electronAPI.setIdleStatus(status)
      }
    } catch (error) {
      console.error('Failed to set idle status:', error)
    }
  }

  // ======================================================================
  // 返回公共接口
  // ======================================================================
  return {
    // 工具函数
    formatDate,
    formatTime,
    getTodayString,

    // 核心方法
    saveFocusRecord,
    loadFocusHistory,
    loadTotalFocusTime,
    loadMonthRecords,
    loadTasksByDate,
    setIdleStatus
  }
}
