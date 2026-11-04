/**
 * Spoiler-free share image (D21): renders the guess grid + stats to a PNG
 * on a canvas — same content as the emoji share text, prettier. Machine
 * textures are deliberately NOT drawn (cross-origin canvas taint would
 * break toBlob); colors + icons carry the information.
 */

import type { GuessRow } from "./local-state";
import { originOrFallback } from "@/lib/site";

const W = 900;
const NAME_W = 230;
const CELL_GAP = 6;
const ROW_H = 62;
const PAD = 24;

const COLORS: Record<string, { bg: string; ink: string; icon: string }> = {
  correct: { bg: "#2fbf71", ink: "#06281a", icon: "✓" },
  partial: { bg: "#d9a426", ink: "#2b2005", icon: "◐" },
  wrong: { bg: "#e2554f", ink: "#2b0806", icon: "✕" },
  higher: { bg: "#4aa3df", ink: "#06202f", icon: "▲" },
  lower: { bg: "#4aa3df", ink: "#06202f", icon: "▼" },
};

const BG = "#10151b";
const SURFACE = "#1a222c";
const EDGE = "#2d3a49";
const TEXT = "#e8eef5";
const MUTED = "#93a1b1";
const ACCENT = "#f5a623";

export interface ShareImageInput {
  title: string; // "GTNH // MACHINES [HARD] — DAILY"
  date: string;
  columns: string[];
  rows: GuessRow[];
  summary: string; // "4 guesses · 1 hint used" or "X"
}

export async function renderSharePng(input: ShareImageInput): Promise<Blob> {
  const { title, date, columns, rows, summary } = input;

  // Make sure the pixel font is available to the canvas before drawing.
  try {
    await Promise.all([
      document.fonts.load("48px VT323"),
      document.fonts.load("700 14px sans-serif"),
    ]);
  } catch {
    /* fonts are best-effort */
  }

  const headerH = 132;
  const colH = 34;
  const footerH = 72;
  const H = PAD + headerH + colH + rows.length * (ROW_H + CELL_GAP) + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Header panel
  roundRect(ctx, PAD, PAD, W - PAD * 2, headerH - 24, 14);
  ctx.fillStyle = SURFACE;
  ctx.fill();
  ctx.font = "48px VT323, monospace";
  ctx.fillStyle = TEXT;
  ctx.fillText("GREGDLE", PAD + 20, PAD + 46);
  ctx.font = "700 15px sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText(`${title} — ${date}`, PAD + 22, PAD + 76);
  ctx.fillStyle = ACCENT;
  ctx.font = "700 15px sans-serif";
  ctx.fillText(summary, PAD + 22, PAD + 98);
  ctx.fillStyle = MUTED;
  ctx.fillText(
    "colors and arrows only — no spoilers",
    PAD + 22 + ctx.measureText(summary).width + 18,
    PAD + 98,
  );

  // Column headers
  const gridTop = PAD + headerH;
  const cellW = (W - PAD * 2 - NAME_W - CELL_GAP * columns.length) / columns.length;
  ctx.font = "800 12px sans-serif";
  ctx.fillStyle = MUTED;
  ctx.textAlign = "left";
  ctx.fillText("GUESS", PAD + 8, gridTop + 22);
  columns.forEach((c, i) => {
    const x = PAD + NAME_W + CELL_GAP + i * (cellW + CELL_GAP);
    ctx.textAlign = "center";
    ctx.fillText(c, x + cellW / 2, gridTop + 22);
  });

  // Rows — spoiler-safe: guess numbers instead of names, icons instead of
  // values. Colors + icons alone carry the result (D42).
  let y = gridTop + colH;
  rows.forEach((row, rowIndex) => {
    // Guess-number cell
    roundRect(ctx, PAD, y, NAME_W, ROW_H, 10);
    ctx.fillStyle = SURFACE;
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = "800 15px sans-serif";
    ctx.fillStyle = TEXT;
    ctx.textAlign = "center";
    ctx.fillText(`GUESS #${rowIndex + 1}`, PAD + NAME_W / 2, y + ROW_H / 2 + 5);

    // Attribute cells — state icon only, no value text.
    row.cells.forEach((cell, i) => {
      const x = PAD + NAME_W + CELL_GAP + i * (cellW + CELL_GAP);
      const c = COLORS[cell.state] ?? COLORS.wrong!;
      roundRect(ctx, x, y, cellW, ROW_H, 10);
      ctx.fillStyle = c.bg;
      ctx.fill();
      ctx.font = "800 22px sans-serif";
      ctx.fillStyle = c.ink;
      ctx.textAlign = "center";
      ctx.fillText(c.icon, x + cellW / 2, y + ROW_H / 2 + 8);
    });

    y += ROW_H + CELL_GAP;
  });

  // Footer
  ctx.font = "700 14px sans-serif";
  ctx.fillStyle = MUTED;
  ctx.textAlign = "center";
  const host = originOrFallback().replace(/^https?:\/\//, "");
  ctx.fillText(`${host} — a daily GregTech guessing game`, W / 2, H - 28);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
