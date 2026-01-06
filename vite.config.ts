
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

          // Encrypt output file with AES-256-GCM
          server.middlewares.use('/api/encrypt-output', async (req, res, next) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { filename, key, iv } = JSON.parse(body);
                  if (!filename || !key || !iv) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Missing filename, key, or iv' }));
                    return;
                  }

                  const fs = await import('fs');
                  const path = await import('path');
                  const crypto = await import('crypto');

                  const outputDir = path.resolve(process.cwd(), '../ComfyUI/output');
                  const filePath = path.join(outputDir, filename);

                  // Security check
                  if (!filePath.startsWith(outputDir)) {
                    res.statusCode = 403;
                    res.end(JSON.stringify({ success: false, error: 'Invalid file path' }));
                    return;
                  }

                  if (!fs.existsSync(filePath)) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, error: 'File not found' }));
                    return;
                  }

                  // Read file
                  const fileData = fs.readFileSync(filePath);

                  // Decrypt base64 key and iv
                  const keyBuffer = Buffer.from(key, 'base64');
                  const ivBuffer = Buffer.from(iv, 'base64');

                  // Encrypt with AES-256-GCM
                  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, ivBuffer);
                  const encrypted = Buffer.concat([cipher.update(fileData), cipher.final()]);
                  const authTag = cipher.getAuthTag();

                  // Save as: authTag (16 bytes) + encrypted data
                  const encryptedWithTag = Buffer.concat([authTag, encrypted]);
                  const encryptedFilePath = filePath + '.enc';
                  fs.writeFileSync(encryptedFilePath, encryptedWithTag);

                  // Delete original
                  fs.unlinkSync(filePath);

                  console.log(`[Encrypt Output] Encrypted ${filename} -> ${filename}.enc`);

                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    success: true,
                    encryptedFilename: filename + '.enc'
                  }));
                } catch (error) {
                  console.error('[Encrypt Output] Error:', error);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(error) }));
                }
              });
            } else {
              next();
            }
          });

          // Decrypt and stream file for viewing
          server.middlewares.use('/api/decrypt-view', async (req, res, next) => {
            if (req.method === 'GET') {
              try {
                const url = await import('url');
                const parsedUrl = url.parse(req.url || '', true);
                const { filename, key, iv } = parsedUrl.query as { filename?: string, key?: string, iv?: string };

                if (!filename || !key || !iv) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: 'Missing filename, key, or iv' }));
                  return;
                }

                const fs = await import('fs');
                const path = await import('path');
                const crypto = await import('crypto');

                const outputDir = path.resolve(process.cwd(), '../ComfyUI/output');
                const filePath = path.join(outputDir, filename);

                // Security check
                if (!filePath.startsWith(outputDir)) {
                  res.statusCode = 403;
                  res.end(JSON.stringify({ success: false, error: 'Invalid file path' }));
                  return;
                }

                if (!fs.existsSync(filePath)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, error: 'File not found' }));
                  return;
                }

                // Read encrypted file
                const encryptedWithTag = fs.readFileSync(filePath);

                // Extract auth tag (first 16 bytes) and encrypted data
                const authTag = encryptedWithTag.subarray(0, 16);
                const encrypted = encryptedWithTag.subarray(16);

                // Decode base64 key and iv
                const keyBuffer = Buffer.from(key, 'base64');
                const ivBuffer = Buffer.from(iv, 'base64');

                // Decrypt with AES-256-GCM
                const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);
                decipher.setAuthTag(authTag);
                const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

                // Determine content type from original filename (remove .enc)
                const originalName = filename.replace(/\.enc$/, '');
                let contentType = 'application/octet-stream';
                if (originalName.endsWith('.png')) contentType = 'image/png';
                else if (originalName.endsWith('.jpg') || originalName.endsWith('.jpeg')) contentType = 'image/jpeg';
                else if (originalName.endsWith('.webp')) contentType = 'image/webp';
                else if (originalName.endsWith('.mp4')) contentType = 'video/mp4';
                else if (originalName.endsWith('.gif')) contentType = 'image/gif';

                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Length', decrypted.length);
                res.statusCode = 200;
                res.end(decrypted);
              } catch (error) {
                console.error('[Decrypt View] Error:', error);
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