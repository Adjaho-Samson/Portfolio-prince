import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);

const sessionDuration = 1000 * 60 * 60 * 8;
const defaults = {
  articles: [
    [
      1,
      "Prendre soin de son chien au quotidien",
      "Les gestes simples qui rendent la vie de votre compagnon plus saine et plus heureuse.",
      "Conseils chiens",
      "published",
      "2026-09-25T09:42:00.000Z",
    ],
    [
      2,
      "Les mots qui donnent vie aux idées",
      "Une réflexion sur l'écriture comme espace de création et de transmission.",
      "Écriture",
      "published",
      "2026-09-24T16:20:00.000Z",
    ],
    [
      3,
      "Carnet de croquis : premières recherches",
      "Les étapes préparatoires d'une nouvelle série de dessins personnalisés.",
      "Art",
      "draft",
      "2026-09-12T12:00:00.000Z",
    ],
  ],
  pages: [
    [
      "home",
      "Accueil",
      "index.html",
      "Page d'accueil et présentation de l'univers",
      "Prince-Abraham Junior Shègun ADJAHO",
      "Un univers où le droit, les mots et l'art se rencontrent.",
    ],
    [
      "presentation",
      "Présentation",
      "presentation.html",
      "Parcours, valeurs et présentation personnelle",
      "Un parcours entre le droit, les mots et l'art.",
      "Découvrez mon parcours, mes valeurs et les projets qui construisent mon univers.",
    ],
    [
      "contact",
      "Contact",
      "contact.html",
      "Coordonnées et formulaire de contact",
      "Parlons de votre projet.",
      "Une question ou une idée ? Échangeons directement.",
    ],
    [
      "dogs",
      "Conseils chiens",
      "chiens.html",
      "Conseils et informations pour les propriétaires",
      "Bien vivre avec son chien.",
      "Prendre soin d'un chien, c'est une responsabilité.",
    ],
  ],
};

function json(response, status, body, headers = {}) {
  response
    .status(status)
    .set({ "content-type": "application/json; charset=utf-8", ...headers })
    .json(body);
}

function cookieValue(request, name) {
  const cookies = request.headers.cookie || "";
  const found = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

function signature(value) {
  return crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD || "missing-secret")
    .update(value)
    .digest("hex");
}

function authenticated(request) {
  const token = cookieValue(request, "admin_session");
  const [expires, nonce, digest] = token.split(".");
  if (!expires || !nonce || !digest || Number(expires) < Date.now())
    return false;
  const expected = signature(`${expires}.${nonce}`);
  return (
    digest.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expected))
  );
}

function requireAuth(request, response) {
  if (authenticated(request)) return true;
  json(response, 401, { error: "Authentification requise" });
  return false;
}

async function setupDatabase() {
  await sql`CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, title VARCHAR(90) NOT NULL, excerpt VARCHAR(180) NOT NULL, category VARCHAR(40) NOT NULL, status VARCHAR(12) NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS pages (id VARCHAR(40) PRIMARY KEY, name VARCHAR(80) NOT NULL, path VARCHAR(120) NOT NULL, description VARCHAR(180) NOT NULL, title VARCHAR(90) NOT NULL, excerpt VARCHAR(220) NOT NULL)`;
  const pageCount = await sql`SELECT COUNT(*)::int AS count FROM pages`;
  if (pageCount.rows[0].count === 0) {
    for (const page of defaults.pages)
      await sql`INSERT INTO pages (id, name, path, description, title, excerpt) VALUES (${page[0]}, ${page[1]}, ${page[2]}, ${page[3]}, ${page[4]}, ${page[5]})`;
  }
  const articleCount = await sql`SELECT COUNT(*)::int AS count FROM articles`;
  if (articleCount.rows[0].count === 0) {
    for (const article of defaults.articles)
      await sql`INSERT INTO articles (id, title, excerpt, category, status, updated_at) VALUES (${article[0]}, ${article[1]}, ${article[2]}, ${article[3]}, ${article[4]}, ${article[5]})`;
  }
}

function articleFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    status: row.status,
    updatedAt: row.updated_at,
  };
}
function pageFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    description: row.description,
    title: row.title,
    excerpt: row.excerpt,
  };
}

