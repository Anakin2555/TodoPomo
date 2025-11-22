<script setup>
import { watch } from 'vue'
import TaskInput from './TaskInput.vue'
import TaskList from './TaskList.vue'
import { useTasks } from '../../composables/useTasks'

// ======================================================================
// Props
// ======================================================================
const props = defineProps({
  focusTime: {
    type: Number,
    required: true
  },
  currentTask: {
    type: Object,
    default: null
  }
})

// ======================================================================
// Emits
// ======================================================================
const emit = defineEmits([
  'task-added',
  'task-updated',
  'task-deleted',
  'task-selected',
  'task-completed',
  'show-edit-modal',
  'show-import-modal'
])

// ======================================================================
// Composable
// ======================================================================
const {
  tasks,
  newTask,
  addTask,
  updateTask,
  deleteTask,
  setCurrentTask,
  toggleTaskComplete,
  loadTasks
} = useTasks(props.focusTime)

// ======================================================================
// Methods
// ======================================================================
const handleAddTask = async () => {
  try {
    const task = await addTask()
    emit('task-added', task)
  } catch (error) {
    emit('task-added', null, error.message)
  }
}

const handleSelectTask = (task) => {
  setCurrentTask(task)
  emit('task-selected', task)
}

const handleEditTask = (task) => {
  emit('show-edit-modal', task)
}

const handleCompleteTask = async (task) => {
  await toggleTaskComplete(task)
  emit('task-completed', task)
}

const handleShowImport = () => {
  emit('show-import-modal')
}

// ======================================================================
// Watchers
// ======================================================================
watch(() => props.focusTime, () => {
  // 当专注时间变化时,重新计算任务时间
  tasks.value.forEach(task => {
    task.totalTime = task.totalSegments * (props.focusTime / 60)
  })
})

// ======================================================================
// Expose for parent
// ======================================================================
defineExpose({
  tasks,
  loadTasks,
  updateTask,
  deleteTask
})
</script>

<template>
  <div class="todo-section">
    <div class="section-header">
      <div class="header-content">
        <h2>Todo List</h2>
        <button class="import-button" @click="handleShowImport">
          Import
        </button>
      </div>
    </div>

    <TaskInput
      v-model:new-task="newTask"
      :focus-time="focusTime"
      @add-task="handleAddTask"
    />

    <TaskList
      :tasks="tasks"
      :current-task-id="currentTask?.id"
      :focus-time="focusTime"
      @select-task="handleSelectTask"
      @edit-task="handleEditTask"
      @complete-task="handleCompleteTask"
    />
  </div>
</template>

<style scoped>
.todo-section {
  margin-bottom: 30px;
}

.section-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2 {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
}

.import-button {
  background-color: transparent;
  color: var(--primary-color);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.import-button:hover {
  background-color: var(--primary-color);
  color: black;
}

@media screen and (max-width: 1100px) {
  .todo-section {
    margin-top: 50px;
    min-width: 500px;
  }
}
</style>
