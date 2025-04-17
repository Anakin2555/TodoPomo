<script setup>
import { ref, onUnmounted, computed, watch, onMounted } from 'vue'
import IconYes from './icons/IconYes.vue'
import IconDelete from './icons/IconDelete.vue'
import IconStart from './icons/IconStart.vue'
import IconEnd from './icons/IconEnd.vue'
import FocusHistory from './FocusHistory.vue'
import FocusHistoryModal from './FocusHistoryModal.vue'


// 计时器状态和配置
const FOCUS_TIME = ref(40 * 60); // 40分钟专注
const SHORT_BREAK_TIME = ref(30); // 30秒短休息
const LONG_BREAK_TIME = ref(5 * 60); // 5分钟长休息
const SHORT_BREAK_INTERVAL = ref(15 * 60); // 每15分钟提醒一次短休息
// 设置目标工作时间（8小时 = 480分钟）
const DAILY_FOCUS_TARGET = ref(8 * 60);


const timeLeft = ref(FOCUS_TIME.value)
const timeLeftMinutes = computed(() => Math.floor((timeLeft.value-1) / 60))
const isStart = ref(false)
const isPause = ref(false) // 主动暂停
const isRunning = ref(false)
const timer = ref(null)
const currentTask = ref(null)
const lastBreakTime = ref(0)
const hasSaved = ref(false)
const tasks = ref([])

// 总专注时间（以分钟为单位）
const totalFocusTime = ref(0);

// 添加历史记录组件引用
const historyRef = ref(null)

// 添加开始时间变量
const focusStartTime = ref(null)

// 添加一个标志变量来控制是否开始监听
const canWatch = ref(false)

// 添加控制弹窗显示的状态
const showHistoryModal = ref(false)

// 添加提示消息状态
const showMessage = ref(false)
const messageText = ref('')
const messageType = ref('error') // 'error' 或 'success'

// 新建Todo 项
const newTask = ref({
      id: Date.now(),
      text: '',
      completed: false,
      totalSegments: 2,  // 默认2个时间段
      completedTime: 0,  // 已完成的时间（分钟）
      totalTime: 0,
      get totalTime(){
        return this.totalSegments * (FOCUS_TIME.value/60)
      }
    })

// 添加任务
const addTask = async () => {
  if (newTask.value.text.trim()) {
    // 检查是否存在相同文本的任务
    const existingTask = tasks.value.find(task => task.text === newTask.value.text.trim())
    if (existingTask) {
      showTip('已存在相同名称的任务')
      return
    }

    const task = {
      id: Date.now(),
      text: newTask.value.text,
      completed: false,
      totalSegments: newTask.value.totalSegments,
      completedTime: 0,
      totalTime: newTask.value.totalSegments * (FOCUS_TIME.value/60)
    }
    
    await window.electronAPI.addTask(task)
    tasks.value.unshift(task)
    
    newTask.value.text = ''
    newTask.value.totalSegments = 2
    showTip('任务添加成功', 'success')
  }
}

