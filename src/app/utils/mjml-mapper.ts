import { EmailDoc, Block, Row, Column, DocSettings, SocialPlatform, BorderStyle } from '../models/email-doc.model';
import { defaultVariableValues, evaluateCondition } from './template-vars';
import { uid } from './id.utils';

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
    // A hero alone in its row renders via the cleaner top-level heroToMjml path (see
    // rowToMjml); mixed with siblings it still renders here so it's never silently dropped.
    case 'hero': return heroToMjml(b);
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
  const button = p.buttonLabel ? `\n      <mj-button href="${p.buttonHref}" background-color="${p.buttonBg}" color="${p.buttonColor}" border-radius="${p.buttonBorderRadius ?? 3}px">${p.buttonLabel}</mj-button>` : '';
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

export function docToMjml(doc: EmailDoc, values?: Record<string, string>): string {
  const vals = values ?? defaultVariableValues(doc.variables);
  const visibleRows = doc.rows
    .filter(row => evaluateCondition(row.condition, vals))
    .map(row => ({
      ...row,
      columns: row.columns.map(col => ({ ...col, blocks: col.blocks.filter(b => evaluateCondition(b.condition, vals)) })),
    }));
  const rows = visibleRows.map(row => rowToMjml(row)).join('\n');

  const previewMjml = doc.settings.previewText
    ? `\n    <mj-preview>${doc.settings.previewText}</mj-preview>`
    : '';

  const fontMjml = (doc.settings.googleFontName && doc.settings.googleFontUrl)
    ? `\n    <mj-font name="${doc.settings.googleFontName}" href="${doc.settings.googleFontUrl}" />`
    : '';

  const border = doc.settings.bodyBorderWidth > 0
    ? ` border="${doc.settings.bodyBorderWidth}px ${doc.settings.bodyBorderStyle} ${doc.settings.bodyBorderColor}"`
    : '';

  return `<mjml>
  <mj-head>${fontMjml}
    <mj-attributes>
      <mj-all font-family="${doc.settings.fontFamily}" />
      <mj-body background-color="${doc.settings.backgroundColor}" width="${doc.settings.contentWidth}px" />
    </mj-attributes>${previewMjml}
  </mj-head>
  <mj-body background-color="${doc.settings.backgroundColor}" width="${doc.settings.contentWidth}px">
    <mj-wrapper background-color="${doc.settings.bodyColor}"${border}>
${rows}
    </mj-wrapper>
  </mj-body>
</mjml>`;
}

// --- MJML -> EmailDoc -------------------------------------------------------------
// Reverse of docToMjml above. Parses with the strict XML parser (rather than the
// browser's lenient HTML parser) because self-closing tags like <mj-image ... /> only
// stay self-closed under XML rules; under HTML parsing rules unknown elements aren't
// void, so everything after them would get swallowed as their children. This means
// hand-written MJML with unescaped HTML (stray <br>, unescaped "&", etc.) may fail to
// parse — that's an accepted limitation in exchange for faithfully round-tripping
// whatever docToMjml itself produced.
//
// Note: MJML has no dedicated "heading" or "video" tag, so both a `heading` block and a
// plain `text` block compile to the same <mj-text>, and a `video` block compiles to the
// same <mj-image href="..."> as an image-with-link. Re-imported MJML can't tell these
// apart, so both always come back as `text`/`image` blocks respectively.

function attr(el: Element | null | undefined, name: string, fallback = ''): string {
  return el?.getAttribute(name) ?? fallback;
}

