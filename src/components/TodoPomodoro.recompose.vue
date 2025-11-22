<script setup>
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import PomodoroTimer from './pomodoro/PomodoroTimer.vue'
import TaskSection from './tasks/TaskSection.vue'
import DailyProgress from './stats/DailyProgress.vue'
import FocusHistory from './FocusHistory.vue'
import TaskEditModal from './TaskEditModal.vue'
import ImportTaskModal from './ImportTaskModal.vue'

// Composables
import { useTimer } from '../composables/useTimer'
import { useStorage } from '../composables/useStorage'
import { useSystemMonitor } from '../composables/useSystemMonitor'
import { useNotifications } from '../composables/useNotifications'

// ======================================================================
// 配置和常量
// ======================================================================
const FOCUS_TIME = ref(40 * 60)          // 40分钟专注
const SHORT_BREAK_TIME = ref(30)         // 30秒短休息
const LONG_BREAK_TIME = ref(5 * 60)      // 5分钟长休息
const SHORT_BREAK_INTERVAL = ref(15 * 60) // 每15分钟提醒一次短休息
const DAILY_FOCUS_TARGET = ref(8 * 60)   // 每日目标专注时间（8小时）
const TASK_SELECTION_REMINDER = ref(true)

// ======================================================================
// Composables 初始化
// ======================================================================
const timerConfig = computed(() => ({
  focusTime: FOCUS_TIME.value,
  shortBreakTime: SHORT_BREAK_TIME.value,
  longBreakTime: LONG_BREAK_TIME.value,
  shortBreakInterval: SHORT_BREAK_INTERVAL.value
}))

const {
  showMessage,
  messageText,
  messageType,
  showNotification,
  showTaskDueNotification,
  showTaskSelectionReminder,
  showBreakEndNotification,
  showBreakReminder,
  showTip,
  showSuccess,
  showError,
  updateTray,
  calculateShortBreakTime
} = useNotifications()

const {
  formatDate,
  getTodayString,
  saveFocusRecord,
  loadTotalFocusTime,
  setIdleStatus
} = useStorage()

const { setupMonitoring, watchConfigChanges, watchTrayToggle } = useSystemMonitor()

// ======================================================================
// 状态管理
// ======================================================================
const timerRef = ref(null)
const taskSectionRef = ref(null)
const historyRef = ref(null)

const currentTask = ref(null)
const totalFocusTime = ref(0)
const canWatch = ref(false) // 是否开始监听时间变化
const noTaskCounter = ref(0) // 没有选择任务的计数器

// Modal states
const showTaskEditModal = ref(false)
const editingTask = ref(null)
const showImportModal = ref(false)
const showHistoryModal = ref(false)

// ======================================================================
// 计算属性
// ======================================================================
const timeLeftMinutes = computed(() => {
  return timerRef.value?.timeLeftMinutes ?? Math.floor(FOCUS_TIME.value / 60)
})

// ======================================================================
// Timer 事件处理
// ======================================================================
const handleTimerTick = (timeLeft) => {
  // Timer is ticking, handled by PomodoroTimer internally
}

const handleShortBreak = (breakDuration) => {
  showBreakReminder('short', breakDuration)
}

const handleTimerComplete = (breakDuration) => {
  showBreakReminder('long', breakDuration)
  showBreakEndNotification()
}

const handleChooseTask = () => {
  // Task selection UI is handled by the timer display
  // User can click on the task name to open task selection
  // For now, we just show a message
  console.log('Choose task clicked')
}

// ======================================================================
// Task 事件处理
// ======================================================================
const handleTaskAdded = (task, error) => {
  if (error) {
    showError(error)
  } else {
    showSuccess('任务添加成功')
  }
}

const handleTaskSelected = (task) => {
  if (currentTask.value?.id === task?.id) {
    currentTask.value = null
  } else {
    currentTask.value = task
  }
}

