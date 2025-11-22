<script setup>
import { computed } from 'vue'

// ======================================================================
// Props
// ======================================================================
const props = defineProps({
  timeLeft: {
    type: Number,
    required: true
  },
  totalTime: {
    type: Number,
    required: true
  },
  currentTask: {
    type: Object,
    default: null
  },
  isPause: {
    type: Boolean,
    default: false
  },
  circumference: {
    type: Number,
    required: true
  },
  progressOffset: {
    type: Number,
    required: true
  },
  radius: {
    type: Number,
    default: 145
  }
})

// ======================================================================
// Emits
// ======================================================================
const emit = defineEmits(['choose-task'])

// ======================================================================
// Computed
// ======================================================================
const formattedTime = computed(() => {
  const minutes = Math.floor(props.timeLeft / 60)
  const seconds = props.timeLeft % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const statusLabel = computed(() => {
  return !props.isPause ? '进行中' : '已暂停'
})

const statusColor = computed(() => {
  return props.isPause ? 'white' : 'var(--bright-grey)'
})

const taskLabel = computed(() => {
  return props.currentTask ? props.currentTask.text : 'Select a task to focus'
})

// ======================================================================
// Methods
// ======================================================================
const handleChooseTask = () => {
  emit('choose-task')
}
</script>

<template>
  <div class="timer-circle">
    <!-- 圆环进度 -->
    <svg class="progress-ring" width="320" height="320">
      <circle
        class="progress-ring__circle-bg"
        stroke="var(--light-grey)"
        stroke-width="15"
        fill="transparent"
        :r="radius"
        cx="160"
        cy="160"
      />
      <circle
        class="progress-ring__circle"
        stroke="var(--primary-color)"
        stroke-width="15"
        fill="transparent"
        :r="radius"
        cx="160"
        cy="160"
        stroke-linecap="round"
        :style="{
          strokeDasharray: `${circumference} ${circumference}`,
          strokeDashoffset: progressOffset
        }"
      />
    </svg>

    <!-- 计时器文字框 -->
    <div class="timer-content">
      <!-- 当前模式 -->
      <div class="mode-label" :style="{ color: statusColor }">
        {{ statusLabel }}
      </div>

      <!-- 计时器文字 -->
      <div class="timer">{{ formattedTime }}</div>

      <!-- 任务文本框 -->
      <div class="timer-label" @click="handleChooseTask">
        {{ taskLabel }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.timer-circle {
  position: relative;
  width: 320px;
  height: 320px;
  margin: 0 auto 20px;
}

.progress-ring {
  transform: rotate(-90deg);
  position: absolute;
  top: 0;
  left: 0;
}

.progress-ring__circle-bg {
  transition: stroke 0.3s ease;
}

.progress-ring__circle {
  transition: stroke-dashoffset 0.3s ease;
  transform-origin: center;
}

.timer-content {
  position: absolute;
  margin-top: 60px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  width: 80%;
}

.timer {
  font-size: 64px;
  font-weight: 600;
  margin-top: -10px;
  margin-bottom: -6px;
}

.timer-label {
  cursor: pointer;
  font-size: 16px;
  color: var(--primary-color);
  transition: opacity 0.2s ease;
}

.timer-label:hover {
  opacity: 0.8;
}

.mode-label {
  font-size: 16px;
  color: var(--bright-grey);
  margin-top: 20px;
}
</style>
