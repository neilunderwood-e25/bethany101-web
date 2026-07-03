#!/usr/bin/env node
/*
 * Rewrites the site's marketing copy to reflect Bethany 101 (bethany101.com):
 * a British colonial-era boutique manor in Puttalam, Sri Lanka. Character
 * counts stay close to the template copy so the verified layouts hold.
 * Images and videos are left untouched.
 *
 * Merges field-by-field (GET → modify → PUT with version → publish), so any
 * field not listed here keeps its current value.
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
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${path} → ${res.status}\n${text}`);
  return text ? JSON.parse(text) : null;
};

const richText = (text) => ({
  nodeType: "document",
  data: {},
  content: [
    {
      nodeType: "paragraph",
      data: {},
      content: [{ nodeType: "text", value: text, marks: [], data: {} }],
    },
  ],
});

/** GET the entry, merge the given en-US field values, PUT + publish. */
const patchEntry = async (id, contentType, changes) => {
  const entry = await api(`/entries/${id}`);
  const fields = { ...entry.fields };
  for (const [key, value] of Object.entries(changes)) {
    fields[key] = { "en-US": value };
  }
  const result = await api(`/entries/${id}`, {
    method: "PUT",
    headers: {
      "X-Contentful-Content-Type": contentType,
      "X-Contentful-Version": String(entry.sys.version),
    },
    body: JSON.stringify({ fields }),
  });
  await api(`/entries/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(result.sys.version) },
  });
  console.log(`✓ "${id}" updated + published`);
};

// ---- Hero: wordmark ---------------------------------------------------------
await patchEntry("heroVillabliss", "hero", {
  internalTitle: "Hero — Bethany 101 (Default)",
  heading: "Bethany 101",
});

// ---- Header: nav + CTA (labels only; logo untouched) ------------------------
await patchEntry("navLinkActivities", "navigationLink", {
  label: "Experience", // was "Activities" (10 chars → 10 chars)
  href: "/experience",
});

// ---- Info / Default (was 58 / ~372 chars) ------------------------------------
await patchEntry("infoWelcome", "info", {
  internalTitle: "Info — Old Ceylon Welcome (Default)",
  heading: "Experience the timeless essence of old Ceylon at Bethany 101",
  body:
    "Built at the dawn of the British colonial era and lovingly restored to " +
    "its original splendour, Bethany 101 is a boutique manor filled with " +
    "antique fittings and furniture in the style of old Ceylon. A family home " +
    "for generations, it hosts just six guest bedrooms — an exclusive retreat " +
    "wrapped in wide verandas, frangipani shade, and an oasis-like garden.",
});

// ---- Features (heading was 74; titles 21/19/21/19; bodies ~172/111/119/103) --
await patchEntry("featuresVilla", "features", {
  internalTitle: "Features — Bethany 101 (Default)",
  heading: "Discover the storied charm that makes Bethany 101 truly unforgettable",
});
await patchEntry("featItemPool", "featureItem", {
  title: "Garden pool & verandas",
  body:
    "Cool off in the garden swimming area shaded by frangipani trees, then " +
    "unwind on sweeping verandas with easy chairs and unbroken views across " +
    "the lawn and gardens.",
});
await patchEntry("featItemInteriors", "featureItem", {
  title: "Old Ceylon interiors",
  body:
    "Step into faultlessly classic rooms restored to their original " +
    "splendour, furnished with antiques in the style of old Ceylon.",
});
await patchEntry("featItemLiving", "featureItem", {
  title: "Six private bedrooms",
  body:
    "With only six guest bedrooms across the whole manor, every stay is " +
    "assured of privacy and exclusive, unhurried luxury.",
});
await patchEntry("featItemEntertainment", "featureItem", {
  title: "World-class cuisine",
  body:
    "Savour local and world flavours side by side, with fresh produce and " +
    "fish drawn daily from the Puttalam lagoon.",
});

// ---- Info / Aminities (heading 53→51; secondary 25→25; values ≈ lengths) -----
await patchEntry("infoAmenities", "info", {
  internalTitle: "Info — Manor Details (Aminities)",
  heading: "Discover the heritage charm of your island getaway",
  secondaryHeading: "Manor details at a glance",
  ctaLabel: "Reserve your stay",
  amenities: [
    { label: "Location", value: "101 Colombo Road, Puttalam" },
    { label: "Established", value: "British colonial era, 1850s" },
    { label: "Restored", value: "2013, to original splendour" },
    { label: "Bedrooms", value: "Six exclusive guest rooms" },
    { label: "Setting", value: "Puttalam lagoon shorefront" },
    { label: "Dining", value: "Local & world fusion cuisine" },
    { label: "Swimming", value: "Frangipani-shaded garden pool" },
    { label: "Wildlife", value: "Wilpattu safaris nearby" },
    { label: "Day trips", value: "Kalpitiya, Anuradhapura and the lagoon" },
  ],
});

// ---- SEO / AEO ---------------------------------------------------------------
await patchEntry("seo-home", "seo", {
  seoTitle: "Bethany 101 — Boutique Hotel in Puttalam, Sri Lanka",
  seoDescription:
    "A paradise boutique hotel of old Ceylon: a colonial-era manor with six " +
    "guest rooms, world-class cuisine, and a frangipani-shaded garden in " +
    "Puttalam, Sri Lanka.",
  seoKeywords: [
    "bethany 101",
    "boutique hotel puttalam",
    "sri lanka",
    "kalpitiya",
    "old ceylon",
    "wilpattu",
  ],
  seoOgTitle: "Bethany 101 — Experience the Essence of Old Ceylon",
  seoOgDescription: richText(
    "A five-star boutique escape on the Puttalam lagoon — colonial-era " +
      "heritage, six exclusive rooms, and dining drawn from Sri Lanka's " +
      "finest local produce."
  ),
  seoAnswerSummary: richText(
    "Bethany 101 is a boutique hotel in Puttalam, Sri Lanka — a British " +
      "colonial-era manor restored with antique old-Ceylon furnishings. It " +
      "offers six guest bedrooms, world-class fusion cuisine, and easy reach " +
      "of Kalpitiya's dolphin watching, kite surfing, and Wilpattu National Park."
  ),
  seoFaqs: [
    {
      question: "Where is Bethany 101 located?",
      answer:
        "At 101 Colombo Road, Puttalam, Sri Lanka — between the Puttalam " +
        "lagoon and the dry zone, minutes from Kalpitiya.",
    },
    {
      question: "How many rooms does Bethany 101 have?",
      answer:
        "The manor hosts just six guest bedrooms, assuring a private and " +
        "exclusively luxurious stay.",
    },
    {
      question: "What is there to do near Bethany 101?",
      answer:
        "Dolphin and whale watching at Kalpitiya, kite surfing, kayaking the " +
        "Puttalam lagoon, Wilpattu National Park safaris, and day trips to " +
        "Anuradhapura.",
    },
  ],
  seoAuthorName: "Bethany 101",
  seoArticleSection: "Boutique Hotel",
});

console.log("\nDone. Marketing copy now reflects Bethany 101 (images/videos untouched).");