const handleTaskCompleted = async (task) => {
  console.log('Task completed:', task)
  if (task.completed && task.id === currentTask.value?.id) {
    currentTask.value = null
  }
}

const handleShowEditModal = (task) => {
  editingTask.value = task
  showTaskEditModal.value = true
}

const handleShowImportModal = () => {
  showImportModal.value = true
}

// ======================================================================
// Modal 事件处理
// ======================================================================
const handleTaskUpdate = async (updatedTask) => {
  if (taskSectionRef.value) {
    await taskSectionRef.value.updateTask(updatedTask)
  }
  
  // 如果编辑的任务是当前任务，则要重新设定当前任务
  if (currentTask.value?.id === updatedTask.id) {
    currentTask.value = updatedTask
  }
}

const handleTaskDelete = async (taskId) => {
  if (taskSectionRef.value) {
    await taskSectionRef.value.deleteTask(taskId)
  }
  
  if (currentTask.value?.id === taskId) {
    currentTask.value = null
  }
}

const handleImportTasks = async (tasksToImport) => {
  if (!taskSectionRef.value) return
  
  // 过滤掉已存在相同标题的任务
  const tasks = taskSectionRef.value.tasks
  const uniqueTasks = tasksToImport.filter(newTask =>
    !tasks.some(existingTask => existingTask.text === newTask.text.trim())
  )

  if (uniqueTasks.length === 0) {
    showError('所选的任务都已存在，未添加任何任务')
    return
  }

  // 添加非重复的任务
  for (const task of uniqueTasks) {
    await window.electronAPI.addTask(task)
    tasks.push(task)
  }

  // 显示导入结果
  if (uniqueTasks.length === tasksToImport.length) {
    showSuccess(`成功导入 ${uniqueTasks.length} 个任务`)
  } else {
    showSuccess(`成功导入 ${uniqueTasks.length} 个任务，${tasksToImport.length - uniqueTasks.length} 个任务已存在`)
  }
}

const showFocusHistory = () => {
  showHistoryModal.value = true
}

// ======================================================================
// 系统监控和配置
// ======================================================================
const handleSystemIdle = async (context) => {
  console.log('System idle detected')
  
  if (timerRef.value) {
    // 保存焦点记录
    const focusRecord = timerRef.value.resetTimer(true)
    if (focusRecord) {
      await saveFocusRecord(focusRecord, currentTask.value)
    }
  }
  
  // 刷新数据
  await refreshData()
}

const handleSystemActive = () => {
  console.log('System active detected')
  // 可选：自动开始计时器
}

const handleRefreshData = async () => {
  console.log('Refresh data requested')
  currentTask.value = null
  await refreshData()
}

const refreshData = async () => {
  if (taskSectionRef.value) {
    await taskSectionRef.value.loadTasks()
  }
  
  totalFocusTime.value = await loadTotalFocusTime(getTodayString())
  
  if (historyRef.value?.loadHistory) {
    historyRef.value.loadHistory()
  }
}

const handleControlTimer = () => {
  if (timerRef.value) {
    const callbacks = {
      onTick: handleTimerTick,
      onShortBreak: () => handleShortBreak(SHORT_BREAK_TIME.value),
      onComplete: () => handleTimerComplete(LONG_BREAK_TIME.value)
    }
    
    // Check if no task selected and reminder is enabled
    if (!currentTask.value && TASK_SELECTION_REMINDER.value && !timerRef.value.isRunning) {
      showTaskSelectionReminder()
    }
  }
}

// ======================================================================
// Watchers
// ======================================================================
// 监听当前任务变化，保存专注记录
watch(currentTask, async (newTask, oldTask) => {
  console.log('Current task changed:', newTask, oldTask)
  
  if (newTask?.id === oldTask?.id) return
  
  // 中途切换任务时存储之前任务的时间段
  if (oldTask && timerRef.value?.focusStartTime) {
    const endTime = new Date()
    const startTime = timerRef.value.focusStartTime
    const duration = 
      endTime.getHours() * 60 + endTime.getMinutes() -
      startTime.getHours() * 60 - startTime.getMinutes()
    
    await saveFocusRecord(
      {
        startTime,
        endTime,
        duration,
        isIdle: false
      },
      oldTask
    )
  }
  
  // 设置新的开始时间
  if (timerRef.value && newTask) {
    timerRef.value.focusStartTime = new Date()
  }
})

