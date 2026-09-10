import { Transaction } from '@/types/cheki';

/**
 * Helper to parse raw cell values containing image links, `=HYPERLINK(...)`,
 * `=IMAGE(...)`, Google Drive, or Google Photos URLs into direct renderable image links.
 */
export function extractDirectImageUrl(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();

  if (!str || str.toLowerCase() === 'none') return '';

  // Extract URL from formulas like =HYPERLINK("https://...", "Link") or =IMAGE("https://...")
  if (str.startsWith('=')) {
    const match = str.match(/https?:\/\/[^\s"',)]+/);
    if (match) {
      str = match[0];
    }
  }

  // Google Drive File View link -> Direct image view URL
  if (str.includes('drive.google.com')) {
    const driveIdMatch = str.match(/\/d\/([a-zA-Z0-9_-]+)/) || str.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveIdMatch && driveIdMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1200`;
    }
  }

  // Convert temporary Google Photos URLs if old domain
  if (str.includes('photos.fife.usercontent.google.com')) {
    str = str.replace(/photos\.fife\.usercontent\.google\.com/g, 'lh3.googleusercontent.com');
  }

  return str;
}

export interface GroupedChekiPhoto {
  key: string;
  imgUrl: string;
  cleanUrl: string;
  totalQty: number;
  members: string[];
  colors: string[];
  events: string[];
  groups: string[];
  rows: Transaction[];
}

export function groupTransactionsByImage(rows: Transaction[]): GroupedChekiPhoto[] {
  const map = new Map<string, GroupedChekiPhoto>();

  rows.forEach((r) => {
    const rawUrl = r.img?.trim() || '';
    if (!rawUrl || rawUrl.toLowerCase() === 'none') return;
    const cleanUrl = extractDirectImageUrl(rawUrl);
    const key = cleanUrl || rawUrl;

    if (!map.has(key)) {
      map.set(key, {
        key,
        imgUrl: rawUrl,
        cleanUrl,
        totalQty: 0,
        members: [],
        colors: [],
        events: [],
        groups: [],
        rows: [],
      });
    }

    const item = map.get(key)!;
    item.totalQty += (r.quantity || 1);
    if (r.member && !item.members.includes(r.member)) item.members.push(r.member);
    if (r.color && !item.colors.includes(r.color)) item.colors.push(r.color);
    if (r.event && !item.events.includes(r.event)) item.events.push(r.event);
    if (r.group && !item.groups.includes(r.group)) item.groups.push(r.group);
    item.rows.push(r);
  });

  return Array.from(map.values());
}

/**
 * Helper to strip parenthetical text from display names,
 * e.g., "Zero (NOLiMIT)" -> "Zero", "Siso (22%)" -> "Siso"
 */
export function formatDisplayName(name: string | undefined | null): string {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/\s*\([^)]*\)/g, '').trim();
}
