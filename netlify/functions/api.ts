// Função serverless do Netlify: expõe o mesmo Express app (apiApp.ts)
// usado no Render, via adaptador serverless-http. Todas as rotas
// /api/* passam a rodar aqui -- ver netlify.toml pro redirect.
import serverless from "serverless-http";
import app from "../../apiApp";

export const handler = serverless(app);
