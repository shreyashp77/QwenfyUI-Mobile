
# QwenfyUI Mobile

A modern, feature-rich, mobile-first web frontend for ComfyUI. This application provides a unified interface for two powerful workflows: **Text-to-Image Generation** (using **Z Image Turbo**) and **Image Editing** (using **Nunchaku Qwen Image Edit**). It transforms complex node graphs into a beautiful, responsive experience optimized for both desktop and mobile devices.

## ✨ Key Features

### 🚀 Dual Modes
1.  **Generate Mode (Text-to-Image)**:
    *   Lightning-fast image creation using **Z Image Turbo**.
    *   Uses Qwen 3 4B CLIP for superior prompt understanding.
    *   **Visual Style Selector**: Choose from 8+ preset styles (Cinematic, Anime, Realism, etc.) with live previews.
    *   **Aspect Ratio Selector**: Quickly switch between 1:1, 9:16, 16:9, 4:3, and 3:4 ratios.
    *   **Generation Steps**: Adjustable step count for balancing speed vs quality.
    *   **Prompt History**: Quickly access your last 10 prompts.
2.  **Edit Mode (Image-to-Image)**:
    *   Advanced editing using the Nunchaku Qwen workflow.
    *   Supports up to 3 input images for complex composition.
    *   Dynamic LoRA stacking for style control.

### 🎨 Modern UI & Customization
- **Mobile-Optimized**: Touch-friendly controls, swipe gestures, auto-keyboard dismissal, and robust clipboard support (even on non-secure LAN connections).
- **Dark/Light Mode**: Fully supported theme switching for any lighting condition.
- **Custom Themes**: Choose from 17 preset accent colors or use the **Color Picker** to match your exact style.
- **Animations**: Smooth transitions, loading states, and modal reveals.
- **Smart Feedback**: Unified **Sounds/Haptics** system that provides vibration feedback on Android and subtle sound effects on iOS (toggleable).

### 🖼️ Advanced Image Handling
- **"Before vs After" Slider**: Interactive comparison slider to visualize edit results against the original input (Toggleable in Settings).
- **HEIC/HEIF Support**: Native support for iPhone image formats with automatic client-side conversion.
- **Remote Input**: Browse and select images directly from your ComfyUI server's input folder.
- **Prompt Manager**: Save and load your favorite prompts. (Hidden by default: Tap the lightning icon 7 times to reveal).
- **Non-Sticky Preview**: The generated result card scrolls naturally with the page for a better mobile experience.
- **Resolution Control**: Optimized presets (720x1280, 1080x1920, 1080x2560) or **Custom Dimensions** for any aspect ratio.

### ⚡ Smart Workflow Tools
- **Dynamic LoRA Stack**: Add, remove, and configure unlimited LoRAs (up to 10) in Edit mode without touching the backend graph.
- **Auto-Randomize Seed**: Automatically generates new variations by default (toggleable).
- **Smart History**:
  - **Single Image Deletion**: Delete specific images directly from the gallery or preview (removes file from server).
  - **Clear History**: One-click cleanup of both server history and local output files.
  - Cross-device synchronization.
  - "Use as Input" workflow for iterative generation/editing.
  - Persistent prompt storage.
- **Resilience**: Auto-retry mechanisms for OOM (Out Of Memory) errors and connection drops. Includes CPU offloading for large models on first run.

## 🛠️ Prerequisites

1.  **Node.js**: Required to run the frontend server. [Download Node.js](https://nodejs.org/).
2.  **ComfyUI**: A working installation of ComfyUI.
3.  **Required Custom Nodes**:
    *   `ComfyUI-nunchaku` (Critical for Edit workflow).
    *   `ComfyUI_Qwen_Image_Edit` (For text encoding).
    *   `ComfyUI-GGUF` (Optional).
4.  **Required Models**:
    *   **Edit**: `svdq-fp4_r128-qwen-image-edit-2509-lightning...` (or similar Nunchaku model).
    *   **Generate**: `z_image_turbo_bf16.safetensors` (Z Image Turbo) and `qwen_3_4b.safetensors` (CLIP).
    *   *Note: Model names can be adjusted in `src/constants.ts` if yours differ.*

## ⚙️ Configuration

### ComfyUI CORS (Crucial!)
To allow this web app to communicate with your ComfyUI server, you **must** enable Cross-Origin Resource Sharing (CORS).

1.  Open your terminal/command prompt.
2.  Navigate to your ComfyUI folder.
3.  Launch ComfyUI with the following argument:

```bash
python main.py --enable-cors-header "*"
```

### Environment Variables
You can configure the frontend server using a `.env` file in the project root.

1.  Copy `.env.sample` to `.env`.
2.  Edit `.env` to set your desired configuration:

```env
VITE_ALLOWED_HOSTS=pc.local
VITE_PORT=7777
```

*   `VITE_ALLOWED_HOSTS`: The hostname you want to allow access from (e.g., `pc.local` for local network access).
*   `VITE_PORT`: The port the frontend server will run on.

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
    *   **Local PC**: Open `http://localhost:7777` (or your configured port).
    *   **Mobile Device**: Look at the terminal output for the **Network** URL (e.g., `http://192.168.1.X:7777`). Enter this IP on your phone's browser.

## 📖 Usage Guide

### 1. Connection & Settings
*   **Change Server**: Click the **Settings (Gear)** icon to enter your PC's IP address if accessing from mobile.
*   **Theme**: Pick a color or toggle Dark/Light mode.

### 2. Generate Mode
*   Select "Generate Image" from the home screen.
*   **Style**: Choose a visual style (e.g., Cinematic, Anime) from the top selector.
*   **Prompt**: Enter a **Positive Prompt** (what you want) and **Negative Prompt** (what to avoid).
*   **History**: Tap a previous prompt from the history chips to reuse it.
*   **Settings**: Adjust **Aspect Ratio** and **Steps** in the "Advanced Configuration" section.
*   Hit "Generate" to create an image using the **Z Image Turbo** workflow.

### 3. Edit Mode
*   Select "Edit Image".
*   Upload a source image (or select from server).
*   (Optional) Add LoRAs via "Advanced Configuration".
*   Enter instructions and generate.
*   **Compare**: Click the result to open the Before/After slider.

## ⚠️ Troubleshooting

**"HEIC preview conversion failed"**
The app tries to convert HEIC images in the browser. If this fails, it uploads the original file. Ensure `pillow-heif` is installed on your ComfyUI python environment for server-side support.

**"Image not found" / Missing History**
If you manually delete images from your ComfyUI `output` folder, the app history might get out of sync. Go to **Settings -> Clear History** to clean up both the server history and the output folder.

**Copy button not working?**
The app includes a fallback for non-secure contexts (HTTP/LAN). If it still fails, ensure your browser has permissions to access the clipboard.

## 📂 Project Structure

*   `src/App.tsx`: Main application controller.
*   `src/services/comfyService.ts`: API layer for ComfyUI interaction.
*   `src/constants.ts`: Workflow definitions (`BASE_WORKFLOW` for Edit, `GENERATE_WORKFLOW` for Gen), Styles, and Aspect Ratios.
*   `src/components/`:
    *   `CompareModal.tsx`: The before/after slider logic.
    *   `HistoryGallery.tsx`: History visualization.
    *   `LoraControl.tsx`: Dynamic LoRA UI.

## License

MIT
