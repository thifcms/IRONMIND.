import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import app from "./apiApp";

dotenv.config();

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        // index.html e sw.js nunca podem ficar em cache — são eles que "apontam"
        // pra versão certa do bundle. Os arquivos em /assets já têm hash no nome
        // (ex: index-D7cYJFGt.js), então podem e devem ficar em cache normalmente.
        if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });

  // Self-ping removido de propósito (2026-08-21): com 3 serviços
  // dividindo as 750h/mês grátis do Render (workspace único), manter
  // este sempre ligado 24/7 esgotava a cota rápido. Deixando hibernar
  // normalmente após ~15min sem uso -- a troca é só uns 30-60s a mais
  // na primeira abertura depois de um tempo parado, sem custo de horas.
}

startServer();
