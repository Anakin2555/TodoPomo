<script setup>
import { computed } from 'vue'
import IconEdit from '../icons/IconEdit.vue'
import IconStart from '../icons/IconStart.vue'
import IconEnd from '../icons/IconEnd.vue'

// ======================================================================
// Props
// ======================================================================
const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  focusTime: {
    type: Number,
    required: true
  }
})

// ======================================================================
// Emits
// ======================================================================
const emit = defineEmits(['select', 'edit', 'complete'])

// ======================================================================
// Computed
// ======================================================================
const isCompleted = computed(() => {
  return props.task.completed || props.task.completedTime >= props.task.totalTime
})

const isDisabled = computed(() => {
  return isCompleted.value
})

const completedTime = computed(() => {
  return Math.max(0, props.task.completedTime)
})

const progressPercentage = computed(() => {
  return Math.max(0, Math.min(100, (completedTime.value / props.task.totalTime) * 100))
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

const handleSelect = () => {
  if (!isDisabled.value) {
    emit('select', props.task)
  }
}

const handleEdit = () => {
  emit('edit', props.task)
}

const handleComplete = () => {
  emit('complete', props.task)
}
</script>

<template>
  <div 
    class="todo-item"
    :class="{
      'active-task': isActive,
      'completed-task': isCompleted
    }"
    @click.stop="handleSelect"
  >
    <div class="todo-content">
      <!-- Left Section: Checkbox & Text -->
      <div class="left-section">
        <input 
          type="checkbox" 
          @click.stop="handleComplete" 
          :checked="task.completed"
        />
        <span 
          class="task-text" 
          :class="{ completed: task.completed }"
        >
          {{ task.text }}
        </span>
        
        <!-- Edit Button (Visible on Hover) -->
        <button 
          @click.stop="handleEdit" 
          class="edit-button"
        >
          <IconEdit />
        </button>
      </div>

      <!-- Right Section: Time & Action -->
      <div class="right-section">
        <div class="task-time-info">
          <div class="time-text">
            {{ formatTimeMinutes(completedTime) }} / {{ formatTimeMinutes(task.totalTime) }}
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill"
              :style="{ width: `${progressPercentage}%` }"
            ></div>
          </div>
        </div>

        <!-- Start/Pause Button -->
        <button 
          :disabled="isDisabled"
          @click.stop="handleSelect" 
          class="focus-button"
          :class="{'focus-button-active': isActive}"
        >
          <IconEnd v-show="isActive" />
          <IconStart v-show="!isActive" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.todo-item {
  background-color: var(--mid-grey);
  border-radius: 12px;
  padding: 16px 24px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.todo-item:hover:not(.completed-task) {
  background-color: var(--light-grey);
  transform: translateY(-1px);
}

.active-task {
  background-color: var(--light-grey);
  border: 1px solid var(--primary-color);
}

.completed-task {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--dark-grey);
}

.completed-task:hover {
  background-color: var(--dark-grey);
  transform: none;
}

.todo-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
  padding-right: 16px;
}

.right-section {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-shrink: 0;
}

input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 6px;
  border: 2px solid var(--primary-color);
  appearance: none;
  position: relative;
  background-color: transparent;
  transition: all 0.2s ease;
}

input[type="checkbox"]:checked {
  background-color: var(--primary-color);
}

input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid black;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.task-text {
  font-size: 16px;
  color: #fff;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-text.completed {
  text-decoration: line-through;
  color: #888;
}

.edit-button {
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  background-color: transparent;
  color: #666;
  height: 28px;
  width: 28px;
  padding: 6px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.todo-item:hover .edit-button {
  opacity: 1;
}

.edit-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--primary-color);
}

.task-time-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 100px;
}

.time-text {
  font-size: 13px;
  color: #888;
  font-family: monospace;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: #444;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.focus-button {
  background-color: var(--primary-color);
  color: #000;
  width: 48px;
  height: 32px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.focus-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(0, 242, 234, 0.3);
}

.focus-button-active {
  background-color: #fff;
  color: #000;
}

.focus-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #555;
}

.focus-button :deep(svg) {
  width: 16px;
  height: 16px;
  fill: currentColor;
}
</style>
