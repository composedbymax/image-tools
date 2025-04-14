const canvas = document.getElementById('canvas'),
      imageInput = document.getElementById('imageInput'),
      downloadButton = document.getElementById('downloadButton'),
      newLayerColor = document.getElementById('newLayerColor'),
      newLayerTolerance = document.getElementById('newLayerTolerance'),
      newToleranceValue = document.getElementById('newToleranceValue'),
      newLayerHue = document.getElementById('newLayerHue'),
      newHueValue = document.getElementById('newHueValue'),
      newLayerUnify = document.getElementById('newLayerUnify'),
      newUnifyValue = document.getElementById('newUnifyValue'),
      addLayerButton = document.getElementById('addLayerButton'),
      layersList = document.getElementById('layersList'),
      sidePanel = document.getElementById('sidePanel'),
      panelToggle = document.getElementById('panelToggle'),
      dropZone = document.getElementById('dropZone'),
      toolColor = document.getElementById('toolColor'),
      toolEraser = document.getElementById('toolEraser'),
      brushSize = document.getElementById('brushSize'),
      brushSizeValue = document.getElementById('brushSizeValue'),
      showOriginalToggle = document.getElementById('showOriginalToggle'),
      originalImageContainer = document.getElementById('originalImageContainer'),
      originalImagePreview = document.getElementById('originalImagePreview');
let originalImage = null,
    colorLayers = [],
    idCounter = 0,
    gl, program, posBuffer, texture, maskTexture,
    uLoc = {},
    eraserMaskCanvas = document.createElement('canvas'),
    eraserMaskCtx,
    erasing = false;