// 更新任务
const updateTask = async (task) => {
  console.log({...task})
  await window.electronAPI.updateTask({...task})
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



// 添加修改时间段的函数
const adjustSegments = (task, increment) => {
  if (increment) {
    task.totalSegments++
    task.totalTime = task.totalSegments * FOCUS_TIME.value
  } else if (task.totalSegments > 1) {
    task.totalSegments--
    task.totalTime = task.totalSegments * FOCUS_TIME.value
  }
}


// 任务切换时保存专注记录
watch(currentTask, async (newTask, oldTask) => {
  console.log('currentTask',newTask,oldTask)
  if(!hasSaved.value){
    hasSaved.value = true
    updateTask(currentTask.value) // 存储任务时间
    await saveToStorage(false,oldTask?.text || '专注')  // 添加任务时间段
    focusStartTime.value = new Date()
  }
})



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


// 监测主线程的idle信号
const handleSystemIdle = (event, isIdle) => {
  console.log('handleSystemIdle',isIdle)
  // 监测到idle
  if (isIdle) {
    // 重置计时器
    resetTimer(isIdle)
    console.log('监测到idle')

    // 监测到active
  }else if(!isIdle&&!isRunning.value&&!isPause.value){
    // 重新开始计时器
    startTimer()
    console.log('监测到active')
  }
}
// 格式化日期
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
// 挂载时添加事件监听
onMounted(async () => {
  console.log('挂载')
  // 加载保存的任务
  try {
    const savedTasks = await window.electronAPI.loadTasks()
    totalFocusTime.value = await window.electronAPI.loadTotalFocusTime(formatDate(new Date()))
    if (savedTasks && savedTasks.length > 0) {
      tasks.value = savedTasks
    }
  } catch (error) {
    console.error('Failed to load tasks:', error)
  }

  document.addEventListener('click', closeTaskList);
  window.electronAPI.onSystemIdle(handleSystemIdle)
  
  window.electronAPI.onFocusDurationChanged((value) => {
    FOCUS_TIME.value = value*60
    resetTimer()

    startTimer()
  })
  
  window.electronAPI.onShortBreakDurationChanged((value) => {
    SHORT_BREAK_TIME.value = value
  })

  window.electronAPI.onShortBreakIntervalChanged((value) => {
    SHORT_BREAK_INTERVAL.value = value*60
  })

  window.electronAPI.onBreakDurationChanged((value) => {
    LONG_BREAK_TIME.value = value*60
  })

  window.electronAPI.onDailyFocusTargetChanged((value)=>{
    DAILY_FOCUS_TARGET.value=value*60
  })

  setTimeout(()=>{
    startTimer()
  },1000)

  // 在组件挂载后延迟2秒设置标志变量
  setTimeout(() => {
    canWatch.value = true;
    console.log('开始监听时间变化');
  }, 2000);
})


// 组件卸载时移除事件监听
onUnmounted(() => {
  console.log('卸载')
  document.removeEventListener('click', closeTaskList);
  window.electronAPI.removeSystemIdleListener(handleSystemIdle)
  resetTimer()
})

// 选择任务
const showTaskList = ref(false)
const chooseTask = () => {
  showTaskList.value = !showTaskList.value
}

// // 开始专注
// const startFocus = (task) => {
//   currentTask.value = task
//   timeLeft.value = FOCUS_TIME.value
//   lastBreakTime.value = 0
//   startTimer()
// }

// 开始休息
// const startBreak = (isLongBreak = false) => {
//   currentMode.value = isLongBreak ? '长休息' : '短休息'
//   timeLeft.value = isLongBreak ? LONG_BREAK_TIME : SHORT_BREAK_TIME
//   startTimer()
// }

// 计时器控制
const ControlTimer = () => {
  
  if (isRunning.value&&!isPause.value) {
    pauseTimer()
    isPause.value=true
  } else {
    startTimer()
    
  }
}


// 计时器功能
const startTimer = () => {
  if (!isRunning.value) {
    // 记录开始时间
    if (!isStart.value) {
      focusStartTime.value = new Date()
    }
    
    isRunning.value = true
    isStart.value = true
    isPause.value=false
    timer.value = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--
        // console.log('timeLeft',timeLeft.value)

        // 检查是否需要短休息提醒  
        // (剩余时间大于短休息时间间隔的60%时提醒,小于60%不提醒，例如短休息时间间隔10分钟，剩余时间大于6分钟时才进行短休息)
        if (timeLeft.value>=SHORT_BREAK_INTERVAL.value*0.6) {
          const timePassed = FOCUS_TIME.value - timeLeft.value
          // console.log('timePassed',timePassed)
          if (timePassed - lastBreakTime.value >= SHORT_BREAK_INTERVAL.value) {
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


// 保存专注记录
const saveToStorage = async (isIdle = false,taskName = currentTask.value?.text || '专注') => {

  // 如果idle，则结束时间减去5分钟idle时间
  const endTime = new Date(isIdle ? Date.now() - 1000 * 60 * 5 : Date.now())

  
  // 获取时间字符串
  const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
  const startTimeStr = `${focusStartTime.value.getHours().toString().padStart(2, '0')}:${focusStartTime.value.getMinutes().toString().padStart(2, '0')}`
  
  const duration = Math.floor((endTime - focusStartTime.value)/1000/60)
  console.log('duration',duration)
  if (duration > 4) {

    await window.electronAPI.addFocusRecord({
      taskName: taskName,
      startTime: startTimeStr,
      endTime: endTimeStr,
      duration: duration
    })

    console.log('saveToStorage', focusStartTime.value.getTime(), duration)
    // 保存总专注时间
    // await window.electronAPI.updateTotalFocusTime(focusStartTime.value.getTime(), duration)
  }

  // 刷新历史记录
  if (historyRef.value) {
    historyRef.value.loadHistory()
  }
  console.log('saveToStorage')
  totalFocusTime.value = await window.electronAPI.loadTotalFocusTime(formatDate(new Date()))
}


const resetTimer = async (isIdle = false) => {
  pauseTimer()
  console.log('resetTimer:isIdle',isIdle)

  // 先保存当前的专注记录
  if (focusStartTime.value) {
    updateTask(currentTask.value)
    await saveToStorage(isIdle)
  }
  
  hasSaved.value = false

  // 最后再重置开始时间
  focusStartTime.value = null
  console.log('focusStartTime','重置啦')

  lastBreakTime.value = 0
  timeLeft.value = FOCUS_TIME.value
  isStart.value = false
}



// 修改休息提醒函数
const notifyBreak = (breakType) => {
  // 播放提示音
  new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3').play()

  let duration = breakType === 'short' ? SHORT_BREAK_TIME.value : LONG_BREAK_TIME.value
  
  // // 使用系统通知
  // window.electronAPI.showNotification({
  //   title: '休息提醒',
  //   body: '闭上眼睛休息一会吧',
  //   timeoutType: 'never'  // 通知不会自动消失
  // })

  // 使用 window.electronAPI 发送消息
  window.electronAPI.showBreakReminder({
    text: '闭上眼睛休息一会吧',
    duration: duration,
    breakType: breakType
  })

  // // 休息结束后自动开始专注
  // setTimeout(() => {

  //   // 排除计时器未开始的情况（例如idle后已经结束计时器）
  //   if(isStart.value){
  //     if(breakType === 'short'){
  //       startTimer()
  //     }else if(breakType==='long'){
  //       startFocus(currentTask.value)
  //     }
  //   }
    
  // }, duration * 1000 + 2000)
}

// 处理计时完成
const handleTimerComplete = async () => {
  resetTimer()
  notifyBreak('long')
}

// 开始新任务
const startNewTask = (task) => {

  if(currentTask.value?.id === task.id){
    currentTask.value = null
  }
  // 如果正在计时，则需要确认是否切换任务
  // if (isRunning.value) {
  //   const confirm = window.confirm('当前有正在进行的任务，是否切换到新任务？')
  //   if (!confirm) return
  // }
  else{
    currentTask.value = task
  }
  // resetTimer()
  // startFocus(task)
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

// // 添加新的方法
// const extendTime = () => {
//   timeLeft.value += 5 * 60; // 增加5分钟
// }




// 修改计算进度条宽度的方法
const calculateProgressWidth = (focusTime) => {
  const progress = (focusTime / DAILY_FOCUS_TARGET.value) * 100;
  // 限制最大进度为100%
  return `${Math.min(progress, 100)}%`;
}

// 格式化时间显示
const formatHoursMinutes = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}hr ${mins}min`;
}

// 圆环进度计算
const radius = 145
const circumference = computed(() => 2 * Math.PI * radius)

// 计算进度偏移量
const progressOffset = computed(() => {
  const progress = timeLeft.value / FOCUS_TIME.value
  return circumference.value * (1 - progress)
})

// 修改 watch 逻辑，添加立即执行选项并检查标志变量
watch(timeLeftMinutes, (newVal, oldVal) => {

  // 更新托盘信息
  let shortBreakTime = SHORT_BREAK_INTERVAL.value/60-(FOCUS_TIME.value/60-newVal)%(SHORT_BREAK_INTERVAL.value/60)
  // 剩余小憩时间大于休息时间，则不显示
  if(shortBreakTime>newVal){
    shortBreakTime='--'
  }
  window.electronAPI.updateTray({
      time: newVal,
      taskName: currentTask.value?.text || '专注',
      shortBreakTime: shortBreakTime
    })


  // 如果还没到监听时间，直接返回
  if (!canWatch.value) return;

    // 如果分钟数减少，则增加专注时间,排除重置计时器的情况（oldVal<newVal）,第一分钟计时不计入
    if (oldVal>newVal&&oldVal!==FOCUS_TIME.value/60) {
      console.log(oldVal,newVal)
      // // 增加一分钟的专注时间,
      totalFocusTime.value++;

    // 如果选择了任务，则更新任务的已完成时间
    if(currentTask.value) {
      currentTask.value.completedTime++;

      if (currentTask.value.completedTime >= currentTask.value.totalTime) {
        currentTask.value.completed = true
        
        window.electronAPI.showNotification({
          title: '任务到时提醒',
          body: `任务 "${currentTask.value.text}" 到时了！`
        })
        updateTask(currentTask.value)
        currentTask.value = null
      }
    }
  }
}, { immediate: true });


// 修改显示历史记录的方法
const showFocusHistory = () => {
  showHistoryModal.value = true
}

// 显示提示消息
const showTip = (text, type = 'error') => {
  messageText.value = text
  messageType.value = type
  showMessage.value = true
  setTimeout(() => {
    showMessage.value = false
  }, 3000)
}

</script>




<template>
  <div class="todo-pomodoro">
    <!-- 添加提示消息组件 -->
    <Transition name="slide-fade">
      <div v-if="showMessage" 
           class="message-tip"
           :class="messageType">
        {{ messageText }}
      </div>
    </Transition>

    <!-- 番茄计时器部分 -->
    <div class="timer-section">

      <!-- 计时器容器 -->
      <div class="timer-circle">

        <!-- 圆环进度 -->
        <svg class="progress-ring" width="320" height="320">
          <circle
            class="progress-ring__circle-bg"
            stroke="var(--light-grey)"
            stroke-width="15"
            fill="transparent"
            r="145"
            cx="160"
            cy="160"
          />
          <circle
            class="progress-ring__circle"
            stroke="var(--primary-color)"
            stroke-width="15"
            fill="transparent"
            r="145"
            cx="160"
            cy="160"
            stroke-linecap="round"
            :style="{
              strokeDasharray: `${circumference} ${circumference}`,
              strokeDashoffset: progressOffset
            }"
          />
        </svg>

        <!-- 计时器文字框 -->
        <div class="timer-content">


          <!-- 当前模式 -->
          <div class="mode-label" >专注</div>

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
            <div class="task-item" v-for="task in tasks.filter(task => !task.completed)" :key="task.id" @click="setTask(task)">
              {{ task.text }}
            </div>
          </div>

          
        </div>
      </div>

      <!-- 计时器控制按钮 -->
      <div class="timer-controls">
        <button @click="ControlTimer" :class="isRunning ? 'primary-outline' : 'primary'">
          {{ isRunning ? 'Pause' : 'Start' }}
        </button>
      </div>

      <!-- 计时器扩展按钮 -->
      <div class="timer-actions">
        <!-- <button @click="extendTime" class="text-button">Extend (5 min)</button> -->
        <!-- <button @click="handleTimerComplete" class="text-button" v-show="isStart">End Focus</button> -->
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
          <div 
            v-for="task in tasks" 
            :key="task.id" 
            class="todo-item"
            :class="{ 'active-task': currentTask?.id === task.id }"
          >
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
                :disabled="task.completed"
                @click="startNewTask(task)" 
                class="focus-button"
                :class="{'focus-button-active': currentTask?.id === task.id}"
              >
                <IconEnd v-show="currentTask?.id === task.id" />
                <IconStart v-show="currentTask?.id !== task.id" />
              </button> 
              
            </div>
            
          </div>
        </div>
      </div>


      <!-- 总时间统计 -->
      <div class="stats-section">
          <div class="stat-item">
            <div class="stat-item-left">
              <div class="stat-label">Today Focus Time</div>
              <div class="stat-label-highlight" @click="showFocusHistory">Focus History</div>
            </div>
            <div class="stat-value">
              {{ formatHoursMinutes(totalFocusTime) }}
              <span class="stat-target">of {{formatHoursMinutes(DAILY_FOCUS_TARGET)}}</span>
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

    <!-- 添加历史记录弹窗 -->
    <FocusHistoryModal 
      :is-visible="showHistoryModal"
      @close="showHistoryModal = false"
    />

  </div>
</template>



<style scoped>
@media screen and (min-width: 1100px) {
  .todo-pomodoro {
    display: flex;
    flex-direction: row;
    justify-content: start;
    gap: 100px;
    width: 100%;
    height: 100vh;
    padding: 40px 8%;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh; /* 确保容器至少有一个视窗高度 */
  }

  .timer-section {
    width: 320px;
    height: 100vh;
    margin-top: 50vh;
    transform: translateY(-50%); /* 垂直居中 */
    height: fit-content; /* 高度适应内容 */
    flex-shrink: 0; /* 防止被压缩 */
    align-self: flex-start; /* 从顶部开始定位 */
  }

  .right-section {
    padding-top: 16vh;
    flex-grow: 2;
    overflow-y: auto; /* 右侧内容可滚动 */
    max-height: 100vh; /* 限制最大高度为视窗高度 */
    padding-right: 20px; /* 为滚动条留出空间 */
  }
}

@media screen and (max-width: 1100px) {
  .todo-pomodoro{
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background-color: var(--dark-grey);
    color: #FFFFFF;
  }
  .todo-section{
    margin-top: 50px;
    min-width: 500px;
  }
  .todo-list{
    max-height: 1000px;
  }
} 

.timer-section {
  text-align: center;
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
  background-color: var(--mid-grey);
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
  background-color: var(--light-grey);
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
  background: var(--dark-grey);
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
  background-color: var(--primary-color);
  color: #000;
  padding: 12px 24px;
  font-weight: bold;
  border-radius: 10px;
}

.primary-outline{
  background-color: transparent;
  color: var(--primary-color);
  padding: 12px 24px;
  font-weight: bold;
  border-radius: 10px;
  border: 2px solid var(--primary-color);
}

.secondary {
  background-color: var(--light-grey);
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
.stat-item-left{
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-label {
  font-size: 14px;
  color: #888;
  margin-bottom: 5px;
}
.stat-label-highlight{
  font-size: 14px;
  color: var(--primary-color);
  cursor: pointer;
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
  background-color: var(--light-grey);
  border-radius: 2px;
  overflow: hidden;
}

.stat-progress-bar {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.todo-section {
  background-color: var(--mid-grey);
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
  background-color: var(--dark-grey);
  border: 1px solid var(--light-grey);
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
  border-color: var(--primary-color);
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
  background-color: var(--light-grey);
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
  background-color: var(--light-grey);
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
  border-radius: 16px;
  border-bottom: 1px solid var(--light-grey);
  transition: background-color 0.3s ease;
}
.todo-item:hover .delete-button{
  opacity: 1;
}

.todo-item.active-task {
  background-color: var(--primary-color-transparent);
  /* 可选：添加边框突出显示 */
}

/* 可选：调整激活状态下的文字颜色 */
.todo-item.active-task .task-details {
  color: #000;
}

.todo-item.active-task .time-text{
  color: #000;
}

/* 可选：调整激活状态下的进度条颜色 */
.todo-item.active-task .progress-bar {
  background-color: rgba(0, 0, 0, 0.2);
}

.todo-item.active-task .progress-fill {
  background-color: #000;
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
  background-color: var(--light-grey);
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
}

/* 滚动条整体样式 */
.todo-list::-webkit-scrollbar {
  width: 8px;
}

/* 滚动条轨道 */
.todo-list::-webkit-scrollbar-track {
  background: var(--dark-grey);
  border-radius: 4px;
}

/* 滚动条滑块 */
.todo-list::-webkit-scrollbar-thumb {
  background: var(--light-grey);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.todo-list::-webkit-scrollbar-thumb:hover {
  background: #444;
}

.mode-label {
  font-size: 16px;
  color: var(--primary-color);
  margin-top: 8px;
}

.mode-pause{
  font-size: 16px;
  color: #ffffff;
  margin-top: 2px;
}

.focus-button {
  background-color: var(--primary-color);
  color: var(--dark-grey);
  padding: 0px 16px;
  height: 28px;
  border-radius: 14px;
  font-size: 12px;
}

.focus-button-active {
  background-color: var(--light-grey);
  padding: 2px 16px 0px 16px;
  color: #666;
  opacity: 1;
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
.delete-button {
  border-radius: 8px;
  opacity: 0;  /* 使用 opacity 代替 visibility */
  transition: opacity 0.2s ease;  /* 添加过渡效果，缩短时间 */
  background-color: var(--light-grey);
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
  background-color: var(--light-grey);
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
  background-color: var(--light-grey);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 2px;
  transition: width 0.3s ease;
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

</style> 