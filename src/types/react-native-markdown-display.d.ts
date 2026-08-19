declare module 'react-native-markdown-display' {
  import { ComponentType, ReactNode } from 'react';

  export interface ASTNode {
    key: string;
    type: string;
    content?: string;
    children?: ASTNode[];
    [key: string]: any;
  }

  export type RenderRule = (
    node: ASTNode,
    children: ReactNode[] | null,
    parent: ASTNode[] | null,
    styles: { [key: string]: any },
    inheritedStyles?: { [key: string]: any }
  ) => ReactNode;

  export interface MarkdownProps {
    children: string;
    style?: { [key: string]: any };
    mergeStyle?: boolean;
    rules?: { [key: string]: RenderRule };
    onLinkPress?: (url: string) => boolean;
  }

  const Markdown: ComponentType<MarkdownProps>;
  export default Markdown;
}