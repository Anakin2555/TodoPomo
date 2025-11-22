<script setup>
// ======================================================================
// Props
// ======================================================================
const props = defineProps({
  isRunning: {
    type: Boolean,
    required: true
  }
})

// ======================================================================
// Emits
// ======================================================================
const emit = defineEmits(['control'])

// ======================================================================
// Methods
// ======================================================================
const handleControl = () => {
  emit('control')
}
</script>

<template>
  <div class="timer-controls">
    <button 
      @click="handleControl" 
      :class="isRunning ? 'primary-outline' : 'primary'"
    >
      {{ isRunning ? 'Pause' : 'Start' }}
    </button>
  </div>
</template>

<style scoped>
.timer-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}

button {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.primary {
  background-color: var(--primary-color);
  color: #000;
  padding: 12px 24px;
  font-weight: bold;
  border-radius: 10px;
}

.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 242, 234, 0.3);
}

.primary-outline {
  background-color: transparent;
  color: var(--primary-color);
  padding: 12px 24px;
  font-weight: bold;
  border-radius: 10px;
  border: 2px solid var(--primary-color);
}

.primary-outline:hover {
  background-color: rgba(0, 242, 234, 0.1);
}
</style>
