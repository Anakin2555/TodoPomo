// devicepicker.js
const { ipcRenderer } = require('electron');
const selectBtn = document.getElementById('selectBtn');
const cancelBtn = document.getElementById('cancelBtn');
const deviceListEl = document.getElementById('deviceList');

let knownDevices = new Set();

// 接收设备列表
ipcRenderer.on('bluetooth-device-list', (event, deviceList) => {
  deviceList.forEach(dev => {
    if (!knownDevices.has(dev.deviceId)) {
      knownDevices.add(dev.deviceId);
      const option = document.createElement('option');
      option.value = dev.deviceId;
      option.textContent = `${dev.deviceName || '未知设备'} (${dev.deviceId})`;
      deviceListEl.appendChild(option);
    }
  });
});

// 连接按钮
selectBtn.onclick = () => {
  const selectedId = deviceListEl.value;
  if (selectedId) {
    ipcRenderer.send('select-bluetooth-device', selectedId);
    window.close();
  }
};

// 取消按钮
cancelBtn.onclick = () => {
  ipcRenderer.send('cancel-bluetooth-scan');
  window.close();
};