"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { HeaderData } from "@/lib/contentful/header";

/**
 * Global site header. Figma 717:5509 (desktop) / 718:5561 (mobile).
 *
 * A cream (`--header-bg`) bar: nav links (active link underlined) on the left,
 * a centered lotus brand mark, and a right-aligned outlined "Book now" pill.
 * Below `lg` it collapses to logo + an amber hamburger that toggles a
 * full-screen overlay menu.
 *
 * This is layout chrome (not a page section) — its content comes from the
 * singleton `header` entry (see lib/contentful/header.ts) and it is rendered
 * under the hero on the homepage.
 */
const PILL_CLASSES =
  "rounded-[100px] border border-[var(--header-fg)] px-[50px] py-[15px] " +
  "text-[18px] font-medium leading-[21.6px] text-[var(--header-fg)] " +
  "transition-colors duration-200 hover:bg-[var(--header-fg)] hover:text-[var(--header-bg)]";

function isActivePath(pathname: string, href: string): boolean {
  const path = pathname.replace(/^\/(es)(?=\/|$)/, "") || "/";
  return href === "/" ? path === "/" : path.startsWith(href);
}

const FALLBACK_LOGO = "/assets/images/logo.webp";

function BrandLogo({
  height,
  src,
  onClick,
}: {
  height: number;
  src: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/"
      aria-label="VillaBliss — home"
      className="block shrink-0"
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="VillaBliss"
        // Height-fixed, width auto so the wordmark keeps its aspect ratio.
        style={{ height, width: "auto" }}
        className="block w-auto"
      />
    </Link>
  );
}

export function Header({ header }: { header: HeaderData }) {
  const { navLinks, ctaLabel, ctaHref } = header;
  const logoSrc = header.logoUrl || FALLBACK_LOGO;
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const mobileMenuId = "site-menu";
  const hasCta = !!ctaLabel;
  const bookHref = ctaHref || "#";

  // While the mobile menu is open, close on Escape and lock body scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    // Sticky: on the homepage the bar scrolls up with the hero until it
    // reaches the viewport top, then pins there; on other pages it starts at
    // the top and pins immediately.
    <header className="sticky top-0 z-50 bg-[var(--header-bg)]">
      {/* ---- Desktop bar (≥ lg) ---- */}
      <div className="hidden justify-center px-[70px] lg:flex">
        <div className="w-full max-w-[1780px] px-[30px]">
          <div className="flex items-center gap-[30px] py-[6px]">
            <nav className="flex flex-1 items-center gap-[40px]">
              {navLinks.map((link) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative pb-[3px] text-[18px] font-medium leading-[21.6px] transition-colors duration-200 ${
                      active
                        ? "text-[var(--header-fg)]"
                        : "text-[var(--header-fg-muted)] hover:text-[var(--header-fg)]"
                    }`}
                  >
                    {link.label}
                    {/* Active: static underline. Non-active: the same underline
                        wipes in left→right on hover (progress animation). */}
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 bottom-0 h-px origin-left bg-[var(--header-fg)] ${
                        active
                          ? "scale-x-100"
                          : "scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 justify-center">
              <BrandLogo height={72} src={logoSrc} onClick={close} />
            </div>

            <div className="flex flex-1 justify-end">
              {hasCta && (
                <Link href={bookHref} className={PILL_CLASSES}>
                  {ctaLabel}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Mobile bar (< lg) ---- */}
      <div className="flex items-center justify-between px-[20px] py-[6px] lg:hidden">
        <BrandLogo height={48} src={logoSrc} onClick={close} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={mobileMenuId}
          className="relative size-[40px] shrink-0 cursor-pointer rounded-[20px] bg-[var(--header-accent)]"
        >
          <span
            className={`absolute left-[12px] h-[2px] w-[16px] rounded-[10px] bg-[var(--header-fg)] transition-all duration-300 ${
              open ? "top-[19px] rotate-45" : "top-[15px]"
            }`}
          />
          <span
            className={`absolute left-[12px] h-[2px] w-[16px] rounded-[10px] bg-[var(--header-fg)] transition-all duration-300 ${
              open ? "top-[19px] -rotate-45" : "top-[23px]"
            }`}
          />
        </button>
      </div>

      {/* Full-screen mobile overlay menu. Sits above the sticky bar (z-60 >
          z-50) and carries its own ✕ close button in the hamburger's spot. */}
      <div
        id={mobileMenuId}
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-[32px] bg-[var(--header-bg)] transition-opacity duration-300 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Close (✕) — same amber circle as the hamburger, same position. */}
        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="absolute right-[20px] top-[10px] size-[40px] cursor-pointer rounded-[20px] bg-[var(--header-accent)]"
        >
          <span className="absolute left-[12px] top-[19px] h-[2px] w-[16px] rotate-45 rounded-[10px] bg-[var(--header-fg)]" />
          <span className="absolute left-[12px] top-[19px] h-[2px] w-[16px] -rotate-45 rounded-[10px] bg-[var(--header-fg)]" />
        </button>

        {navLinks.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <Link
              key={link.id}
              href={link.href}
              onClick={close}
              aria-current={active ? "page" : undefined}
              className={`text-[28px] font-medium leading-none transition-colors duration-200 ${
                active
                  ? "text-[var(--header-fg)]"
                  : "text-[var(--header-fg-muted)] hover:text-[var(--header-fg)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        {hasCta && (
          <Link href={bookHref} onClick={close} className={`mt-[8px] ${PILL_CLASSES}`}>
            {ctaLabel}
          </Link>
        )}
      </div>
    </header>
  );
}

export default Header;