// 监听剩余时间分钟数变化
watch(timeLeftMinutes, (newVal, oldVal) => {
  // 排除时间归零时timeLeftMinutes因为computed(timeleft-1/60)计算出-1的情况
  if (newVal < 0) return
  
  // 没有选择任务的计数器
  if (!currentTask.value && newVal - oldVal === -1) {
    noTaskCounter.value++
  } else {
    noTaskCounter.value = 0
  }
  
  // 5分钟没有选择任务，则提醒
  if (noTaskCounter.value >= 5 && newVal !== FOCUS_TIME.value / 60 && TASK_SELECTION_REMINDER.value) {
    showTaskSelectionReminder()
    noTaskCounter.value = 0
  }
  
  // 更新托盘信息
  const shortBreakTime = calculateShortBreakTime(
    newVal,
    FOCUS_TIME.value / 60,
    SHORT_BREAK_INTERVAL.value / 60
  )
  
  updateTray({
    time: newVal,
    taskName: currentTask.value?.text || '专注',
    shortBreakTime
  })
  
  // 如果还没到监听时间，直接返回
  if (!canWatch.value) return
  
  // 如果分钟数减少，则增加专注时间
  if (oldVal > newVal && oldVal !== FOCUS_TIME.value / 60) {
    // 增加一分钟的专注时间
    totalFocusTime.value++
    
    // 如果选择了任务，则更新任务的已完成时间
    if (currentTask.value && taskSectionRef.value) {
      const tasks = taskSectionRef.value.tasks
      const curTask = tasks.find(task => task.id === currentTask.value.id)
      
      if (curTask && curTask.completedTime < curTask.totalTime) {
        curTask.completedTime++
        
        // 到时提醒
        const minutesLeft = curTask.totalTime - curTask.completedTime
        showTaskDueNotification(curTask, minutesLeft)
        
        // 如果任务到时了，清空当前任务
        if (curTask.completedTime >= curTask.totalTime) {
          currentTask.value = null
        }
      }
    }
  }
}, { immediate: true })

// 控制历史弹窗时的页面滚动
watch(showHistoryModal, (newValue) => {
  const todoPomodoro = document.querySelector('.todo-pomodoro')
  if (todoPomodoro) {
    if (newValue) {
      todoPomodoro.style.cssText = `
        overflow: hidden !important;
        height: 100vh;
      `
    } else {
      todoPomodoro.style.cssText = `
        overflow: auto;
        height: auto;
      `
    }
  }
})

// ======================================================================
// 生命周期钩子
// ======================================================================
onMounted(async () => {
  console.log('TodoPomodoro mounted')
  
  // 加载数据
  await refreshData()
  
  // 设置系统监控
  setupMonitoring({
    onIdle: handleSystemIdle,
    onActive: handleSystemActive,
    onRefresh: handleRefreshData
  })
  
  // 配置监听
  watchConfigChanges({
    onFocusDurationChanged: (value) => {
      FOCUS_TIME.value = value * 60
      if (timerRef.value) {
        timerRef.value.resetTimer()
      }
      setIdleStatus(true)
    },
    onShortBreakDurationChanged: (value) => {
      SHORT_BREAK_TIME.value = value
    },
    onShortBreakIntervalChanged: (value) => {
      SHORT_BREAK_INTERVAL.value = value * 60
    },
    onBreakDurationChanged: (value) => {
      LONG_BREAK_TIME.value = value * 60
    },
    onDailyFocusTargetChanged: (value) => {
      DAILY_FOCUS_TARGET.value = value * 60
    },
    onTaskSelectionReminderChanged: (value) => {
      TASK_SELECTION_REMINDER.value = value
    }
  })
  
  // 监听托盘计时器控制
  watchTrayToggle(handleControlTimer)
  
  // 延迟2秒后允许监听分钟数变化
  setTimeout(() => {
    canWatch.value = true
    console.log('开始监听时间变化')
  }, 2000)
})

