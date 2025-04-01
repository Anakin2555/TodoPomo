<template>
  <div class="focus-history">
    <!-- <div>今日专注记录</div> -->
    <div class="history-list">
      <div v-for="record in focusHistory" :key="record.startTime" class="history-item">
        <div class="time-range">
          {{ record.startTime }} - {{ record.endTime }}
        </div>
        <div class="task-name">
          {{ record.taskName || '专注' }}
        </div>
        <div class="duration">
          {{ record.duration }}分钟
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const focusHistory = ref([])

// 加载历史记录
const loadHistory = async () => {
  try {
    focusHistory.value = await window.electronAPI.loadFocusHistory()
  } catch (error) {
    console.error('Failed to load focus history:', error)
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
}

.history-list {
  margin-top: 10px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin: 8px 0;
  background: #252525;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.history-item:hover {
  background: #2C2C2C;
}

.time-range {
  color: var(--primary-color);
  font-size: 14px;
}

.task-name {
  flex: 1;
  margin: 0 15px;
  color: #fff;
}

.duration {
  color: #888;
  font-size: 14px;
}
</style> 