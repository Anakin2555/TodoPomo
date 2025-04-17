<script setup>
import { ref, onMounted, computed } from 'vue'

const props = defineProps({
  isVisible: Boolean
})

const emit = defineEmits(['close'])

const currentDate = ref(new Date())
const selectedDate = ref(new Date())
const focusRecords = ref([])
const totalFocusTime = ref(0)

// 获取当月的天数
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate()
}

// 获取当月第一天是星期几
const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay()
}

// 计算日历数据
const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  
  const days = []
  // 添加上个月的天数
  const prevMonthDays = getDaysInMonth(year, month - 1)
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false
    })
  }
  
  // 添加当月的天数
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    })
  }
  
  // 添加下个月的天数
  const remainingDays = 42 - days.length // 保持6行
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    })
  }
  
  return days
})

// 月份名称
const monthNames = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

// 当前月份显示
const currentMonthDisplay = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = monthNames[currentDate.value.getMonth()]
  return `${year}年 ${month}`
})

// 切换月份
const changeMonth = (increment) => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + increment)
  currentDate.value = newDate
}

// 选择日期
const selectDate = async (date) => {
  selectedDate.value = date
  await loadDayRecords(date)
}

// 格式化日期
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 加载选中日期的记录
const loadDayRecords = async (date) => {
  try {
    const dateStr = formatDate(date)
    const records = await window.electronAPI.loadFocusHistory(dateStr)
    const dailyFocusTime = await window.electronAPI.loadTotalFocusTime(dateStr)
    focusRecords.value = records || []
    totalFocusTime.value = dailyFocusTime || 0
  } catch (error) {
    console.error('Failed to load focus history:', error)
  }
}

// 格式化时间显示
const formatTimeDisplay = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}小时 ${mins}分钟`
  }
  return `${mins}分钟`
}

// 组件挂载时加载当天记录
onMounted(async () => {
  await loadDayRecords(selectedDate.value)
})

// 关闭弹窗时重置状态
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2>专注历史记录</h2>
        <button class="close-button" @click="handleClose">&times;</button>
      </div>
      
      <div class="history-page">
        <!-- 日历部分 -->
        <div class="calendar-section">
          <div class="calendar-header">
            <button @click="changeMonth(-1)" class="month-button">&lt;</button>
            <h2>{{ currentMonthDisplay }}</h2>
            <button @click="changeMonth(1)" class="month-button">&gt;</button>
          </div>
          
          <div class="calendar-grid">
            <div class="weekday">日</div>
            <div class="weekday">一</div>
            <div class="weekday">二</div>
            <div class="weekday">三</div>
            <div class="weekday">四</div>
            <div class="weekday">五</div>
            <div class="weekday">六</div>
            
            <div
              v-for="day in calendarDays"
              :key="day.date"
              class="calendar-day"
              :class="{
                'other-month': !day.isCurrentMonth,
                'selected': formatDate(selectedDate) === formatDate(day.date)
              }"
              @click="selectDate(day.date)"
            >
              {{ day.date.getDate() }}
            </div>
          </div>
        </div>

        <!-- 历史记录部分 -->
        <div class="history-section">
          <div class="history-header">
            <h2>{{ formatDate(selectedDate) }} 专注记录</h2>
            <div class="total-focus-time">
              总专注时间：{{ formatTimeDisplay(totalFocusTime) }}
            </div>
          </div>

          <div class="history-list">
            <div v-if="focusRecords.length === 0" class="no-records">
              暂无专注记录
            </div>
            <div v-else v-for="record in focusRecords" :key="record.startTime" class="history-item">
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
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  z-index: 1000;
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
  min-height: 0; /* 重要：允许flex子项收缩 */
}

.calendar-section {
  flex: 0 0 400px;
  background-color: var(--mid-grey);
  border-radius: 16px;
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
}

.month-button:hover {
  color: var(--primary-color);
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
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  font-size: 14px;
  transition: all 0.3s ease;
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
}

.history-section {
  flex: 1;
  background-color: var(--mid-grey);
  border-radius: 16px;
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
  background: #252525;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.history-item:hover {
  background: #2C2C2C;
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
</style> 