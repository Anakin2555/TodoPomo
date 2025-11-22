<script setup>
import TaskItem from './TaskItem.vue'

// ======================================================================
// Props
// ======================================================================
const props = defineProps({
  tasks: {
    type: Array,
    required: true,
    default: () => []
  },
  currentTaskId: {
    type: Number,
    default: null
  },
  focusTime: {
    type: Number,
    required: true
  }
})

// ======================================================================
// Emits
// ======================================================================
const emit = defineEmits(['select-task', 'edit-task', 'complete-task'])

// ======================================================================
// Methods
// ======================================================================
const handleSelectTask = (task) => {
  emit('select-task', task)
}

const handleEditTask = (task) => {
  emit('edit-task', task)
}

const handleCompleteTask = (task) => {
  emit('complete-task', task)
}
</script>

<template>
  <div class="todo-list">
    <TaskItem
      v-for="task in tasks"
      :key="task.id"
      :task="task"
      :is-active="currentTaskId === task.id"
      :focus-time="focusTime"
      @select="handleSelectTask"
      @edit="handleEditTask"
      @complete="handleCompleteTask"
    />
    
    <div v-if="tasks.length === 0" class="empty-state">
      No tasks yet. Add one above to get started!
    </div>
  </div>
</template>

<style scoped>
.todo-list {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 40px 20px;
  font-size: 14px;
}

/* 自定义滚动条 */
.todo-list::-webkit-scrollbar {
  width: 8px;
}

.todo-list::-webkit-scrollbar-track {
  background: var(--dark-grey);
  border-radius: 4px;
}

.todo-list::-webkit-scrollbar-thumb {
  background: var(--light-grey);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.todo-list::-webkit-scrollbar-thumb:hover {
  background: #444;
}

@media screen and (max-width: 1100px) {
  .todo-list {
    max-height: 1000px;
  }
}
</style>
