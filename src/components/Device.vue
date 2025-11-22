<template>
    <div>
      <h2>BLE 蓝牙扫描</h2>
      <button @click="scanDevices">扫描设备</button>
      <ul>
        <li v-for="device in devices" :key="device.address">
          {{ device.name || '未知设备' }} ({{ device.address }})
          <button @click="connect(device.address)">连接</button>
        </li>
      </ul>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const devices = ref([])
  
  async function scanDevices() {
    const list = await window.electronAPI.scan()
    devices.value = list
  }

  async function connect(address) {
    const res = await window.electronAPI.connect(address)
    if (res.connected) alert('已连接: ' + address)
  }
  </script>
  