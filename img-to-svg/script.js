const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const originalCanvas = document.getElementById("originalCanvas");
const svgPreview = document.getElementById("svgPreview");
const svgCode = document.getElementById("svgCode");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const edgeSensitivity = document.getElementById("edgeSensitivity");
const blockSize = document.getElementById("blockSize");
const originalLoadingOverlay = document.getElementById("originalLoadingOverlay");
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
        originalCanvas.width = img.width;
        originalCanvas.height = img.height;
        const ctx = originalCanvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const worker = new Worker("worker.js");
        worker.postMessage({
            imageData,
            width: img.width,
            height: img.height,
            blockSize: parseInt(blockSize.value),
            sensitivity: parseInt(edgeSensitivity.value)
        });
        worker.onmessage = function (e) {
            const { svgContent } = e.data;
            const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
            svgPreview.src = URL.createObjectURL(svgBlob);
            svgCode.value = svgContent;
            hideLoading();
            worker.terminate();
        };
        worker.onerror = function (e) {
            console.error(e);
            alert("Error processing image");
            hideLoading();
            worker.terminate();
        };
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