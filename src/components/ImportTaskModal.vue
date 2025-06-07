<script setup>
import { ref, onMounted } from 'vue'


const emit = defineEmits(['close', 'import'])

// 前一天的任务列表
const previousTasks = ref([])
// 选中的任务ID
const selectedTaskIds = ref([])

// 获取前一天的任务
const loadPreviousTasks = async () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const date = yesterday.toISOString().split('T')[0]
  
  try {
    const tasks = await window.electronAPI.loadTasksByDate(date)
    console.log('loadPreviousTasks',tasks)
    previousTasks.value = tasks
  } catch (error) {
    console.error('Failed to load previous tasks:', error)
  }
}

// 处理导入
const handleImport = () => {
  const tasksToImport = previousTasks.value.filter(task => 
    selectedTaskIds.value.includes(task.id)
  ).map(task => ({
    ...task,
    id: Date.now() + Math.random(), // 生成新的ID
    completed: false,
    completedTime: 0
  }))
  
  emit('import', tasksToImport)
  emit('close')
}

// 组件挂载时加载前一天的任务
onMounted(() => {
  loadPreviousTasks()
})
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Import Previous Tasks</h3>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      
      <div class="modal-body">
        <div v-if="previousTasks.length === 0" class="no-tasks">
          No tasks from yesterday
        </div>
        
        <div v-else class="task-list">
          <div 
            v-for="task in previousTasks" 
            :key="task.id"
            class="task-item"
          >
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                :value="task.id"
                v-model="selectedTaskIds"
              >
              <span class="task-text">{{ task.text }}</span>
              <span class="task-time">{{ task.totalTime }}min</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          class="import-button"
          @click="handleImport"
          :disabled="selectedTaskIds.length === 0"
        >
          Import Selected ({{ selectedTaskIds.length }})
        </button>
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--mid-grey);
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--light-grey);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: normal;
}

.close-button {
  background: none;
  border: none;
  color: var(--bright-grey);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 60vh;
}

.no-tasks {
  text-align: center;
  color: var(--bright-grey);
  padding: 20px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  padding: 10px;
  border-radius: 8px;
  background-color: var(--dark-grey);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.task-text {
  flex: 1;
}

.task-time {
  color: var(--bright-grey);
  font-size: 14px;
}

input[type="checkbox"] {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--primary-color);
  appearance: none;
  cursor: pointer;
  position: relative;
}

input[type="checkbox"]:checked {
  background-color: var(--primary-color);
}

input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  color: black;
  font-size: 14px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--light-grey);
  display: flex;
  justify-content: flex-end;
}

.import-button {
  background-color: var(--primary-color);
  color: black;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.import-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-button:hover:not(:disabled) {
  opacity: 0.9;
}
</style> 