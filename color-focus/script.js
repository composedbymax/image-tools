const canvas = document.getElementById('canvas'),
        imageInput = document.getElementById('imageInput'),
        downloadButton = document.getElementById('downloadButton'),
        newLayerColor = document.getElementById('newLayerColor'),
        newLayerTolerance = document.getElementById('newLayerTolerance'),
        newToleranceValue = document.getElementById('newToleranceValue'),
        newLayerHue = document.getElementById('newLayerHue'),
        newHueValue = document.getElementById('newHueValue'),
        addLayerButton = document.getElementById('addLayerButton'),
        layersList = document.getElementById('layersList'),
        sidePanel = document.getElementById('sidePanel'),
        panelToggle = document.getElementById('panelToggle'),
        dropZone = document.getElementById('dropZone');
let originalImage = null, colorLayers = [], idCounter = 0, gl, program, posBuffer, texture;
const MAX_LAYERS = 10;
let uLoc = {};
const showOriginalToggle = document.getElementById('showOriginalToggle');
const originalImageContainer = document.getElementById('originalImageContainer');
const originalImagePreview = document.getElementById('originalImagePreview');
panelToggle.addEventListener('click', () => {
    sidePanel.classList.toggle('open');
    panelToggle.classList.toggle('panel-closed');
    panelToggle.textContent = sidePanel.classList.contains('open') ? '›' : '≡';
});
sidePanel.classList.add('open');
panelToggle.textContent = '›';
newLayerTolerance.oninput = () => newToleranceValue.textContent = newLayerTolerance.value;
newLayerHue.oninput = () => newHueValue.textContent = newLayerHue.value;
addLayerButton.onclick = () => {
    const color = newLayerColor.value,
        tolerance = +newLayerTolerance.value,
        hue = +newLayerHue.value,
        r = parseInt(color.slice(1,3),16),
        g = parseInt(color.slice(3,5),16),
        b = parseInt(color.slice(5,7),16);
    colorLayers.push({ id: 'layer-' + idCounter++, color, tolerance, hue, r, g, b });
    updateLayersList();
    processImage();
};
layersList.addEventListener('input', e => {
    const target = e.target, id = target.closest('.color-layer').id,
        layer = colorLayers.find(l => l.id === id);
    if (!layer) return;
    if (target.type === 'color') {
    layer.color = target.value;
    layer.r = parseInt(target.value.slice(1,3),16);
    layer.g = parseInt(target.value.slice(3,5),16);
    layer.b = parseInt(target.value.slice(5,7),16);
    target.closest('.color-layer').querySelector('.layer-preview').style.backgroundColor = target.value;
    } else if (target.type === 'range') {
    if(target.name === 'tolerance') {
        layer.tolerance = +target.value;
        const span = target.parentElement.querySelector('span');
        if (span) span.textContent = target.value;
    }
    if(target.name === 'hue') {
        layer.hue = +target.value;
        const span = target.parentElement.querySelector('span');
        if (span) span.textContent = target.value;
    }
    }
    processImage();
});
layersList.addEventListener('click', e => {
    if(e.target.classList.contains('layer-remove')){
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
            <div>
            <label>Color:</label>
            <input type="color" name="color" value="${layer.color}">
            </div>
            <div>
            <label>Tolerance: </label>
            <input type="range" name="tolerance" min="0" max="200" value="${layer.tolerance}">
            <span>${layer.tolerance}</span>
            </div>
            <div>
            <label>Hue: </label>
            <input type="range" name="hue" min="0" max="360" value="${layer.hue}">
            <span>${layer.hue}</span>
            </div>
        </div>
        <div class="layer-remove" title="Remove this layer">✕</div>
        </div>
    `);
    });
}
function initWebGL() {
    gl = canvas.getContext('webgl');
    if (!gl) return alert('WebGL not supported.');
    const vs = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main(){ gl_Position = vec4(a_position*2.0-1.0, 0,1); v_texCoord = a_position; }
    `;
    const fs = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image; uniform vec2 u_resolution;
    const int MAX_LAYERS = ${MAX_LAYERS};
    uniform vec3 u_layerColors[MAX_LAYERS];
    uniform float u_layerTolerances[MAX_LAYERS];
    uniform float u_layerHues[MAX_LAYERS];
    uniform int u_numLayers;
    vec3 rgb2hsl(vec3 c){ float maxc = max(max(c.r,c.g),c.b), minc = min(min(c.r,c.g),c.b), h=0.0, s=0.0, l=(maxc+minc)/2.0;
        if(maxc!=minc){ float d = maxc-minc; s = l>0.5? d/(2.0-maxc-minc): d/(maxc+minc);
        h = maxc==c.r? (c.g-c.b)/d+(c.g<c.b?6.0:0.0) : maxc==c.g? (c.b-c.r)/d+2.0 : (c.r-c.g)/d+4.0; h /=6.0; } return vec3(h,s,l); }
    float hue2rgb(float p, float q, float t){ if(t<0.0)t+=1.0; if(t>1.0)t-=1.0; return t<1.0/6.0?p+(q-p)*6.0*t: t<1.0/2.0?q: t<2.0/3.0?p+(q-p)*(2.0/3.0-t)*6.0:p; }
    vec3 hsl2rgb(vec3 hsl){ if(hsl.y==0.0)return vec3(hsl.z); float q = hsl.z<0.5?hsl.z*(1.0+hsl.y): hsl.z+hsl.y-hsl.z*hsl.y, p = 2.0*hsl.z-q;
        return vec3(hue2rgb(p,q,hsl.x+1.0/3.0), hue2rgb(p,q,hsl.x), hue2rgb(p,q,hsl.x-1.0/3.0)); }
    void main(){
        vec4 tex = texture2D(u_image, v_texCoord);
        vec3 color = tex.rgb, outColor = vec3(0.0); bool matched=false;
        for(int i=0;i<MAX_LAYERS;i++){ if(i>=u_numLayers) break;
        if(length(color-u_layerColors[i])<=u_layerTolerances[i]){
            vec3 hsl = rgb2hsl(color); hsl.x = mod(hsl.x+u_layerHues[i],1.0);
            outColor = hsl2rgb(hsl); matched=true; break;
        }
        }
        if(!matched){ float gray = dot(color, vec3(0.299,0.587,0.114)); outColor = vec3(gray); }
        gl_FragColor = vec4(outColor, tex.a);
    }
    `;
    const compile = (type, src) => { let s = gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; } return s; };
    const vsShader = compile(gl.VERTEX_SHADER, vs), fsShader = compile(gl.FRAGMENT_SHADER, fs);
    program = gl.createProgram();
    gl.attachShader(program, vsShader); gl.attachShader(program, fsShader); gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(program)); return; }
    gl.useProgram(program);
    ['u_image','u_resolution','u_layerColors','u_layerTolerances','u_layerHues','u_numLayers']
    .forEach(n=> uLoc[n]=gl.getUniformLocation(program,n));
    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 0,1, 1,0, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program,"a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
}
function processImage() {
    if(!originalImage || !gl) return;
    canvas.width = originalImage.width; 
    canvas.height = originalImage.height;
    canvas.classList.add('canvas-visible');
    const dropContent = dropZone.querySelector('.drop-zone-content');
    if (dropContent) dropContent.style.display = 'none';
    gl.viewport(0,0,canvas.width,canvas.height);
    if(!texture) texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE, originalImage);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.uniform1i(uLoc.u_image, 0);
    gl.uniform2f(uLoc.u_resolution, canvas.width, canvas.height);
    const cols = [], tols = [], hues = [];
    colorLayers.slice(0, MAX_LAYERS).forEach(l => {
    cols.push(l.r/255, l.g/255, l.b/255);
    tols.push(l.tolerance/255);
    hues.push(l.hue/360);
    });
    while(cols.length < MAX_LAYERS*3) cols.push(0,0,0);
    while(tols.length < MAX_LAYERS) tols.push(0);
    while(hues.length < MAX_LAYERS) hues.push(0);
    gl.uniform3fv(uLoc.u_layerColors, new Float32Array(cols));
    gl.uniform1fv(uLoc.u_layerTolerances, new Float32Array(tols));
    gl.uniform1fv(uLoc.u_layerHues, new Float32Array(hues));
    gl.uniform1i(uLoc.u_numLayers, Math.min(colorLayers.length, MAX_LAYERS));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    downloadButton.disabled = false;
}
imageInput.onchange = e => {
    if(e.target.files?.[0]) {
    loadImageFile(e.target.files[0]);
    }
};
function loadImageFile(file) {
    const reader = new FileReader();
    reader.onload = event => { 
      originalImage = new Image(); 
      originalImage.onload = () => {
        processImage();
        // Update the preview image
        originalImagePreview.src = event.target.result;
      }; 
      originalImage.src = event.target.result; 
    };
    reader.readAsDataURL(file);
  }
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    });
});
dropZone.addEventListener('dragenter', () => {
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragover', () => {
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', e => {
    dropZone.classList.remove('drag-over');
    if(e.dataTransfer.files?.length) {
    loadImageFile(e.dataTransfer.files[0]);
    }
});
showOriginalToggle.addEventListener('change', () => {
    originalImageContainer.classList.toggle('visible', showOriginalToggle.checked);
});
downloadButton.onclick = () => {
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.finish();
    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = canvas.width;
    downloadCanvas.height = canvas.height;
    const ctx = downloadCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    const a = document.createElement('a');
    a.download = 'multi-color-focus.png';
    a.href = downloadCanvas.toDataURL('image/png');
    a.click();
};
initWebGL(); 
updateLayersList();