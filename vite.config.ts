
/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      basicSsl(),
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
                    const filePath = path.join(outputDir, file);
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                      fs.rmSync(filePath, { recursive: true, force: true });
                    } else {
                      fs.unlinkSync(filePath);
                    }
                  }
                  console.log(`[Clear Output] Deleted ${files.length} files/folders from ${outputDir}`);
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

          server.middlewares.use('/api/delete-image', async (req, res, next) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { filename } = JSON.parse(body);
                  if (!filename) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Filename is required' }));
                    return;
                  }

                  const fs = await import('fs');
                  const path = await import('path');
                  // Resolve path relative to project root: ../ComfyUI/output
                  const outputDir = path.resolve(process.cwd(), '../ComfyUI/output');
                  const filePath = path.join(outputDir, filename);

                  // Security check: Ensure the resolved path is still within the output directory
                  if (!filePath.startsWith(outputDir)) {
                    res.statusCode = 403;
                    res.end(JSON.stringify({ success: false, error: 'Invalid file path' }));
                    return;
                  }

                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[Delete Image] Deleted file: ${filePath}`);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true }));
                  } else {
                    console.log(`[Delete Image] File not found: ${filePath}`);
                    // We return success even if file doesn't exist, as the goal (file gone) is met
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, message: 'File not found, but treated as success' }));
                  }
                } catch (error) {
                  console.error('[Delete Image] Error:', error);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(error) }));
                }
              });
            } else {
              next();
            }
          });

          server.middlewares.use('/api/delete-input-image', async (req, res, next) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { filename } = JSON.parse(body);
                  if (!filename) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Filename is required' }));
                    return;
                  }

                  const fs = await import('fs');
                  const path = await import('path');
                  // Resolve path relative to project root: ../ComfyUI/input
                  const inputDir = path.resolve(process.cwd(), '../ComfyUI/input');
                  const filePath = path.join(inputDir, filename);

                  console.log(`[Delete Input Image] Request for: ${filename}`);
                  console.log(`[Delete Input Image] CWD: ${process.cwd()}`);
                  console.log(`[Delete Input Image] Resolved Input Dir: ${inputDir}`);
                  console.log(`[Delete Input Image] Target Path: ${filePath}`);

                  // Security check: Ensure the resolved path is still within the input directory
                  if (!filePath.startsWith(inputDir)) {
                    res.statusCode = 403;
                    res.end(JSON.stringify({ success: false, error: 'Invalid file path' }));
                    return;
                  }

                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[Delete Input Image] Deleted file: ${filePath}`);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, debug: { inputDir, filePath, deleted: true } }));
                  } else {
                    console.log(`[Delete Input Image] File not found: ${filePath}`);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, message: 'File not found, but treated as success', debug: { inputDir, filePath, exists: false } }));
                  }
                } catch (error) {
                  console.error('[Delete Input Image] Error:', error);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(error) }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    server: {
      host: true, // Exposes the server to the LAN
      port: parseInt(env.VITE_PORT) || 7777,
      allowedHosts: env.VITE_ALLOWED_HOSTS ? [env.VITE_ALLOWED_HOSTS] : [],
      proxy: {
        '/api/comfy': {
          target: 'http://127.0.0.1:8188',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/comfy/, ''),
          secure: false,
          ws: true
        },
        '/ws': {
          target: 'ws://127.0.0.1:8188',
          changeOrigin: true,
          secure: false,
          ws: true
          // Note: Do NOT rewrite path - ComfyUI expects /ws
        }
      }
    }
  }
})