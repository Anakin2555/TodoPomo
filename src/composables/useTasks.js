import { ref, computed } from 'vue'

/**
 * 任务管理 Composable
 * 管理任务的增删改查和状态
 */
export function useTasks(focusTimeRef) {
  // ======================================================================
  // 状态管理
  // ======================================================================
  const tasks = ref([])
  const currentTask = ref(null)
  const newTask = ref({
    id: Date.now(),
    text: '',
    completed: false,
    totalSegments: 2,
    completedTime: 0,
    get totalTime() {
      return this.totalSegments * (focusTimeRef.value / 60)
    }
  })

  // ======================================================================
  // 计算属性
  // ======================================================================
  
  // 活跃任务(未完成)
  const activeTasks = computed(() => 
    tasks.value.filter(task => !task.completed && task.completedTime < task.totalTime)
  )

  // 已完成任务
  const completedTasks = computed(() => 
    tasks.value.filter(task => task.completed || task.completedTime >= task.totalTime)
  )

  // ======================================================================
  // 核心方法
  // ======================================================================

  /**
   * 添加任务
   * @param {Object} taskData - 任务数据(可选,使用newTask或自定义)
   * @returns {Promise<Object>} 添加的任务
   */
  const addTask = async (taskData = null) => {
    const taskToAdd = taskData || newTask.value

    if (!taskToAdd.text.trim()) {
      throw new Error('任务名称不能为空')
    }

    // 检查是否存在相同名称的任务
    const existingTask = tasks.value.find(task => task.text === taskToAdd.text.trim())
    if (existingTask) {
      throw new Error('已存在相同名称的任务')
    }

    const task = {
      id: taskData ? taskData.id : Date.now(),
      text: taskToAdd.text.trim(),
      completed: false,
      totalSegments: taskToAdd.totalSegments || 2,
      completedTime: 0,
      totalTime: (taskToAdd.totalSegments || 2) * (focusTimeRef.value / 60)
    }

    // 保存到存储
    if (window.electronAPI?.addTask) {
      await window.electronAPI.addTask(task)
    }

    tasks.value.push(task)

    // 重置新任务表单
    if (!taskData) {
      newTask.value.text = ''
      newTask.value.totalSegments = 2
      newTask.value.id = Date.now()
    }

    return task
  }

  /**
   * 更新任务
   * @param {Object} updatedTask - 更新后的任务对象
   */
  const updateTask = async (updatedTask) => {
    const index = tasks.value.findIndex(t => t.id === updatedTask.id)
    if (index !== -1) {
      // 更新本地状态
      tasks.value[index] = { ...updatedTask }

      // 同步到存储
      if (window.electronAPI?.updateTask) {
        await window.electronAPI.updateTask({ ...updatedTask })
      }

      // 如果是当前任务,也要更新
      if (currentTask.value?.id === updatedTask.id) {
        currentTask.value = { ...updatedTask }
      }
    }
  }

  /**
   * 删除任务
   * @param {Number} taskId - 任务ID
   */
  const deleteTask = async (taskId) => {
    // 从存储删除
    if (window.electronAPI?.deleteTask) {
      await window.electronAPI.deleteTask(taskId)
    }

    // 从本地删除
    tasks.value = tasks.value.filter(t => t.id !== taskId)

    // 如果删除的是当前任务,清空当前任务
    if (currentTask.value?.id === taskId) {
      currentTask.value = null
    }
  }

  /**
   * 设置当前任务
   * @param {Object} task - 任务对象
   */
  const setCurrentTask = (task) => {
    if (currentTask.value?.id === task?.id) {
      currentTask.value = null
    } else {
      currentTask.value = task
    }
  }

  /**
   * 调整任务时间段
   * @param {Object} task - 任务对象
   * @param {Boolean} increment - true增加,false减少
   */
  const adjustSegments = (task, increment) => {
    if (increment) {
      task.totalSegments++
    } else if (task.totalSegments > 1) {
      task.totalSegments--
    }
    task.totalTime = task.totalSegments * (focusTimeRef.value / 60)
  }

  /**
   * 切换任务完成状态
   * @param {Object} task - 任务对象
   */
  const toggleTaskComplete = async (task) => {
    task.completed = !task.completed
    
    // 如果完成的是当前任务,清空当前任务
    if (task.completed && task.id === currentTask.value?.id) {
      currentTask.value = null
    }

    await updateTask(task)
  }

  /**
   * 增加任务完成时间
   * @param {Number} taskId - 任务ID
   * @param {Number} minutes - 增加的分钟数(默认1)
   */
  const incrementTaskTime = (taskId, minutes = 1) => {
    const task = tasks.value.find(t => t.id === taskId)
    if (task && task.completedTime < task.totalTime) {
      task.completedTime += minutes
      return task
    }
    return null
  }

  /**
   * 加载任务列表
   */
  const loadTasks = async () => {
    try {
      if (window.electronAPI?.loadTasks) {
        const savedTasks = await window.electronAPI.loadTasks()
        if (savedTasks && savedTasks.length > 0) {
          tasks.value = savedTasks
        }
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
      throw error
    }
  }

  /**
   * 批量导入任务
   * @param {Array} tasksToImport - 要导入的任务数组
   * @returns {Object} 导入结果
   */
  const importTasks = async (tasksToImport) => {
    // 过滤掉已存在相同标题的任务
    const uniqueTasks = tasksToImport.filter(newTask =>
      !tasks.value.some(existingTask => existingTask.text === newTask.text.trim())
    )

    if (uniqueTasks.length === 0) {
      return {
        success: false,
        imported: 0,
        duplicates: tasksToImport.length,
        message: '所选的任务都已存在,未添加任何任务'
      }
    }

    // 添加非重复的任务
    for (const task of uniqueTasks) {
      await addTask(task)
    }

    return {
      success: true,
      imported: uniqueTasks.length,
      duplicates: tasksToImport.length - uniqueTasks.length,
      message: uniqueTasks.length === tasksToImport.length
        ? `成功导入 ${uniqueTasks.length} 个任务`
        : `成功导入 ${uniqueTasks.length} 个任务,${tasksToImport.length - uniqueTasks.length} 个任务已存在`
    }
  }

  /**
   * 格式化时间显示(分钟 -> 小时分钟)
   * @param {Number} minutes - 分钟数
   * @returns {String} 格式化的时间字符串
   */
  const formatTimeMinutes = (minutes) => {
    const safeMinutes = Math.max(0, minutes)
    if (safeMinutes < 60) {
      return `${safeMinutes}min`
    } else {
      return `${Math.floor(safeMinutes / 60)}h ${safeMinutes % 60}min`
    }
  }

  // ======================================================================
  // 返回公共接口
  // ======================================================================
  return {
    // 状态
    tasks,
    currentTask,
    newTask,

    // 计算属性
    activeTasks,
    completedTasks,

    // 方法
    addTask,
    updateTask,
    deleteTask,
    setCurrentTask,
    adjustSegments,
    toggleTaskComplete,
    incrementTaskTime,
    loadTasks,
    importTasks,
    formatTimeMinutes
  }
}
