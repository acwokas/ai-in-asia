import { Node, mergeAttributes } from '@tiptap/core';

export interface YouTubeEmbedOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtubeEmbed: {
      insertYouTube: (attrs: { src: string }) => ReturnType;
    };
  }
}

const getYouTubeEmbedUrl = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
};

export const YouTubeEmbed = Node.create<YouTubeEmbedOptions>({
  name: 'youtubeEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          const iframe = element.querySelector('iframe');
          return iframe?.getAttribute('src') || null;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.youtube-embed',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src;
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        class: 'youtube-embed',
        style: 'margin: 32px 0;',
      }),
      [
        'div',
        {
          style:
            'position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; background: #000;',
        },
        [
          'iframe',
          {
            src,
            style:
              'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowfullscreen: 'true',
            loading: 'lazy',
          },
        ],
      ],
    ];
  },

  addCommands() {
    return {
      insertYouTube:
        (attrs) =>
        ({ commands }) => {
          const embedUrl = getYouTubeEmbedUrl(attrs.src);
          if (!embedUrl) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { src: embedUrl },
          });
        },
    };
  },
});

export default YouTubeEmbed;
