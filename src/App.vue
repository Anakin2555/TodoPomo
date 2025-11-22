<script setup>
import TodoPomodoro from './components/TodoPomodoro.vue'
</script>

<template>
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
  background-color: #010101;
  color: #FFFFFF;
}

.app {
  display: flex;
  align-items: center;
  min-height: 100vh;
}
@media screen and (min-width: 1000px) {
  .app{
    margin-top: -20px;
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
