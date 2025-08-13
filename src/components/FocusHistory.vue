<template>
  <div class="focus-history">
    <div class="gantt-chart">
      <!-- 时间轴 -->
      <div class="timeline-axis">
        <div 
          v-for="(time, index) in timeSlots" 
          :key="time" 
          class="time-slot"
          :style="{ visibility: index === 0 ? 'hidden' : 'visible' }"
        >
          {{ time }}
        </div>
      </div>
      
      <!-- 甘特图内容区域 -->
      <div class="gantt-content">
        <!-- 时间网格线 -->
        <div class="time-grid">
          <div 
            v-for="time in timeSlots" 
            :key="time" 
            class="grid-line"
          ></div>
        </div>
        
        <!-- 专注会话条 -->
        <div class="session-bars">
          <div 
            v-for="(record, index) in focusHistory" 
            :key="`${record.startTime}-${record.endTime}-${index}`"
            class="session-bar"
            :style="getSessionBarStyle(record)"
            :title="`${record.taskName || '专注'} (${record.startTime} - ${record.endTime}, ${record.duration}分钟)`"
          >
            <span class="session-label">
              {{ record.taskName || '专注' }}
            </span>
            <span class="session-time">
              {{ record.startTime }} - {{ record.endTime }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 调试信息 -->
    <!-- <div v-if="focusHistory.length === 0" class="debug-info">
      暂无专注记录
    </div> -->
    <!-- <div v-else class="debug-info">
      共 {{ focusHistory.length }} 条记录
    </div> -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const focusHistory = ref([])
const timeInterval = ref(30)
const startHour = ref(6)

// 生成时间轴（30分钟间隔，只显示有数据的时间范围）
const timeSlots = computed(() => {
  const slots = []
  // 从早上6点到晚上12点，覆盖大部分工作时间
  for (let hour = startHour.value; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += timeInterval.value) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(time)
    }
  }
  return slots
})

// 格式化日期
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 计算会话条的位置和样式
const getSessionBarStyle = (record) => {
  const startTime = record.startTime
  const endTime = record.endTime
  
  // 解析时间
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  
  // 计算位置（基于时间轴）
  const startPosition = getTimePosition(start)
  const duration = getTimeDuration(start, end)
  
  console.log('Session bar calculation:', {
    record,
    start,
    end,
    startPosition,
    duration
  })
  
  return {
    top: `${startPosition}px`,
    height: `${duration}px`,
    backgroundColor: record.taskName && record.taskName !== '专注' ? '#1ED4CD' : '#666666',
    minHeight: '20px'
  }
}

// 解析时间字符串为分钟数
const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// 计算时间在时间轴上的位置
const getTimePosition = (minutes) => {
  // 基准时间：0:00 = 0px（因为时间轴从0:00开始）
  
  const baseMinutes = startHour.value * 60 // 0:00
  const adjustedMinutes = minutes - baseMinutes
  
  // 每个30分钟间隔对应30px高度
  return Math.max(0, (adjustedMinutes / timeInterval.value) * 30)
}

// 计算会话持续时间
const getTimeDuration = (startMinutes, endMinutes) => {
  let duration = endMinutes - startMinutes
  if (duration < 0) {
    duration += 24 * 60 // 跨天处理
  }
  // 每个30分钟间隔对应30px高度，最小高度20px
  return Math.max((duration / timeInterval.value) * 30, 20)
}

// 从子组件加载历史记录
const loadHistory = async () => {
  try {
    const history = await window.electronAPI.loadFocusHistory(formatDate(new Date()))
    console.log('Loaded focus history:', history)
    focusHistory.value = history.focusHistory || []
    if(focusHistory.value.length > 0) {
      startHour.value = Number(focusHistory.value[0].startTime.split(':')[0])
    }
  } catch (error) {
    console.error('Failed to load focus history:', error)
    focusHistory.value = []
  }
}

// 组件挂载时加载历史记录
onMounted(loadHistory)

// 导出方法供父组件调用
defineExpose({
  loadHistory
})
</script>

<style scoped>
.focus-history {
  background: #1E1E1E;
  border-radius: 10px;
  margin-bottom: 20px;
  padding: 0px;
}

.gantt-chart {
  display: flex;
  position: relative;
  overflow: hidden;
}

.timeline-axis {
  width: 40px;
  flex-shrink: 0;
  margin-top: -20px;
  /* border-right: 1px solid #333; */
  position: relative;
  /* background: #252525; */
}

.time-slot {
  height: 30px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  font-size: 12px;
  color: #888;
  padding-right: 8px;
  position: relative;
  margin-bottom: 0;
  border: none;
}

/* .time-slot::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background-color: #333;
} */

.gantt-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #1E1E1E;
}

.time-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.grid-line {
  height: 30px;
  border-bottom: 1px solid #555;
}

.session-bars {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.session-bar {
  position: absolute;
  left: 6px;
  right: 0px;
  border-radius: 4px;
  border-top: 1px solid #1e1e1e;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  font-size: 13px;
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
  /* box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); */
}


.session-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 700;
}

.session-time {
  font-size: 11px;
  color: #fff;
  font-weight: 400;
}

.debug-info {
  margin-top: 10px;
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style> 