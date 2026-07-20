// JSON Schema + prompt for asking OpenAI to reconstruct an email template photo as an
// EmailDoc-shaped document (see src/app/models/email-doc.model.ts on the client). Kept as a
// hand-written mirror rather than a shared import since the server and Angular app are separate
// TS projects; if a block type/prop is added on the client, mirror it here too.
//
// Written for OpenAI's *strict* Structured Outputs mode, which is stricter than plain JSON
// Schema: every object needs `additionalProperties: false` and EVERY key in `properties` must
// also appear in `required` (there's no such thing as an optional field — fields that are
// conceptually optional are instead typed as nullable and always present).
//
// ids are deliberately NOT part of this schema: the client's normalizeImportedDoc() backfills
// them, so leaving them out avoids the model wasting effort inventing unique identifiers.

function obj(properties: Record<string, unknown>, description?: string) {
  return {
    type: 'object',
    ...(description ? { description } : {}),
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

const align = { type: 'string', enum: ['left', 'center', 'right'] };
const paddingProp = {
  type: 'string',
  description: 'CSS padding shorthand, e.g. "10px 25px" or "20px 25px 10px". Use "0px" for none.',
};
const colorProp = { type: 'string', description: 'Hex color, e.g. "#1a73e8".' };
const nullableColor = {
  type: ['string', 'null'],
  description: 'Hex color, or null to inherit the surrounding background.',
};

function block(type: string, description: string, props: Record<string, unknown>) {
  return obj(
    {
      type: { type: 'string', enum: [type] },
      props: obj(props),
    },
    description
  );
}

const BLOCK_SCHEMAS = [
  block('text', 'A paragraph of rich text / body copy.', {
    html: { type: 'string', description: 'Inline HTML, basic tags only: <p>, <b>, <i>, <a>, <br>.' },
    align, fontSize: { type: 'number' }, color: colorProp, padding: paddingProp,
  }),

  block('heading', 'A section heading / title text, larger and bolder than body text.', {
    text: { type: 'string' },
    level: { type: 'number', enum: [1, 2, 3], description: '1 = largest.' },
    align, color: colorProp, padding: paddingProp,
  }),

  block('image', 'A standalone image, optionally a link.', {
    src: { type: 'string', description: 'Image URL. Use "https://placehold.co/<w>x<h>" as a placeholder if the real asset URL is unknown.' },
    alt: { type: 'string' },
    width: { type: 'number', description: 'Pixel width.' },
    align,
    href: { type: 'string', description: 'Link URL when the image is clickable, or "" for none.' },
    padding: paddingProp,
  }),

  block('button', 'A call-to-action button.', {
    label: { type: 'string' },
    href: { type: 'string' },
    bg: colorProp,
    color: colorProp,
    align,
    borderRadius: { type: 'number' },
    padding: paddingProp,
  }),

  block('divider', 'A thin horizontal rule separating sections.', {
    borderColor: colorProp,
    borderWidth: { type: 'number' },
    padding: paddingProp,
  }),

  block('spacer', 'Empty vertical space with no visible content.', {
    height: { type: 'number', description: 'Pixel height.' },
  }),

  block('video', 'A clickable video thumbnail (renders as a static image linking out, not an embedded player).', {
    thumbnailUrl: { type: 'string' },
    videoUrl: { type: 'string' },
    alt: { type: 'string' },
    width: { type: 'number' },
    align, padding: paddingProp,
  }),

  block(
    'hero',
    'A full-width banner/masthead section: background image or color, with an optional overlaid title, subtitle, and CTA button. Use this for the top banner of an email instead of composing image+heading+button separately.',
    {
      backgroundUrl: { type: 'string' },
      backgroundColor: colorProp,
      backgroundWidth: { type: 'string', description: 'CSS width, e.g. "600px".' },
      backgroundHeight: { type: 'string', description: 'CSS height, e.g. "400px".' },
      height: { type: 'string', description: 'CSS height, e.g. "400px".' },
      verticalAlign: { type: 'string', enum: ['top', 'middle', 'bottom'] },
      title: { type: 'string' },
      titleColor: colorProp,
      titleSize: { type: 'number' },
      subtitle: { type: 'string' },
      subtitleColor: colorProp,
      buttonLabel: { type: 'string', description: 'Empty string to omit the button.' },
      buttonHref: { type: 'string' },
      buttonBg: colorProp,
      buttonColor: colorProp,
      padding: paddingProp,
    }
  ),

  block('table', 'A simple data table (e.g. an order/booking summary).', {
    rows: {
      type: 'array',
      items: obj({ cells: { type: 'array', items: { type: 'string' } } }),
    },
    hasHeader: { type: 'boolean', description: 'True if the first row is a header row.' },
    align, color: colorProp, fontSize: { type: 'number' }, borderColor: colorProp, padding: paddingProp,
  }),

  block('accordion', 'A list of expandable title/content items (e.g. an FAQ).', {
    items: {
      type: 'array',
      items: obj({ title: { type: 'string' }, content: { type: 'string' } }),
    },
    borderColor: colorProp, titleBg: colorProp, titleColor: colorProp, padding: paddingProp,
  }),

  block('navbar', 'A row of top-level text navigation links, typically at the very top of the email.', {
    links: {
      type: 'array',
      items: obj({ label: { type: 'string' }, href: { type: 'string' } }),
    },
    align, backgroundColor: colorProp, color: colorProp, fontSize: { type: 'number' }, padding: paddingProp,
  }),

  block('carousel', 'A horizontally scrollable set of images (renders as the first image with dots in most clients).', {
    images: {
      type: 'array',
      items: obj({ src: { type: 'string' }, alt: { type: 'string' }, href: { type: 'string' } }),
    },
    thumbnailWidth: { type: 'number' },
    padding: paddingProp,
  }),

  block(
    'social',
    'A row of social platform icons. Only use platforms actually visible in the photo.',
    {
      links: {
        type: 'array',
        items: obj({
          platform: {
            type: 'string',
            enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest', 'github', 'discord', 'reddit', 'whatsapp', 'telegram'],
          },
          href: { type: 'string' },
        }),
      },
      align, iconSize: { type: 'number' }, padding: paddingProp,
    }
  ),

  block(
    'html',
    'Escape hatch: raw HTML/CSS for content that genuinely does not fit any other block type (e.g. a complex illustration, an exact pixel-matched graphic). Prefer a typed block above whenever one applies — html content cannot be edited through the normal block inspector.',
    { html: { type: 'string' }, padding: paddingProp }
  ),
];

const rowSchema = obj(
  {
    backgroundColor: nullableColor,
    padding: paddingProp,
    columns: {
      type: 'array',
      description: 'Side-by-side columns within this row. Most rows have exactly one column; use multiple for side-by-side layouts.',
      items: obj({
        backgroundColor: nullableColor,
        blocks: { type: 'array', items: { anyOf: BLOCK_SCHEMAS } },
      }),
    },
  },
  'One horizontal section of the email, divided into one or more columns side by side.'
);

const emailDocShape = {
  version: { type: 'number', enum: [1] },
  settings: obj({
    contentWidth: { type: 'number', description: 'Overall email width in pixels, typically 600.' },
    backgroundColor: { type: 'string', description: 'Page background behind the email, e.g. "#f4f4f4".' },
    bodyColor: { type: 'string', description: 'Background of the email body itself, e.g. "#ffffff".' },
    fontFamily: { type: 'string', description: 'CSS font stack, e.g. "Arial, sans-serif".' },
    previewText: { type: 'string', description: 'Hidden inbox preview snippet; "" if not inferable.' },
    googleFontName: { type: 'string', description: 'Leave "" unless a distinctive Google Font is clearly used.' },
    googleFontUrl: { type: 'string', description: 'Leave "" unless googleFontName is set.' },
  }),
  variables: {
    type: 'array',
    description: 'Leave empty; not inferable from a photo.',
    items: obj({ name: { type: 'string' }, defaultValue: { type: 'string' } }),
  },
  rows: { type: 'array', items: rowSchema },
};

export const EMAIL_DOC_JSON_SCHEMA = obj(emailDocShape);

// Chat responses carry a short conversational reply alongside the document, so the UI can show
// something meaningful (an answer, a summary of what changed) instead of a canned string.
export const EMAIL_DOC_CHAT_JSON_SCHEMA = obj({
  reply: {
    type: 'string',
    description: 'A short conversational reply: answer the user’s question directly, or briefly summarize what you changed. 1-3 sentences, no markdown.',
  },
  doc: obj(emailDocShape, 'The current template. Identical to the "Current template JSON" you were given if this turn was just a question with no edit requested.'),
});

export const EMAIL_DOC_MOCKUP_SYSTEM_PROMPT = `You reconstruct email template designs from a photo or design document (image or PDF) as a structured document, so a user can continue editing it in a block-based email builder.

Rules:
- Break the design into rows (horizontal sections) and, within each row, one or more side-by-side columns, and within each column, an ordered list of blocks — top to bottom, matching the source.
- Always prefer the most specific typed block that fits (e.g. a banner with overlaid title/button is a single "hero" block, not separate image+heading+button blocks). Only use the "html" block as a last resort for content no typed block can represent, since html content loses inline editability.
- Match colors, alignment, and approximate font sizes from the source as closely as you can; when unsure, prefer the visually closest simple value over a highly specific guess.
- Preserve any links/URLs found in the source exactly as given — visible link text, printed URLs, or (for a PDF) actual embedded hyperlink annotations on buttons, images, or text — into the corresponding block's href field. Only fall back to a placeholder like "#" when no URL is discoverable for that element.
- Do not invent content that is not visibly present in the source. If text is illegible, use a short neutral placeholder rather than fabricating specifics.
- Respond only with the JSON document — no extra commentary.`;

export const EMAIL_DOC_BRIEF_SYSTEM_PROMPT = `You design an email template from a written brief (e.g. a PDF describing what the email should contain), using a fixed library of block types, so a user can continue editing it in a block-based email builder. Unlike reconstructing a photo, there is no visual reference to match — you are composing a new layout that serves the brief's content and intent.

Rules:
- Extract the concrete content the brief specifies — subject line, preview text, headings, body copy, calls-to-action and their links, tables of data, FAQ items, and so on — and use it verbatim or close to it. Don't paraphrase away specifics like prices, dates, or names given in the brief. In particular, preserve any URLs given in the brief exactly, into the matching block's href field, rather than substituting a placeholder like "#".
- Where the brief specifies structure or order, follow it. Where it doesn't, use your own judgment to produce a clean, conventional layout (e.g. hero banner, body copy, CTA button) from the block types below.
- Always prefer the most specific typed block that fits (e.g. a banner with overlaid title/button is a single "hero" block, not separate image+heading+button blocks). Only use the "html" block as a last resort, since html content loses inline editability.
- If the brief references an image or asset that isn't attached, use a placeholder image URL rather than omitting that block.
- Do not invent content unrelated to what the brief describes or implies.
- Respond only with the JSON document — no extra commentary.`;

export const EMAIL_DOC_CHAT_SYSTEM_PROMPT = `You help a user build and iteratively edit an email template through conversation, using a fixed library of block types, so they can continue editing it in a block-based email builder. Every response has two parts: a short conversational "reply", and the "doc" — the complete, current EmailDoc JSON document (never a partial diff or just the changed parts).

Rules:
- If the user asks a question or requests suggestions rather than an edit (e.g. "what else could I add?"), answer it directly in "reply" and return "doc" completely unchanged from the "Current template JSON" you were given.
- If the conversation includes a "Current template JSON" message and the user's latest message requests a change, apply exactly what they asked for in "doc" — leave every other row, column, block, and setting exactly as it was, and briefly summarize what you changed in "reply" (e.g. "Changed the button to green."). Do not regenerate or restyle parts of the template the user didn't mention.
- If there is no "Current template JSON" message, design a new template from scratch based on the conversation so far, optionally using an attached image (visual mockup to match) or PDF (either a mockup or a written brief) as reference, following the same content and layout judgment as reconstructing a photo or brief; briefly describe what you created in "reply".
- Always prefer the most specific typed block that fits (e.g. a banner with overlaid title/button is a single "hero" block, not separate image+heading+button blocks). Only use the "html" block as a last resort, since html content loses inline editability.
- Preserve any links/URLs the user or an attached file gives you exactly as given, into the corresponding block's href field.
- Do not invent content the user didn't ask for or that isn't present in an attached file.`;
