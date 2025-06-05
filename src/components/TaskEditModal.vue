<script setup>
import { ref, watch, onUnmounted, computed, onMounted } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  task: {
    type: Object,
    default: null
  },
  focusTime: {       
    type: Number,
    default: 40
  }
})

const emit = defineEmits(['close', 'update', 'delete'])

const taskName = ref('')
const taskSegments = ref(2)
const showDeleteConfirm = ref(false)

// 格式化时间显示
const formattedDuration = computed(() => {
  const hours = Math.floor(props.focusTime*taskSegments.value / 60)
  const minutes = props.focusTime*taskSegments.value % 60
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? minutes + 'min' : ''}`
  }
  return `${minutes}min`
})

// 当任务数据变化时更新表单
watch(() => props.task, (newTask) => {
  if (newTask) {
    console.log('props.task', newTask)
    taskName.value = newTask.text
    taskSegments.value = newTask.totalSegments || 2
  }
}, { immediate: true })

// 监听弹窗显示状态，控制body滚动
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    // 弹窗显示时禁用滚动
    document.body.style.overflow = 'hidden'
  } else {
    // 弹窗关闭时恢复滚动
    document.body.style.overflow = 'auto'
  }
})

// 组件卸载时确保恢复滚动
onUnmounted(() => {
  document.body.style.overflow = 'auto'
})

const handleSubmit = () => {
  emit('update', {
    ...props.task,
    text: taskName.value,
    totalSegments: taskSegments.value,
    totalTime: props.focusTime*taskSegments.value,
    completed: props.focusTime*taskSegments.value < props.task.completedTime
  })
  emit('close')
}

const handleDelete = () => {
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  showDeleteConfirm.value = false
  document.body.style.overflow = 'auto'
  emit('close')
  emit('delete', props.task.id)
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
}

onUnmounted(() => {
  console.log('TaskEditModal unmounted')
})

onMounted(() => {
  console.log('TaskEditModal mounted')
})
</script>

<template>
  <div v-show="isVisible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header class="modal-header">
        <h2>编辑任务</h2>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </header>
      
      <div class="modal-body">
        <div class="form-group">
          <label>任务名称</label>
          <input 
            type="text" 
            v-model="taskName"
            placeholder="输入任务名称"
            class="input-field"
          >
        </div>
        
        <div class="form-group">
          <label>预设时长</label>
          <div class="duration-adjust">
            <button 
              class="segment-button" 
              @click="taskSegments = Math.max(1, taskSegments - 1)"
              :disabled="taskSegments <= 1"
            >-</button>
            <span class="duration-display">{{ formattedDuration }}</span>
            <button 
              class="segment-button" 
              @click="taskSegments += 1"
            >+</button>
          </div>
        </div>
      </div>
      
      <footer class="modal-footer">
        <button class="delete-button" @click="handleDelete">删除任务</button>
        <div class="action-buttons">
          <button class="cancel-button" @click="$emit('close')">取消</button>
          <button class="save-button" @click="handleSubmit">保存</button>
        </div>
      </footer>
    </div>
  </div>

  <!-- 删除确认对话框 -->
  <div v-if="showDeleteConfirm" class="confirm-overlay">
    <div class="confirm-dialog">
      <h3>删除确认</h3>
      <p>确定要删除这个任务吗？此操作无法撤销。</p>
      <div class="confirm-actions">
        <button class="cancel-button" @click="cancelDelete">取消</button>
        <button class="delete-button" @click="confirmDelete">删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--mid-grey);
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--light-grey);
}

.close-button {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.input-field {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--light-grey);
  border-radius: 8px;
  background-color: var(--mid-grey);
  color: var(--text-primary);
  font-size: 16px;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-color);
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--light-grey);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.save-button {
  background-color: var(--primary-color);
  color: var(--dark-grey);
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}

.cancel-button {
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--light-grey);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.delete-button {
  background-color: var(--danger-color, #dc3545);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

button:hover {
  opacity: 0.8;
}

.duration-adjust {
  display: flex;
  align-items: center;
  gap: 16px;
  /* background: var(--dark-grey); */
  padding: 8px;
  border-radius: 8px;
  width: fit-content;
}

.segment-button {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: var(--dark-grey);
  color: var(--text-primary);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
}

.segment-button:hover {
  background-color: var(--light-grey);
}

.segment-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.duration-display {
  font-size: 16px;
  color: var(--text-primary);
  min-width: 80px;
  text-align: center;
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
}

.confirm-dialog {
  background-color: var(--mid-grey);
  padding: 24px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
}

.confirm-dialog h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.confirm-dialog p {
  margin: 0 0 24px 0;
  color: var(--text-secondary, #999);
  font-size: 14px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.confirm-actions button {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.confirm-actions .cancel-button {
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--light-grey);
}

.confirm-actions .delete-button {
  background-color: var(--danger-color, #dc3545);
  color: white;
  border: none;
}

.confirm-actions button:hover {
  opacity: 0.8;
}
</style> 