
/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import crypto from 'crypto'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Generate a random API token for this server session.
  // This is injected into the client and required on all /api/* requests.
  const apiToken = crypto.randomUUID();
  console.log(`[Security] API token generated for this session.`);

  return {
    define: {
      '__API_TOKEN__': JSON.stringify(apiToken)
    },
    plugins: [
      react(),
      basicSsl(),
      {
        name: 'api-auth-middleware',
        configureServer(server) {
          // Auth middleware: validate token on all custom /api/* routes
          server.middlewares.use((req, res, next) => {
            const url = req.url || '';
            // Only protect custom /api/* endpoints (not the /api/comfy proxy or /ws)
            if (url.startsWith('/api/') && !url.startsWith('/api/comfy')) {
              const authHeader = req.headers['authorization'];
              if (authHeader !== `Bearer ${apiToken}`) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
                return;
              }
            }
            next();
          });
        }
      },
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

          // ========== GALLERY API ENDPOINTS ==========

          // GET/POST gallery config (password hash + salt)
          server.middlewares.use('/api/gallery/config', async (req, res, next) => {
            const fs = await import('fs');
            const path = await import('path');
            const galleryDir = path.resolve(process.cwd(), '../ComfyUI/qwenfy');
            const configPath = path.join(galleryDir, '.gallery_config');

            // Ensure gallery directory exists
            if (!fs.existsSync(galleryDir)) {
              fs.mkdirSync(galleryDir, { recursive: true });
              console.log(`[Gallery] Created directory: ${galleryDir}`);
            }

            if (req.method === 'GET') {
              try {
                if (fs.existsSync(configPath)) {
                  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, config }));
                } else {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, config: null }));
                }
              } catch (error) {
                console.error('[Gallery Config] Error reading config:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(error) }));
              }
            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const { hash, salt } = JSON.parse(body);
                  if (!hash || !salt) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Hash and salt required' }));
                    return;
                  }
                  const config = { version: 1, hash, salt };
                  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                  console.log(`[Gallery] Saved config to: ${configPath}`);
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true }));
                } catch (error) {
                  console.error('[Gallery Config] Error saving config:', error);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(error) }));
                }
              });
            } else {
              next();
            }
          });

          // POST save file to gallery
          server.middlewares.use('/api/gallery/save', async (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Buffer[] = [];
              req.on('data', chunk => { chunks.push(chunk); });
              req.on('end', async () => {
                try {
                  const fs = await import('fs');
                  const path = await import('path');
                  const galleryDir = path.resolve(process.cwd(), '../ComfyUI/qwenfy');

                  // Ensure gallery directory exists
                  if (!fs.existsSync(galleryDir)) {
                    fs.mkdirSync(galleryDir, { recursive: true });
                  }

                  // Parse multipart form data (simple implementation)
                  const buffer = Buffer.concat(chunks);
                  const contentType = req.headers['content-type'] || '';

                  if (contentType.includes('application/octet-stream')) {
                    // Simple binary upload with filename in header
                    const filename = req.headers['x-filename'] as string || `gallery_${Date.now()}.psave`;
                    const filePath = path.join(galleryDir, filename);

                    // Security check
                    if (!filePath.startsWith(galleryDir)) {
                      res.statusCode = 403;
                      res.end(JSON.stringify({ success: false, error: 'Invalid file path' }));
                      return;
                    }

                    fs.writeFileSync(filePath, buffer);
                    console.log(`[Gallery] Saved file: ${filePath}`);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, filename }));
                  } else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Expected application/octet-stream' }));
                  }
                } catch (error) {
                  console.error('[Gallery Save] Error:', error);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(error) }));
                }
              });
            } else {
              next();
            }
          });

          // GET list gallery files
          server.middlewares.use('/api/gallery/list', async (req, res, next) => {
            if (req.method === 'GET') {
              try {
                const fs = await import('fs');
                const path = await import('path');
                const galleryDir = path.resolve(process.cwd(), '../ComfyUI/qwenfy');

                if (!fs.existsSync(galleryDir)) {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, files: [] }));
                  return;
                }

                const allFiles = fs.readdirSync(galleryDir);
                // Only return .psave files, exclude config
                const files = allFiles
                  .filter(f => f.endsWith('.psave'))
                  .map(f => {
                    const stat = fs.statSync(path.join(galleryDir, f));
                    return {
                      filename: f,
                      size: stat.size,
                      mtime: stat.mtime.getTime()
                    };
                  })
                  .sort((a, b) => b.mtime - a.mtime); // Most recent first

                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, files }));
              } catch (error) {
                console.error('[Gallery List] Error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(error) }));
              }
            } else {
              next();
            }
          });

          // GET gallery file content
          server.middlewares.use('/api/gallery/file', async (req, res, next) => {
            if (req.method === 'GET') {
              try {
                const fs = await import('fs');
                const path = await import('path');
                const url = await import('url');

                const parsedUrl = url.parse(req.url || '', true);
                const filename = parsedUrl.query.filename as string;

                if (!filename) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: 'Filename required' }));
                  return;
                }

                const galleryDir = path.resolve(process.cwd(), '../ComfyUI/qwenfy');
                const filePath = path.join(galleryDir, filename);

                // Security check
                if (!filePath.startsWith(galleryDir)) {
                  res.statusCode = 403;
                  res.end(JSON.stringify({ success: false, error: 'Invalid file path' }));
                  return;
                }

                if (!fs.existsSync(filePath)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, error: 'File not found' }));
                  return;
                }

                const fileBuffer = fs.readFileSync(filePath);
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Length', fileBuffer.length);
                res.statusCode = 200;
                res.end(fileBuffer);
              } catch (error) {
                console.error('[Gallery File] Error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(error) }));
              }
            } else {
              next();
            }
          });

          // POST delete gallery file
          server.middlewares.use('/api/gallery/delete', async (req, res, next) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const { filename } = JSON.parse(body);
                  if (!filename) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Filename required' }));
                    return;
                  }

                  const fs = await import('fs');
                  const path = await import('path');
                  const galleryDir = path.resolve(process.cwd(), '../ComfyUI/qwenfy');
                  const filePath = path.join(galleryDir, filename);

                  // Security check
                  if (!filePath.startsWith(galleryDir)) {
                    res.statusCode = 403;
                    res.end(JSON.stringify({ success: false, error: 'Invalid file path' }));
                    return;
                  }

                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[Gallery] Deleted file: ${filePath}`);
                  }
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true }));
                } catch (error) {
                  console.error('[Gallery Delete] Error:', error);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(error) }));
                }
              });
            } else {
              next();
            }
          });

          // POST delete ALL gallery files
          server.middlewares.use('/api/gallery/delete-all', async (req, res, next) => {
            if (req.method === 'POST') {
              try {
                const fs = await import('fs');
                const path = await import('path');
                const galleryDir = path.resolve(process.cwd(), '../ComfyUI/qwenfy');

                if (!fs.existsSync(galleryDir)) {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, deletedCount: 0 }));
                  return;
                }

                const files = fs.readdirSync(galleryDir);
                let deletedCount = 0;

                for (const file of files) {
                  if (file !== '.gallery_config') {
                    fs.unlinkSync(path.join(galleryDir, file));
                    deletedCount++;
                  }
                }

                console.log(`[Gallery] Deleted all files (${deletedCount} items)`);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, deletedCount }));
              } catch (error) {
                console.error('[Gallery Delete All] Error:', error);
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