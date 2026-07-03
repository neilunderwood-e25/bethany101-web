#!/usr/bin/env node
/*
 * Build the Features (Default) section in Contentful:
 *   - creates + publishes the `featureItem` and `features` content types
 *   - uploads + publishes the bg video, bg image (fallback/poster), 4 icons
 *   - creates + publishes 4 featureItem entries and the features entry
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
  console.error("✗ CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN required.");
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
const L = (v) => ({ "en-US": v });
const assetLink = (id) => ({ sys: { type: "Link", linkType: "Asset", id } });
const entryLink = (id) => ({ sys: { type: "Link", linkType: "Entry", id } });

const upsertContentType = async (id, spec) => {
  let version;
  try {
    version = (await api(`/content_types/${id}`)).sys.version;
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

const upsertAsset = async (id, { title, fileName, contentType, upload }) => {
  try {
    const existing = await api(`/assets/${id}`);
    if (existing.fields?.file?.["en-US"]?.url) {
      console.log(`✓ asset "${id}" already present`);
      return;
    }
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const created = await api(`/assets/${id}`, {
    method: "PUT",
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
  let asset;
  for (let i = 0; i < 40; i++) {
    await sleep(1500);
    asset = await api(`/assets/${id}`);
    if (asset.fields?.file?.["en-US"]?.url) break;
  }
  if (!asset?.fields?.file?.["en-US"]?.url) throw new Error(`asset "${id}" did not process`);
  await api(`/assets/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(asset.sys.version) },
  });
  console.log(`✓ asset "${id}" processed + published`);
};

const upsertEntry = async (contentType, id, fields) => {
  let version;
  try {
    version = (await api(`/entries/${id}`)).sys.version;
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
};

// ---- content types ---------------------------------------------------------
await upsertContentType("featureItem", {
  name: "Feature Item",
  description: "One feature card: a gold icon, a title, and body copy.",
  displayField: "title",
  fields: [
    { id: "title", name: "Title", type: "Symbol", required: true },
    { id: "body", name: "Body", type: "Text" },
    {
      id: "icon",
      name: "Icon",
      type: "Link",
      linkType: "Asset",
      validations: [{ linkMimetypeGroup: ["image"] }],
    },
  ],
});

await upsertContentType("features", {
  name: "Features",
  description:
    "Dark full-bleed feature band: a background video (with image fallback) under a brown gradient, a large heading, and a row of feature cards. Variants via frontEndComponent.",
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
    { id: "heading", name: "Heading", type: "Symbol" },
    {
      id: "backgroundVideo",
      name: "Background Video",
      type: "Link",
      linkType: "Asset",
      validations: [{ linkMimetypeGroup: ["video"] }],
    },
    {
      id: "backgroundImage",
      name: "Background Image (Fallback / Poster)",
      type: "Link",
      linkType: "Asset",
      validations: [{ linkMimetypeGroup: ["image"] }],
    },
    {
      id: "items",
      name: "Feature Items",
      type: "Array",
      items: {
        type: "Link",
        linkType: "Entry",
        validations: [{ linkContentType: ["featureItem"] }],
      },
    },
  ],
});

// ---- assets (Contentful fetches the public URLs) ---------------------------
await upsertAsset("featuresBgVideo", {
  title: "Features background video",
  fileName: "features-bg.mp4",
  contentType: "video/mp4",
  upload: "https://framerusercontent.com/assets/K96ZT7zMM5njm7snvAr5dcHXmDQ.mp4",
});
await upsertAsset("featuresBgImage", {
  title: "Features background image (fallback)",
  fileName: "features-bg.jpg",
  contentType: "image/jpeg",
  upload: "https://framerusercontent.com/images/AIFdOjFGNoY85ug6dBHMxuRzBKg.jpg",
});

const ICONS = [
  { id: "featIconPool", file: "L8s7ycgueSR21ZLRbhWWh29Lnw", title: "Pool icon" },
  { id: "featIconInterior", file: "dhNqjniGA02utcNo5OgPKJmllo", title: "Chandelier icon" },
  { id: "featIconLiving", file: "by5XTlarbMD0izFZpWYX9A7amY", title: "Living areas icon" },
  { id: "featIconEntertainment", file: "YElUxluUeUo0IgXWXUvvzEfQpI", title: "Diamond icon" },
];
for (const i of ICONS) {
  await upsertAsset(i.id, {
    title: i.title,
    fileName: `${i.file}.svg`,
    contentType: "image/svg+xml",
    upload: `https://framerusercontent.com/images/${i.file}.svg`,
  });
}

// ---- entries ---------------------------------------------------------------
const ITEMS = [
  {
    id: "featItemPool",
    icon: "featIconPool",
    title: "Private pool & garden",
    body:
      "Immerse yourself in ultimate relaxation with a private pool surrounded by lush, manicured gardens. Perfect for morning swims, sunbathing, or peaceful evenings by the water.",
  },
  {
    id: "featItemInteriors",
    icon: "featIconInterior",
    title: "Luxurious interiors",
    body:
      "Step inside and experience thoughtfully designed spaces featuring elegant decor, and high-quality furnishings.",
  },
  {
    id: "featItemLiving",
    icon: "featIconLiving",
    title: "Spacious living areas",
    body:
      "Relax with family or friends in open-concept living spaces designed for socializing, featuring plenty of natural light.",
  },
  {
    id: "featItemEntertainment",
    icon: "featIconEntertainment",
    title: "Entertainment space",
    body:
      "Host gatherings or enjoy quiet nights under the stars in a spacious outdoor area equipped with seating.",
  },
];
for (const item of ITEMS) {
  await upsertEntry("featureItem", item.id, {
    title: L(item.title),
    body: L(item.body),
    icon: L(assetLink(item.icon)),
  });
}

await upsertEntry("features", "featuresVilla", {
  internalTitle: L("Features — Villa (Default)"),
  frontEndComponent: L("Default"),
  heading: L("Discover the exceptional features that make our villa truly unforgettable"),
  backgroundVideo: L(assetLink("featuresBgVideo")),
  backgroundImage: L(assetLink("featuresBgImage")),
  items: L(ITEMS.map((i) => entryLink(i.id))),
});

// ---- attach to home page ----------------------------------------------------
const home = await api(`/entries/home`);
const current = home.fields?.sections?.["en-US"] ?? [];
const without = current.filter((l) => l?.sys?.id !== "featuresVilla");
const updated = await api(`/entries/home`, {
  method: "PUT",
  headers: {
    "X-Contentful-Content-Type": "flexiblePage",
    "X-Contentful-Version": String(home.sys.version),
  },
  body: JSON.stringify({
    fields: { ...home.fields, sections: L([...without, entryLink("featuresVilla")]) },
  }),
});
await api(`/entries/home/published`, {
  method: "PUT",
  headers: { "X-Contentful-Version": String(updated.sys.version) },
});
console.log("✓ home page updated + published (features appended)");
console.log("\nDone.");