const MAX_LAYERS = 10;
panelToggle.addEventListener('click', () => {
  sidePanel.classList.toggle('open');
  panelToggle.classList.toggle('panel-closed');
  panelToggle.textContent = sidePanel.classList.contains('open') ? '›' : '≡';
});
sidePanel.classList.add('open');
panelToggle.textContent = '›';
const eraserToggle = document.getElementById('eraserToggle');
eraserToggle.addEventListener('change', () => {
  brushSize.parentElement.style.display = eraserToggle.checked ? 'block' : 'none';
});
brushSize.oninput = () => brushSizeValue.textContent = brushSize.value;
newLayerTolerance.oninput = () => newToleranceValue.textContent = newLayerTolerance.value;
newLayerHue.oninput = () => newHueValue.textContent = newLayerHue.value;
newLayerUnify.oninput = () => newUnifyValue.textContent = newLayerUnify.value;
addLayerButton.onclick = () => {
  const color = newLayerColor.value,
        tolerance = +newLayerTolerance.value,
        hue = +newLayerHue.value,
        unify = +newLayerUnify.value,
        r = parseInt(color.slice(1,3),16),
        g = parseInt(color.slice(3,5),16),
        b = parseInt(color.slice(5,7),16);
  colorLayers.push({ id: 'layer-' + idCounter++, color, tolerance, hue, unify, r, g, b });
  updateLayersList();
  processImage();
};
layersList.addEventListener('input', e => {
  const target = e.target,
        id = target.closest('.color-layer').id,
        layer = colorLayers.find(l => l.id === id);
  if (!layer) return;
  if (target.type === 'color') {
    layer.color = target.value;
    layer.r = parseInt(target.value.slice(1,3),16);
    layer.g = parseInt(target.value.slice(3,5),16);
    layer.b = parseInt(target.value.slice(5,7),16);
    target.closest('.color-layer').querySelector('.layer-preview').style.backgroundColor = target.value;
  } else if (target.type === 'range') {
    const span = target.parentElement.querySelector('span');
    if (target.name === 'tolerance') layer.tolerance = +target.value;
    if (target.name === 'hue') layer.hue = +target.value;
    if (target.name === 'unify') layer.unify = +target.value;
    if (span) span.textContent = target.value;
  }
  processImage();
});
layersList.addEventListener('click', e => {
  if (e.target.classList.contains('layer-remove')) {
    const id = e.target.closest('.color-layer').id;
    colorLayers = colorLayers.filter(l => l.id !== id);
    updateLayersList();
    processImage();
  }
});
function updateLayersList() {
  if (!colorLayers.length) {
    layersList.innerHTML = '<p class="empty-layer-message">No color layers added. The entire image will be grayscale.</p>';
    return;
  }
  layersList.innerHTML = '';
  colorLayers.forEach(layer => {
    layersList.insertAdjacentHTML('beforeend', `
      <div class="color-layer" id="${layer.id}">
        <div class="layer-preview" style="background:${layer.color}"></div>
        <div class="layer-controls">
          <div><label>Color:</label><input type="color" name="color" value="${layer.color}"></div>
          <div><label>Tolerance:</label><input type="range" name="tolerance" min="0" max="200" value="${layer.tolerance}"><span>${layer.tolerance}</span></div>
          <div><label>Hue:</label><input type="range" name="hue" min="0" max="360" value="${layer.hue}"><span>${layer.hue}</span></div>
          <div><label>Unify:</label><input type="range" name="unify" min="0" max="100" value="${layer.unify}"><span>${layer.unify}</span></div>
        </div>
        <div class="layer-remove" title="Remove this layer">✕</div>
      </div>
    `);
  });
}
function initEraserMask(width, height) {
  eraserMaskCanvas.width = width;
  eraserMaskCanvas.height = height;
  eraserMaskCtx = eraserMaskCanvas.getContext('2d');
  eraserMaskCtx.fillStyle = 'black';
  eraserMaskCtx.fillRect(0, 0, width, height);
}
canvas.addEventListener('mousedown', e => { if (eraserToggle.checked) { erasing = true; drawErase(e); }});
canvas.addEventListener('mousemove', drawErase);
canvas.addEventListener('mouseup', () => erasing = false);
canvas.addEventListener('mouseleave', () => erasing = false);
function drawErase(e) {
  if (!erasing) return;
  const rect = canvas.getBoundingClientRect(),
        x = (e.clientX - rect.left) * (canvas.width/rect.width),
        y = (e.clientY - rect.top)  * (canvas.height/rect.height);
  eraserMaskCtx.globalCompositeOperation = 'source-over';
  eraserMaskCtx.fillStyle = 'white';
  eraserMaskCtx.beginPath();
  eraserMaskCtx.arc(x, y, +brushSize.value, 0, Math.PI*2);
  eraserMaskCtx.fill();
  processImage();
}
function initWebGL() {
  gl = canvas.getContext('webgl');
  if (!gl) return alert('WebGL not supported.');
  const vs = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main(){ gl_Position = vec4(a_position*2.0-1.0,0,1); v_texCoord = a_position; }
  `;
  const fs = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform sampler2D u_eraseMask;
    uniform vec2 u_resolution;
    const int MAX_LAYERS = ${MAX_LAYERS};
    uniform vec3 u_layerColors[MAX_LAYERS];
    uniform float u_layerTolerances[MAX_LAYERS];
    uniform float u_layerHues[MAX_LAYERS];
    uniform float u_layerUnify[MAX_LAYERS];
    uniform int u_numLayers;
    // rgb<->hsl helpers
    vec3 rgb2hsl(vec3 c){ float maxc=max(max(c.r,c.g),c.b),minc=min(min(c.r,c.g),c.b),h=0.0,s=0.0,l=(maxc+minc)/2.0;
      if(maxc!=minc){ float d=maxc-minc; s=l>0.5?d/(2.0-maxc-minc):d/(maxc+minc);
        h=maxc==c.r?(c.g-c.b)/d+(c.g<c.b?6.0:0.0):maxc==c.g?(c.b-c.r)/d+2.0:(c.r-c.g)/d+4.0; h/=6.0;} return vec3(h,s,l); }
    float hue2rgb(float p,float q,float t){ if(t<0.0)t+=1.0; if(t>1.0)t-=1.0; return t<1.0/6.0?p+(q-p)*6.0*t:t<1.0/2.0?q:t<2.0/3.0?p+(q-p)*(2.0/3.0-t)*6.0:p; }
    vec3 hsl2rgb(vec3 hsl){ if(hsl.y==0.0)return vec3(hsl.z);
      float q=hsl.z<0.5?hsl.z*(1.0+hsl.y):hsl.z+hsl.y-hsl.z*hsl.y,p=2.0*hsl.z-q;
      return vec3(hue2rgb(p,q,hsl.x+1.0/3.0),hue2rgb(p,q,hsl.x),hue2rgb(p,q,hsl.x-1.0/3.0)); }
    void main(){
      vec4 tex = texture2D(u_image,v_texCoord);
      float mask = texture2D(u_eraseMask,v_texCoord).r;
      if(mask>0.5){ float gray=dot(tex.rgb,vec3(0.299,0.587,0.114)); gl_FragColor=vec4(vec3(gray),tex.a); return; }
      vec3 color=tex.rgb,outColor=vec3(0.0); bool matched=false;
      for(int i=0;i<MAX_LAYERS;i++){ if(i>=u_numLayers) break;
        if(length(color-u_layerColors[i])<=u_layerTolerances[i]){
          vec3 hsl=rgb2hsl(color);
          hsl.x=mod(hsl.x+u_layerHues[i],1.0);
          vec3 targetHsl=rgb2hsl(u_layerColors[i]);
          float ua=u_layerUnify[i]/100.0;
          hsl.y=mix(hsl.y,targetHsl.y,ua);
          hsl.z=mix(hsl.z,targetHsl.z,ua);
          outColor=hsl2rgb(hsl);
          outColor=mix(outColor,u_layerColors[i],ua);
          matched=true; break;
        }
      }
      if(!matched){ float gray=dot(color,vec3(0.299,0.587,0.114)); outColor=vec3(gray); }
      gl_FragColor=vec4(outColor,tex.a);
    }
  `;
  const compile=(type,src)=>{ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const vsShader=compile(gl.VERTEX_SHADER,vs), fsShader=compile(gl.FRAGMENT_SHADER,fs);
  program=gl.createProgram(); gl.attachShader(program,vsShader); gl.attachShader(program,fsShader); gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  ['u_image','u_eraseMask','u_resolution','u_layerColors','u_layerTolerances','u_layerHues','u_layerUnify','u_numLayers']
    .forEach(n=>uLoc[n]=gl.getUniformLocation(program,n));
  posBuffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
  const aPos=gl.getAttribLocation(program,'a_position'); gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
}
function processImage() {
  if(!originalImage||!gl) return;
  canvas.width=originalImage.width; canvas.height=originalImage.height;
  if(!eraserMaskCtx||eraserMaskCanvas.width!==canvas.width) initEraserMask(canvas.width,canvas.height);
  canvas.classList.add('canvas-visible');
  const dropContent=dropZone.querySelector('.drop-zone-content'); if(dropContent) dropContent.style.display='none';
  gl.viewport(0,0,canvas.width,canvas.height);
  if(!texture) texture=gl.createTexture();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,originalImage);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  if(!maskTexture) maskTexture=gl.createTexture();
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,maskTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,gl.LUMINANCE,gl.UNSIGNED_BYTE,eraserMaskCanvas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.uniform1i(uLoc.u_image,0);
  gl.uniform1i(uLoc.u_eraseMask,1);
  gl.uniform2f(uLoc.u_resolution,canvas.width,canvas.height);
  const cols=[], tols=[], hues=[], unis=[];
  colorLayers.slice(0,MAX_LAYERS).forEach(l=>{ cols.push(l.r/255,l.g/255,l.b/255); tols.push(l.tolerance/255); hues.push(l.hue/360); unis.push(l.unify||0); });
  while(cols.length<MAX_LAYERS*3) cols.push(0,0,0);
  while(tols.length<MAX_LAYERS) tols.push(0);
  while(hues.length<MAX_LAYERS) hues.push(0);
  while(unis.length<MAX_LAYERS) unis.push(0);
  gl.uniform3fv(uLoc.u_layerColors,new Float32Array(cols));
  gl.uniform1fv(uLoc.u_layerTolerances,new Float32Array(tols));
  gl.uniform1fv(uLoc.u_layerHues,new Float32Array(hues));
  gl.uniform1fv(uLoc.u_layerUnify,new Float32Array(unis));
  gl.uniform1i(uLoc.u_numLayers,Math.min(colorLayers.length,MAX_LAYERS));
  gl.drawArrays(gl.TRIANGLES,0,6);
  downloadButton.disabled=false;
}
imageInput.onchange = e => { if(e.target.files?.[0]) loadImageFile(e.target.files[0]); };
function loadImageFile(file) {
  const reader=new FileReader();
  reader.onload=event=>{
    originalImage=new Image();
    originalImage.onload=()=>{ processImage(); originalImagePreview.src=event.target.result; };
    originalImage.src=event.target.result;
  };
  reader.readAsDataURL(file);
}
['dragenter','dragover','dragleave','drop'].forEach(ev=>{
  dropZone.addEventListener(ev,e=>{ e.preventDefault(); e.stopPropagation(); });
});
dropZone.addEventListener('dragenter',()=>dropZone.classList.add('drag-over'));
dropZone.addEventListener('dragover',()=>dropZone.classList.add('drag-over'));
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop',e=>{ dropZone.classList.remove('drag-over'); if(e.dataTransfer.files?.length) loadImageFile(e.dataTransfer.files[0]); });
showOriginalToggle.addEventListener('change',()=>{
  originalImageContainer.classList.toggle('visible', showOriginalToggle.checked);
});
downloadButton.onclick = () => {
  processImage();
  const downloadCanvas = document.createElement('canvas');
  downloadCanvas.width = canvas.width;
  downloadCanvas.height = canvas.height;
  const ctx = downloadCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  const a = document.createElement('a');
  a.download = 'multi-color-focus-eraser.png';
  a.href = downloadCanvas.toDataURL('image/png');
  a.click();
};
initWebGL();
updateLayersList();