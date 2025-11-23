# QwenfyUI Mobile

A modern, mobile-first web frontend for ComfyUI, specifically designed for the **Qwen Image Edit** workflow. This application allows you to edit images using text prompts via a clean, responsive interface that works seamlessly on both desktop and mobile devices connected to your local network.

## ✨ Features

- **Mobile-Optimized UI**: Touch-friendly controls, swipe gestures for history, auto-keyboard dismissal, and full-screen previews.
- **Cross-Device Sync**: History and saved prompts are stored on the ComfyUI server, allowing you to start generating on one device and view results on another.
- **Dynamic Model Loading**: Automatically fetches available GGUF models, Diffusion models, and LoRAs from your ComfyUI installation.
- **Multi-Image Support**: Upload images from your device or select existing images from the ComfyUI server's input folder.
- **Advanced Configuration**:
  - Toggle between Fast (GGUF) and Quality (Diffusion) models.
  - Adjust LoRA strengths and selections dynamically.
  - Seed control.
- **Theme Support**: Choose from 6 different color accents (Purple, Red, Yellow, Green, Cyan, Orange).
- **Privacy & Control**: 
  - NSFW blur toggle.
  - **Stop/Interrupt** generation button.
  - Option to clear shared history and saved prompts from the server.
- **Smart History**:
  - "Use as Input" workflow.
  - Copy prompts and seeds.
  - Persistent storage across sessions.

## 🛠️ Prerequisites

1.  **Node.js**: You need Node.js installed on the computer running the app. [Download Node.js](https://nodejs.org/).
2.  **ComfyUI**: A working installation of ComfyUI.
3.  **ComfyUI Custom Nodes**: Your ComfyUI must have the necessary nodes installed for the Qwen workflow (e.g., `ComfyUI-GGUF`, `ComfyUI-Qwen-Image-Edit`, etc.).

## ⚙️ ComfyUI Configuration (Crucial!)

For this web app to communicate with ComfyUI, you must enable Cross-Origin Resource Sharing (CORS).

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

## 🔧 Changing the Port

If you want to run the app on a different port (default is 1234):

**Method 1: Configuration File (Permanent)**
1.  Open `vite.config.ts` in a text editor.
2.  Find the `port: 1234` line and change the number to your desired port.
3.  Restart the server.

**Method 2: Command Line (Temporary)**
Run the following command:
```bash
npm run dev -- --port 8080
```

## 📖 Usage Guide

### 1. Connection
On first load, the app tries to connect to `http://localhost:8188`. If your ComfyUI is on a different IP or port:
1.  Click the **Settings (Gear)** icon.
2.  Enter your ComfyUI Server Address (e.g., `http://192.168.1.5:8188`).
3.  The Lightning icon in the header will glow your theme color when connected.

### 2. Selecting Inputs
*   **Images**: Tap the image boxes to upload files. You can upload up to 3 reference images.
    *   *Tip*: Click the **Folder** icon on an image slot to pick an image already inside your ComfyUI `input` folder.
*   **Model**: Choose between **GGUF** (Faster, lower VRAM) or **Diffusion** (Higher quality, standard UNET).
*   **Prompt**: Type your edit instruction. Use the **Save** icon to store frequently used prompts.

### 3. Generating
*   Click **Generate**.
*   The button turns into a progress bar.
*   To cancel a generation, click the **Stop (Square)** button next to the progress bar.
*   Once finished, the result appears in a floating card.
*   Click **Use as Input** to send the result back to the main image slot for further editing.

### 4. History
*   Click the **Clock** icon to view past generations.
*   History is shared! Generate on your PC, view on your phone.
*   You can clear the shared history or saved prompts from the **Settings** menu under "Server Data".

## ⚠️ Troubleshooting

**"Not connected to ComfyUI server"**
*   Ensure ComfyUI is running.
*   Ensure you started ComfyUI with `--enable-cors-header "*"`.
*   Check if the IP address in Settings matches your PC's local IP.

**"Image not found" / Broken Images**
*   If you manually deleted images from the ComfyUI `output` folder, the history will show errors.
*   Use **Settings -> Clear Shared History** to reset the broken list.

**Stuck on "Uploading/Queueing"**
*   This usually means the WebSocket connection failed. Refresh the page.

## 📂 Project Structure

*   `src/App.tsx`: Main application logic.
*   `src/services/comfyService.ts`: API layer for communicating with ComfyUI.
*   `src/constants.ts`: Defines the JSON workflow structure sent to the API.
*   `src/components/`: UI components (History, ImageInput, PromptManager, etc.).

## License

MIT