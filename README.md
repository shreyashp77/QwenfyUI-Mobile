# QwenfyUI Mobile

A modern, feature-rich, mobile-first web frontend for ComfyUI, specifically designed for the **Nunchaku Qwen Image Edit** workflow. This application transforms complex node graphs into a beautiful, responsive interface that works seamlessly on both desktop and mobile devices connected to your local network.

## ✨ Key Features

### 🎨 Modern UI & Customization
- **Mobile-Optimized**: Touch-friendly controls, swipe gestures, and auto-keyboard dismissal.
- **Dark/Light Mode**: Fully supported theme switching for any lighting condition.
- **Custom Themes**: Choose from 17 preset accent colors or use the **Color Picker** to match your exact style.
- **Animations**: Smooth transitions, loading states, and modal reveals.

### 🖼️ Advanced Image Handling
- **"Before vs After" Slider**: Real-time, interactive comparison slider to visualize changes instantly against the original input.
- **HEIC/HEIF Support**: Native support for iPhone image formats with automatic client-side conversion (and server-side fallback).
- **Remote Input**: Browse and select images directly from your ComfyUI server's input folder (Toggleable in Settings).
- **Resolution Control**: Quickly switch between optimized presets (720x1280, 1080x1920, 1080x2560).

### ⚡ Powerful Generation Tools
- **Dynamic LoRA Stack**: Add, remove, and configure unlimited LoRAs (up to 10) dynamically without touching the workflow.
- **Auto-Randomize Seed**: Automatically generates new variations by default (toggleable).
- **Smart History**:
  - Cross-device synchronization (generate on PC, view on phone).
  - "Use as Input" workflow for iterative editing.
  - Persistent storage of prompts and history on the server.
- **Resilience**: Built-in polling and race-condition handling ensure you never miss a result, even on shaky mobile connections.

## 🛠️ Prerequisites

1.  **Node.js**: Required to run the frontend server. [Download Node.js](https://nodejs.org/).
2.  **ComfyUI**: A working installation of ComfyUI.
3.  **Required Custom Nodes**:
    *   `ComfyUI-nunchaku` (Critical for the specific Qwen workflow used).
    *   `ComfyUI_Qwen_Image_Edit` (For text encoding).
    *   `ComfyUI-GGUF` (Optional, depending on your model config).

## ⚙️ ComfyUI Configuration (Crucial!)

To allow this web app to communicate with your ComfyUI server, you **must** enable Cross-Origin Resource Sharing (CORS).

1.  Open your terminal/command prompt.
2.  Navigate to your ComfyUI folder.
3.  Launch ComfyUI with the following argument:

```bash
python main.py --enable-cors-header "*"
```

*Without this flag, the web app will fail to connect.*

## 🚀 Installation & Running

1.  **Clone/Download** this repository.
2.  **Install Dependencies**:
    Open a terminal in the project folder and run:
    ```bash
    npm install
    ```
3.  **Start the App**:
    ```bash
    npm run dev
    ```
4.  **Access the App**:
    *   **Local PC**: Open `http://localhost:1234`
    *   **Mobile Device**: Look at the terminal output for the **Network** URL (e.g., `http://192.168.1.X:1234`). Enter this IP on your phone's browser.

## 📖 Usage Guide

### 1. Connection & Settings
On first load, the app connects to `http://localhost:8188`.
*   **Change Server**: Click the **Settings (Gear)** icon to enter your PC's IP address if you are on mobile.
*   **Theme**: Pick a color or toggle Dark/Light mode.
*   **Remote Input**: Enable this in settings if you want to browse files stored on the server PC.

### 2. Inputs & Uploads
*   **Upload**: Tap the image boxes to upload files (JPG, PNG, HEIC supported).
*   **Prompt**: Type your edit instruction. Use the **Save** icon to store favorite prompts.
*   **Resolutions**: Select output size in the "Advanced Configuration" dropdown.

### 3. Advanced Configuration
*   **LoRAs**: Expand the "Advanced Configuration" section. Click "Add LoRA" to stack multiple effects.
*   **Seed**: Toggle "Auto" (Sparkles icon) to randomize output every time, or turn it off to lock the seed for tweaking.

### 4. Viewing Results
*   **Comparison**: Click the result image to open full-screen. Drag the slider to see the Before/After difference.
*   **History**: Click the **Clock** icon. You can also compare history items against their inputs using the "Compare" button on the card.

## ⚠️ Troubleshooting

**"HEIC preview conversion failed"**
The app tries to convert HEIC images in the browser. If this fails, it will still upload the original file. If your ComfyUI server has `pillow-heif` installed, it will work fine.

**"Image not found"**
If you manually delete images from your ComfyUI `output` folder, the history list might still show them. Go to **Settings -> Server Data -> Clear Shared History** to fix this.

**Result is cropped/zoomed in?**
The app tries to match the output aspect ratio to your input. Ensure you are using one of the standard resolution presets or that your input image matches the target aspect ratio.

## 📂 Project Structure

*   `src/App.tsx`: Main application controller.
*   `src/services/comfyService.ts`: API layer for ComfyUI interaction.
*   `src/constants.ts`: The JSON workflow definition (Nunchaku Qwen adaptation).
*   `src/components/`:
    *   `CompareModal.tsx`: The before/after slider logic.
    *   `HistoryGallery.tsx`: History visualization.
    *   `LoraControl.tsx`: Dynamic LoRA UI.

## License

MIT