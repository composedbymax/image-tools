# Batch Color Grade

`batch-color-grade` is a tool designed to automatically adjust and apply color grading to multiple images based on a reference image. The application allows users to upload one reference image and multiple other images, then applies color adjustments such as brightness and color intensity to all images.

## Features

- **Upload and Process Multiple Images**: Upload one reference image and one or more images to process.
- **Color Adjustment**: Fine-tune brightness and color intensity for the processed images.
- **Preview**: View a live preview of both the reference image and the other images being processed.
- **Download Processed Images**: Download processed images individually or as a zip file.
- **Drag-and-Drop**: Simple drag-and-drop zones for image selection.
- **Real-time Processing**: Apply color adjustments in real-time, with progress feedback.

# Usage

- **Upload a Base Image**: Select the reference image by dragging it into the designated drop zone or using the file input.

- **Upload Other Images**: Add one or more images to process by dragging them into the drop zone or selecting them using the file input.

- **Adjust Settings**: Use the sliders to adjust the brightness and color intensity for all images.

- **Process Images**: Click the "Process" button to apply the color adjustments. You will see the processed images appear below with their previews.

- **Download Processed Images**:
  - You can download images individually by clicking the "Download" button next to each image.
  - Alternatively, click "Download All" to get a zip file containing all processed images.

# UI Components

- **Base Image Input**: Allows the user to upload the reference image for color grading.
- **Other Images Input**: Uploads multiple images that need to be processed.
- **Brightness Slider**: Adjusts the overall brightness of the processed images.
- **Color Intensity Slider**: Controls the strength of the color grading applied to the images.
- **Processing Indicator**: Shows when the images are being processed.
- **Download All Button**: Download all processed images in a zip file.
- **Preview Sections**: Previews the base image and all the other images selected for processing.

# File Handling

- **Supported File Types**:
  - JPG
  - JPEG
  - PNG

The tool uses the FileReader API to preview the images before processing and the Canvas API to apply the color grading effects.

# Color Grading Logic

- **Base Image Analysis**: The average color values of the base image are calculated.
- **Color Adjustment**: The color grading is done by adjusting the colors of the other images to match the average colors of the base image with adjustments based on user-defined brightness and color intensity.
- **Brightness & Intensity**: The brightness of the image is scaled, and the colors are adjusted by the user-specified intensity.

### Color Grading Details:
- Each pixel's red, green, and blue channels are adjusted based on the average color from the base image.
- The brightness slider scales the RGB values to make the image lighter or darker.
- The color intensity slider adjusts how closely the image colors match the base image's average color.

# Dependencies

- **JSZip**: A library to create zip files for downloading multiple processed images.


## **Installation**
To get started, clone the repository:
```bash
git clone https://github.com/composedbymax/image-tools.git

cd image-tools/batch-color-grade

open index.html

