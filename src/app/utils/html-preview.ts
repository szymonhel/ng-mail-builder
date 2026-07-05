import { EmailDoc, Block } from '../models/email-doc.model';
import { defaultVariableValues, evaluateCondition } from './template-vars';

function blockToHtml(b: Block): string {
  switch (b.type) {
    case 'text': {
      const p = b.props as any;
      return `<div style="text-align:${p.align};font-size:${p.fontSize}px;color:${p.color};padding:${p.padding};font-family:inherit">${p.html}</div>`;
    }
    case 'image': {
      const p = b.props as any;
      const img = `<img src="${p.src}" alt="${p.alt}" style="max-width:${p.width}px;width:100%;display:block;${p.align === 'center' ? 'margin:0 auto' : p.align === 'right' ? 'margin-left:auto' : ''}" />`;
      return `<div style="padding:${p.padding}">${p.href ? `<a href="${p.href}">${img}</a>` : img}</div>`;
    }
    case 'button': {
      const p = b.props as any;
      return `<div style="text-align:${p.align};padding:${p.padding}"><a href="${p.href}" style="display:inline-block;background:${p.bg};color:${p.color};text-decoration:none;padding:12px 24px;border-radius:${p.borderRadius}px;font-weight:bold">${p.label}</a></div>`;
    }
    case 'divider': {
      const p = b.props as any;
      return `<div style="padding:${p.padding}"><hr style="border:none;border-top:${p.borderWidth}px solid ${p.borderColor};margin:0" /></div>`;
    }
    case 'spacer': {
      const p = b.props as any;
      return `<div style="height:${p.height}px"></div>`;
    }
    case 'heading': {
      const p = b.props as any;
      const sizes: Record<number, string> = { 1: '28px', 2: '22px', 3: '18px' };
      const tag = `h${p.level}`;
      return `<${tag} style="margin:0;text-align:${p.align};font-size:${sizes[p.level]};color:${p.color};font-weight:700;line-height:1.2;padding:${p.padding};font-family:inherit">${p.text}</${tag}>`;
    }
    case 'social': {
      const p = b.props as any;
      const colors: Record<string, string> = { facebook: '#1877F2', instagram: '#E4405F', twitter: '#000', linkedin: '#0A66C2', youtube: '#FF0000', tiktok: '#010101', pinterest: '#E60023', github: '#24292E', discord: '#5865F2', reddit: '#FF4500', whatsapp: '#25D366', telegram: '#2CA5E0' };
      const labels: Record<string, string> = { facebook: 'f', instagram: 'ig', twitter: 'X', linkedin: 'in', youtube: '▶', tiktok: 'TT', pinterest: 'P', github: 'GH', discord: 'DC', reddit: 'r/', whatsapp: 'WA', telegram: 'TG' };
      const icons = p.links.filter((l: any) => l.href).map((l: any) => {
        const size = p.iconSize;
        return `<a href="${l.href}" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:${size/2}px;background:${colors[l.platform]};color:#fff;font-size:${Math.round(size*0.38)}px;font-weight:bold;text-decoration:none;margin:0 4px;font-family:Arial,sans-serif">${labels[l.platform]}</a>`;
      }).join('');
      return `<div style="text-align:${p.align};padding:${p.padding}">${icons}</div>`;
    }
    case 'video': {
      const p = b.props as any;
      const ml = p.align === 'center' ? 'margin:0 auto' : p.align === 'right' ? 'margin-left:auto' : 'margin:0';
      return `<div style="padding:${p.padding}"><a href="${p.videoUrl}" style="position:relative;display:block;max-width:${p.width}px;${ml}"><img src="${p.thumbnailUrl}" alt="${p.alt}" style="width:100%;display:block;border-radius:4px" /><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;background:rgba(0,0,0,0.65);border-radius:50%;display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;border-left:18px solid white;margin-left:4px"></div></div></a></div>`;
    }
    case 'html': {
      const p = b.props as any;
      return `<div style="padding:${p.padding}">${p.html}</div>`;
    }
    case 'hero': {
      const p = b.props as any;
      const bgStyle = p.backgroundUrl
        ? `background:url('${p.backgroundUrl}') center/cover no-repeat;background-color:${p.backgroundColor}`
        : `background:${p.backgroundColor}`;
      const justify = p.verticalAlign === 'top' ? 'flex-start' : p.verticalAlign === 'bottom' ? 'flex-end' : 'center';
      const subtitle = p.subtitle ? `<div style="color:${p.subtitleColor};font-size:16px;margin-bottom:20px">${p.subtitle}</div>` : '';
      const button = p.buttonLabel ? `<a href="${p.buttonHref}" style="display:inline-block;background:${p.buttonBg};color:${p.buttonColor};padding:12px 28px;border-radius:${p.buttonBorderRadius ?? 3}px;font-weight:bold;text-decoration:none;font-size:15px">${p.buttonLabel}</a>` : '';
      return `<div style="position:relative;min-height:${p.height};${bgStyle};display:flex;flex-direction:column;align-items:center;justify-content:${justify};padding:${p.padding};box-sizing:border-box"><div style="position:absolute;inset:0;background:rgba(0,0,0,0.35)"></div><div style="position:relative;text-align:center;width:100%"><div style="color:${p.titleColor};font-size:${p.titleSize}px;font-weight:700;line-height:1.2;margin-bottom:12px">${p.title}</div>${subtitle}${button}</div></div>`;
    }
    case 'table': {
      const p = b.props as any;
      const cellBase = `border:1px solid ${p.borderColor};padding:8px 12px;font-size:${p.fontSize}px;color:${p.color};text-align:${p.align}`;
      const rows = p.rows.map((row: any, ri: number) => {
        const cells = row.cells.map((cell: string) =>
          (ri === 0 && p.hasHeader)
            ? `<th style="${cellBase};background:#f5f5f5;font-weight:600">${cell}</th>`
            : `<td style="${cellBase}">${cell}</td>`
        ).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<div style="padding:${p.padding};overflow-x:auto"><table style="width:100%;border-collapse:collapse">${rows}</table></div>`;
    }
    case 'accordion': {
      const p = b.props as any;
      const items = p.items.map((item: any) =>
        `<div style="border:1px solid ${p.borderColor};border-bottom:none"><div style="background:${p.titleBg};color:${p.titleColor};padding:10px 16px;font-weight:600;display:flex;justify-content:space-between"><span>${item.title}</span><span>▼</span></div><div style="padding:10px 16px;font-size:14px;color:#555;display:none">${item.content}</div></div>`
      ).join('') + (p.items.length ? `<div style="border-bottom:1px solid ${p.borderColor}"></div>` : '');
      return `<div style="padding:${p.padding}">${items}</div>`;
    }
    case 'navbar': {
      const p = b.props as any;
      const links = p.links.map((l: any) =>
        `<a href="${l.href}" style="color:${p.color};font-size:${p.fontSize}px;text-decoration:none;font-weight:500;padding:0 12px;display:inline-block">${l.label}</a>`
      ).join('');
      return `<div style="background:${p.backgroundColor};padding:${p.padding};text-align:${p.align}">${links}</div>`;
    }
    case 'carousel': {
      const p = b.props as any;
      const first = p.images[0];
      if (!first) return '';
      const img = `<img src="${first.src}" alt="${first.alt}" style="width:100%;display:block;border-radius:2px" />`;
      const dots = p.images.map((_: any, i: number) =>
        `<span style="width:8px;height:8px;border-radius:50%;background:${i === 0 ? '#1a73e8' : '#ccc'};display:inline-block;margin:0 3px"></span>`
      ).join('');
      return `<div style="padding:${p.padding}">${first.href ? `<a href="${first.href}">${img}</a>` : img}<div style="text-align:center;padding:8px 0">${dots}</div></div>`;
    }
  }
}

export function docToHtml(doc: EmailDoc, values?: Record<string, string>): string {
  const vals = values ?? defaultVariableValues(doc.variables);
  const rows = doc.rows
    .filter(row => evaluateCondition(row.condition, vals))
    .map(row => {
      const rowBg = row.backgroundColor ?? 'transparent';
      const cols = row.columns.map(col => {
        const blocks = col.blocks.filter(b => evaluateCondition(b.condition, vals))
          .map(b => `<div data-email-block-id="${b.id}">${blockToHtml(b)}</div>`).join('');
        const colBg = col.backgroundColor ?? 'transparent';
        return `<div style="flex:1;min-width:0;background:${colBg}">${blocks}</div>`;
      }).join('');
      return `<div style="display:flex;background:${rowBg};padding:${row.padding}">${cols}</div>`;
    }).join('');

  const border = doc.settings.bodyBorderWidth > 0
    ? `border: ${doc.settings.bodyBorderWidth}px ${doc.settings.bodyBorderStyle} ${doc.settings.bodyBorderColor};`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; background: ${doc.settings.backgroundColor}; font-family: ${doc.settings.fontFamily}; }
  .email-wrapper { max-width: ${doc.settings.contentWidth}px; margin: 0 auto; background: ${doc.settings.bodyColor}; ${border} box-sizing: border-box; }
  .email-block-highlight { outline: 2px solid #3b82f6; outline-offset: 2px; transition: outline-color 0.15s ease; }
</style>
</head>
<body>
<div class="email-wrapper">${rows}</div>
<script>
(function () {
  var current = null;
  function highlight(id, scroll) {
    if (current) {
      var prev = document.querySelector('[data-email-block-id="' + CSS.escape(current) + '"]');
      if (prev) prev.classList.remove('email-block-highlight');
    }
    current = id;
    if (id) {
      var el = document.querySelector('[data-email-block-id="' + CSS.escape(id) + '"]');
      if (el) {
        el.classList.add('email-block-highlight');
        if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'email-preview-highlight') highlight(e.data.blockId, e.data.scroll);
  });
})();
</script>
</body>
</html>`;
}
