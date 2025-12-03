import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const dataFolder = join(import.meta.dirname, 'data');
const dataFile = join(dataFolder, 'articles.json');

const app = express();
const angularApp = new AngularNodeAppEngine();

type Category = 'alimentaire' | 'nonAlimentaire';

interface ArticleItem {
  name: string;
  done: boolean;
}

interface ArchiveEntry {
  id: number;
  createdAt: string;
  articlesAlimentaires: ArticleItem[];
  articlesNonAlimentaires: ArticleItem[];
}

interface ArticleState {
  articlesAlimentaires: ArticleItem[];
  articlesNonAlimentaires: ArticleItem[];
  archives: ArchiveEntry[];
}

const defaultState: ArticleState = {
  articlesAlimentaires: [],
  articlesNonAlimentaires: [],
  archives: [],
};

const normalizeList = (value: unknown): ArticleItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return { name: entry, done: false };
      }
      const name = typeof entry?.name === 'string' ? entry.name : '';
      if (!name) return null;
      const done = Boolean(entry?.done);
      return { name, done };
    })
    .filter((v): v is ArticleItem => Boolean(v));
};

const normalizeArchives = (value: unknown): ArchiveEntry[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      id: Number(entry?.id) || Date.now(),
      createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
      articlesAlimentaires: normalizeList(entry?.articlesAlimentaires),
      articlesNonAlimentaires: normalizeList(entry?.articlesNonAlimentaires),
    }))
    .filter(Boolean);
};

async function readState(): Promise<ArticleState> {
  try {
    const raw = await readFile(dataFile, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      articlesAlimentaires: normalizeList(parsed.articlesAlimentaires),
      articlesNonAlimentaires: normalizeList(parsed.articlesNonAlimentaires),
      archives: normalizeArchives(parsed.archives),
    };
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return { ...defaultState };
    }

    console.error('Erreur lors de la lecture de la base locale', error);
    throw error;
  }
}

async function writeState(state: ArticleState): Promise<void> {
  await mkdir(dataFolder, { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2), 'utf-8');
}

app.use(express.json());

app.get('/api/lists', async (req, res, next) => {
  try {
    const snapshot = await readState();
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.post('/api/articles', async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const category: Category =
      req.body?.category === 'nonAlimentaire' ? 'nonAlimentaire' : 'alimentaire';

    if (!name) {
      return res.status(400).json({ message: "Le nom de l'article est obligatoire." });
    }

    const state = await readState();
    const all = [...state.articlesAlimentaires, ...state.articlesNonAlimentaires];
    const exists = all.some((item) => item.name.toLowerCase() === name.toLowerCase());

    if (exists) {
      return res.status(409).json({ message: 'Cet article existe deja.' });
    }

    const target =
      category === 'alimentaire' ? state.articlesAlimentaires : state.articlesNonAlimentaires;
    target.push({ name, done: false });

    await writeState(state);
    return res.json(state);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/articles', async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const category: Category =
      req.body?.category === 'nonAlimentaire' ? 'nonAlimentaire' : 'alimentaire';

    if (!name) {
      return res.status(400).json({ message: "Le nom de l'article est obligatoire." });
    }

    const state = await readState();
    const target =
      category === 'alimentaire' ? state.articlesAlimentaires : state.articlesNonAlimentaires;
    const index = target.findIndex((item) => item.name.toLowerCase() === name.toLowerCase());

    if (index === -1) {
      return res.status(404).json({ message: 'Article introuvable.' });
    }

    target.splice(index, 1);
    await writeState(state);
    return res.json(state);
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/articles/toggle', async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const category: Category =
      req.body?.category === 'nonAlimentaire' ? 'nonAlimentaire' : 'alimentaire';

    if (!name) {
      return res.status(400).json({ message: "Le nom de l'article est obligatoire." });
    }

    const state = await readState();
    const target =
      category === 'alimentaire' ? state.articlesAlimentaires : state.articlesNonAlimentaires;
    const item = target.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

    if (!item) {
      return res.status(404).json({ message: 'Article introuvable.' });
    }

    item.done = !item.done;
    await writeState(state);
    return res.json(state);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/current', async (req, res, next) => {
  try {
    const state = await readState();
    state.articlesAlimentaires = [];
    state.articlesNonAlimentaires = [];
    await writeState(state);
    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.post('/api/archive', async (req, res, next) => {
  try {
    const state = await readState();
    const isEmpty =
      state.articlesAlimentaires.length === 0 && state.articlesNonAlimentaires.length === 0;

    if (isEmpty) {
      return res.status(400).json({ message: 'La liste est vide, rien a archiver.' });
    }

    const now = new Date();
    const snapshot: ArchiveEntry = {
      id: now.getTime(),
      createdAt: now.toISOString(),
      articlesAlimentaires: [...state.articlesAlimentaires],
      articlesNonAlimentaires: [...state.articlesNonAlimentaires],
    };

    state.archives.unshift(snapshot);
    state.articlesAlimentaires = [];
    state.articlesNonAlimentaires = [];

    await writeState(state);
    return res.json(state);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/archives', async (req, res, next) => {
  try {
    const state = await readState();
    state.archives = [];
    await writeState(state);
    res.json(state);
  } catch (error) {
    next(error);
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
