export type BlockType = 'text' | 'image' | 'button' | 'divider' | 'spacer';

export interface DocSettings {
  contentWidth: number;
  backgroundColor: string;
  bodyColor: string;
  fontFamily: string;
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

export interface Block {
  id: string;
  type: BlockType;
  props: TextProps | ImageProps | ButtonProps | DividerProps | SpacerProps;
}

export interface Column {
  id: string;
  blocks: Block[];
}

export interface Row {
  id: string;
  backgroundColor: string;
  padding: string;
  columns: Column[];
}

export interface EmailDoc {
  version: number;
  settings: DocSettings;
  rows: Row[];
}
