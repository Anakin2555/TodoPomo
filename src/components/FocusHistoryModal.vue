<script setup>
import { ref, onMounted, computed } from 'vue'

// ======================================================================
// Props 和 Emits
// ======================================================================

const emit = defineEmits(['close'])

// ======================================================================
// 状态管理
// ======================================================================
const currentDate = ref(new Date())
const selectedDate = ref(new Date())
const isToday = ref(true)
const focusRecords = ref([])
const totalFocusTime = ref(0)
const monthRecords = ref({}) // 存储当月每天是否有记录的数据
const taskRecords = ref([])

// 月份名称常量
const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

// ======================================================================
// 工具函数
// ======================================================================
// 日期相关工具
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

// 格式化日期为 YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化时间显示（分钟 → 小时和分钟）
const formatTimeDisplay = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}小时 ${mins}分钟` : `${mins}分钟`
}

// ======================================================================
// 数据加载函数
// ======================================================================
// 加载当月记录数据
const loadMonthRecords = async () => {
  try {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth() + 1
    
    // 获取当月所有记录
    const records = await window.electronAPI.loadMonthRecords(year, month)
    
    // 转换为以日期为键的映射对象
    const recordMap = {}
    if (records && Array.isArray(records)) {
      records.forEach(date => {
        recordMap[date] = true
      })
    }
    monthRecords.value = recordMap
  } catch (error) {
    console.error('加载当月记录数据失败:', error)
  }
}

// 加载选中日期的记录
const loadDayRecords = async (date) => {
  try {
    const dateStr = formatDate(date)
    const records = await window.electronAPI.loadFocusHistory(dateStr)
    const dailyFocusTime = await window.electronAPI.loadTotalFocusTime(dateStr)

    taskRecords.value = records.tasks || []
    focusRecords.value = records.focusHistory || []
    totalFocusTime.value = dailyFocusTime || 0
  } catch (error) {
    console.error('加载日期记录失败:', error)
  }
}

// ======================================================================
// 用户交互处理
// ======================================================================
// 切换月份
const changeMonth = async (increment) => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + increment)
  newDate.setDate(1)
  currentDate.value = newDate
  console.log(newDate,new Date())
  if(newDate.getMonth()===new Date().getMonth()&&newDate.getDate()===new Date().getDate()){
    isToday.value = true
  }else{
    isToday.value = false
  }
  await loadMonthRecords() // 加载新月份的记录数据
}

// 选择日期
const selectDate = async (date) => {
  if (!date) return // 防止点击空白日期
  selectedDate.value = date
  isToday.value = date.toDateString() === new Date().toDateString()
  await loadDayRecords(date)
}

// 跳转到今日
const goToToday = async () => {
  currentDate.value = new Date()
  selectedDate.value = new Date()
  await loadMonthRecords()
  await loadDayRecords(selectedDate.value)
}

// 关闭弹窗
const handleClose = () => emit('close')

// ======================================================================
// 计算属性
// ======================================================================
// 当前月份显示文本
const currentMonthDisplay = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = MONTH_NAMES[currentDate.value.getMonth()]
  return `${year}年 ${month}`
})

// 日历数据计算
const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  
  const days = []
  
  // 添加空白项使1号对应到正确的星期几
  for (let i = 0; i < firstDay; i++) {
    days.push({
      date: null,
      isCurrentMonth: false,
      hasRecords: false,
      isEmpty: true
    })
  }
  
  // 添加当月的天数
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i)
    const dateStr = formatDate(date)
    const selDateStr = formatDate(selectedDate.value)
    
    days.push({
      date,
      isCurrentMonth: true,
      hasRecords: monthRecords.value[dateStr] || false,
      isEmpty: false,
      isSelected: dateStr === selDateStr
    })
  }
  
  return days
})

// ======================================================================
// 生命周期钩子
// ======================================================================
onMounted(async () => {
  console.log('FocusHistoryModal mounted')
  await loadMonthRecords() // 加载当月记录数据
  await loadDayRecords(selectedDate.value) // 加载当前选中日期的记录
})
</script>




<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- 模态框标题 -->
      <header class="modal-header">
        <h2>专注历史记录</h2>
        <button class="close-button" @click="handleClose">&times;</button>
      </header>
      
      <!-- 主要内容区 -->
      <main class="history-page">
        <!-- 日历部分 -->
        <section class="calendar-section">
          <!-- 月份导航 -->
          <header class="calendar-header">
            <button @click="changeMonth(-1)" class="month-button" aria-label="上个月">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <h2>{{ currentMonthDisplay }}</h2>
            <button @click="changeMonth(1)" class="month-button" aria-label="下个月">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </header>
          
          <!-- 日历网格 -->
          <div class="calendar-grid">
            <!-- 星期表头 -->
            <div class="weekday">日</div>
            <div class="weekday">一</div>
            <div class="weekday">二</div>
            <div class="weekday">三</div>
            <div class="weekday">四</div>
            <div class="weekday">五</div>
            <div class="weekday">六</div>
            
            <!-- 日期单元格 -->
            <template v-for="(day, index) in calendarDays" :key="day.date ? day.date.getTime() : `empty-${index}`">
              <div 
                v-if="!day.isEmpty" 
                :class="['calendar-day', {
                  'current-month': day.isCurrentMonth, 
                  'has-records': day.hasRecords,
                  'selected': day.isSelected
                }]"
                @click="selectDate(day.date)">
                {{ day.date.getDate() }}
                <span v-if="day.hasRecords" class="record-dot"></span>
              </div>
              <div v-else class="calendar-day empty"></div>
            </template>
          </div>
          
          <!-- 今日按钮 -->
          <div class="today-button-container">
            <button class="today-button" @click="goToToday"  v-show="!isToday" title="跳转到今日">
              今
            </button>
          </div>
        </section>

        <!-- 右侧历史记录部分 -->
        <section class="history-section">
          <header class="history-header">
            <h2>{{ formatDate(selectedDate) }} 专注记录</h2>
            <div class="total-focus-time">
              总时间：{{ formatTimeDisplay(totalFocusTime) }}
            </div>
          </header>


          <div class="history-list">

            <div class="history-task-list-header">
              <h3>TODO</h3>
            </div>
            <div class="history-task-list">
                <div class="task-text-container" v-for="task in taskRecords" :key="task.id">
                  <div class="task-text-container-left">
                    <input type="checkbox" v-model="task.completed" style="cursor: not-allowed;" disabled />
                    <span class="task-text">{{task.text}}</span>
                  </div>
                  <div class="task-text-container-right">
                    <div class="task-duration">
                      {{task.completedTime}}/{{ task.totalTime }}
                    </div>
                  </div>
                  
                </div>
            </div>

            <!-- 无记录提示 -->
            <div v-if="focusRecords.length === 0" class="no-records">
              暂无专注记录
            </div>
            
            <!-- 记录列表 -->
            <div 
              v-else 
              v-for="record in focusRecords" 
              :key="record.startTime" 
              class="history-item">
              <div class="record-time">
                {{ record.startTime }} - {{ record.endTime }}
              </div>
              <div class="record-task">
                {{ record.taskName }}
              </div>
              <div class="record-duration">
                {{ formatTimeDisplay(record.duration) }}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ======================================================================
   布局结构样式
   ====================================================================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9000;
}

.modal-content {
  background-color: var(--bg-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 1200px;
  height: 90vh;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--light-grey);
  flex-shrink: 0;
}

.close-button {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
}

.close-button:hover {
  color: var(--primary-color);
}

.history-page {
  display: flex;
  gap: 40px;
  padding: 40px;
  flex: 1;
  min-height: 0; /* 允许flex子项收缩 */
  overflow-y: auto; /* 添加垂直滚动 */
}

@media screen and (max-width: 1100px) {
  .history-page {
    flex-direction: column;
    overflow-y: auto;
    align-items: center;
  }

  .calendar-section {
    flex: 1 1 auto;
    width: 400px;
    
  }

  .history-section {
    width:400px;
    height: 2000px;
  }

  /* 调整历史记录列表的滚动行为 */
  .history-list {
    height: 2000px; /* 限制列表最大高度 */
  }
}

/* ======================================================================
   日历部分样式
   ====================================================================== */
.calendar-section {
  flex: 0 0 400px;
  background-color: var(--mid-grey);
  border-radius: 16px;
  border: 2px solid var(--light-grey);
  padding: 24px;
  height: fit-content;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.month-button {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  transition: all 0.3s ease;
}

.month-button:hover {
  color: var(--primary-color);
  background-color: rgba(0, 195, 255, 0.1);
}

.month-button:active {
  transform: scale(0.95);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.weekday {
  text-align: center;
  padding: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
  position: relative;
  padding-bottom: 6px; /* 为指示点留出空间 */
}

.calendar-day:hover {
  background-color: var(--light-grey);
}

.calendar-day.other-month {
  color: var(--text-tertiary);
}

.calendar-day.selected {
  background-color: var(--primary-color);
  color: var(--dark-grey);
  font-weight: bold;
  transform: scale(1.1);
}

/* 记录指示点样式 */
.record-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--primary-color);
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
}

.calendar-day.selected .record-dot {
  background-color: var(--dark-grey);
}

.calendar-day.other-month .record-dot {
  opacity: 0.5;
}

/* 今日按钮样式 */
.today-button-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.today-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: transparent;
  color: var(--primary-color);
  border: 2px solid var(--primary-color);
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.today-button:hover {
  transform: scale(1.2);
}

.today-button:active {
  transform: scale(0.95);
}

/* ======================================================================
   历史记录部分样式
   ====================================================================== */
.history-section {
  flex: 1;
  background-color: var(--mid-grey);
  border-radius: 16px;
  border: 2px solid var(--light-grey);
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.history-header {
  margin-bottom: 24px;
  flex-shrink: 0;
}

.total-focus-time {
  color: var(--primary-color);
  font-size: 16px;
  margin-top: 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  padding-right: 8px;
  margin-top: 10px;
}

/* 自定义滚动条样式 */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: var(--dark-grey);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb {
  background: var(--light-grey);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}

.no-records {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--light-grey);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.history-item:hover {
  background: var(--light-grey);
}

.record-time {
  color: var(--primary-color);
  font-size: 14px;
}

.record-task {
  flex: 1;
  margin: 0 15px;
  color: #fff;
}

.record-duration {
  color: #888;
  font-size: 14px;
}


.task-text-container{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
}

.task-text-container-left{
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-text-container-right{
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-task-list-header{
  font-weight: 800;
}

.history-task-list{
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style> 