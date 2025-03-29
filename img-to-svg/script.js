const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const originalCanvas = document.getElementById("originalCanvas");
const svgPreview = document.getElementById("svgPreview");
const svgCode = document.getElementById("svgCode");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const edgeSensitivity = document.getElementById("edgeSensitivity");
const blockSize = document.getElementById("blockSize");
const originalLoadingOverlay = document.getElementById(
"originalLoadingOverlay"
);
const svgLoadingOverlay = document.getElementById("svgLoadingOverlay");
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
dropZone.addEventListener(eventName, preventDefaults, false);
});
function preventDefaults(e) {
e.preventDefault();
e.stopPropagation();
}
dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", handleFile);
dropZone.addEventListener("drop", handleDrop);
function handleDrop(e) {
const files = e.dataTransfer.files;
if (files.length > 0) {
    fileInput.files = files;
    handleFile();
}
}
function showLoading() {
originalLoadingOverlay.style.display = "flex";
svgLoadingOverlay.style.display = "flex";
copyBtn.disabled = true;
downloadBtn.disabled = true;
}
function hideLoading() {
originalLoadingOverlay.style.display = "none";
svgLoadingOverlay.style.display = "none";
copyBtn.disabled = false;
downloadBtn.disabled = false;
}
function handleFile() {
const file = fileInput.files[0];
if (file && file.type.startsWith("image/")) {
    showLoading();
    const reader = new FileReader();
    reader.onload = function (e) {
    const img = new Image();
    img.onload = () => {
        processImage(img);
        hideLoading();
    };
    img.onerror = () => {
        alert("Error loading image");
        hideLoading();
    };
    img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
}
function processImage(img) {
originalCanvas.width = img.width;
originalCanvas.height = img.height;
const ctx = originalCanvas.getContext("2d");
ctx.drawImage(img, 0, 0);
const blockSizeValue = parseInt(blockSize.value);
const sensitivityValue = parseInt(edgeSensitivity.value);
let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">`;
for (let y = 0; y < img.height; y += blockSizeValue) {
    for (let x = 0; x < img.width; x += blockSizeValue) {
    const centerX = x + Math.floor(blockSizeValue / 2);
    const centerY = y + Math.floor(blockSizeValue / 2);
    const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
    const color = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
    let hasEdge = false;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const neighborPixel = ctx.getImageData(
            centerX + dx * blockSizeValue,
            centerY + dy * blockSizeValue,
            1,
            1
        ).data;
        const colorDiff =
            Math.abs(pixel[0] - neighborPixel[0]) +
            Math.abs(pixel[1] - neighborPixel[1]) +
            Math.abs(pixel[2] - neighborPixel[2]);
        if (colorDiff > sensitivityValue) {
            hasEdge = true;
            break;
        }
        }
        if (hasEdge) break;
    }
    if (pixel[3] > 10) {
        if (hasEdge) {
        svgContent += `<rect x="${x}" y="${y}" width="${blockSizeValue}" height="${blockSizeValue}" 
                        fill="${color}" rx="2" ry="2"/>`;
        } else {
        svgContent += `<rect x="${x}" y="${y}" width="${blockSizeValue}" height="${blockSizeValue}" 
                        fill="${color}"/>`;
        }
    }
    }
}
svgContent += "</svg>";
const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
svgPreview.src = URL.createObjectURL(svgBlob);
svgCode.value = svgContent;
}
copyBtn.addEventListener("click", () => {
svgCode.select();
document.execCommand("copy");
});
downloadBtn.addEventListener("click", () => {
const blob = new Blob([svgCode.value], { type: "image/svg+xml" });
const link = document.createElement("a");
link.href = URL.createObjectURL(blob);
link.download = "vector-image.svg";
link.click();
});
edgeSensitivity.addEventListener("input", () => {
if (fileInput.files.length > 0) {
    handleFile();
}
});
blockSize.addEventListener("input", () => {
if (fileInput.files.length > 0) {
    handleFile();
}
});