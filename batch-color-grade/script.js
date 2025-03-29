const baseImageInput = document.getElementById('baseImage');
const otherImagesInput = document.getElementById('otherImages');
const processButton = document.getElementById('process');
const outputDiv = document.getElementById('output');
const brightnessSlider = document.getElementById('brightness');
const colorIntensitySlider = document.getElementById('colorIntensity');
const loadingIndicator = document.getElementById('loading');
const downloadAllButton = document.getElementById('downloadAll');
const outputWidthInput = document.getElementById('outputWidth');
const outputHeightInput = document.getElementById('outputHeight');
let baseImageData;
let processedImages = [];
function setupDragAndDrop(dropZone, input, previewElement) {
    const events = ['dragenter', 'dragover', 'dragleave', 'drop'];
    events.forEach(event => {
        dropZone.addEventListener(event, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    ['dragenter', 'dragover'].forEach(event => {
        dropZone.addEventListener(event, () => {
            dropZone.classList.add('drag-over');
        });
    });
    ['dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, () => {
            dropZone.classList.remove('drag-over');
        });
    });
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (input.multiple) {
            input.files = files;
        } else {
            const dt = new DataTransfer();
            dt.items.add(files[0]);
            input.files = dt.files;
        }
        input.dispatchEvent(new Event('change'));
    });
}
setupDragAndDrop(
    document.getElementById('baseImageDropZone'),
    baseImageInput,
    document.getElementById('basePreview')
);
setupDragAndDrop(
    document.getElementById('otherImagesDropZone'),
    otherImagesInput,
    document.getElementById('otherPreviewsContainer')
);
function showBaseImagePreview(file) {
    const preview = document.getElementById('basePreview');
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('baseImageLabel').textContent = file.name;
    }
    reader.readAsDataURL(file);
}
function showOtherImagesPreview(files) {
    const container = document.getElementById('otherPreviewsContainer');
    container.innerHTML = '';
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.createElement('img');
            preview.src = e.target.result;
            preview.className = 'preview-image';
            container.appendChild(preview);
        }
        reader.readAsDataURL(file);
    });
    
    document.getElementById('otherImagesLabel').textContent = `${files.length} files selected`;
}
baseImageInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        showBaseImagePreview(e.target.files[0]);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        };
        img.src = URL.createObjectURL(e.target.files[0]);
    }
});
otherImagesInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        showOtherImagesPreview(e.target.files);
    }
});
brightnessSlider.addEventListener('input', (e) => {
    document.getElementById('brightnessValue').textContent = e.target.value;
});
colorIntensitySlider.addEventListener('input', (e) => {
    document.getElementById('colorIntensityValue').textContent = e.target.value;
});
processButton.addEventListener('click', () => {
    if (!baseImageData) {
        alert("Please upload a reference image.");
        return;
    }
    if (!otherImagesInput.files.length) {
        alert("Please upload one or more images to process.");
        return;
    }
    const upscaleWidth = parseInt(outputWidthInput.value) || 1080;
    const upscaleHeight = parseInt(outputHeightInput.value) || 1920;
    outputDiv.innerHTML = '';
    loadingIndicator.style.display = 'block';
    downloadAllButton.style.display = 'none';
    processedImages = [];
    const averageColor = getAverageColor(baseImageData);
    const brightness = parseFloat(brightnessSlider.value);
    const colorIntensity = parseFloat(colorIntensitySlider.value);
    let processed = 0;
    Array.from(otherImagesInput.files).forEach(file => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = upscaleWidth;
            canvas.height = upscaleHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, upscaleWidth, upscaleHeight);
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            adjustColors(imageData, averageColor, brightness, colorIntensity);
            ctx.putImageData(imageData, 0, 0);
            processedImages.push({
                dataUrl: canvas.toDataURL(),
                name: `processed_${file.name}`
            });
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';
            const outputImage = document.createElement('img');
            outputImage.src = canvas.toDataURL();
            const cardFooter = document.createElement('div');
            cardFooter.className = 'image-card-footer';
            const downloadButton = document.createElement('button');
            downloadButton.className = 'download-btn';
            downloadButton.innerText = 'Download';
            downloadButton.onclick = () => {
                const link = document.createElement('a');
                link.href = canvas.toDataURL();
                link.download = `processed_${file.name}`;
                link.click();
            };
            imageCard.appendChild(outputImage);
            cardFooter.appendChild(downloadButton);
            imageCard.appendChild(cardFooter);
            outputDiv.appendChild(imageCard);
            processed++;
            if (processed === otherImagesInput.files.length) {
                loadingIndicator.style.display = 'none';
                downloadAllButton.style.display = 'block';
            }
        };
        img.src = URL.createObjectURL(file);
    });
});
function getAverageColor(imageData) {
    const data = imageData.data;
    let r = 0, g = 0, b = 0, count = 0;
    let maxR = 0, maxG = 0, maxB = 0;
    let minR = 255, minG = 255, minB = 255;
    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        maxR = Math.max(maxR, data[i]);
        maxG = Math.max(maxG, data[i + 1]);
        maxB = Math.max(maxB, data[i + 2]);
        minR = Math.min(minR, data[i]);
        minG = Math.min(minG, data[i + 1]);
        minB = Math.min(minB, data[i + 2]);
        count++;
    }
    return {
        r: Math.floor(r / count),
        g: Math.floor(g / count),
        b: Math.floor(b / count),
        maxR, maxG, maxB,
        minR, minG, minB
    };
}
function adjustColors(imageData, averageColor, brightness, colorIntensity) {
    const data = imageData.data;
    const rangeR = averageColor.maxR - averageColor.minR;
    const rangeG = averageColor.maxG - averageColor.minG;
    const rangeB = averageColor.maxB - averageColor.minB;
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        r = r + (averageColor.r - r) * colorIntensity;
        g = g + (averageColor.g - g) * colorIntensity;
        b = b + (averageColor.b - b) * colorIntensity;
        r *= brightness;
        g *= brightness;
        b *= brightness;
        if (rangeR !== 0) r = ((r - averageColor.minR) / rangeR) * 255;
        if (rangeG !== 0) g = ((g - averageColor.minG) / rangeG) * 255;
        if (rangeB !== 0) b = ((b - averageColor.minB) / rangeB) * 255;
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
    }
}
downloadAllButton.addEventListener('click', () => {
    if (processedImages.length === 0) {
        alert("No processed images to download!");
        return;
    }
    const zip = new JSZip();
    processedImages.forEach(image => {
        const imgData = image.dataUrl.split(',')[1];
        zip.file(image.name, imgData, { base64: true });
    });
    zip.generateAsync({ type: "blob" })
        .then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "processed_images.zip";
            link.click();
        })
        .catch(err => {
            console.error("Error creating zip file:", err);
            alert("Error creating zip file. Please try again.");
        });
});