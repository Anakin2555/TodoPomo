<script setup>
import { ref, onMounted, computed } from 'vue'


const emit = defineEmits(['close', 'import'])

// 前一天的任务列表
const previousTasks = ref([])
// 选中的任务ID
const selectedTaskIds = ref([])

// 计算属性：是否全选
const isAllSelected = computed(() => {
  return previousTasks.value.length > 0 && selectedTaskIds.value.length === previousTasks.value.length
})

// 计算属性：是否部分选中
const isIndeterminate = computed(() => {
  return selectedTaskIds.value.length > 0 && selectedTaskIds.value.length < previousTasks.value.length
})

// 全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    // 取消全选
    selectedTaskIds.value = []
  } else {
    // 全选
    selectedTaskIds.value = previousTasks.value.map(task => task.id)
  }
}

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
  ).map((task,index) => ({
    ...task,
    id: Date.now() + index, // 生成新的ID
    completed: false,
    completedTime: 0
  }))
  tasksToImport.reverse()
  console.log('tasksToImport',tasksToImport)
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
          <!-- 全选框 -->
          <div class="select-all-container">
            <label class="checkbox-label select-all-label">
              <input 
                type="checkbox" 
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="toggleSelectAll"
              >
              <span class="select-all-text">Select All</span>
              <span class="select-count">({{ selectedTaskIds.length }}/{{ previousTasks.length }})</span>
            </label>
          </div>
          
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
  background-color: var(--dark-grey);
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

.select-all-container {
  padding: 10px;
  border-radius: 8px;
  background-color: var(--dark-grey);
  /* border-bottom: 2px solid var(--primary-color); */
}

.select-all-label {
  font-weight: bold;
}

.select-all-text {
  flex: 1;
  color: var(--primary-color);
}

.select-count {
  color: var(--bright-grey);
  font-size: 14px;
  font-weight: normal;
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