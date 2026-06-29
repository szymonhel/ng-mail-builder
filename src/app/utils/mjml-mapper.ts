import { EmailDoc, Block } from '../models/email-doc.model';

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
  }
}

export function docToMjml(doc: EmailDoc): string {
  const rows = doc.rows.map(row => {
    const cols = row.columns.map(col => {
      const blocks = col.blocks.map(blockToMjml).join('\n        ');
      return `      <mj-column>\n        ${blocks}\n      </mj-column>`;
    }).join('\n');
    return `    <mj-section background-color="${row.backgroundColor}" padding="${row.padding}">\n${cols}\n    </mj-section>`;
  }).join('\n');

  return `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="${doc.settings.fontFamily}" />
      <mj-body background-color="${doc.settings.backgroundColor}" width="${doc.settings.contentWidth}px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="${doc.settings.backgroundColor}" width="${doc.settings.contentWidth}px">
${rows}
  </mj-body>
</mjml>`;
}