function intAttr(el: Element | null | undefined, name: string, fallback: number): number {
  const raw = el?.getAttribute(name);
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function alignAttr(el: Element | null | undefined, fallback: 'left' | 'center' | 'right'): 'left' | 'center' | 'right' {
  const raw = el?.getAttribute('align');
  return raw === 'left' || raw === 'center' || raw === 'right' ? raw : fallback;
}

// Parses MJML's border shorthand (e.g. "1px solid #dddddd") back into its parts.
// Falls back to "no border" for anything that isn't in that exact shape.
function parseBorder(value: string): { width: number; style: BorderStyle; color: string } {
  const [rawWidth, rawStyle, rawColor] = value.trim().split(/\s+/);
  const width = parseInt(rawWidth ?? '', 10);
  const style: BorderStyle = rawStyle === 'dashed' || rawStyle === 'dotted' ? rawStyle : 'solid';
  return {
    width: Number.isFinite(width) ? width : 0,
    style,
    color: rawColor ?? '#dddddd',
  };
}

function innerXml(el: Element): string {
  const serializer = new XMLSerializer();
  let out = '';
  el.childNodes.forEach(node => { out += serializer.serializeToString(node); });
  return out;
}

function children(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter(c => c.tagName.toLowerCase() === tag);
}

function heroElToBlock(el: Element): Block {
  const textEls = children(el, 'mj-text');
  const titleEl = textEls[0];
  const subtitleEl = textEls[1];
  const buttonEl = children(el, 'mj-button')[0];
  return {
    id: uid(),
    type: 'hero',
    props: {
      backgroundUrl: attr(el, 'background-url'),
      backgroundColor: attr(el, 'background-color', '#1a1a2e'),
      backgroundWidth: attr(el, 'background-width', '600px'),
      backgroundHeight: attr(el, 'background-height', '400px'),
      height: attr(el, 'height', '400px'),
      verticalAlign: (attr(el, 'vertical-align', 'middle') as 'top' | 'middle' | 'bottom'),
      title: titleEl ? innerXml(titleEl).trim() : '',
      titleColor: attr(titleEl, 'color', '#ffffff'),
      titleSize: intAttr(titleEl, 'font-size', 32),
      subtitle: subtitleEl ? innerXml(subtitleEl).trim() : '',
      subtitleColor: attr(subtitleEl, 'color', '#eeeeee'),
      buttonLabel: buttonEl ? innerXml(buttonEl).trim() : '',
      buttonHref: attr(buttonEl, 'href', '#'),
      buttonBg: attr(buttonEl, 'background-color', '#1a73e8'),
      buttonColor: attr(buttonEl, 'color', '#ffffff'),
      buttonBorderRadius: intAttr(buttonEl, 'border-radius', 3),
      padding: attr(el, 'padding', '40px 25px'),
    },
  };
}

function tableElToBlock(el: Element): Block {
  const tableEl = el.querySelector('table');
  const trEls = tableEl ? Array.from(tableEl.querySelectorAll('tr')) : [];
  const rows = trEls.map(tr => ({ id: uid(), cells: Array.from(tr.children).map(cell => cell.textContent ?? '') }));
  const hasHeader = trEls.length > 0 && Array.from(trEls[0].children).some(c => c.tagName.toLowerCase() === 'th');
  const firstCellStyle = (trEls[0]?.children[0] as Element | undefined)?.getAttribute('style') ?? '';
  const borderMatch = firstCellStyle.match(/border:\s*1px solid ([^;]+)/);
  return {
    id: uid(),
    type: 'table',
    props: {
      rows,
      hasHeader,
      align: alignAttr(el, 'center'),
      color: attr(el, 'color', '#333333'),
      fontSize: intAttr(el, 'font-size', 14),
      borderColor: borderMatch ? borderMatch[1].trim() : '#dddddd',
      padding: attr(el, 'padding', '10px 25px'),
    },
  };
}

function accordionElToBlock(el: Element): Block {
  const borderAttr = attr(el, 'border', '1px solid #dddddd');
  const borderColorMatch = borderAttr.match(/solid\s+(.+)$/);
  let titleBg = '#f5f5f5';
  let titleColor = '#333333';
  const items = children(el, 'mj-accordion-element').map(itemEl => {
    const titleEl = children(itemEl, 'mj-accordion-title')[0];
    const textEl = children(itemEl, 'mj-accordion-text')[0];
    if (titleEl) {
      titleBg = attr(titleEl, 'background-color', titleBg);
      titleColor = attr(titleEl, 'color', titleColor);
    }
    return { id: uid(), title: titleEl ? innerXml(titleEl).trim() : '', content: textEl ? innerXml(textEl).trim() : '' };
  });
  return {
    id: uid(),
    type: 'accordion',
    props: { items, borderColor: borderColorMatch ? borderColorMatch[1].trim() : '#dddddd', titleBg, titleColor, padding: attr(el, 'padding', '10px 25px') },
  };
}

function navbarElToBlock(el: Element): Block {
  const linkEls = children(el, 'mj-navbar-link');
  const first = linkEls[0];
  const links = linkEls.map(l => ({ id: uid(), label: innerXml(l).trim(), href: attr(l, 'href', '#') }));
  return {
    id: uid(),
    type: 'navbar',
    props: {
      links,
      align: 'center',
      backgroundColor: '#ffffff',
      color: attr(first, 'color', '#333333'),
      fontSize: intAttr(first, 'font-size', 14),
      padding: attr(el, 'padding', '10px 25px'),
    },
  };
}

function carouselElToBlock(el: Element): Block {
  const images = children(el, 'mj-carousel-image').map(imgEl => ({
    id: uid(),
    src: attr(imgEl, 'src'),
    alt: attr(imgEl, 'alt'),
    href: attr(imgEl, 'href'),
  }));
  return {
    id: uid(),
    type: 'carousel',
    props: { images, thumbnailWidth: intAttr(el, 'tb-width', 100), padding: attr(el, 'padding', '0px') },
  };
}

function socialElToBlock(el: Element): Block {
  const links = children(el, 'mj-social-element').map(l => {
    const iconUrl = l.getAttribute('src');
    return { id: uid(), platform: attr(l, 'name') as any, href: attr(l, 'href'), ...(iconUrl ? { iconUrl } : {}) };
  });
  return {
    id: uid(),
    type: 'social',
    props: { links, align: alignAttr(el, 'center'), iconSize: intAttr(el, 'icon-size', 32), padding: attr(el, 'padding', '10px 25px') },
  };
}

function rawElToBlock(el: Element): Block {
  const divEl = el.querySelector(':scope > div');
  if (!divEl) return { id: uid(), type: 'html', props: { html: innerXml(el).trim(), padding: '10px 25px' } };
  const style = divEl.getAttribute('style') ?? '';
  const match = style.match(/padding:\s*([^;]+)/);
  return { id: uid(), type: 'html', props: { html: innerXml(divEl).trim(), padding: match ? match[1].trim() : '10px 25px' } };
}

function elementToBlock(el: Element): Block | null {
  switch (el.tagName.toLowerCase()) {
    case 'mj-text':
      return {
        id: uid(),
        type: 'text',
        props: {
          html: innerXml(el).trim(),
          align: alignAttr(el, 'left'),
          fontSize: intAttr(el, 'font-size', 14),
          color: attr(el, 'color', '#333333'),
          padding: attr(el, 'padding', '10px 25px'),
        },
      };
    case 'mj-image':
      return {
        id: uid(),
        type: 'image',
        props: {
          src: attr(el, 'src'),
          alt: attr(el, 'alt'),
          width: intAttr(el, 'width', 600),
          align: alignAttr(el, 'center'),
          href: attr(el, 'href'),
          padding: attr(el, 'padding', '10px 25px'),
        },
      };
    case 'mj-button':
      return {
        id: uid(),
        type: 'button',
        props: {
          label: el.textContent?.trim() ?? '',
          href: attr(el, 'href', '#'),
          bg: attr(el, 'background-color', '#1a73e8'),
          color: attr(el, 'color', '#ffffff'),
          align: alignAttr(el, 'center'),
          borderRadius: intAttr(el, 'border-radius', 3),
          padding: attr(el, 'padding', '10px 25px'),
        },
      };
    case 'mj-divider':
      return {
        id: uid(),
        type: 'divider',
        props: {
          borderColor: attr(el, 'border-color', '#dddddd'),
          borderWidth: intAttr(el, 'border-width', 1),
          padding: attr(el, 'padding', '10px 25px'),
        },
      };
    case 'mj-spacer':
      return { id: uid(), type: 'spacer', props: { height: intAttr(el, 'height', 20) } };
    case 'mj-social': return socialElToBlock(el);
    case 'mj-raw': return rawElToBlock(el);
    case 'mj-hero': return heroElToBlock(el);
    case 'mj-table': return tableElToBlock(el);
    case 'mj-accordion': return accordionElToBlock(el);
    case 'mj-navbar': return navbarElToBlock(el);
    case 'mj-carousel': return carouselElToBlock(el);
    default: return null;
  }
}

function columnElToColumn(el: Element): Column {
  const blocks = Array.from(el.children).map(elementToBlock).filter((b): b is Block => b !== null);
  return { id: uid(), backgroundColor: el.getAttribute('background-color') || null, blocks };
}

function elementToRow(el: Element): Row | null {
  const tag = el.tagName.toLowerCase();
  if (tag === 'mj-hero') {
    return { id: uid(), backgroundColor: null, padding: '0px', columns: [{ id: uid(), blocks: [heroElToBlock(el)] }] };
  }
  if (tag !== 'mj-section') return null;
  const columns = children(el, 'mj-column').map(columnElToColumn);
  if (columns.length === 0) return null;
  return { id: uid(), backgroundColor: el.getAttribute('background-color') || null, padding: attr(el, 'padding', '0px'), columns };
}

function parseSettingsFromHead(headEl: Element | null, bodyEl: Element): DocSettings {
  const attributesEl = headEl ? children(headEl, 'mj-attributes')[0] : undefined;
  const allEl = attributesEl ? children(attributesEl, 'mj-all')[0] : undefined;
  const attrBodyEl = attributesEl ? children(attributesEl, 'mj-body')[0] : undefined;
  const fontEl = headEl ? children(headEl, 'mj-font')[0] : undefined;
  const previewEl = headEl ? children(headEl, 'mj-preview')[0] : undefined;
  const wrapperEl = children(bodyEl, 'mj-wrapper')[0];
  const border = parseBorder(attr(wrapperEl, 'border', ''));

  return {
    contentWidth: intAttr(attrBodyEl, 'width', intAttr(bodyEl, 'width', 600)),
    backgroundColor: attr(attrBodyEl, 'background-color') || attr(bodyEl, 'background-color', '#f4f4f4'),
    bodyColor: attr(wrapperEl, 'background-color', '#ffffff'),
    bodyBorderWidth: border.width,
    bodyBorderColor: border.color,
    bodyBorderStyle: border.style,
    fontFamily: attr(allEl, 'font-family', 'Arial, sans-serif'),
    previewText: previewEl?.textContent?.trim() ?? '',
    googleFontName: attr(fontEl, 'name'),
    googleFontUrl: attr(fontEl, 'href'),
  };
}

export function mjmlToDoc(mjmlSource: string): EmailDoc {
  const xml = new DOMParser().parseFromString(mjmlSource, 'text/xml');
  if (xml.querySelector('parsererror')) {
    throw new Error('That file is not well-formed MJML/XML.');
  }
  const mjmlEl = xml.querySelector('mjml');
  if (!mjmlEl) throw new Error('Not a valid MJML document: missing an <mjml> root element.');
  const bodyEl = children(mjmlEl, 'mj-body')[0];
  if (!bodyEl) throw new Error('Not a valid MJML document: missing an <mj-body> element.');
  const headEl = children(mjmlEl, 'mj-head')[0] ?? null;

  const settings = parseSettingsFromHead(headEl, bodyEl);
  const wrapper = children(bodyEl, 'mj-wrapper')[0] ?? bodyEl;
  const rows = Array.from(wrapper.children)
    .filter(el => ['mj-section', 'mj-hero'].includes(el.tagName.toLowerCase()))
    .map(elementToRow)
    .filter((r): r is Row => r !== null);

  return { version: 2, settings, variables: [], locales: [], translations: {}, rows };
}
