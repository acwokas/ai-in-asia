import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface ImageFigureOptions {
  HTMLAttributes: Record<string, any>;
  uploadFn?: (file: File) => Promise<string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageFigure: {
      insertImageFigure: (attrs: {
        src: string;
        alt?: string;
        title?: string;
        caption?: string;
        size?: 'small' | 'medium' | 'large';
      }) => ReturnType;
    };
  }
}

export const ImageFigure = Node.create<ImageFigureOptions>({
  name: 'imageFigure',
  group: 'block',
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      uploadFn: undefined,
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      title: { default: '' },
      caption: { default: '' },
      size: { default: 'large' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const img = el.querySelector('img');
          if (!img) return false;
          const figcaption = el.querySelector('figcaption');
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') || '',
            title: img.getAttribute('title') || '',
            caption: figcaption?.textContent || '',
            size: img.getAttribute('data-size') || 'large',
          };
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (element) => {
          const el = element as HTMLImageElement;
          return {
            src: el.getAttribute('src'),
            alt: el.getAttribute('alt') || '',
            title: el.getAttribute('title') || '',
            caption: '',
            size: el.getAttribute('data-size') || 'large',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, title, caption, size } = HTMLAttributes;
    const sizeClass =
      size === 'small' ? 'max-w-xs' : size === 'medium' ? 'max-w-md' : 'max-w-full';

    const imgAttrs: Record<string, any> = {
      src,
      alt: alt || '',
      class: `rounded-lg h-auto ${sizeClass}`,
      loading: 'lazy',
    };
    if (title) imgAttrs.title = title;
    if (size) imgAttrs['data-size'] = size;

    if (caption) {
      return [
        'figure',
        mergeAttributes(this.options.HTMLAttributes, { class: 'my-6' }),
        ['img', imgAttrs],
        [
          'figcaption',
          {
            class: 'text-sm text-muted-foreground mt-2 text-center italic',
          },
          caption,
        ],
      ];
    }

    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, { class: 'my-6' }),
      ['img', imgAttrs],
    ];
  },

  addCommands() {
    return {
      insertImageFigure:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const uploadFn = this.options.uploadFn;
    if (!uploadFn) return [];

    return [
      new Plugin({
        key: new PluginKey('imageDrop'),
        props: {
          handleDrop(view, event) {
            const files = event.dataTransfer?.files;
            if (!files || files.length === 0) return false;

            const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
            if (images.length === 0) return false;

            event.preventDefault();

            images.forEach(async (file) => {
              try {
                const url = await uploadFn(file);
                const { schema } = view.state;
                const node = schema.nodes.imageFigure.create({
                  src: url,
                  alt: file.name.replace(/\.[^.]+$/, ''),
                  size: 'large',
                });
                const pos = view.posAtCoords({
                  left: event.clientX,
                  top: event.clientY,
                });
                if (pos) {
                  const tr = view.state.tr.insert(pos.pos, node);
                  view.dispatch(tr);
                }
              } catch (err) {
                console.error('Image upload failed:', err);
              }
            });

            return true;
          },
          handlePaste(view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;

            const images = Array.from(items).filter((item) =>
              item.type.startsWith('image/')
            );
            if (images.length === 0) return false;

            event.preventDefault();

            images.forEach(async (item) => {
              const file = item.getAsFile();
              if (!file) return;

              try {
                const url = await uploadFn(file);
                const { schema } = view.state;
                const node = schema.nodes.imageFigure.create({
                  src: url,
                  alt: '',
                  size: 'large',
                });
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              } catch (err) {
                console.error('Image upload failed:', err);
              }
            });

            return true;
          },
        },
      }),
    ];
  },
});

export default ImageFigure;
