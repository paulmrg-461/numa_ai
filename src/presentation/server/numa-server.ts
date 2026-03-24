import sdk, { AppServer, AppSession } from '@mentra/sdk';
const { AppServer: ActualAppServer } = (sdk as any).default || sdk;
import { config } from '../../shared/config/env';
import { SessionHandler } from '../handlers/session.handler';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NumaAppServer extends ActualAppServer {
  constructor(private sessionHandler: SessionHandler) {
    super({
      packageName: config.app.id,
      apiKey: config.app.apiKey,
      port: config.app.port,
    });

    if (process.env.NODE_ENV !== 'test') {
      this.initializeWebview();
    }
  }

  private initializeWebview() {
    const app = this.getExpressApp();
    if (!app) return;

    // Serve static files from public directory
    const publicPath = path.resolve(__dirname, '../../../public');
    app.use('/public', express.static(publicPath));
    
    app.get('/webview', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${config.app.name} - Red de Recuerdos</title>
            <style>
              :root {
                --primary-color: #00e5ff;
                --secondary-color: #ffd700;
                --bg-color: #0a0e14;
                --card-bg: #151b23;
                --text-color: #ffffff;
                --text-muted: #8b949e;
              }
              body { 
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                margin: 0; 
                background-color: var(--bg-color);
                color: var(--text-color);
              }
              .card { 
                background: var(--card-bg); 
                padding: 2.5rem; 
                border-radius: 16px; 
                box-shadow: 0 8px 32px rgba(0, 229, 255, 0.15); 
                text-align: center; 
                max-width: 400px;
                width: 90%;
                border: 1px solid rgba(0, 229, 255, 0.2);
              }
              .logo {
                width: 180px;
                height: 180px;
                margin-bottom: 1.5rem;
                border-radius: 12px;
                box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
              }
              h1 { 
                color: var(--primary-color); 
                margin: 0 0 0.5rem 0;
                font-size: 2rem;
                letter-spacing: 1px;
              }
              .tagline {
                color: var(--secondary-color);
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 2rem;
                font-weight: bold;
              }
              p { 
                color: var(--text-muted); 
                line-height: 1.6;
                margin-bottom: 1.5rem;
              }
              .status {
                display: inline-flex;
                align-items: center;
                background: rgba(0, 229, 255, 0.1);
                color: var(--primary-color);
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 500;
              }
              .status::before {
                content: "";
                display: inline-block;
                width: 8px;
                height: 8px;
                background-color: var(--primary-color);
                border-radius: 50%;
                margin-right: 8px;
                box-shadow: 0 0 8px var(--primary-color);
              }
              .instructions {
                margin-top: 2rem;
                font-size: 0.8rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding-top: 1.5rem;
              }
              .instruction-item {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-bottom: 8px;
                color: var(--text-muted);
              }
              strong { color: var(--text-color); }
            </style>
          </head>
          <body>
            <div class="card">
              <img src="/public/numa_ai_logo.jpg" alt="Numa AI Logo" class="logo">
              <h1>${config.app.name}</h1>
              <div class="tagline">Red de Recuerdos</div>
              
              <div class="status">Sistema Activo</div>
              
              <p>Tu asistente visual y de voz está conectado y listo para ayudarte.</p>
              
              <div class="instructions">
                <div class="instruction-item">
                  <span>Presiona el <strong>Botón Derecho</strong> para hablar</span>
                </div>
                <div class="instruction-item">
                  <span>Haz <strong>Doble Toque</strong> para analizar la escena</span>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
    });
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string) {
    console.log(`New session: ${sessionId} for user: ${userId}`);
    session.layouts.showTextWall(`${config.app.name} ready.`);

    // 1. Setup continuous transcription for wake word detection
    this.sessionHandler.setupWakeWordDetection(session);

    // 2. Register manual button press handler
    session.events.onButtonPress((data) => {
      if (data.buttonId === 'right' && data.pressType === 'short') {
        this.sessionHandler.handleButtonPress(session);
      }
    });

    // 3. Register manual gesture handler for vision
    session.events.onTouchEvent('double_tap', async () => {
      await this.sessionHandler.handleDoubleTap(session);
    });
  }
}
