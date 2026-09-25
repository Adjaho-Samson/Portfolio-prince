import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(root, "data");
const dataFile = path.join(dataDirectory, "content.json");
const port = Number(process.env.PORT || 3000);
const sessions = new Map();
const sessionDuration = 1000 * 60 * 60 * 8;

const defaultContent = {
  articles: [
    {
      id: 1,
      title: "Prendre soin de son chien au quotidien",
      excerpt:
        "Les gestes simples qui rendent la vie de votre compagnon plus saine et plus heureuse.",
      category: "Conseils chiens",
      status: "published",
      updatedAt: "2026-09-25T09:42:00.000Z",
    },
    {
      id: 2,
      title: "Les mots qui donnent vie aux idées",
      excerpt:
        "Une réflexion sur l'écriture comme espace de création et de transmission.",
      category: "Écriture",
      status: "published",
      updatedAt: "2026-09-24T16:20:00.000Z",
    },
    {
      id: 3,
      title: "Carnet de croquis : premières recherches",
      excerpt:
        "Les étapes préparatoires d'une nouvelle série de dessins personnalisés.",
      category: "Art",
      status: "draft",
      updatedAt: "2026-09-12T12:00:00.000Z",
    },
  ],
  pages: [
    {
      id: "home",
      name: "Accueil",
      path: "index.html",
      description: "Page d'accueil et présentation de l'univers",
      title: "Prince-Abraham Junior Shègun ADJAHO",
      excerpt: "Un univers où le droit, les mots et l'art se rencontrent.",
    },
    {
      id: "presentation",
      name: "Présentation",
      path: "presentation.html",
      description: "Parcours, valeurs et présentation personnelle",
      title: "Un parcours entre le droit, les mots et l'art.",
      excerpt:
        "Découvrez mon parcours, mes valeurs et les projets qui construisent mon univers.",
    },
    {
      id: "contact",
      name: "Contact",
      path: "contact.html",
      description: "Coordonnées et formulaire de contact",
      title: "Parlons de votre projet.",
      excerpt: "Une question ou une idée ? Échangeons directement.",
    },
    {
      id: "dogs",
      name: "Conseils chiens",
      path: "chiens.html",
      description: "Conseils et informations pour les propriétaires",
      title: "Bien vivre avec son chien.",
      excerpt: "Prendre soin d'un chien, c'est une responsabilité.",
    },
  ],
};

async function readContent() {
  try {
    return JSON.parse(await fs.readFile(dataFile, "utf8"));
  } catch {
    await fs.mkdir(dataDirectory, { recursive: true });
    await writeContent(defaultContent);
    return structuredClone(defaultContent);
  }
}

async function writeContent(content) {
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [
          part.slice(0, separator).trim(),
          decodeURIComponent(part.slice(separator + 1).trim()),
        ];
      }),
  );
}

function isAuthenticated(request) {
  const token = parseCookies(request).admin_session;
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(request, response) {
  if (isAuthenticated(request)) return true;
  sendJson(response, 401, { error: "Authentification requise" });
  return false;
}

function passwordMatches(password) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword || !password) return false;
  const input = crypto.createHash("sha256").update(password).digest();
  const expected = crypto
    .createHash("sha256")
    .update(configuredPassword)
    .digest();
  return crypto.timingSafeEqual(input, expected);
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (body.length > 100_000) throw new Error("Payload trop volumineux");
  return body ? JSON.parse(body) : {};
}

function validateArticle(input) {
  if (
    !input.title?.trim() ||
    !input.excerpt?.trim() ||
    !input.category ||
    !["published", "draft"].includes(input.status)
  )
    return null;
  return {
    title: input.title.trim().slice(0, 90),
    excerpt: input.excerpt.trim().slice(0, 180),
    category: input.category,
    status: input.status,
  };
}