onUnmounted(() => {
  console.log('TodoPomodoro unmounted')
  
  // 保存当前专注记录
  if (timerRef.value?.focusStartTime) {
    const focusRecord = timerRef.value.resetTimer(false)
    if (focusRecord) {
      saveFocusRecord(focusRecord, currentTask.value)
    }
  }
})

// 异步加载历史弹窗
const FocusHistoryModal = defineAsyncComponent(() =>
  import('./FocusHistoryModal.vue')
)
</script>

<template>
  <div class="todo-pomodoro">
    <!-- 提示消息 -->
    <Transition name="slide-fade">
      <div
        v-if="showMessage"
        class="message-tip"
        :class="messageType"
      >
        {{ messageText }}
      </div>
    </Transition>

    <!-- 番茄计时器部分 -->
    <PomodoroTimer
      ref="timerRef"
      :current-task="currentTask"
      :config="timerConfig"
      @choose-task="handleChooseTask"
      @short-break="handleShortBreak"
      @complete="handleTimerComplete"
      @tick="handleTimerTick"
    />

    <!-- 右侧容器 -->
    <div class="right-section">
      <!-- Todo列表容器 -->
      <TaskSection
        ref="taskSectionRef"
        :focus-time="FOCUS_TIME"
        :current-task="currentTask"
        @task-added="handleTaskAdded"
        @task-selected="handleTaskSelected"
        @task-completed="handleTaskCompleted"
        @show-edit-modal="handleShowEditModal"
        @show-import-modal="handleShowImportModal"
      />

      <!-- 每日进度 -->
      <DailyProgress
        :total-focus-time="totalFocusTime"
        :daily-target="DAILY_FOCUS_TARGET"
        @show-history="showFocusHistory"
      />

      <!-- 历史记录组件 -->
      <FocusHistory ref="historyRef" />
    </div>

    <!-- 任务编辑弹窗 -->
    <TaskEditModal
      v-if="showTaskEditModal"
      :task="editingTask"
      :focus-time="FOCUS_TIME"
      @close="showTaskEditModal = false"
      @update="handleTaskUpdate"
      @delete="handleTaskDelete"
    />

    <!-- 任务导入弹窗 -->
    <ImportTaskModal
      v-if="showImportModal"
      :focus-time="FOCUS_TIME"
      @close="showImportModal = false"
      @import="handleImportTasks"
    />

    <!-- 历史记录弹窗 -->
    <Suspense v-if="showHistoryModal">
      <FocusHistoryModal
        @close="showHistoryModal = false"
      />
    </Suspense>
  </div>
</template>

<style scoped>
.todo-pomodoro {
  width: 100%;
  display: flex;
  gap: 80px;
  padding: 40px;
  min-height: 100vh;
  background: var(--bg-primary);
}

.right-section {
  flex: 1;
  overflow-y: auto;
  max-width: 600px;
}

/* 提示消息样式 */
.message-tip {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.message-tip.error {
  background-color: rgba(255, 76, 76, 0.95);
  color: white;
}

.message-tip.success {
  background-color: rgba(0, 200, 83, 0.95);
  color: white;
}

.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* 自定义滚动条样式 */
.right-section::-webkit-scrollbar {
  width: 6px;
}

.right-section::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

.right-section::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.right-section::-webkit-scrollbar-thumb:hover {
  background: var(--hover-bg);
}

/* 响应式布局 */
@media screen and (max-width: 1100px) {
  .todo-pomodoro {
    flex-direction: column;
    gap: 20px;
    padding: 20px;
  }

  .right-section {
    max-width: 100%;
  }
}
</style>