const toggleControlsBtn = document.getElementById('toggleControlsBtn');
const controlsDiv = document.querySelector('.controls');
toggleControlsBtn.addEventListener('click', function() {
    controlsDiv.classList.toggle('hidden');
});
const vertexShaderSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
    }
`;
const fragmentShaderSource = `#version 300 es
    precision highp float;
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform float u_stippleSize;
    uniform float u_density;
    uniform float u_randomness;
    uniform float u_threshold;
    uniform float u_pixelSize;
    uniform float u_edgeIntensity;
    uniform float u_contrast;
    uniform float u_brightness;
    uniform float u_saturation;
    uniform float u_hue;
    uniform float u_binaryThreshold;
    uniform bool u_stippleEffect;
    uniform bool u_pixelEffect;
    uniform bool u_edgeEffect;
    uniform bool u_binaryEffect;
    in vec2 v_texCoord;
    out vec4 outColor;
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    vec4 applyStipple(vec4 color, vec2 pixelCoord) {
        vec2 stippleGrid = floor(pixelCoord / u_stippleSize);
        vec2 randomOffset = vec2(
            random(stippleGrid + 0.1) - 0.5,
            random(stippleGrid + 0.2) - 0.5
        ) * u_randomness;
        vec2 stippleCenter = (stippleGrid + 0.5) * u_stippleSize;
        float dist = length(pixelCoord - (stippleCenter + randomOffset * u_stippleSize));
        float stippleR = step(dist, u_stippleSize * 0.5 * (1.0 - color.r) * u_density) * step(u_threshold, color.r);
        float stippleG = step(dist, u_stippleSize * 0.5 * (1.0 - color.g) * u_density) * step(u_threshold, color.g);
        float stippleB = step(dist, u_stippleSize * 0.5 * (1.0 - color.b) * u_density) * step(u_threshold, color.b);
        return vec4(1.0 - stippleR, 1.0 - stippleG, 1.0 - stippleB, 1.0);
    }
    vec4 applyPixelation(vec2 texCoord) {
        vec2 pixelatedCoord = floor(texCoord * u_resolution / u_pixelSize) * u_pixelSize / u_resolution;
        return texture(u_image, pixelatedCoord);
    }
    vec4 detectEdges(vec2 texCoord) {
        float dx = 1.0 / u_resolution.x;
        float dy = 1.0 / u_resolution.y;
        vec4 center = texture(u_image, texCoord);
        vec4 left = texture(u_image, texCoord + vec2(-dx, 0));
        vec4 right = texture(u_image, texCoord + vec2(dx, 0));
        vec4 top = texture(u_image, texCoord + vec2(0, -dy));
        vec4 bottom = texture(u_image, texCoord + vec2(0, dy));
        vec4 dx_vec = right - left;
        vec4 dy_vec = bottom - top;
        float edge = sqrt(dot(dx_vec.rgb, dx_vec.rgb) + dot(dy_vec.rgb, dy_vec.rgb));
        return vec4(vec3(1.0 - edge * u_edgeIntensity), 1.0);
    }
    vec4 applyBinary(vec4 color) {
        float intensity = (color.r + color.g + color.b) / 3.0;
        float binary = step(u_binaryThreshold, intensity);
        return vec4(vec3(binary), 1.0);
    }

    void main() {
        vec2 pixelCoord = v_texCoord * u_resolution;
        vec4 color = texture(u_image, v_texCoord);
        
        if (u_pixelEffect) {
            color = applyPixelation(v_texCoord);
        }
        if (u_edgeEffect) {
            color = mix(color, detectEdges(v_texCoord), 0.5);
        }
        
        vec3 hsv = rgb2hsv(color.rgb);
        hsv.x = mod(hsv.x + u_hue / 360.0, 1.0);
        hsv.y *= u_saturation;
        hsv.z = pow(hsv.z * u_brightness, 1.0 / u_contrast);
        color = vec4(hsv2rgb(hsv), color.a);
        
        if (u_binaryEffect) {
            color = applyBinary(color);
        }
        if (u_stippleEffect) {
            color = applyStipple(color, pixelCoord);
        }
        
        outColor = color;
    }
