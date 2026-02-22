import { Node, mergeAttributes } from '@tiptap/core';

export interface SocialEmbedOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    socialEmbed: {
      insertSocialEmbed: (attrs: { html: string; platform?: string }) => ReturnType;
    };
  }
}

const detectPlatform = (html: string): string => {
  if (html.includes('twitter.com') || html.includes('x.com')) return 'twitter';
  if (html.includes('instagram.com')) return 'instagram';
  if (html.includes('tiktok.com')) return 'tiktok';
  return 'social';
};

export const SocialEmbed = Node.create<SocialEmbedOptions>({
  name: 'socialEmbed',
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
      html: {
        default: '',
        parseHTML: (element) => element.innerHTML,
      },
      platform: {
        default: 'social',
        parseHTML: (element) => {
          const classList = element.className || '';
          if (classList.includes('twitter')) return 'twitter';
          if (classList.includes('instagram')) return 'instagram';
          if (classList.includes('tiktok')) return 'tiktok';
          return detectPlatform(element.innerHTML);
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div.social-embed' },
      { tag: 'div.social-embed-twitter' },
      { tag: 'div.social-embed-instagram' },
      { tag: 'div.social-embed-tiktok' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const platform = HTMLAttributes.platform || 'social';
    return ['div', mergeAttributes(this.options.HTMLAttributes, {
      class: `social-embed social-embed-${platform}`,
      style: 'margin: 32px 0; display: flex; justify-content: center;',
    })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = `social-embed social-embed-${node.attrs.platform}`;
      dom.style.cssText = 'margin: 32px 0; display: flex; justify-content: center;';
      dom.innerHTML = node.attrs.html || '';

      const scripts = dom.querySelectorAll('script');
      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        Array.from(script.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = script.textContent;
        script.parentNode?.replaceChild(newScript, script);
      });

      return { dom };
    };
  },

  addCommands() {
    return {
      insertSocialEmbed:
        (attrs) =>
        ({ commands }) => {
          const platform = attrs.platform || detectPlatform(attrs.html);
          return commands.insertContent({
            type: this.name,
            attrs: { html: attrs.html, platform },
          });
        },
    };
  },
});

export default SocialEmbed;
