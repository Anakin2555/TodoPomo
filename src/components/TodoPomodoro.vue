<script setup>
import { ref, onUnmounted, computed, watch, onMounted } from 'vue'
import IconYes from './icons/IconYes.vue'
import IconDelete from './icons/IconDelete.vue'
import IconStart from './icons/IconStart.vue'
import FocusHistory from './FocusHistory.vue'


// 计时器状态和配置
const FOCUS_TIME = 40 * 60 /10; // 40分钟专注
const SHORT_BREAK_TIME = 30 /10; // 30秒短休息
const LONG_BREAK_TIME = 5 * 60 /10; // 5分钟长休息
const SHORT_BREAK_INTERVAL = 15 * 60 /10; // 每15分钟提醒一次短休息

const timeLeft = ref(FOCUS_TIME)
const timeLeftMinutes = computed(() => Math.floor(timeLeft.value / 60))
const isStart = ref(false)
const isRunning = ref(false)
const timer = ref(null)
const currentMode = ref('专注')
const currentTask = ref(null)
const lastBreakTime = ref(0)

// 计时器模式
const modes = {
  '专注': FOCUS_TIME,
  '小憩': SHORT_BREAK_TIME,
  '长休息': LONG_BREAK_TIME
}

// 新建Todo 项
const newTask = ref({
      id: Date.now(),
      text: '',
      completed: false,
      totalSegments: 2,  // 默认2个时间段
      completedTime: 0,  // 已完成的时间（分钟）
      totalTime: 2 * 40  // 总计划时间（分钟）
    })
const tasks = ref([])

// 记录上一次完成的分钟
const lastCompletedMinute = ref(null);

// 添加历史记录组件引用
const historyRef = ref(null)

// 添加任务
const addTask = async () => {
  if (newTask.value.text.trim()) {
    const task = {
      id: Date.now(),
      text: newTask.value.text,
      completed: false,
      totalSegments: newTask.value.totalSegments,
      completedTime: 0,
      totalTime: newTask.value.totalSegments * 40
    }
    
    await window.electronAPI.addTask(task)
    tasks.value.unshift(task)
    
    newTask.value.text = ''
    newTask.value.totalSegments = 2
  }
}

// 更新任务
const updateTask = async (task) => {
  console.log({...task})
  await window.electronAPI.updateTask({...task})
}

// 更新总专注时间
const updateTotalFocusTime = async (time) => {
  console.log('update',time)
  await window.electronAPI.updateTotalFocusTime(time)
}

// 删除任务
const deleteTask = async (task) => {
  await window.electronAPI.deleteTask(task.id)
  tasks.value = tasks.value.filter(t => t.id !== task.id)
}

// // 监听任务变化并更新
// watch(tasks, (newTasks, oldTasks) => {
//   // 找出发生变化的任务
//   newTasks.forEach(task => {
//     const oldTask = oldTasks.find(t => t.id === task.id)
//     if (!oldTask || JSON.stringify(task) !== JSON.stringify(oldTask)) {
//       updateTask(task)
//     }
//   })
// }, { deep: true })

// 加载保存的任务
onMounted(async () => {
  try {
    const savedTasks = await window.electronAPI.loadTasks()
    totalFocusTime.value = await window.electronAPI.loadTotalFocusTime()
    if (savedTasks && savedTasks.length > 0) {
      tasks.value = savedTasks
    }
  } catch (error) {
    console.error('Failed to load tasks:', error)
  }
})

// 添加修改时间段的函数
const adjustSegments = (task, increment) => {
  if (increment) {
    task.totalSegments++
    task.totalTime = task.totalSegments * 40
  } else if (task.totalSegments > 1) {
    task.totalSegments--
    task.totalTime = task.totalSegments * 40
  }
}


// 从弹窗中选择并设置任务
const setTask = (task) => {
  currentTask.value = task
  showTaskList.value = false
}

// 弹窗外点击关闭选择任务列表
const closeTaskList = (event) => {
  // 检查点击事件的目标是否在task-list内
  const taskList = document.querySelector('.task-list');
  const taskLabel = document.querySelector('.timer-label');
  
  if (showTaskList.value && 
      !taskList?.contains(event.target) && 
      !taskLabel?.contains(event.target)) {
    showTaskList.value = false;
  }
}

// 添加事件监听
onMounted(() => {
  document.addEventListener('click', closeTaskList);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', closeTaskList);
});

// 选择任务
const showTaskList = ref(false)
const chooseTask = () => {
  showTaskList.value = !showTaskList.value
}

