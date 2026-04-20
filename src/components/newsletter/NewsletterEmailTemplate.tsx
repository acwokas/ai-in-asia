import React from "react";

// ── Types ──────────────────────────────────────────────────────
interface TopStoryData {
  title: string;
  excerpt: string;
  url: string;
  imageUrl?: string;
  aiSummary?: string;
}

interface ThreeBeforeNineItem {
  emoji?: string;
  headline: string;
  body: string;
}

interface GuideData {
  title: string;
  excerpt: string;
  url: string;
}

interface ToolData {
  title: string;
  description: string;
  url?: string;
}

interface WorthWatchingItem {
  title: string;
  content: string;
}

interface WorthWatching {
  trends?: WorthWatchingItem;
  events?: WorthWatchingItem;
  spotlight?: WorthWatchingItem;
  policy?: WorthWatchingItem;
}

export interface EmailTemplateData {
  editionDate: string;
  subjectLine: string;
  editorNote?: string;
  heroStory?: TopStoryData;
  topStories: TopStoryData[];
  threeBeforeNine: ThreeBeforeNineItem[];
  guides: GuideData[];
  tool?: ToolData;
  adriansTake?: string;
  worthWatching?: WorthWatching;
  unsubscribeUrl?: string;
}

// ── Shared inline style constants ──────────────────────────────
const COLORS = {
  headerBg: "#1a1a2e",
  contentBg: "#ffffff",
  accent: "#7c3aed",
  gold: "#d4af37",
  textDark: "#1a1a2e",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  footerBg: "#1a1a2e",
  footerText: "#9ca3af",
};

const BASE_URL = "https://aiinasia.com";

