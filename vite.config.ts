
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'clear-output-plugin',
      configureServer(server) {
        server.middlewares.use('/api/clear-output', async (req, res, next) => {
          if (req.method === 'POST') {
            try {
              const fs = await import('fs');
              const path = await import('path');
              // Resolve path relative to project root: ../ComfyUI/output
              const outputDir = path.resolve(process.cwd(), '../ComfyUI/output');

              if (fs.existsSync(outputDir)) {
                const files = fs.readdirSync(outputDir);
                for (const file of files) {
                  fs.unlinkSync(path.join(outputDir, file));
                }
                console.log(`[Clear Output] Deleted ${files.length} files from ${outputDir}`);
              } else {
                console.log(`[Clear Output] Directory not found: ${outputDir}`);
              }

              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('[Clear Output] Error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(error) }));
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    host: true, // Exposes the server to the LAN
    port: 7777
  }
})