`;
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');
if (!gl) {
    alert('WebGL2 is not supported in your browser!');
    throw new Error('WebGL2 not supported');
}
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw new Error('Failed to link program');
}
const positions = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1,
]);
const texCoords = new Float32Array([
    0, 1,
    1, 1,
    0, 0,
    1, 0,
]);
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
const positionLoc = gl.getAttribLocation(program, 'a_position');
const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
const uniforms = {
    image: gl.getUniformLocation(program, 'u_image'),
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    stippleSize: gl.getUniformLocation(program, 'u_stippleSize'),
    density: gl.getUniformLocation(program, 'u_density'),
    randomness: gl.getUniformLocation(program, 'u_randomness'),
    threshold: gl.getUniformLocation(program, 'u_threshold'),
    pixelSize: gl.getUniformLocation(program, 'u_pixelSize'),
    edgeIntensity: gl.getUniformLocation(program, 'u_edgeIntensity'),
    contrast: gl.getUniformLocation(program, 'u_contrast'),
    brightness: gl.getUniformLocation(program, 'u_brightness'),
    saturation: gl.getUniformLocation(program, 'u_saturation'),
    hue: gl.getUniformLocation(program, 'u_hue'),
    stippleEffect: gl.getUniformLocation(program, 'u_stippleEffect'),
    pixelEffect: gl.getUniformLocation(program, 'u_pixelEffect'),
    edgeEffect: gl.getUniformLocation(program, 'u_edgeEffect'),
    binaryThreshold: gl.getUniformLocation(program, 'u_binaryThreshold'),
    binaryEffect: gl.getUniformLocation(program, 'u_binaryEffect')
};
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
const params = {
    stippleSize: 4,
    density: 1.0,
    randomness: 0.5,
    threshold: 0.1,
    pixelSize: 4,
    edgeIntensity: 1.0,
    contrast: 1.0,
    brightness: 1.0,
    saturation: 1.0,
    hue: 0,
    binaryThreshold: 0.5,
    stippleEffect: true,
    pixelEffect: false,
    edgeEffect: false,
    binaryEffect: false
};
const controls = {
    stippleSize: document.getElementById('stippleSize'),
    density: document.getElementById('density'),
    randomness: document.getElementById('randomness'),
    threshold: document.getElementById('threshold'),
    pixelSize: document.getElementById('pixelSize'),
    edgeIntensity: document.getElementById('edgeIntensity'),
    contrast: document.getElementById('contrast'),
    brightness: document.getElementById('brightness'),
    saturation: document.getElementById('saturation'),
    hue: document.getElementById('hue'),
    stippleEffect: document.getElementById('stippleEffect'),
    pixelEffect: document.getElementById('pixelEffect'),
    edgeEffect: document.getElementById('edgeEffect'),
    binaryThreshold: document.getElementById('binaryThreshold'),
    binaryEffect: document.getElementById('binaryEffect')
};
Object.entries(controls).forEach(([key, control]) => {
    if (control.type === 'checkbox') {
        control.checked = params[key];
        control.addEventListener('change', () => {
            params[key] = control.checked;
            render();
        });
    } else {
        control.value = params[key];
        control.addEventListener('input', () => {
            params[key] = parseFloat(control.value);
            render();
        });
    }
});
document.getElementById('resetBtn').addEventListener('click', () => {
    Object.entries(params).forEach(([key, defaultValue]) => {
        params[key] = defaultValue;
        const control = controls[key];
        if (control.type === 'checkbox') {
            control.checked = defaultValue;
        } else {
            control.value = defaultValue;
        }
    });
    render();
});
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const loading = document.getElementById('loading');
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
});
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});
document.getElementById('downloadBtn').addEventListener('click', () => {
    render();
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    const imageData = tempCtx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < canvas.height; i++) {
        for (let j = 0; j < canvas.width; j++) {
            const sourceIndex = (canvas.height - i - 1) * canvas.width * 4 + j * 4;
            const targetIndex = i * canvas.width * 4 + j * 4;
            imageData.data[targetIndex] = pixels[sourceIndex];
            imageData.data[targetIndex + 1] = pixels[sourceIndex + 1];
            imageData.data[targetIndex + 2] = pixels[sourceIndex + 2];
            imageData.data[targetIndex + 3] = pixels[sourceIndex + 3];
        }
    }
    tempCtx.putImageData(imageData, 0, 0);
    const format = document.getElementById('fileFormat').value;
    const quality = format === 'image/jpeg' ? 0.9 : 1.0;
    const extension = format === 'image/jpeg' ? 'jpg' : 'png';
    const dataURL = tempCanvas.toDataURL(format, quality);
    const link = document.createElement('a');
    link.download = `art-effect.${extension}`;
    link.href = dataURL;
    link.click();
});
let zoomLevel = 1;
document.getElementById('zoomInBtn').addEventListener('click', () => {
    zoomLevel *= 1.2;
    render();
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
    zoomLevel /= 1.2;
    render();
});
document.addEventListener('keydown', function(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        document.getElementById('downloadBtn').click();
    }
});
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    loading.style.display = 'block';
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            loading.style.display = 'none';
            render();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
function render() {
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    const zoomedWidth = canvas.width * zoomLevel;
    const zoomedHeight = canvas.height * zoomLevel;
    gl.uniform2f(uniforms.resolution, zoomedWidth, zoomedHeight);
    gl.uniform1f(uniforms.stippleSize, params.stippleSize);
    gl.uniform1f(uniforms.density, params.density);
    gl.uniform1f(uniforms.randomness, params.randomness);
    gl.uniform1f(uniforms.threshold, params.threshold);
    gl.uniform1f(uniforms.pixelSize, params.pixelSize);
    gl.uniform1f(uniforms.edgeIntensity, params.edgeIntensity);
    gl.uniform1f(uniforms.contrast, params.contrast);
    gl.uniform1f(uniforms.brightness, params.brightness);
    gl.uniform1f(uniforms.saturation, params.saturation);
    gl.uniform1f(uniforms.hue, params.hue);
    gl.uniform1i(uniforms.stippleEffect, params.stippleEffect);
    gl.uniform1i(uniforms.pixelEffect, params.pixelEffect);
    gl.uniform1i(uniforms.edgeEffect, params.edgeEffect);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform1f(uniforms.binaryThreshold, params.binaryThreshold);
    gl.uniform1i(uniforms.binaryEffect, params.binaryEffect);
}
controlsDiv.addEventListener('click', function() {
    if (controlsDiv.classList.contains('hidden')) {
        controlsDiv.classList.remove('hidden');
        controlsDiv.classList.add('visible');
    }
});