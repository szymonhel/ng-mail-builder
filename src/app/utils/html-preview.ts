import { EmailDoc, Block } from '../models/email-doc.model';

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
  }
}

export function docToHtml(doc: EmailDoc): string {
  const rows = doc.rows.map(row => {
    const blocks = row.columns.flatMap(col => col.blocks).map(blockToHtml).join('');
    return `<div style="background:${row.backgroundColor};padding:${row.padding}">${blocks}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; background: ${doc.settings.backgroundColor}; font-family: ${doc.settings.fontFamily}; }
  .email-wrapper { max-width: ${doc.settings.contentWidth}px; margin: 0 auto; background: ${doc.settings.bodyColor}; }
</style>
</head>
<body>
<div class="email-wrapper">${rows}</div>
</body>
</html>`;
}
