self.addEventListener("message", function (e) {
    const { imageData, width, height, blockSize, sensitivity } = e.data;
    const data = imageData.data;
    function getPixel(x, y) {
      const idx = (y * width + x) * 4;
      return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
    }
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        const centerX = Math.min(x + Math.floor(blockSize / 2), width - 1);
        const centerY = Math.min(y + Math.floor(blockSize / 2), height - 1);
        const pixel = getPixel(centerX, centerY);
        const color = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
        let hasEdge = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const neighborX = centerX + dx * blockSize;
            const neighborY = centerY + dy * blockSize;
            if (neighborX < 0 || neighborY < 0 || neighborX >= width || neighborY >= height) continue;
            const neighborPixel = getPixel(neighborX, neighborY);
            const colorDiff =
              Math.abs(pixel[0] - neighborPixel[0]) +
              Math.abs(pixel[1] - neighborPixel[1]) +
              Math.abs(pixel[2] - neighborPixel[2]);
            if (colorDiff > sensitivity) {
              hasEdge = true;
              break;
            }
          }
          if (hasEdge) break;
        }
        if (pixel[3] > 10) {
          svgContent += `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" fill="${color}"${hasEdge ? ' rx="2" ry="2"' : ''}/>`;
        }
      }
    }
    svgContent += "</svg>";
    self.postMessage({ svgContent });
  });