// ── Helper: format date ────────────────────────────────────────
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Generate raw HTML string (for email sending) ───────────────
export function generateEmailHtml(data: EmailTemplateData): string {
  const date = formatDate(data.editionDate);
  const unsub = data.unsubscribeUrl || `${BASE_URL}/newsletter/unsubscribe`;

  const wwItems = data.worthWatching
    ? [
        data.worthWatching.trends && { label: "📈 Trends", ...data.worthWatching.trends },
        data.worthWatching.events && { label: "📅 Events", ...data.worthWatching.events },
        data.worthWatching.spotlight && { label: "🏢 Spotlight", ...data.worthWatching.spotlight },
        data.worthWatching.policy && { label: "⚖️ Policy", ...data.worthWatching.policy },
      ].filter(Boolean) as { label: string; title: string; content: string }[]
    : [];

  // Build Worth Watching 2x2 grid rows
  let wwHtml = "";
  for (let i = 0; i < wwItems.length; i += 2) {
    const left = wwItems[i];
    const right = wwItems[i + 1];
    wwHtml += `<tr>
      <td style="padding:8px;width:50%;vertical-align:top;border:1px solid ${COLORS.border};border-radius:6px;">
        <p style="margin:0 0 4px;font-size:11px;color:${COLORS.accent};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${left.label}</p>
        <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${COLORS.textDark};">${left.title}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.5;">${left.content}</p>
      </td>
      ${right ? `<td style="padding:8px;width:50%;vertical-align:top;border:1px solid ${COLORS.border};border-radius:6px;">
        <p style="margin:0 0 4px;font-size:11px;color:${COLORS.accent};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${right.label}</p>
        <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${COLORS.textDark};">${right.title}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.5;">${right.content}</p>
      </td>` : `<td style="padding:8px;width:50%;"></td>`}
    </tr>`;
  }

  // Top stories HTML
  const storiesHtml = data.topStories
    .map(
      (s) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${COLORS.border};">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          ${s.imageUrl ? `<td style="width:100px;vertical-align:top;padding-right:12px;">
            <img src="${s.imageUrl}" alt="" width="100" height="68" style="display:block;border-radius:6px;object-fit:cover;" />
          </td>` : ""}
          <td style="vertical-align:top;">
            <a href="${s.url}" style="font-size:15px;font-weight:600;color:${COLORS.textDark};text-decoration:none;line-height:1.3;">${s.title}</a>
            <p style="margin:4px 0 0;font-size:13px;color:${COLORS.textMuted};line-height:1.5;">${s.aiSummary || s.excerpt}</p>
          </td>
        </tr></table>
      </td>
    </tr>`
    )
    .join("");

  // 3B9 items
  const b9Html = data.threeBeforeNine
    .slice(0, 3)
    .map(
      (item, i) => `
    <tr>
      <td style="padding:12px 16px;${i < data.threeBeforeNine.length - 1 ? `border-bottom:1px solid ${COLORS.border};` : ""}">
        <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:${COLORS.textDark};">${item.emoji || "☕"} ${item.headline}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.5;">${item.body}</p>
      </td>
    </tr>`
    )
    .join("");

  // Guides
  const guidesHtml = data.guides
    .map(
      (g) => `
    <tr>
      <td style="padding:8px 0;">
        <a href="${g.url}" style="font-size:14px;font-weight:600;color:${COLORS.accent};text-decoration:none;">📚 ${g.title}</a>
        <p style="margin:4px 0 0;font-size:13px;color:${COLORS.textMuted};line-height:1.4;">${g.excerpt}</p>
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.subjectLine}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">

<!-- Wrapper -->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:20px 10px;">

<!-- Container 600px -->
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${COLORS.contentBg};border-radius:8px;overflow:hidden;">

<!-- HEADER -->
<tr>
  <td style="background-color:${COLORS.headerBg};padding:28px 30px;text-align:center;">
    <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:${COLORS.accent};letter-spacing:-0.5px;">AiiN<span style="color:#ffffff;">ASi</span>A</p>
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:1.5px;">Weekly Brief</p>
    <p style="margin:0;font-size:12px;color:${COLORS.footerText};">${date}</p>
  </td>
</tr>

<!-- EDITOR NOTE -->
${data.editorNote ? `<tr>
  <td style="padding:24px 30px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="border-left:4px solid ${COLORS.accent};padding:14px 18px;background-color:#f9f5ff;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${COLORS.accent};text-transform:uppercase;letter-spacing:0.5px;">Editor's Note</p>
        <p style="margin:0;font-size:14px;color:${COLORS.textDark};line-height:1.6;">${data.editorNote}</p>
      </td>
    </tr></table>
  </td>
</tr>` : ""}

<!-- TOP STORIES -->
${data.heroStory || data.topStories.length > 0 ? `<tr>
  <td style="padding:24px 30px 0;">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${COLORS.textDark};">📰 This Week's Top Stories</p>
    ${data.heroStory ? `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;">
      <tr><td>
        ${data.heroStory.imageUrl ? `<a href="${data.heroStory.url}" style="text-decoration:none;"><img src="${data.heroStory.imageUrl}" alt="" width="540" style="display:block;width:100%;border-radius:8px;margin-bottom:12px;" /></a>` : ""}
        <a href="${data.heroStory.url}" style="font-size:18px;font-weight:700;color:${COLORS.textDark};text-decoration:none;line-height:1.3;">${data.heroStory.title}</a>
        <p style="margin:6px 0 12px;font-size:14px;color:${COLORS.textMuted};line-height:1.5;">${data.heroStory.aiSummary || data.heroStory.excerpt}</p>
        <a href="${data.heroStory.url}" style="display:inline-block;padding:10px 24px;background-color:${COLORS.accent};color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px;">Read Full Story →</a>
      </td></tr>
    </table>` : ""}
    ${data.topStories.length > 0 ? `<table cellpadding="0" cellspacing="0" border="0" width="100%">${storiesHtml}</table>` : ""}
  </td>
</tr>` : ""}

<!-- 3 BEFORE 9 -->
${data.threeBeforeNine.length > 0 ? `<tr>
  <td style="padding:24px 30px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:2px solid ${COLORS.gold};border-radius:8px;overflow:hidden;">
      <tr><td style="background-color:${COLORS.gold};padding:12px 16px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#1a1a2e;">☕ 3 Before 9</p>
        <p style="margin:2px 0 0;font-size:11px;color:#1a1a2e;opacity:0.7;">3 must-know AI stories before your 9am coffee</p>
      </td></tr>
      ${b9Html}
    </table>
  </td>
</tr>` : ""}

<!-- GUIDES -->
${data.guides.length > 0 ? `<tr>
  <td style="padding:24px 30px 0;">
    <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:${COLORS.textDark};">📚 Guides &amp; Learn</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%">${guidesHtml}</table>
  </td>
</tr>` : ""}

<!-- AI TOOL OF THE WEEK -->
${data.tool ? `<tr>
  <td style="padding:24px 30px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;">🛠️ AI Tool of the Week</p>
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${COLORS.textDark};">${data.tool.title}</p>
        <p style="margin:0 0 10px;font-size:13px;color:${COLORS.textMuted};line-height:1.5;">${data.tool.description}</p>
        ${data.tool.url ? `<a href="${data.tool.url}" style="display:inline-block;padding:8px 20px;background-color:#16a34a;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px;">Try It Out →</a>` : ""}
      </td></tr>
    </table>
  </td>
</tr>` : ""}

<!-- ADRIAN'S TAKE -->
${data.adriansTake ? `<tr>
  <td style="padding:24px 30px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="border-left:4px solid ${COLORS.gold};padding:14px 18px;background-color:#fffbeb;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${COLORS.gold};text-transform:uppercase;letter-spacing:0.5px;">💡 Adrian's Take</p>
        <p style="margin:0;font-size:14px;color:${COLORS.textDark};line-height:1.6;font-style:italic;">${data.adriansTake}</p>
      </td>
    </tr></table>
  </td>
</tr>` : ""}

<!-- WORTH WATCHING -->
${wwItems.length > 0 ? `<tr>
  <td style="padding:24px 30px 0;">
    <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:${COLORS.textDark};">👀 Worth Watching</p>
    <table cellpadding="0" cellspacing="8" border="0" width="100%">${wwHtml}</table>
  </td>
</tr>` : ""}

<!-- FOOTER -->
<tr>
  <td style="padding:30px 0 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.footerBg};border-radius:0 0 8px 8px;">
      <tr><td style="padding:24px 30px;text-align:center;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#ffffff;">AiiNASiA - AI Intelligence for Asia</p>
        <p style="margin:0 0 16px;font-size:12px;color:${COLORS.footerText};">Follow us for daily AI insights across the Asia-Pacific region.</p>
        <table cellpadding="0" cellspacing="0" border="0" align="center"><tr>
          <td style="padding:0 8px;"><a href="${BASE_URL}" style="color:${COLORS.accent};font-size:12px;text-decoration:none;">Website</a></td>
          <td style="padding:0 8px;"><a href="https://twitter.com/aiinasia" style="color:${COLORS.accent};font-size:12px;text-decoration:none;">Twitter</a></td>
          <td style="padding:0 8px;"><a href="https://linkedin.com/company/aiinasia" style="color:${COLORS.accent};font-size:12px;text-decoration:none;">LinkedIn</a></td>
        </tr></table>
        <p style="margin:16px 0 0;font-size:11px;color:${COLORS.footerText};">
          <a href="${unsub}" style="color:${COLORS.footerText};text-decoration:underline;">Unsubscribe</a> · 
          <a href="${BASE_URL}/privacy" style="color:${COLORS.footerText};text-decoration:underline;">Privacy Policy</a>
        </p>
      </td></tr>
    </table>
  </td>
</tr>

</table>
<!-- /Container -->

</td></tr>
</table>
<!-- /Wrapper -->

</body>
</html>`;
}

// ── React Preview Component ────────────────────────────────────
export function NewsletterEmailPreview({ data }: { data: EmailTemplateData }) {
  const html = generateEmailHtml(data);
  return (
    <div className="bg-[#f4f4f7] p-4 rounded-lg">
      <iframe
        srcDoc={html}
        title="Newsletter Email Preview"
        className="w-full border-0 rounded-lg"
        style={{ minHeight: 800, maxWidth: 640, margin: "0 auto", display: "block" }}
      />
    </div>
  );
}
