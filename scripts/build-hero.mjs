#!/usr/bin/env node
/*
 * Build the Hero (Default) section in Contentful:
 *   - creates + publishes the `hero` content type
 *   - uploads + publishes the desktop & mobile background images
 *   - creates + publishes a sample `hero` entry (VillaBliss)
 *   - appends it to the `home` flexiblePage's sections and republishes the page
 *
 * Re-runnable: everything is upserted by fixed id. Reads .env.local next to it.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envFile = join(scriptDir, "..", ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SPACE = process.env.CONTENTFUL_SPACE_ID;
const ENV = process.env.CONTENTFUL_ENVIRONMENT || "master";
const CMA = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
if (!SPACE || !CMA) {
  console.error("✗ CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN required in .env.local.");
  process.exit(1);
}

const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/${ENV}`;
const api = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${CMA}`,
      "Content-Type": "application/vnd.contentful.management.v1+json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${opts.method || "GET"} ${path} → ${res.status}\n${text}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- content type ----------------------------------------------------------
const HERO_TYPE = {
  name: "Hero",
  description:
    "Full-bleed hero banner: a background image with a dark overlay and a large display wordmark. Variants via frontEndComponent.",
  displayField: "internalTitle",
  fields: [
    { id: "internalTitle", name: "Internal Title", type: "Symbol", required: true },
    {
      id: "frontEndComponent",
      name: "Front End Component",
      type: "Symbol",
      validations: [{ in: ["Default"] }],
    },
    { id: "sectionId", name: "Section ID", type: "Symbol" },
    { id: "heading", name: "Heading (Wordmark)", type: "Symbol" },
    {
      id: "backgroundImage",
      name: "Background Image (Desktop)",
      type: "Link",
      linkType: "Asset",
      validations: [{ linkMimetypeGroup: ["image"] }],
    },
    {
      id: "mobileImage",
      name: "Background Image (Mobile)",
      type: "Link",
      linkType: "Asset",
      validations: [{ linkMimetypeGroup: ["image"] }],
    },
  ],
};

const upsertContentType = async (id, spec) => {
  let version;
  try {
    const existing = await api(`/content_types/${id}`);
    version = existing.sys.version;
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const result = await api(`/content_types/${id}`, {
    method: "PUT",
    headers: version ? { "X-Contentful-Version": String(version) } : {},
    body: JSON.stringify(spec),
  });
  await api(`/content_types/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(result.sys.version) },
  });
  console.log(`✓ content type "${id}" published`);
};

// ---- assets ----------------------------------------------------------------
const upsertAsset = async (id, { title, fileName, contentType, upload }) => {
  let version;
  try {
    const existing = await api(`/assets/${id}`);
    version = existing.sys.version;
    // Already processed+published before → reuse as-is.
    if (existing.fields?.file?.["en-US"]?.url) {
      console.log(`✓ asset "${id}" already present`);
      return id;
    }
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const created = await api(`/assets/${id}`, {
    method: "PUT",
    headers: version ? { "X-Contentful-Version": String(version) } : {},
    body: JSON.stringify({
      fields: {
        title: { "en-US": title },
        file: { "en-US": { contentType, fileName, upload } },
      },
    }),
  });
  await api(`/assets/${id}/files/en-US/process`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(created.sys.version) },
  });
  // Poll until processed (file url present).
  let asset;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    asset = await api(`/assets/${id}`);
    if (asset.fields?.file?.["en-US"]?.url) break;
  }
  if (!asset?.fields?.file?.["en-US"]?.url) {
    throw new Error(`asset "${id}" did not finish processing`);
  }
  await api(`/assets/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(asset.sys.version) },
  });
  console.log(`✓ asset "${id}" processed + published`);
  return id;
};

// ---- entries ---------------------------------------------------------------
const L = (v) => ({ "en-US": v });
const link = (linkType, id) => ({ sys: { type: "Link", linkType, id } });

const upsertEntry = async (contentType, id, fields) => {
  let version;
  try {
    const existing = await api(`/entries/${id}`);
    version = existing.sys.version;
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const result = await api(`/entries/${id}`, {
    method: "PUT",
    headers: {
      "X-Contentful-Content-Type": contentType,
      ...(version ? { "X-Contentful-Version": String(version) } : {}),
    },
    body: JSON.stringify({ fields }),
  });
  await api(`/entries/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(result.sys.version) },
  });
  console.log(`✓ entry "${id}" published`);
  return result;
};

// ---- run -------------------------------------------------------------------
await upsertContentType("hero", HERO_TYPE);

const FIGMA_DESKTOP = "https://www.figma.com/api/mcp/asset/48c860ca-aa42-46f7-95e7-f2172cff2c03";
const FIGMA_MOBILE = "https://www.figma.com/api/mcp/asset/54974777-3ac2-4f87-905a-94fd3c59c56c";

await upsertAsset("heroVillablissDesktop", {
  title: "VillaBliss hero — desktop",
  fileName: "villabliss-hero-desktop.jpg",
  contentType: "image/jpeg",
  upload: FIGMA_DESKTOP,
});
await upsertAsset("heroVillablissMobile", {
  title: "VillaBliss hero — mobile",
  fileName: "villabliss-hero-mobile.png",
  contentType: "image/png",
  upload: FIGMA_MOBILE,
});

await upsertEntry("hero", "heroVillabliss", {
  internalTitle: L("Hero — VillaBliss (Default)"),
  frontEndComponent: L("Default"),
  heading: L("VillaBliss"),
  backgroundImage: L(link("Asset", "heroVillablissDesktop")),
  mobileImage: L(link("Asset", "heroVillablissMobile")),
});

// Attach to the home page (prepend so the hero is first), de-duped.
const home = await api(`/entries/home`);
const current = home.fields?.sections?.["en-US"] ?? [];
const withoutHero = current.filter((l) => l?.sys?.id !== "heroVillabliss");
const nextSections = [link("Entry", "heroVillabliss"), ...withoutHero];
const updated = await api(`/entries/home`, {
  method: "PUT",
  headers: {
    "X-Contentful-Content-Type": "flexiblePage",
    "X-Contentful-Version": String(home.sys.version),
  },
  body: JSON.stringify({ fields: { ...home.fields, sections: L(nextSections) } }),
});
await api(`/entries/home/published`, {
  method: "PUT",
  headers: { "X-Contentful-Version": String(updated.sys.version) },
});
console.log("✓ home page updated + published (hero attached)");
console.log("\nDone.");