async function handleApi(request, response, url) {
  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    let body;
    try {
      body = await readBody(request);
    } catch {
      return sendJson(response, 400, { error: "Requête invalide" });
    }
    if (!passwordMatches(body.password))
      return sendJson(response, 401, { error: "Mot de passe incorrect" });
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { expiresAt: Date.now() + sessionDuration });
    return sendJson(
      response,
      200,
      { authenticated: true },
      {
        "set-cookie": `admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionDuration / 1000}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      },
    );
  }
  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = parseCookies(request).admin_session;
    if (token) sessions.delete(token);
    return sendJson(
      response,
      200,
      { authenticated: false },
      {
        "set-cookie":
          "admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      },
    );
  }
  if (request.method === "GET" && url.pathname === "/api/session")
    return sendJson(response, 200, { authenticated: isAuthenticated(request) });
  if (request.method === "GET" && url.pathname === "/api/public/pages") {
    const content = await readContent();
    return sendJson(response, 200, content.pages);
  }
  if (!requireAuth(request, response)) return true;

  const content = await readContent();
  if (request.method === "GET" && url.pathname === "/api/articles")
    return sendJson(response, 200, content.articles);
  if (request.method === "GET" && url.pathname === "/api/pages")
    return sendJson(response, 200, content.pages);
  if (request.method === "POST" && url.pathname === "/api/articles") {
    let body;
    try {
      body = await readBody(request);
    } catch {
      return sendJson(response, 400, { error: "Requête invalide" });
    }
    const article = validateArticle(body);
    if (!article)
      return sendJson(response, 422, { error: "Données article invalides" });
    const savedArticle = {
      id: Math.max(0, ...content.articles.map((item) => item.id)) + 1,
      ...article,
      updatedAt: new Date().toISOString(),
    };
    content.articles.unshift(savedArticle);
    await writeContent(content);
    return sendJson(response, 201, savedArticle);
  }

  const articleMatch = url.pathname.match(/^\/api\/articles\/(\d+)$/);
  if (articleMatch) {
    const articleId = Number(articleMatch[1]);
    const index = content.articles.findIndex(
      (article) => article.id === articleId,
    );
    if (request.method === "DELETE") {
      if (index === -1)
        return sendJson(response, 404, { error: "Article introuvable" });
      content.articles.splice(index, 1);
      await writeContent(content);
      return sendJson(response, 200, { deleted: true });
    }
    if (request.method === "PATCH") {
      if (index === -1)
        return sendJson(response, 404, { error: "Article introuvable" });
      let body;
      try {
        body = await readBody(request);
      } catch {
        return sendJson(response, 400, { error: "Requête invalide" });
      }
      const article = validateArticle(body);
      if (!article)
        return sendJson(response, 422, { error: "Données article invalides" });
      content.articles[index] = {
        ...content.articles[index],
        ...article,
        updatedAt: new Date().toISOString(),
      };
      await writeContent(content);
      return sendJson(response, 200, content.articles[index]);
    }
  }

  const pageMatch = url.pathname.match(/^\/api\/pages\/([\w-]+)$/);
  if (request.method === "PATCH" && pageMatch) {
    const index = content.pages.findIndex((page) => page.id === pageMatch[1]);
    if (index === -1)
      return sendJson(response, 404, { error: "Page introuvable" });
    let body;
    try {
      body = await readBody(request);
    } catch {
      return sendJson(response, 400, { error: "Requête invalide" });
    }
    if (!body.title?.trim() || !body.excerpt?.trim())
      return sendJson(response, 422, { error: "Titre et introduction requis" });
    content.pages[index] = {
      ...content.pages[index],
      title: body.title.trim().slice(0, 90),
      excerpt: body.excerpt.trim().slice(0, 220),
    };
    await writeContent(content);
    return sendJson(response, 200, content.pages[index]);
  }

  return sendJson(response, 404, { error: "Route API introuvable" });
}

async function serveStatic(response, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(root) || filePath.startsWith(dataDirectory))
    return sendJson(response, 404, { error: "Fichier introuvable" });
  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".png": "image/png",
    };
    response.writeHead(200, {
      "content-type": types[extension] || "application/octet-stream",
    });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Fichier introuvable" });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(
    request.url,
    `http://${request.headers.host || "localhost"}`,
  );
  try {
    if (url.pathname.startsWith("/api/"))
      await handleApi(request, response, url);
    else await serveStatic(response, url);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Erreur interne du serveur" });
  }
});

server.listen(port, () =>
  console.log(`Site disponible sur http://localhost:${port}`),
);
