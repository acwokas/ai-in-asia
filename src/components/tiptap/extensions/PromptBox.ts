import { Node, mergeAttributes } from '@tiptap/core';

export interface PromptBoxOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    promptBox: {
      insertPromptBox: (attrs: { title: string; content: string }) => ReturnType;
    };
  }
}

export const PromptBox = Node.create<PromptBoxOptions>({
  name: 'promptBox',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      title: {
        default: 'Prompt',
        parseHTML: (element) => {
          const header = element.querySelector('.prompt-box-header');
          return header?.textContent || 'Prompt';
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.prompt-box',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'prompt-box',
        style:
          'background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03)); border: 1px solid rgba(16,185,129,0.2); border-radius: 12px; padding: 20px; margin: 24px 0;',
      }),
      [
        'div',
        {
          class: 'prompt-box-header',
          style:
            'font-weight: 700; font-size: 14px; color: #10b981; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;',
          contenteditable: 'false',
        },
        ['span', {}, '✨'],
        ['span', {}, HTMLAttributes.title || 'Prompt'],
      ],
      ['div', { class: 'prompt-box-content' }, 0],
    ];
  },

  addCommands() {
    return {
      insertPromptBox:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: attrs.content || 'Enter prompt content...' }],
              },
            ],
          });
        },
    };
  },
});

export default PromptBox;
