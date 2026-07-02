import { EmailDoc, Block, Row, SocialPlatform } from '../models/email-doc.model';

// MJML's mj-social ships built-in icons/colors only for a fixed set of networks. These
// platforms aren't in that set, so without an explicit background-color they'd render
// with no color at all (see mjml-social's defaultSocialNetworks list).
const FALLBACK_SOCIAL_COLORS: Partial<Record<SocialPlatform, string>> = {
  tiktok: '#000000',
  discord: '#5865f2',
  reddit: '#ff4500',
  whatsapp: '#25d366',
  telegram: '#229ed9',
};

function blockToMjml(b: Block): string {
  switch (b.type) {
    case 'text': {
      const p = b.props as any;
      return `<mj-text align="${p.align}" font-size="${p.fontSize}px" color="${p.color}" padding="${p.padding}">${p.html}</mj-text>`;
    }
    case 'image': {
      const p = b.props as any;
      const href = p.href ? ` href="${p.href}"` : '';
      return `<mj-image src="${p.src}" alt="${p.alt}" width="${p.width}px" align="${p.align}" padding="${p.padding}"${href} />`;
    }
    case 'button': {
      const p = b.props as any;
      return `<mj-button href="${p.href}" background-color="${p.bg}" color="${p.color}" align="${p.align}" border-radius="${p.borderRadius}px" padding="${p.padding}">${p.label}</mj-button>`;
    }
    case 'divider': {
      const p = b.props as any;
      return `<mj-divider border-color="${p.borderColor}" border-width="${p.borderWidth}px" padding="${p.padding}" />`;
    }
    case 'spacer': {
      const p = b.props as any;
      return `<mj-spacer height="${p.height}px" />`;
    }
    case 'heading': {
      const p = b.props as any;
      const sizes: Record<number, string> = { 1: '28px', 2: '22px', 3: '18px' };
      const size = sizes[p.level] ?? '22px';
      return `<mj-text align="${p.align}" font-size="${size}" color="${p.color}" padding="${p.padding}" font-weight="700">${p.text}</mj-text>`;
    }
    case 'social': {
      const p = b.props as any;
      const els = p.links.filter((l: any) => l.href).map((l: any) => {
        const src = l.iconUrl ? ` src="${l.iconUrl}"` : '';
        const fallbackColor = FALLBACK_SOCIAL_COLORS[l.platform as SocialPlatform];
        const bg = fallbackColor ? ` background-color="${fallbackColor}"` : '';
        return `<mj-social-element name="${l.platform}" href="${l.href}"${src}${bg}></mj-social-element>`;
      }).join('\n          ');
      return `<mj-social align="${p.align}" icon-size="${p.iconSize}px" padding="${p.padding}">\n          ${els}\n        </mj-social>`;
    }
    case 'video': {
      const p = b.props as any;
      return `<mj-image src="${p.thumbnailUrl}" alt="${p.alt}" width="${p.width}px" align="${p.align}" padding="${p.padding}" href="${p.videoUrl}" />`;
    }
    case 'html': {
      const p = b.props as any;
      return `<mj-raw><div style="padding:${p.padding}">${p.html}</div></mj-raw>`;
    }
    case 'hero': return ''; // handled at row level by heroToMjml
    case 'table': {
      const p = b.props as any;
      const rows = p.rows.map((row: any, ri: number) => {
        const cells = row.cells.map((cell: string) =>
          (ri === 0 && p.hasHeader)
            ? `<th style="font-size: ${p.fontSize}px;border:1px solid ${p.borderColor};padding:8px 12px;background:#f5f5f5;font-weight:600">${cell}</th>`
            : `<td style="font-size: ${p.fontSize}px;border:1px solid ${p.borderColor};padding:8px 12px">${cell}</td>`
        ).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<mj-table align="${p.align}" color="${p.color}" font-size="${p.fontSize}px" padding="${p.padding}" cellpadding="0" cellspacing="0"><table style="border-collapse:collapse;width:100%">${rows}</table></mj-table>`;
    }
    case 'accordion': {
      const p = b.props as any;
      const els = p.items.map((item: any) =>
        `<mj-accordion-element>
            <mj-accordion-title background-color="${p.titleBg}" color="${p.titleColor}">${item.title}</mj-accordion-title>
            <mj-accordion-text>${item.content}</mj-accordion-text>
          </mj-accordion-element>`
      ).join('\n          ');
      return `<mj-accordion padding="${p.padding}" border="1px solid ${p.borderColor}">\n          ${els}\n        </mj-accordion>`;
    }
    case 'navbar': {
      const p = b.props as any;
      const links = p.links.map((l: any) =>
        `<mj-navbar-link href="${l.href}" color="${p.color}" font-size="${p.fontSize}px">${l.label}</mj-navbar-link>`
      ).join('\n          ');
      return `<mj-navbar>\n          ${links}\n        </mj-navbar>`;
    }
    case 'carousel': {
      const p = b.props as any;
      const images = p.images.map((img: any) => {
        const href = img.href ? ` href="${img.href}"` : '';
        return `<mj-carousel-image src="${img.src}" alt="${img.alt}"${href} />`;
      }).join('\n          ');
      return `<mj-carousel padding="${p.padding}" tb-width="${p.thumbnailWidth}px">\n          ${images}\n        </mj-carousel>`;
    }
  }
}

function heroToMjml(b: Block): string {
  const p = b.props as any;
  const subtitle = p.subtitle ? `\n      <mj-text align="center" color="${p.subtitleColor}" font-size="16px" padding="0 25px 16px">${p.subtitle}</mj-text>` : '';
  const button = p.buttonLabel ? `\n      <mj-button href="${p.buttonHref}" background-color="${p.buttonBg}" color="${p.buttonColor}">${p.buttonLabel}</mj-button>` : '';
  return `    <mj-hero mode="fixed-height" height="${p.height}" background-width="${p.backgroundWidth}" background-height="${p.backgroundHeight}" background-url="${p.backgroundUrl}" background-color="${p.backgroundColor}" vertical-align="${p.verticalAlign}" padding="${p.padding}">
      <mj-text align="center" color="${p.titleColor}" font-size="${p.titleSize}px" font-weight="700" padding="0 25px 12px">${p.title}</mj-text>${subtitle}${button}
    </mj-hero>`;
}

function rowToMjml(row: Row): string {
  // Hero: single block of type hero → output mj-hero instead of section
  if (row.columns.length === 1 && row.columns[0].blocks.length === 1 && row.columns[0].blocks[0].type === 'hero') {
    return heroToMjml(row.columns[0].blocks[0]);
  }
  // Navbar: section needs full-width attribute
  const hasNavbar = row.columns.some(c => c.blocks.some(b => b.type === 'navbar'));
  const fullWidth = hasNavbar ? ' full-width="full-width"' : '';
  const cols = row.columns.map(col => {
    const blocks = col.blocks.map(blockToMjml).join('\n        ');
    // No explicit background-color when unset: groups the column's own elements
    // together visually, independent of sibling columns and the row's background.
    const colBg = col.backgroundColor ? ` background-color="${col.backgroundColor}"` : '';
    return `      <mj-column${colBg}>\n        ${blocks}\n      </mj-column>`;
  }).join('\n');
  // No explicit background-color when unset: the section stays transparent so the
  // mj-wrapper's body background (set to doc.settings.bodyColor) shows through.
  const bg = row.backgroundColor ? ` background-color="${row.backgroundColor}"` : '';
  return `    <mj-section${bg} padding="${row.padding}"${fullWidth}>\n${cols}\n    </mj-section>`;
}

export function docToMjml(doc: EmailDoc): string {
  const rows = doc.rows.map(row => rowToMjml(row)).join('\n');

  const previewMjml = doc.settings.previewText
    ? `\n    <mj-preview>${doc.settings.previewText}</mj-preview>`
    : '';

  const fontMjml = (doc.settings.googleFontName && doc.settings.googleFontUrl)
    ? `\n    <mj-font name="${doc.settings.googleFontName}" href="${doc.settings.googleFontUrl}" />`
    : '';

  return `<mjml>
  <mj-head>${fontMjml}
    <mj-attributes>
      <mj-all font-family="${doc.settings.fontFamily}" />
      <mj-body background-color="${doc.settings.backgroundColor}" width="${doc.settings.contentWidth}px" />
    </mj-attributes>${previewMjml}
  </mj-head>
  <mj-body background-color="${doc.settings.backgroundColor}" width="${doc.settings.contentWidth}px">
    <mj-wrapper background-color="${doc.settings.bodyColor}">
${rows}
    </mj-wrapper>
  </mj-body>
</mjml>`;
}