export default async function handler(request, response) {
  const url = new URL(request.url || "/api", "https://vercel.local");
  try {
    if (request.method === "GET" && url.pathname === "/api/session")
      return json(response, 200, { authenticated: authenticated(request) });
    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      const password = request.body?.password;
      if (
        !process.env.ADMIN_PASSWORD ||
        password !== process.env.ADMIN_PASSWORD
      )
        return json(response, 401, { error: "Mot de passe incorrect" });
      const expires = Date.now() + sessionDuration;
      const value = `${expires}.${crypto.randomBytes(18).toString("hex")}`;
      return json(
        response,
        200,
        { authenticated: true },
        {
          "set-cookie": `admin_session=${value}.${signature(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionDuration / 1000}`,
        },
      );
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout")
      return json(
        response,
        200,
        { authenticated: false },
        {
          "set-cookie":
            "admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        },
      );
    await setupDatabase();
    if (request.method === "GET" && url.pathname === "/api/public/pages") {
      const result =
        await sql`SELECT id, name, path, description, title, excerpt FROM pages`;
      return json(response, 200, result.rows.map(pageFromRow));
    }
    if (request.method === "GET" && url.pathname === "/api/public/articles") {
      const result =
        await sql`SELECT id, title, excerpt, category, status, updated_at FROM articles WHERE status = 'published' ORDER BY updated_at DESC`;
      return json(response, 200, result.rows.map(articleFromRow));
    }
    if (!requireAuth(request, response)) return;
    if (request.method === "GET" && url.pathname === "/api/articles") {
      const result =
        await sql`SELECT id, title, excerpt, category, status, updated_at FROM articles ORDER BY updated_at DESC`;
      return json(response, 200, result.rows.map(articleFromRow));
    }
    if (request.method === "GET" && url.pathname === "/api/pages") {
      const result =
        await sql`SELECT id, name, path, description, title, excerpt FROM pages ORDER BY name`;
      return json(response, 200, result.rows.map(pageFromRow));
    }
    if (request.method === "POST" && url.pathname === "/api/articles") {
      const { title, excerpt, category, status } = request.body || {};
      if (
        !title?.trim() ||
        !excerpt?.trim() ||
        !category ||
        !["published", "draft"].includes(status)
      )
        return json(response, 422, { error: "Données article invalides" });
      const result =
        await sql`INSERT INTO articles (title, excerpt, category, status) VALUES (${title.trim().slice(0, 90)}, ${excerpt.trim().slice(0, 180)}, ${category}, ${status}) RETURNING id, title, excerpt, category, status, updated_at`;
      return json(response, 201, articleFromRow(result.rows[0]));
    }
    const articleMatch = url.pathname.match(/^\/api\/articles\/(\d+)$/);
    if (articleMatch && request.method === "DELETE") {
      await sql`DELETE FROM articles WHERE id = ${Number(articleMatch[1])}`;
      return json(response, 200, { deleted: true });
    }
    if (articleMatch && request.method === "PATCH") {
      const { title, excerpt, category, status } = request.body || {};
      if (
        !title?.trim() ||
        !excerpt?.trim() ||
        !category ||
        !["published", "draft"].includes(status)
      )
        return json(response, 422, { error: "Données article invalides" });
      const result =
        await sql`UPDATE articles SET title = ${title.trim().slice(0, 90)}, excerpt = ${excerpt.trim().slice(0, 180)}, category = ${category}, status = ${status}, updated_at = NOW() WHERE id = ${Number(articleMatch[1])} RETURNING id, title, excerpt, category, status, updated_at`;
      if (!result.rows[0])
        return json(response, 404, { error: "Article introuvable" });
      return json(response, 200, articleFromRow(result.rows[0]));
    }
    const pageMatch = url.pathname.match(/^\/api\/pages\/([\w-]+)$/);
    if (pageMatch && request.method === "PATCH") {
      const { title, excerpt } = request.body || {};
      if (!title?.trim() || !excerpt?.trim())
        return json(response, 422, { error: "Titre et introduction requis" });
      const result =
        await sql`UPDATE pages SET title = ${title.trim().slice(0, 90)}, excerpt = ${excerpt.trim().slice(0, 220)} WHERE id = ${pageMatch[1]} RETURNING id, name, path, description, title, excerpt`;
      if (!result.rows[0])
        return json(response, 404, { error: "Page introuvable" });
      return json(response, 200, pageFromRow(result.rows[0]));
    }
    return json(response, 404, { error: "Route API introuvable" });
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Erreur interne du serveur" });
  }
}
