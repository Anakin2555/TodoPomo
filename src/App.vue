<script setup>
import TodoPomodoro from './components/TodoPomodoro.vue'
</script>

<template>
  <div class="title-bar">
    <div class="app-title">TodoPomo</div>
  </div>
  <div class="app">
    <TodoPomodoro />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.title-bar {
  height: 30px;
  background: var(--bg-primary);
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding-left: 16px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  user-select: none;
}

.app-title {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
}

.app {
  display: flex;
  align-items: center;
  min-height: 100vh;
}


@media screen and (max-width: 1100px) {
  .app{
    margin-top: 40px;
  }
} 
  

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1E1E1E;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
  transition: background 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: #444;
}

/* 防止滚动条导致页面抖动 */
/* html {
  overflow-y: overlay;
  scrollbar-gutter: stable;
} */
</style>
