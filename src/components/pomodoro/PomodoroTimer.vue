<script setup>
import { ref, watch, onMounted } from 'vue'
import TimerDisplay from './TimerDisplay.vue'
import TimerControls from './TimerControls.vue'
import { useTimer } from '../../composables/useTimer'

// ======================================================================
// Props
// ======================================================================
const props = defineProps({
  currentTask: {
    type: Object,
    default: null
  },
  config: {
    type: Object,
    default: () => ({})
  }
})

// ======================================================================
// Emits
// ======================================================================
const emit = defineEmits([
  'choose-task',
  'short-break',
  'complete',
  'tick',
  'focus-record'
])

// ======================================================================
// Composable
// ======================================================================
const {
  timeLeft,
  isRunning,
  isPause,
  isStart,
  focusStartTime,
  FOCUS_TIME,
  SHORT_BREAK_TIME,
  LONG_BREAK_TIME,
  SHORT_BREAK_INTERVAL,
  timeLeftMinutes,
  circumference,
  progressOffset,
  radius,
  startTimer,
  pauseTimer,
  resetTimer,
  controlTimer,
  updateConfig,
  handleSystemIdle
} = useTimer(props.config)

// ======================================================================
// Methods
// ======================================================================
const handleControl = () => {
  controlTimer({
    onTick: (time) => {
      emit('tick', time)
    },
    onShortBreak: () => {
      emit('short-break', SHORT_BREAK_TIME.value)
    },
    onComplete: () => {
      emit('complete', LONG_BREAK_TIME.value)
    }
  })
}

const handleChooseTask = () => {
  emit('choose-task')
}

// ======================================================================
// Watchers
// ======================================================================
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    updateConfig(newConfig)
  }
}, { deep: true })

// ======================================================================
// Expose methods for parent
// ======================================================================
defineExpose({
  startTimer: (callbacks) => startTimer(callbacks),
  pauseTimer,
  resetTimer,
  handleSystemIdle,
  timeLeftMinutes,
  focusStartTime,
  isRunning,
  isPause,
  isStart
})
</script>

<template>
  <div class="timer-section">
    <TimerDisplay
      :time-left="timeLeft"
      :total-time="FOCUS_TIME"
      :current-task="currentTask"
      :is-pause="isPause"
      :circumference="circumference"
      :progress-offset="progressOffset"
      :radius="radius"
      @choose-task="handleChooseTask"
    />

    <TimerControls
      :is-running="isRunning"
      @control="handleControl"
    />

    <div class="timer-actions">
      <!-- 扩展按钮区域,预留 -->
    </div>
  </div>
</template>

<style scoped>
.timer-section {
  text-align: center;
}

.timer-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
}

@media screen and (min-width: 1100px) {
  .timer-section {
    width: 320px;
    height: 100vh;
    margin-top: 50vh;
    transform: translateY(-50%);
    height: fit-content;
    flex-shrink: 0;
    align-self: flex-start;
  }
}
</style>
