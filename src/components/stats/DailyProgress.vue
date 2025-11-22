<script setup>
import { computed } from 'vue'

// ======================================================================
// Props
// ======================================================================
const props = defineProps({
  totalFocusTime: {
    type: Number,
    required: true,
    default: 0
  },
  dailyTarget: {
    type: Number,
    required: true,
    default: 480 // 8 hours in minutes
  }
})

// ======================================================================
// Emits
// ======================================================================
const emit = defineEmits(['show-history'])

// ======================================================================
// Computed
// ======================================================================
const formattedFocusTime = computed(() => {
  return formatHoursMinutes(props.totalFocusTime)
})

const formattedTarget = computed(() => {
  return formatHoursMinutes(props.dailyTarget)
})

const progressWidth = computed(() => {
  const progress = (props.totalFocusTime / props.dailyTarget) * 100
  return `${Math.min(progress, 100)}%`
})

// ======================================================================
// Methods
// ======================================================================
const formatHoursMinutes = (minutes) => {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hrs}hr ${mins}min`
}

const handleShowHistory = () => {
  emit('show-history')
}
</script>

<template>
  <div class="stats-section">
    <div class="stat-item">
      <div class="stat-item-left">
        <div class="stat-label">Today Focus Time</div>
        <button class="history-button" @click="handleShowHistory">
          Focus History
        </button>
      </div>
      <div class="stat-value">
        {{ formattedFocusTime }}
        <span class="stat-target">of {{ formattedTarget }}</span>
      </div>
      <div class="stat-progress">
        <div 
          class="stat-progress-bar" 
          :style="{ width: progressWidth }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-section {
  margin-top: 50px;
  margin-bottom: 30px;
}

.stat-item {
  margin-bottom: 20px;
}

.stat-item-left {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #888;
  margin-bottom: 5px;
}

.history-button {
  background-color: transparent;
  color: var(--primary-color);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.history-button:hover {
  background-color: var(--primary-color);
  color: black;
}

.stat-value {
  font-size: 16px;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.stat-target {
  color: #666;
  font-size: 14px;
}

.stat-progress {
  height: 8px;
  background-color: var(--light-grey);
  border-radius: 4px;
  overflow: hidden;
}

.stat-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), #00d4cc);
  border-radius: 4px;
  transition: width 0.5s ease;
}
</style>
