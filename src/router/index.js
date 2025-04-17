import { createRouter, createWebHashHistory } from 'vue-router'
import TodoPomodoro from '../components/TodoPomodoro.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: TodoPomodoro
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router