// 开始专注
const startFocus = (task) => {
  currentTask.value = task
  currentMode.value = '专注'
  timeLeft.value = FOCUS_TIME
  lastBreakTime.value = 0
  startTimer()
}

// 开始休息
// const startBreak = (isLongBreak = false) => {
//   currentMode.value = isLongBreak ? '长休息' : '短休息'
//   timeLeft.value = isLongBreak ? LONG_BREAK_TIME : SHORT_BREAK_TIME
//   startTimer()
// }

// 计时器控制
const ControlTimer = () => {
  if (isRunning.value) {
    pauseTimer()
  } else {
    startTimer()
  }
}


// 计时器功能
const startTimer = () => {
  if (!isRunning.value) {
    isRunning.value = true
    isStart.value = true
    timer.value = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--


        // 检查是否需要短休息提醒  
        // (剩余时间大于短休息时间间隔的60%时提醒,小于60%不提醒，例如短休息时间间隔10分钟，剩余时间大于6分钟时才进行短休息)
        if (currentMode.value === '专注'&&timeLeft.value>=SHORT_BREAK_INTERVAL*0.6) {
          const timePassed = FOCUS_TIME - timeLeft.value
          if (timePassed - lastBreakTime.value >= SHORT_BREAK_INTERVAL) {
            lastBreakTime.value = timePassed
            notifyBreak('short')
            pauseTimer()
          }
        }

      } else {
        handleTimerComplete()
      }
    }, 1000)
  }
}

const pauseTimer = () => {
  clearInterval(timer.value)
  isRunning.value = false
}

const resetTimer = () => {
  pauseTimer()
  timeLeft.value = modes[currentMode.value]
  lastCompletedMinute.value = null
  isStart.value = false
}

const changeMode = (mode) => {
  currentMode.value = mode
  timeLeft.value = modes[mode]
  pauseTimer()
}

// 修改休息提醒函数
const notifyBreak = (breakType) => {
  // 播放提示音
  new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3').play()


  let duration = breakType === 'short' ? SHORT_BREAK_TIME : LONG_BREAK_TIME
  // 使用 window.electronAPI 发送消息
  window.electronAPI.showBreakReminder({
    text: '闭上眼睛休息一会吧',
    duration: duration 
  })

  // 休息结束后自动开始专注
  setTimeout(() => {
    if(breakType === 'short'){
      startTimer()
    }else if(breakType==='long'){
      startFocus(currentTask.value)
    }
  }, duration * 1000 + 2000)
}

// 处理计时完成
const handleTimerComplete = async () => {
  clearInterval(timer.value)
  isRunning.value = false
  
  // 记录本次专注
  const now = new Date()
  const endTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const startTime = new Date(now - FOCUS_TIME  * 1000)
  const startTimeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
  
  await window.electronAPI.addFocusRecord({
    taskName: currentTask.value?.text || '专注',
    startTime: startTimeStr,
    endTime: endTime,
    duration: Math.floor(FOCUS_TIME/60)
  })
  
  // 刷新历史记录
  if (historyRef.value) {
    historyRef.value.loadHistory()
  }
  
  endFocus()
  
  if (currentMode.value === '专注' && currentTask.value) {
    // // 更新已完成时间
    // currentTask.value.completedTime += FOCUS_TIME / 60 // 转换为分钟
    
    // // 播放完成提示音
    // new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3').play()
    
    if (currentTask.value.completedTime >= currentTask.value.totalTime) {
      currentTask.value.completed = true
    }
      
    // focusCount.value++
    // if (focusCount.value % 4 === 0) {
    //   alert('专注完成！开始长休息时间')
    //   startBreak(true)
    // } else {
    //   alert('专注完成！')
    //   resetTimer()
    // }
  }
  
  
  notifyBreak('long')
}

// 开始新任务
const startNewTask = (task) => {
  if (isRunning.value) {
    const confirm = window.confirm('当前有正在进行的任务，是否切换到新任务？')
    if (!confirm) return
  }
  
  currentTask.value = task
  resetTimer()
  startFocus(task)
}

// 格式化时间
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}
const formatTimeMinutes = (minutes) => {
  if (minutes < 60) {
    return `${String(minutes)}min`
  } else {
    return `${String(Math.floor(minutes/60))}h ${String(minutes%60)}min`
  }
}
// 组件卸载时清理定时器
onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
})

// 添加新的方法
const extendTime = () => {
  timeLeft.value += 5 * 60; // 增加5分钟
}

const endFocus = () => {
  resetTimer();
}

// 设置目标工作时间（8小时 = 480分钟）
const DAILY_FOCUS_TARGET = 8 * 60;

