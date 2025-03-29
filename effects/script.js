const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
let originalImage = null;
let layers = [];
let layerId = 0;
class Layer {
  constructor(type, intensity = 50) {
    this.id = layerId++;
    this.type = type;
    this.intensity = intensity;
    this.enabled = true;
  }
}
const dropZone = document.getElementById("dropZone");
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "var(--accent)";
});
dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "#ccc";
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "#ccc";
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    handleImage(file);
  }
});
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    handleImage(file);
  }
});
function handleImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      originalImage = img;
      enableButtons();
      layers = [];
      updateLayers();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function enableButtons() {
  document.querySelectorAll("button").forEach((btn) => (btn.disabled = false));
}
function addEffectLayer(type) {
  if (!originalImage) return;
  const layer = new Layer(type);
  layers.push(layer);
  updateLayers();
  applyAllEffects();
}
function updateLayers() {
  const layersList = document.getElementById("layersList");
  layersList.innerHTML = "";
  layers.forEach((layer, index) => {
    const layerItem = document.createElement("div");
    layerItem.className = "layer-item";
    const label = document.createElement("span");
    label.textContent = `${layer.type}(${layer.intensity}%)`;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "1";
    slider.max = "100";
    slider.value = layer.intensity;
    slider.addEventListener("input", (e) => {
      layer.intensity = parseInt(e.target.value);
      label.textContent = `${layer.type}(${layer.intensity}%)`;
      applyAllEffects();
    });
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = layer.enabled ? "Disable" : "Enable";
    toggleBtn.onclick = () => {
      layer.enabled = !layer.enabled;
      toggleBtn.textContent = layer.enabled ? "Disable" : "Enable";
      applyAllEffects();
    };
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => {
      layers.splice(index, 1);
      updateLayers();
      applyAllEffects();
    };
    const controls = document.createElement("div");
    controls.className = "layer-controls";
    controls.appendChild(slider);
    controls.appendChild(toggleBtn);
    controls.appendChild(deleteBtn);
    layerItem.appendChild(label);
    layerItem.appendChild(controls);
    layersList.appendChild(layerItem);
  });
}
function savePreset() {
  const presetNameInput = document.getElementById("presetName");
  const presetName = presetNameInput.value.trim();
  if (!presetName) {
    alert("Please enter a preset name");
    return;
  }
  const presets = JSON.parse(
    localStorage.getItem("imageEffectPresets") || "{}"
  );
  presets[presetName] = layers.map((layer) => ({
    type: layer.type,
    intensity: layer.intensity,
    enabled: layer.enabled,
  }));
  localStorage.setItem("imageEffectPresets", JSON.stringify(presets));
  presetNameInput.value = "";
  loadPresets();
}
function loadPresets() {
  const presetList = document.getElementById("presetList");
  presetList.innerHTML = "";
  const presets = JSON.parse(
    localStorage.getItem("imageEffectPresets") || "{}"
  );
  Object.entries(presets).forEach(([name, preset]) => {
    const presetTag = document.createElement("div");
    presetTag.className = "preset-tag";
    const presetNameSpan = document.createElement("span");
    presetNameSpan.textContent = name;
    const applyBtn = document.createElement("button");
    applyBtn.textContent = "Apply";
    applyBtn.onclick = () => applyPreset(preset);
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.onclick = () => deletePreset(name);
    presetTag.appendChild(presetNameSpan);
    presetTag.appendChild(applyBtn);
    presetTag.appendChild(deleteBtn);
    presetList.appendChild(presetTag);
  });
}
function applyPreset(preset) {
  if (!originalImage) {
    alert("Please upload an image first");
    return;
  }
  layers = [];
  preset.forEach((layerConfig) => {
    const layer = new Layer(layerConfig.type, layerConfig.intensity);
    layer.enabled = layerConfig.enabled;
    layers.push(layer);
  });
  updateLayers();
  applyAllEffects();
}
function deletePreset(name) {
  const presets = JSON.parse(
    localStorage.getItem("imageEffectPresets") || "{}"
  );
  delete presets[name];
  localStorage.setItem("imageEffectPresets", JSON.stringify(presets));
  loadPresets();
}
loadPresets();
function applyAllEffects() {
  if (!originalImage) return;
  ctx.drawImage(originalImage, 0, 0);
  layers.forEach((layer) => {
    if (layer.enabled) {
      applyEffect(layer);
    }
  });
}
function applyEffect(layer) {
  const intensity = layer.intensity / 100;
  switch (layer.type) {
    case "pixelate":
      pixelateEffect(intensity);
      break;
    case "glitch":
      glitchEffect(intensity);
      break;
    case "wavey":
      waveyEffect(intensity);
      break;
    case "invert":
      invertEffect(intensity);
      break;
    case "blur":
      blurEffect(intensity);
      break;
    case "noise":
      noiseEffect(intensity);
      break;
    case "chromatic":
      chromaticEffect(intensity);
      break;
    case "vignette":
      vignetteEffect(intensity);
      break;
    case "scanlines":
      scanlinesEffect(intensity);
      break;
    case "rgb-shift":
      rgbShiftEffect(intensity);
      break;
  }
}
function pixelateEffect(intensity) {
  const size = Math.max(2, Math.floor(50 * intensity));
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0, canvas.width / size, canvas.height / size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    tempCanvas,
    0,
    0,
    canvas.width / size,
    canvas.height / size,
    0,
    0,
    canvas.width,
    canvas.height
  );
}
function glitchEffect(intensity) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const amount = Math.floor(intensity * 50);
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  for (let i = 0; i < amount; i++) {
    const y = Math.random() * canvas.height;
    const height = Math.random() * 50 * intensity;
    const shift = (Math.random() - 0.5) * 30 * intensity;
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(
      tempCanvas,
      0,
      y,
      canvas.width,
      height,
      shift,
      y,
      canvas.width,
      height
    );
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(
      tempCanvas,
      0,
      y,
      canvas.width,
      height,
      -shift,
      y,
      canvas.width,
      height
    );
  }
  for (let i = 0; i < amount; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const width = Math.random() * 100 * intensity;
    const height = Math.random() * 30 * intensity;
    const sourceX = Math.random() * canvas.width;
    const sourceY = Math.random() * canvas.height;
    ctx.drawImage(
      tempCanvas,
      sourceX,
      sourceY,
      width,
      height,
      x,
      y,
      width,
      height
    );
  }
  ctx.globalCompositeOperation = "source-over";
}
function waveyEffect(intensity) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  const amplitude = 20 * intensity;
  const period = 200 * (1 - intensity);
  const phase = Date.now() / 1000;
  for (let x = 0; x < canvas.width; x++) {
    const distortX = amplitude * Math.sin((x / period + phase) * Math.PI * 2);
    const distortY = amplitude * Math.cos((x / period + phase) * Math.PI * 2);
    ctx.drawImage(
      tempCanvas,
      x,
      0,
      1,
      canvas.height,
      x + distortX,
      distortY,
      1,
      canvas.height
    );
  }
}
function invertEffect(intensity) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] * (1 - intensity) + (255 - data[i]) * intensity;
    data[i + 1] =
      data[i + 1] * (1 - intensity) + (255 - data[i + 1]) * intensity;
    data[i + 2] =
      data[i + 2] * (1 - intensity) + (255 - data[i + 2]) * intensity;
  }
  ctx.putImageData(imageData, 0, 0);
}
function blurEffect(intensity) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  const radius = Math.floor(intensity * 20);
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.filter = "none";
}
function noiseEffect(intensity) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity * 100;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}
function chromaticEffect(intensity) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  const shift = Math.floor(intensity * 20);
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "red";
  ctx.globalAlpha = 0.5 * intensity;
  ctx.drawImage(tempCanvas, shift, 0);
  ctx.fillStyle = "blue";
  ctx.drawImage(tempCanvas, -shift, 0);
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = "source-over";
}
function vignetteEffect(intensity) {
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) / 2
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1 - intensity, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = "multiply";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
}
function scanlinesEffect(intensity) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  const lineHeight = Math.max(1, Math.floor(4 * (1 - intensity)));
  for (let y = 0; y < canvas.height; y += lineHeight * 2) {
    ctx.fillStyle = `rgba(0,0,0,${0.5 * intensity})`;
    ctx.fillRect(0, y, canvas.width, lineHeight);
  }
}
function rgbShiftEffect(intensity) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const shift = Math.floor(intensity * 10);
  const result = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = data[(y * canvas.width + ((x + shift) % canvas.width)) * 4];
      const g = data[i + 1];
      const b = data[(y * canvas.width + ((x - shift) % canvas.width)) * 4 + 2];
      result.data[i] = r;
      result.data[i + 1] = g;
      result.data[i + 2] = b;
      result.data[i + 3] = 255;
    }
  }
  ctx.putImageData(result, 0, 0);
}
function resetAll() {
  if (originalImage) {
    ctx.drawImage(originalImage, 0, 0);
    layers = [];
    updateLayers();
  }
}
function downloadImage() {
  const link = document.createElement("a");
  link.download = "edited-image.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
function showNotification(message) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.classList.add("show");
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}
function savePreset() {
  const presetNameInput = document.getElementById("presetName");
  const presetName = presetNameInput.value.trim();
  if (!presetName) {
    showNotification("Please enter a preset name");
    return;
  }
  const presets = JSON.parse(
    localStorage.getItem("imageEffectPresets") || "{}"
  );
  presets[presetName] = layers.map((layer) => ({
    type: layer.type,
    intensity: layer.intensity,
    enabled: layer.enabled,
  }));
  localStorage.setItem("imageEffectPresets", JSON.stringify(presets));
  presetNameInput.value = "";
  loadPresets();
  showNotification(`Preset "${presetName}" saved successfully`);
}
window.addEventListener("resize", () => {
  if (originalImage) {
    applyAllEffects();
  }
});