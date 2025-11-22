<script setup>
import { computed } from 'vue'
import IconYes from '../icons/IconYes.vue'

// ======================================================================
// Props
// ======================================================================
const props = defineProps({
  focusTime: {
    type: Number,
    required: true
  }
})

// ======================================================================
// Emits
// ======================================================================
const emit = defineEmits(['add-task'])

// ======================================================================
// State
// ======================================================================
const newTask = defineModel('newTask', {
  type: Object,
  required: true
})

// ======================================================================
// Computed
// ======================================================================
const totalTime = computed(() => {
  return newTask.value.totalSegments * (props.focusTime / 60)
})

const showControls = computed(() => {
  return newTask.value.text.trim() !== ''
})

// ======================================================================
// Methods
// ======================================================================
const formatTimeMinutes = (minutes) => {
  const safeMinutes = Math.max(0, minutes)
  if (safeMinutes < 60) {
    return `${safeMinutes}min`
  } else {
    return `${Math.floor(safeMinutes / 60)}h ${safeMinutes % 60}min`
  }
}

const adjustSegments = (increment) => {
  if (increment) {
    newTask.value.totalSegments++
  } else if (newTask.value.totalSegments > 1) {
    newTask.value.totalSegments--
  }
}

const handleAddTask = () => {
  emit('add-task')
}

const handleKeyup = (event) => {
  if (event.key === 'Enter') {
    handleAddTask()
  }
}
</script>

<template>
  <div class="todo-input">
    <input 
      v-model="newTask.text" 
      @keyup="handleKeyup"
      placeholder="Add new task..."
    >
    
    <!-- 预设时间段调整 -->
    <div class="segment-adjust" v-show="showControls">
      <button 
        class="icon-button" 
        @click.stop="adjustSegments(false)"
        :disabled="newTask.totalSegments <= 1"
      >-</button>
      <span class="segments-count">{{ formatTimeMinutes(totalTime) }}</span>
      <button 
        class="icon-button" 
        @click.stop="adjustSegments(true)"
      >+</button>
    </div>
    
    <button 
      @click="handleAddTask" 
      class="icon-button-add" 
      v-show="showControls"
    >
      <IconYes />
    </button>
  </div>
</template>

<style scoped>
.todo-input {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}

.todo-input input {
  flex: 1;
  padding: 12px;
  background-color: var(--mid-grey);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}

.todo-input input::placeholder {
  color: #666;
}

.segment-adjust {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--mid-grey);
  padding: 4px 12px;
  border-radius: 8px;
}

.icon-button {
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
  font-size: 16px;
  transition: background-color 0.2s ease;
}

.icon-button:hover:not(:disabled) {
  background-color: #444;
}

.icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.segments-count {
  min-width: 64px;
  text-align: center;
  font-size: 14px;
  color: #888;
}

.icon-button-add {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--primary-color);
  color: #000;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 6px;
}

.icon-button-add:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 242, 234, 0.3);
}
</style>
