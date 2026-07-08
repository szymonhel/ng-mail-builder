export type BlockType = 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'heading' | 'social' | 'video' | 'html' | 'hero' | 'table' | 'accordion' | 'navbar' | 'carousel';

export type BorderStyle = 'solid' | 'dashed' | 'dotted';

export interface DocSettings {
  contentWidth: number;
  backgroundColor: string;
  bodyColor: string;
  bodyBorderWidth: number;
  bodyBorderColor: string;
  bodyBorderStyle: BorderStyle;
  fontFamily: string;
  previewText: string;
  googleFontName: string;
  googleFontUrl: string;
}

export interface TextProps {
  html: string;
  align: 'left' | 'center' | 'right';
  fontSize: number;
  color: string;
  padding: string;
}

export interface ImageProps {
  src: string;
  alt: string;
  width: number;
  align: 'left' | 'center' | 'right';
  href: string;
  padding: string;
}

export interface ButtonProps {
  label: string;
  href: string;
  bg: string;
  color: string;
  align: 'left' | 'center' | 'right';
  borderRadius: number;
  padding: string;
}

export interface DividerProps {
  borderColor: string;
  borderWidth: number;
  padding: string;
}

export interface SpacerProps {
  height: number;
}

export interface HeadingProps {
  text: string;
  level: 1 | 2 | 3;
  align: 'left' | 'center' | 'right';
  color: string;
  padding: string;
}

export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'pinterest' | 'github' | 'discord' | 'reddit' | 'whatsapp' | 'telegram';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  href: string;
  // Overrides MJML's built-in icon; required for platforms MJML doesn't ship an icon for
  // (tiktok, discord, reddit, whatsapp, telegram) since those otherwise render as broken images.
  iconUrl?: string;
}

export interface SocialProps {
  links: SocialLink[];
  align: 'left' | 'center' | 'right';
  iconSize: number;
  padding: string;
}

export interface VideoProps {
  thumbnailUrl: string;
  videoUrl: string;
  alt: string;
  width: number;
  align: 'left' | 'center' | 'right';
  padding: string;
}

export interface HtmlProps {
  html: string;
  padding: string;
}

export interface HeroProps {
  backgroundUrl: string;
  backgroundColor: string;
  backgroundWidth: string;
  backgroundHeight: string;
  height: string;
  verticalAlign: 'top' | 'middle' | 'bottom';
  title: string;
  titleColor: string;
  titleSize: number;
  subtitle: string;
  subtitleColor: string;
  buttonLabel: string;
  buttonHref: string;
  buttonBg: string;
  buttonColor: string;
  buttonBorderRadius: number;
  padding: string;
}

export interface TableRow {
  id: string;
  cells: string[];
}

export interface TableProps {
  rows: TableRow[];
  hasHeader: boolean;
  align: 'left' | 'center' | 'right';
  color: string;
  fontSize: number;
  borderColor: string;
  padding: string;
  // When set, the header row (if hasHeader) stays fixed and the remaining rows act
  // as a template rendered once per item of the collection (see RowRepeat).
  repeat?: RowRepeat | null;
}

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

export interface AccordionProps {
  items: AccordionItem[];
  borderColor: string;
  titleBg: string;
  titleColor: string;
  padding: string;
  // When set, the defined items act as a template rendered once per item of the
  // collection (see RowRepeat).
  repeat?: RowRepeat | null;
}

export interface NavbarLink {
  id: string;
  label: string;
  href: string;
}

export interface NavbarProps {
  links: NavbarLink[];
  align: 'left' | 'center' | 'right';
  backgroundColor: string;
  color: string;
  fontSize: number;
  padding: string;
}

export interface CarouselImage {
  id: string;
  src: string;
  alt: string;
  href: string;
}

export interface CarouselProps {
  images: CarouselImage[];
  thumbnailWidth: number;
  padding: string;
}

export type ConditionOperator = 'isSet' | 'isNotSet' | 'equals' | 'notEquals';

export interface VisibilityCondition {
  variableName: string;
  operator: ConditionOperator;
  // only used by the equals/notEquals operators
  value?: string;
}

// Repeats a row once per item of the named collection. Inside the repeated row,
// {{collectionName.field}} tokens resolve to the current item's field values.
export interface RowRepeat {
  collectionName: string;
}

export interface Block {
  id: string;
  type: BlockType;
  props: TextProps | ImageProps | ButtonProps | DividerProps | SpacerProps | HeadingProps | SocialProps | VideoProps | HtmlProps | HeroProps | TableProps | AccordionProps | NavbarProps | CarouselProps;
  // null/undefined = always render; otherwise this block is dropped from output
  // (MJML/HTML/preview) whenever the condition evaluates to false
  condition?: VisibilityCondition | null;
}

export interface Column {
  id: string;
  blocks: Block[];
  // null = no background of its own; groups whatever's in this column visually,
  // independent of sibling columns and the row's own background (mj-column background-color)
  backgroundColor?: string | null;
}

export interface Row {
  id: string;
  // null = inherit the document's page background instead of an explicit color
  backgroundColor: string | null;
  padding: string;
  columns: Column[];
  // same semantics as Block.condition, but drops the whole row/section
  condition?: VisibilityCondition | null;
  // null/undefined = render once; otherwise the row is expanded at render time,
  // once per item of the referenced collection (see RowRepeat)
  repeat?: RowRepeat | null;
}

export interface EmailVariable {
  id: string;
  name: string;
  defaultValue: string;
}

// An array-typed part of the email's data contract: a named list of items whose
// shape is `fields`. `sampleItems` plays the same role as EmailVariable.defaultValue —
// it fills the preview and in-editor sends; a future send endpoint provides real items.
export interface EmailCollection {
  id: string;
  name: string;
  fields: string[];
  sampleItems: Record<string, string>[];
}

export interface Locale {
  id: string;
  // free text, e.g. 'es', 'fr-CA' — not validated against ISO/BCP-47
  code: string;
  // display name, e.g. 'Spanish'
  label: string;
}

// fieldKey -> override value. Missing key or '' means "fall back to source value".
export type TranslationMap = Record<string, string>;

export interface EmailDoc {
  version: number;
  settings: DocSettings;
  variables: EmailVariable[];
  // optional so docs saved before collections existed still load; treat missing as []
  collections?: EmailCollection[];
  rows: Row[];
  locales: Locale[];
  translations: Record<string /* localeId */, TranslationMap>;
}
