export type BlockType = 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'heading' | 'social' | 'video' | 'html' | 'hero' | 'table' | 'accordion' | 'navbar' | 'carousel';

export interface DocSettings {
  contentWidth: number;
  backgroundColor: string;
  bodyColor: string;
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
  padding: string;
}

export interface TableRow {
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
}

export interface AccordionItem {
  title: string;
  content: string;
}

export interface AccordionProps {
  items: AccordionItem[];
  borderColor: string;
  titleBg: string;
  titleColor: string;
  padding: string;
}

export interface NavbarLink {
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
}

export interface EmailVariable {
  id: string;
  name: string;
  defaultValue: string;
}

export interface EmailDoc {
  version: number;
  settings: DocSettings;
  variables: EmailVariable[];
  rows: Row[];
}
