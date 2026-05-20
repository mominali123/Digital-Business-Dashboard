import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import QRCode from "qrcode";
import { db, cardsTable } from "@workspace/db";
import {
  CreateCardBody,
  UpdateCardParams,
  UpdateCardBody,
  DeleteCardParams,
  PublishCardParams,
  PublishCardBody,
  UnpublishCardParams,
  GetPublicCardParams,
  GetCardQrParams,
  ExportCardParams,
  CheckUsernameQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

function serializeCard(card: any) {
  return {
    ...card,
    links: Array.isArray(card.links) ? card.links : [],
    publishedAt: card.publishedAt ? card.publishedAt.toISOString() : null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

// GET /api/cards/check-username — must be before /api/cards/:id routes
router.get("/cards/check-username", async (req, res): Promise<void> => {
  const parsed = CheckUsernameQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username } = parsed.data;
  const [existing] = await db
    .select({ id: cardsTable.id })
    .from(cardsTable)
    .where(eq(cardsTable.username, username));
  res.json({ available: !existing, username });
});

// GET /api/cards/public/:username — public, no auth required
router.get("/cards/public/:username", async (req, res): Promise<void> => {
  const parsed = GetPublicCardParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [card] = await db
    .select()
    .from(cardsTable)
    .where(
      and(
        eq(cardsTable.username, parsed.data.username),
        eq(cardsTable.isPublished, true),
      ),
    );
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  res.json(serializeCard(card));
});

// GET /api/cards/me
router.get("/cards/me", requireAuth, async (req: any, res): Promise<void> => {
  const [card] = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.userId, req.userId));
  if (!card) {
    res.status(404).json({ error: "No card found" });
    return;
  }
  res.json(serializeCard(card));
});

// POST /api/cards
router.post("/cards", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = CreateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check if user already has a card
  const [existing] = await db
    .select({ id: cardsTable.id })
    .from(cardsTable)
    .where(eq(cardsTable.userId, req.userId));
  if (existing) {
    res.status(409).json({ error: "Card already exists. Use PUT to update." });
    return;
  }

  const { links, ...rest } = parsed.data;
  const [card] = await db
    .insert(cardsTable)
    .values({
      ...rest,
      userId: req.userId,
      links: links ?? [],
    })
    .returning();

  res.status(201).json(serializeCard(card));
});

// PUT /api/cards/:id
router.put("/cards/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { links, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (links !== undefined) {
    updateData.links = links;
  }

  const [card] = await db
    .update(cardsTable)
    .set(updateData)
    .where(
      and(eq(cardsTable.id, params.data.id), eq(cardsTable.userId, req.userId)),
    )
    .returning();

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  res.json(serializeCard(card));
});

// DELETE /api/cards/:id
router.delete(
  "/cards/:id",
  requireAuth,
  async (req: any, res): Promise<void> => {
    const params = DeleteCardParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [card] = await db
      .delete(cardsTable)
      .where(
        and(
          eq(cardsTable.id, params.data.id),
          eq(cardsTable.userId, req.userId),
        ),
      )
      .returning();

    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    res.sendStatus(204);
  },
);

// POST /api/cards/:id/publish
router.post(
  "/cards/:id/publish",
  requireAuth,
  async (req: any, res): Promise<void> => {
    const params = PublishCardParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = PublishCardBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    // Check username availability
    const { username } = body.data;
    const [taken] = await db
      .select({ id: cardsTable.id })
      .from(cardsTable)
      .where(eq(cardsTable.username, username));

    if (taken && taken.id !== params.data.id) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const [card] = await db
      .update(cardsTable)
      .set({
        username,
        isPublished: true,
        publishedAt: new Date(),
      })
      .where(
        and(
          eq(cardsTable.id, params.data.id),
          eq(cardsTable.userId, req.userId),
        ),
      )
      .returning();

    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    res.json(serializeCard(card));
  },
);

// POST /api/cards/:id/unpublish
router.post(
  "/cards/:id/unpublish",
  requireAuth,
  async (req: any, res): Promise<void> => {
    const params = UnpublishCardParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [card] = await db
      .update(cardsTable)
      .set({ isPublished: false, publishedAt: null })
      .where(
        and(
          eq(cardsTable.id, params.data.id),
          eq(cardsTable.userId, req.userId),
        ),
      )
      .returning();

    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    res.json(serializeCard(card));
  },
);

// GET /api/cards/:id/qr
router.get(
  "/cards/:id/qr",
  requireAuth,
  async (req: any, res): Promise<void> => {
    const params = GetCardQrParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [card] = await db
      .select()
      .from(cardsTable)
      .where(
        and(
          eq(cardsTable.id, params.data.id),
          eq(cardsTable.userId, req.userId),
        ),
      );

    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    if (!card.isPublished || !card.username) {
      res.status(400).json({ error: "Card must be published to generate QR code" });
      return;
    }

    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
    const domain = domains[0] || "localhost";
    const cardUrl = `https://${domain}/c/${card.username}`;

    // Generate a simple QR code SVG using a basic matrix approach
    const qrSvg = await generateQrSvg(cardUrl);

    res.json({ svg: qrSvg, url: cardUrl });
  },
);

// GET /api/cards/:id/export
router.get(
  "/cards/:id/export",
  requireAuth,
  async (req: any, res): Promise<void> => {
    const params = ExportCardParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [card] = await db
      .select()
      .from(cardsTable)
      .where(
        and(
          eq(cardsTable.id, params.data.id),
          eq(cardsTable.userId, req.userId),
        ),
      );

    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    const html = generateCardHtml(card);
    const filename = `${card.username || "card"}-business-card.html`;

    res.json({ html, filename });
  },
);

