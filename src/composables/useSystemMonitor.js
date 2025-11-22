import { onMounted, onUnmounted } from 'vue'

/**
 * 系统监控 Composable
 * 管理系统空闲检测和事件监听
 */
export function useSystemMonitor() {
  // ======================================================================
  // 事件处理器
  // ======================================================================

  /**
   * 处理系统空闲事件
   * @param {Function} onIdle - 空闲时的回调
   * @param {Function} onActive - 活跃时的回调
   * @returns {Function} 事件处理函数
   */
  const createIdleHandler = (onIdle, onActive) => {
    return (event, isIdle, context) => {
      console.log('System idle state changed:', isIdle, context)
      
      if (isIdle && onIdle) {
        onIdle(context)
      } else if (!isIdle && onActive) {
        onActive(context)
      }
    }
  }

  /**
   * 处理数据刷新事件
   * @param {Function} onRefresh - 刷新时的回调
   * @returns {Function} 事件处理函数
   */
  const createRefreshHandler = (onRefresh) => {
    return () => {
      console.log('Refresh data requested')
      if (onRefresh) {
        onRefresh()
      }
    }
  }

  // ======================================================================
  // 生命周期管理
  // ======================================================================

  /**
   * 设置系统监控
   * @param {Object} callbacks - 回调函数集合
   * @param {Function} callbacks.onIdle - 空闲回调
   * @param {Function} callbacks.onActive - 活跃回调
   * @param {Function} callbacks.onRefresh - 刷新回调
   */
  const setupMonitoring = (callbacks = {}) => {
    const { onIdle, onActive, onRefresh } = callbacks

    onMounted(() => {
      // 监听系统空闲状态
      if (window.electronAPI?.onSystemIdle) {
        const idleHandler = createIdleHandler(onIdle, onActive)
        window.electronAPI.onSystemIdle(idleHandler)
      }

      // 监听数据刷新请求
      if (window.electronAPI?.onRefreshData && onRefresh) {
        const refreshHandler = createRefreshHandler(onRefresh)
        window.electronAPI.onRefreshData(refreshHandler)
      }

      console.log('System monitoring setup complete')
    })

    onUnmounted(() => {
      // 清理监听器
      if (window.electronAPI?.removeSystemIdleListener) {
        window.electronAPI.removeSystemIdleListener()
      }

      if (window.electronAPI?.removeRefreshData) {
        window.electronAPI.removeRefreshData()
      }

      console.log('System monitoring cleanup complete')
    })
  }

  /**
   * 手动监听系统空闲(不使用生命周期钩子)
   * @param {Function} onIdle - 空闲回调
   * @param {Function} onActive - 活跃回调
   * @returns {Function} 清理函数
   */
  const watchSystemIdle = (onIdle, onActive) => {
    if (!window.electronAPI?.onSystemIdle) {
      return () => {}
    }

    const handler = createIdleHandler(onIdle, onActive)
    window.electronAPI.onSystemIdle(handler)

    // 返回清理函数
    return () => {
      if (window.electronAPI?.removeSystemIdleListener) {
        window.electronAPI.removeSystemIdleListener(handler)
      }
    }
  }

  /**
   * 手动监听数据刷新(不使用生命周期钩子)
   * @param {Function} onRefresh - 刷新回调
   * @returns {Function} 清理函数
   */
  const watchRefreshData = (onRefresh) => {
    if (!window.electronAPI?.onRefreshData) {
      return () => {}
    }

    const handler = createRefreshHandler(onRefresh)
    window.electronAPI.onRefreshData(handler)

    // 返回清理函数
    return () => {
      if (window.electronAPI?.removeRefreshData) {
        window.electronAPI.removeRefreshData(handler)
      }
    }
  }

  // ======================================================================
  // 配置监听
  // ======================================================================

  /**
   * 监听配置变化
   * @param {Object} callbacks - 配置变化回调函数集合
   */
  const watchConfigChanges = (callbacks = {}) => {
    const {
      onFocusDurationChanged,
      onShortBreakDurationChanged,
      onShortBreakIntervalChanged,
      onBreakDurationChanged,
      onDailyFocusTargetChanged,
      onTaskSelectionReminderChanged
    } = callbacks

    onMounted(() => {
      // 专注时长变化
      if (window.electronAPI?.onFocusDurationChanged && onFocusDurationChanged) {
        window.electronAPI.onFocusDurationChanged(onFocusDurationChanged)
      }

      // 短休息时长变化
      if (window.electronAPI?.onShortBreakDurationChanged && onShortBreakDurationChanged) {
        window.electronAPI.onShortBreakDurationChanged(onShortBreakDurationChanged)
      }

      // 短休息间隔变化
      if (window.electronAPI?.onShortBreakIntervalChanged && onShortBreakIntervalChanged) {
        window.electronAPI.onShortBreakIntervalChanged(onShortBreakIntervalChanged)
      }

      // 长休息时长变化
      if (window.electronAPI?.onBreakDurationChanged && onBreakDurationChanged) {
        window.electronAPI.onBreakDurationChanged(onBreakDurationChanged)
      }

      // 每日目标变化
      if (window.electronAPI?.onDailyFocusTargetChanged && onDailyFocusTargetChanged) {
        window.electronAPI.onDailyFocusTargetChanged(onDailyFocusTargetChanged)
      }

      // 任务选择提醒变化
      if (window.electronAPI?.onTaskSelectionReminderChanged && onTaskSelectionReminderChanged) {
        window.electronAPI.onTaskSelectionReminderChanged(onTaskSelectionReminderChanged)
      }

      console.log('Config watchers setup complete')
    })
  }

  /**
   * 监听托盘计时器控制
   * @param {Function} onToggle - 切换回调
   * @returns {Function} 清理函数
   */
  const watchTrayToggle = (onToggle) => {
    if (!window.electronAPI?.onToggleTimer) {
      return () => {}
    }

    onMounted(() => {
      window.electronAPI.onToggleTimer(onToggle)
    })

    onUnmounted(() => {
      if (window.electronAPI?.removeToggleTimer) {
        window.electronAPI.removeToggleTimer()
      }
    })

    return () => {
      if (window.electronAPI?.removeToggleTimer) {
        window.electronAPI.removeToggleTimer()
      }
    }
  }

  // ======================================================================
  // 返回公共接口
  // ======================================================================
  return {
    setupMonitoring,
    watchSystemIdle,
    watchRefreshData,
    watchConfigChanges,
    watchTrayToggle,
    createIdleHandler,
    createRefreshHandler
  }
}