// 修改计算进度条宽度的方法
const calculateProgressWidth = (focusTime) => {
  const progress = (focusTime / DAILY_FOCUS_TARGET) * 100;
  // 限制最大进度为100%
  return `${Math.min(progress, 100)}%`;
}

// 格式化时间显示
const formatHoursMinutes = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}hr ${mins}min`;
}

// 总专注时间（以分钟为单位）
const totalFocusTime = ref(0);

// 圆环进度计算
const radius = 145
const circumference = computed(() => 2 * Math.PI * radius)

// 计算进度偏移量
const progressOffset = computed(() => {
  const progress = timeLeft.value / modes[currentMode.value]
  return circumference.value * (1 - progress)
})

// 监听计时器变化，以统计专注时间
watch(timeLeftMinutes, (newVal, oldVal) => {
    
    // 如果分钟数发生变化，并且不是刚开始计时
    if (lastCompletedMinute.value===oldVal && currentMode.value === '专注') {
      // 增加一分钟的专注时间
      totalFocusTime.value++;
      updateTotalFocusTime(totalFocusTime.value)

      // 如果选择了任务，则更新任务的已完成时间
      if(currentTask.value) {
        currentTask.value.completedTime++;
        updateTask(currentTask.value)
      }

    }
    lastCompletedMinute.value = newVal
});

// 在 script setup 中
watch([timeLeft, isRunning], ([time, running]) => {
  // 更新托盘信息
  window.electronAPI.updateTray({
    time: formatTime(time),
    isRunning: running
  })
}, { immediate: true })

</script>




<template>
  <div class="todo-pomodoro">

    <!-- 番茄计时器部分 -->
    <div class="timer-section">

      <!-- 计时器容器 -->
      <div class="timer-circle">

        <!-- 圆环进度 -->
        <svg class="progress-ring" width="320" height="320">
          <circle
            class="progress-ring__circle-bg"
            stroke="#333"
            stroke-width="15"
            fill="transparent"
            r="145"
            cx="160"
            cy="160"
          />
          <circle
            class="progress-ring__circle"
            stroke="#00F2EA"
            stroke-width="15"
            fill="transparent"
            r="145"
            cx="160"
            cy="160"
            :style="{
              strokeDasharray: `${circumference} ${circumference}`,
              strokeDashoffset: progressOffset
            }"
          />
        </svg>

        <!-- 计时器文字框 -->
        <div class="timer-content">


          <!-- 当前模式 -->
          <div class="mode-label" >{{ currentMode }}</div>

          <!-- 是否暂停 -->
          <div class="mode-pause" :style="{visibility: !isStart||isRunning ? 'hidden' : 'visible'}" >已暂停</div>

          <!-- 计时器文字 -->
          <div class="timer">{{ formatTime(timeLeft) }}</div>

          <!-- 任务文本框 -->
          <div class="timer-label" @click="chooseTask" >
            {{ currentTask ? 'Going: ' + currentTask.text : 'Select a task to focus' }}
          </div>

          <!-- 选择任务列表 弹窗 -->
          <div class="task-list" v-show="showTaskList">
            <div class="task-item" v-if="tasks.length === 0">请先添加任务</div>
            <div class="task-item" @click="setTask(null)" v-if="tasks.length !== 0">专注</div>
            <div class="task-item" v-for="task in tasks" :key="task.id" @click="setTask(task)">
              {{ task.text }}
            </div>
          </div>

          
        </div>
      </div>

      <!-- 计时器控制按钮 -->
      <div class="timer-controls">
        <button @click="ControlTimer" :class="isRunning ? 'primary-outline' : 'primary'">
          {{ isRunning ? 'Pause' : 'Start Focus' }}
        </button>
      </div>

      <!-- 计时器扩展按钮 -->
      <div class="timer-actions">
        <!-- <button @click="extendTime" class="text-button">Extend (5 min)</button> -->
        <button @click="endFocus" class="text-button" v-show="isStart">End Focus</button>
      </div>
    </div>

    <!-- 右侧容器 -->
    <div class="right-section">

      <!-- Todo列表容器 -->
      <div class="todo-section">
        <div class="section-header">
          <h2>Todo List</h2>
        </div>
        <!-- 添加任务 -->
        <div class="todo-input">
          <input 
            v-model="newTask.text" 
            @keyup.enter="addTask"
            placeholder="Add new task..."
          >
          <!-- 预设时间段调整 -->
          <div class="segment-adjust" v-show="newTask.text.trim() !== ''">
            <button 
              class="icon-button" 
              @click.stop="adjustSegments(newTask, false)"
              :disabled="newTask.totalSegments <= 1"
            >-</button>
            <span class="segments-count">{{ formatTimeMinutes(newTask.totalTime) }}</span>
            <button 
              class="icon-button" 
              @click.stop="adjustSegments(newTask, true)">+</button>
          </div>
          <button @click="addTask" class="icon-button-add" v-show="newTask.text.trim() !== ''">
            <IconYes />
          </button>
        </div>

        <div class="todo-list">
          <div v-for="task in tasks" :key="task.id" class="todo-item">
            <div class="todo-content">
              <div class="task-details">
                <span :class="{ completed: task.completed }">{{ task.text }}</span>
                <div class="task-time-info">
                  <!-- 时间段调整按钮
                  <button 
                    class="segment-button" 
                    @click.stop="adjustSegments(task, false)"
                    :disabled="task.totalSegments <= 1"
                  >-</button>
                  <span class="segments-count">{{ task.totalSegments }} × 40min</span>
                  <button 
                    class="segment-button" 
                    @click.stop="adjustSegments(task, true)"
                  >+</button> -->
                  
                  <!-- 时间进度 -->
                  <div class="time-progress">
                    <div class="time-text">
                      {{ formatTimeMinutes(task.completedTime) }} / {{ formatTimeMinutes(task.totalTime) }}
                    </div>
                    <div class="progress-bar">
                      <div 
                        class="progress-fill"
                        :style="{ width: `${(task.completedTime / task.totalTime) * 100}%` }"
                      ></div>
                    </div>
                  </div>

                  
                </div>
              </div>

              <!-- 删除按钮 -->
              <button 
                @click="deleteTask(task)" 
                class="delete-button"
              >
                <IconDelete />
              </button> 

              <!-- 开始按钮 --> 
              <button 
                @click="startNewTask(task)" 
                :disabled="currentTask?.id === task.id && isRunning"
                class="focus-button"
              >
                <IconStart />
              </button> 
              
            </div>
            
          </div>
        </div>


        
      </div>


      <!-- 总时间统计 -->
      <div class="stats-section">
          <div class="stat-item">
            <div class="stat-label">Today Focus Time</div>
            <div class="stat-value">
              {{ formatHoursMinutes(totalFocusTime) }}
              <span class="stat-target">of 8hr 0min</span>
            </div>
            <div class="stat-progress">
              <div 
                class="stat-progress-bar" 
                :style="{ width: calculateProgressWidth(totalFocusTime) }"
              ></div>
            </div>
          </div>
          
      </div>

      <FocusHistory ref="historyRef" />

    </div>

  </div>
</template>



<style scoped>
@media screen and (min-width: 1100px) {
  .todo-pomodoro {
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: center;
    gap: 100px;
    width: 100%;
    padding: 40px 8%;
    background-color: #1E1E1E;
    color: #FFFFFF;
  }
  .right-section{
    flex-grow: 2;
  }
  .todo-section{
    min-width: 540px;
    border-radius: 16px;
  }
  .timer-section{
    width: 320px;
    flex-grow: 1;
  }
  .todo-list{
    max-height: 300px;
  }
}

@media screen and (max-width: 1100px) {
  .todo-pomodoro{
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background-color: #1E1E1E;
    color: #FFFFFF;
  }
  .todo-section{
    min-width: 500px;
  }
  .todo-list{
    max-height: 1000px;
  }
} 

.timer-section {
  text-align: center;
  margin-bottom: 40px;
}

.timer-circle {
  position: relative;
  width: 320px;
  height: 320px;
  margin: 0 auto 20px;
}

.progress-ring {
  transform: rotate(-90deg); /* 从12点钟位置开始 */
  position: absolute;
  top: 0;
  left: 0;
}

.progress-ring__circle-bg {
  transition: stroke 0.3s ease;
}

.progress-ring__circle {
  transition: stroke-dashoffset 0.3s ease;
  transform-origin: center;
}

.timer-content {
  position: absolute;
  margin-top: 60px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  width: 80%;
}

.timer {
  font-size: 64px;
  font-weight: 600;
  margin-top: -20px;
  margin-bottom: 10px;
}

.timer-label {
  cursor: pointer;
  font-size: 16px;
  color: #888;
}
/* 弹窗选择任务 */
.task-list {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  max-height: 200px;
  overflow-y: auto;
  background-color: #252525;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 8px 0;
  margin-top: 10px;
  z-index: 999;
}

.task-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.task-item:hover {
  background-color: #333;
}

/* 添加小三角形指示器 */
.task-list::before {
  content: '';
  position: absolute;
  top: -0px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #ffffff;
}

/* 自定义滚动条样式 */
.task-list::-webkit-scrollbar {
  width: 6px;
}

.task-list::-webkit-scrollbar-track {
  background: #1E1E1E;
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.timer-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}

.timer-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
}

button {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.primary {
  background-color: #00F2EA;
  color: #000;
  padding: 12px 24px;
  font-weight: bold;
  border-radius: 10px;
}

.primary-outline{
  background-color: transparent;
  color: #00F2EA;
  padding: 12px 24px;
  font-weight: bold;
  border-radius: 10px;
  border: 2px solid #00F2EA;
}

.secondary {
  background-color: #333;
  color: #fff;
  padding: 12px 24px;
}

.text-button {
  background: none;
  color: #888;
  padding: 8px 16px;
}

.text-button:hover {
  color: #fff;
}

.stats-section {
  margin-top: 50px;
  margin-bottom: 30px;
}

.stat-item {
  margin-bottom: 20px;
}

.stat-label {
  font-size: 14px;
  color: #888;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 16px;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.stat-target {
  color: #666;
  font-size: 14px;
}

.stat-progress {
  height: 4px;
  background-color: #333;
  border-radius: 2px;
  overflow: hidden;
}

.stat-progress-bar {
  height: 100%;
  background-color: #00F2EA;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.todo-section {
  background-color: #252525;
  border-radius: 10px;
  padding: 20px;
  padding-right: calc(20px + 8px); /* 原来的padding加上滚动条宽度 */
  width: 100%;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: normal;
}

.todo-input {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;

}

.todo-input input {
  flex: 1;
  height: 40px;  /* 设置固定高度 */
  background-color: #1E1E1E;
  border: 1px solid #333;
  color: #fff;
  box-sizing: border-box;
  padding: 0 12px;  /* 调整左右内边距 */
  border-radius: 10px;
  transition: all 0.6s ease;
  font-size: 14px;  /* 设置字体大小 */
  line-height: 40px;  /* 文字垂直居中 */
}

/* 添加焦点样式 */
.todo-input input:focus {
  border-color: #00F2EA;
  outline: none;
}

.segment-adjust{
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon-button {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background-color: #333;
  color: #fff;
  box-sizing: border-box;
  border-radius: 6px;
  font-size: 20px;
}
.icon-button-add{
  flex-shrink: 0;
  padding-top: 2px;
  width: 40px;
  height: 40px;
  box-sizing: border-box;
  background-color: #333;
  color: #fff;
  border-radius: 6px;
  font-size: 20px;
}
.icon-button-add:hover{
  background-color: #01fff7cb;
  color: #000;
}
.todo-item {
  padding: 15px;
  border-bottom: 1px solid #333;
}
.todo-item:hover .delete-button{
  opacity: 1;
}

.todo-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.task-time {
  color: #888;
  font-size: 14px;
  min-width: 80px;
}

.task-details {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-score {
  background-color: #333;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.completed {
  text-decoration: line-through;
  color: #888;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

.todo-list {
  overflow-y: auto;
  padding-right: 10px;
}

/* 滚动条整体样式 */
.todo-list::-webkit-scrollbar {
  width: 8px;
}

/* 滚动条轨道 */
.todo-list::-webkit-scrollbar-track {
  background: #1E1E1E;
  border-radius: 4px;
}

/* 滚动条滑块 */
.todo-list::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
  transition: background 0.3s ease;
}

.todo-list::-webkit-scrollbar-thumb:hover {
  background: #444;
}

.mode-label {
  font-size: 16px;
  color: #00F2EA;
  margin-top: 8px;
}

.mode-pause{
  font-size: 16px;
  color: #ffffff;
  margin-top: 2px;
}

.focus-button {
  background-color: #00F2EA;
  color: #1E1E1E;
  padding: 0px 16px;
  height: 28px;
  border-radius: 14px;
  font-size: 12px;
}

.focus-button:disabled {
  background-color: #333;
  color: #666;
}

.delete-button {
  border-radius: 8px;
  opacity: 0;  /* 使用 opacity 代替 visibility */
  transition: opacity 0.2s ease;  /* 添加过渡效果，缩短时间 */
  background-color: #333;
  color: #666;
  height: 28px;
  padding: 4px;
}

.todo-item:hover .delete-button {
  opacity: 1;
}

.task-time-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 14px;
  color: #888;
}

.segment-button {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background-color: #333;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.segment-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.segments-count {
  min-width: 64px;
  text-align: center;
}

.time-progress {
  flex: 1;
  margin-left: 10px;
}

.time-text {
  font-size: 12px;
  margin-bottom: 4px;
}

.progress-bar {
  height: 4px;
  background-color: #333;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #00F2EA;
  border-radius: 2px;
  transition: width 0.3s ease;
}


</style> 