async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 2, width: 200 });
}

function generateCardHtml(card: any): string {
  const links: any[] = Array.isArray(card.links) ? card.links : [];

  const fontMap: Record<string, string> = {
    outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
    playfair: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
    inter: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  };
  const fontFamily = card.fontStyle === "playfair" ? "Playfair Display" : card.fontStyle === "inter" ? "Inter" : "Outfit";
  const fontUrl = fontMap[card.fontStyle] || fontMap.outfit;

  const linksHtml = links
    .map(
      (link: any) => `
    <a href="${link.url}" target="_blank" rel="noopener" class="action-btn">
      <span>${link.label || link.type}</span>
      <span class="chevron">›</span>
    </a>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${card.fullName} — Digital Card</title>
<link href="${fontUrl}" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --red: ${card.accentColor};
    --ink: ${card.textColor};
    --off-white: ${card.bgColor};
    --font: '${fontFamily}', sans-serif;
  }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--off-white);
    font-family: var(--font);
    color: var(--ink);
    overflow-x: hidden;
  }
  .card {
    max-width: 380px;
    width: 92vw;
    padding: 2.5rem 2rem;
    position: relative;
    z-index: 1;
  }
  .brand { font-size: 0.75rem; letter-spacing: 0.15em; text-transform: lowercase; opacity: 0.5; margin-bottom: 2rem; }
  .logo-ring {
    width: 80px; height: 80px; border-radius: 50%;
    border: 2px solid var(--red);
    display: flex; align-items: center; justify-content: center;
    animation: ringPulse 2.5s ease-in-out infinite;
    margin-bottom: 1.5rem;
  }
  .logo-initials { font-size: 1.5rem; font-weight: 600; color: var(--red); }
  @keyframes ringPulse {
    0%, 100% { box-shadow: 0 0 0 0 transparent; }
    50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--red) 20%, transparent); }
  }
  .name { font-size: 1.75rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.25rem; }
  .title { font-size: 0.875rem; opacity: 0.6; margin-bottom: 0.5rem; }
  .location { font-size: 0.8rem; opacity: 0.5; display: flex; align-items: center; gap: 0.25rem; margin-bottom: 1.5rem; }
  .bio { font-size: 0.875rem; font-style: italic; opacity: 0.7; margin-bottom: 2rem; line-height: 1.6; }
  .action-btn {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1.25rem; margin-bottom: 0.5rem;
    border: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
    border-radius: 0.5rem; text-decoration: none; color: var(--ink);
    font-size: 0.875rem; transition: all 0.2s ease;
  }
  .action-btn:hover { padding-left: 1.5rem; border-color: var(--red); }
  .action-btn:hover .chevron { transform: translateX(3px); }
  .chevron { color: var(--red); transition: transform 0.2s ease; }
  .bg-canvas {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 0; overflow: hidden;
  }
  .bg-icon { position: absolute; font-size: 1.5rem; opacity: var(--icon-opacity, 0.08); }
</style>
</head>
<body>
<div class="bg-canvas" id="bgCanvas"></div>
<div class="card">
  ${card.brandName ? `<div class="brand">${card.brandName}${card.brandSubtitle ? ` · ${card.brandSubtitle}` : ""}</div>` : ""}
  <div class="logo-ring">
    ${card.profileImageUrl
      ? `<img src="${card.profileImageUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="${card.fullName}">`
      : `<span class="logo-initials">${card.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</span>`
    }
  </div>
  <h1 class="name">${card.fullName}</h1>
  ${card.professionalTitle ? `<p class="title">${card.professionalTitle}</p>` : ""}
  ${card.location ? `<p class="location">${card.showStatusDot ? '<span style="color:var(--red)">●</span>' : ""}${card.location}</p>` : ""}
  ${card.bio ? `<p class="bio">${card.bio}</p>` : ""}
  ${linksHtml}
</div>
<script>
  (function() {
    const iconPacks = {
      tech: ['💻','📷','🔋','⌚','📺','🚚','⚡','🖥️','📱','🔌'],
      'real-estate': ['🏠','🔑','🏢','📐','📍','🏗️','🏡','🗺️'],
      creative: ['✏️','🖌️','🎨','📐','🖥️','📸','🎭','✒️'],
      medical: ['❤️','🩺','💊','📋','➕','🏥','💉','🧬'],
    };
    const icons = iconPacks['${card.bgIconPack}'] || iconPacks.tech;
    const canvas = document.getElementById('bgCanvas');
    const count = Math.floor(icons.length * ${card.bgIconDensity} * 3);
    const placed = [];
    for (let i = 0; i < count * 5 && placed.length < count; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const collision = placed.some(p => Math.hypot(p.x - x, p.y - y) < 10);
      if (!collision) {
        placed.push({ x, y });
        const el = document.createElement('span');
        el.className = 'bg-icon';
        el.textContent = icons[Math.floor(Math.random() * icons.length)];
        el.style.left = x + 'vw';
        el.style.top = y + 'vh';
        el.style.opacity = ${card.bgIconOpacity}.toString();
        el.style.transform = 'rotate(' + (Math.random() * 60 - 30) + 'deg)';
        canvas.appendChild(el);
      }
    }
  })();
</script>
</body>
</html>`;
}

export default router;
