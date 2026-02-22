import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { convertMarkdownToHtml, convertHtmlToMarkdown, generateSlug } from '@/lib/markdownConversion';
import TipTapToolbar from './TipTapToolbar';
import {
  ImageDialog,
  LinkDialog,
  TableDialog,
  YouTubeDialog,
  PromptDialog,
  SocialEmbedDialog,
} from '@/components/editor/EditorDialogs';
import { PromptBox } from './extensions/PromptBox';
import { YouTubeEmbed } from './extensions/YouTubeEmbed';
import { SocialEmbed } from './extensions/SocialEmbed';
import { ImageFigure } from './extensions/ImageFigure';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (selectedText: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  keyphraseSynonyms?: string;
}

const TipTapEditor = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Start writing...',
  label,
  className,
  keyphraseSynonyms,
}: TipTapEditorProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageUploadCounterRef = useRef(0);
  const lastExternalValue = useRef(value);
  const isInternalUpdate = useRef(false);

  // Dialog states
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showYoutubeDialog, setShowYoutubeDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showSocialEmbedDialog, setShowSocialEmbedDialog] = useState(false);

  // Dialog data
  const [imageData, setImageData] = useState({
    url: '',
    caption: '',
    alt: '',
    description: '',
    size: 'large' as 'small' | 'medium' | 'large',
    filename: '',
  });
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [linkData, setLinkData] = useState({ url: '', text: '', openInNewTab: false });
  const [tableData, setTableData] = useState({ rows: 3, columns: 3, hasHeader: true });
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [promptData, setPromptData] = useState({ title: '', content: '' });
  const [socialEmbedCode, setSocialEmbedCode] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);

  // Image upload function for drag-and-drop
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const compressedFile = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85,
      maxSizeMB: 1,
    });

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedFilename = generateSlug(file.name.replace(/\.[^/.]+$/, '') || 'image');
    const fileName = `${sanitizedFilename}-${timestamp}.${fileExt}`;
    const filePath = `content/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('article-images')
      .upload(filePath, compressedFile);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('article-images').getPublicUrl(filePath);

    return publicUrl;
  }, []);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: {},
        blockquote: {},
        bulletList: {},
        orderedList: {},
        codeBlock: {},
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:no-underline',
        },
      }),
      Underline,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'w-full border-collapse my-4',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border px-4 py-2',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-border bg-muted px-4 py-2 text-left font-semibold',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
      ImageFigure.configure({
        uploadFn: uploadImage,
      }),
      PromptBox,
      YouTubeEmbed,
      SocialEmbed,
    ],
    content: value ? convertMarkdownToHtml(value) : '',
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[500px] w-full bg-background px-4 py-3',
          'focus-visible:outline-none',
          'prose prose-slate dark:prose-invert max-w-none',
          '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:font-display',
          '[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:font-display',
          '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-display',
          '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-4',
          '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-4',
          '[&_li]:my-1',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4',
          '[&_a]:text-primary [&_a]:underline [&_a]:hover:no-underline',
          '[&_strong]:font-bold',
          '[&_em]:italic',
          '[&_hr]:border-t [&_hr]:border-border [&_hr]:my-4',
          '[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-4',
          '[&_table]:w-full [&_table]:border-collapse [&_table]:my-4',
          '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold',
          '[&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-2',
          '[&_.youtube-embed]:my-8',
          '[&_.social-embed]:my-8',
          '[&_.prompt-box]:my-6',
          '[&_figure]:my-6',
          '[&_figcaption]:text-sm [&_figcaption]:text-muted-foreground [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:italic'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const html = editor.getHTML();
      const markdown = convertHtmlToMarkdown(html);
      onChange(markdown);
      requestAnimationFrame(() => {
        isInternalUpdate.current = false;
      });
    },
    onSelectionUpdate: ({ editor }) => {
      if (onSelect) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, ' ');
          onSelect(text);
        } else {
          onSelect('');
        }
      }
    },
  });

  // Handle external content updates (e.g. Scout Assist rewrite)
  useEffect(() => {
    if (!editor || isInternalUpdate.current) return;

    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      const html = convertMarkdownToHtml(value);
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  // Handle image upload from file picker
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast('Optimizing image...', {
        description: 'Compressing for best performance',
      });

      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        maxSizeMB: 1,
      });

      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);

      let suggestedName: string;
      if (keyphraseSynonyms && keyphraseSynonyms.trim()) {
        const synonyms = keyphraseSynonyms
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (synonyms.length > 0) {
          const synonymIndex = imageUploadCounterRef.current % synonyms.length;
          suggestedName = synonyms[synonymIndex];
          imageUploadCounterRef.current++;
        } else {
          suggestedName = file.name.replace(/\.[^/.]+$/, '');
        }
      } else {
        suggestedName = file.name.replace(/\.[^/.]+$/, '');
      }

      const previewUrl = URL.createObjectURL(compressedFile);

      setPendingImageFile(compressedFile);
      setImageData({
        url: previewUrl,
        caption: '',
        alt: '',
        description: '',
        size: 'large',
        filename: suggestedName,
      });
      setShowImageDialog(true);

      toast.success('Image ready', {
        description: `Optimized (${originalSizeMB}MB → ${compressedSizeMB}MB). Edit filename and click Insert.`,
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Processing failed', {
        description: error instanceof Error ? error.message : 'Failed to process image',
      });
    } finally {
      e.target.value = '';
    }
  };

  // Insert image handler (from dialog)
  const handleInsertImage = async () => {
    if (!editor) return;
    setIsUploadingImage(true);

    try {
      let finalUrl = imageData.url;

      if (pendingImageFile) {
        const timestamp = Date.now();
        const fileExt = pendingImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const sanitizedFilename = generateSlug(imageData.filename || 'image');
        const fileName = `${sanitizedFilename}-${timestamp}.${fileExt}`;
        const filePath = `content/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('article-images')
          .upload(filePath, pendingImageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('article-images').getPublicUrl(filePath);

        finalUrl = publicUrl;

        if (imageData.url.startsWith('blob:')) {
          URL.revokeObjectURL(imageData.url);
        }

        toast.success('Image uploaded', {
          description: `Saved as ${fileName}`,
        });
      }

      editor.chain().focus().insertImageFigure({
        src: finalUrl,
        alt: imageData.alt || '',
        title: imageData.description || '',
        caption: imageData.caption || '',
        size: imageData.size,
      }).run();

      setShowImageDialog(false);
      setImageData({ url: '', caption: '', alt: '', description: '', size: 'large', filename: '' });
      setPendingImageFile(null);
    } catch (error: any) {
      console.error('Error inserting image:', error);
      toast.error('Upload failed', {
        description: error.message || 'Failed to upload image',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Insert link handler
  const handleInsertLink = () => {
    if (!editor) return;

    if (!linkData.url) {
      editor.chain().focus().unsetLink().run();
    } else {
      const attrs: any = { href: linkData.url };
      if (linkData.openInNewTab) {
        attrs.target = '_blank';
        attrs.rel = 'noopener noreferrer';
      }

      if (linkData.text && editor.state.selection.empty) {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkData.url}"${linkData.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${linkData.text}</a>`)
          .run();
      } else {
        editor.chain().focus().setLink(attrs).run();
      }
    }

    setShowLinkDialog(false);
    setLinkData({ url: '', text: '', openInNewTab: false });
    setIsEditingLink(false);
  };

  // Remove link handler
  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkDialog(false);
    setLinkData({ url: '', text: '', openInNewTab: false });
    setIsEditingLink(false);
  };

  // Open link dialog handler
  const handleOpenLinkDialog = () => {
    if (!editor) return;

    const linkMark = editor.getAttributes('link');
    if (linkMark.href) {
      setIsEditingLink(true);
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ');
      setLinkData({
        url: linkMark.href,
        text: text || '',
        openInNewTab: linkMark.target === '_blank',
      });
    } else {
      setIsEditingLink(false);
      const { from, to } = editor.state.selection;
      const selectedText = from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';
      setLinkData({ url: '', text: selectedText, openInNewTab: false });
    }

    setShowLinkDialog(true);
  };

  // Insert table handler
  const handleInsertTable = () => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertTable({
        rows: tableData.rows,
        cols: tableData.columns,
        withHeaderRow: tableData.hasHeader,
      })
      .run();

    setShowTableDialog(false);
    setTableData({ rows: 3, columns: 3, hasHeader: true });
  };

  // Insert YouTube handler
  const handleInsertYoutube = () => {
    if (!editor || !youtubeUrl) return;
    editor.chain().focus().insertYouTube({ src: youtubeUrl }).run();
    setShowYoutubeDialog(false);
    setYoutubeUrl('');
  };

  // Insert prompt box handler
  const handleInsertPrompt = () => {
    if (!editor) return;
    editor.chain().focus().insertPromptBox({
      title: promptData.title || 'Prompt',
      content: promptData.content || 'Enter prompt content...',
    }).run();
    setShowPromptDialog(false);
    setPromptData({ title: '', content: '' });
  };

  // Insert social embed handler
  const handleInsertSocialEmbed = () => {
    if (!editor || !socialEmbedCode) return;
    editor.chain().focus().insertSocialEmbed({ html: socialEmbedCode }).run();
    setShowSocialEmbedDialog(false);
    setSocialEmbedCode('');
  };

  // Open image dialog (from toolbar button)
  const handleOpenImageDialog = () => {
    imageInputRef.current?.click();
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}

      {/* Hidden file input for image uploads */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Toolbar */}
      <TipTapToolbar
        editor={editor}
        onOpenImageDialog={handleOpenImageDialog}
        onOpenLinkDialog={handleOpenLinkDialog}
        onOpenTableDialog={() => setShowTableDialog(true)}
        onOpenYouTubeDialog={() => setShowYoutubeDialog(true)}
        onOpenPromptDialog={() => setShowPromptDialog(true)}
        onOpenSocialDialog={() => setShowSocialEmbedDialog(true)}
      />

      {/* Editor content area */}
      <div className="rounded-b-lg border border-t-0 border-border overflow-hidden">
        <div className="overflow-y-auto max-h-[70vh]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Dialogs - reusing existing dialog components */}
      <ImageDialog
        open={showImageDialog}
        onOpenChange={setShowImageDialog}
        imageData={imageData}
        setImageData={setImageData}
        pendingImageFile={pendingImageFile}
        onInsert={handleInsertImage}
        onImageInputClick={() => imageInputRef.current?.click()}
        onRemoveImage={() => {
          setImageData({ url: '', caption: '', alt: '', description: '', size: 'large', filename: '' });
          setPendingImageFile(null);
        }}
        isUploading={isUploadingImage}
      />

      <LinkDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        linkData={linkData}
        setLinkData={setLinkData}
        isEditingLink={isEditingLink}
        onInsert={handleInsertLink}
        onRemove={handleRemoveLink}
      />

      <TableDialog
        open={showTableDialog}
        onOpenChange={setShowTableDialog}
        tableData={tableData}
        setTableData={setTableData}
        onInsert={handleInsertTable}
      />

      <YouTubeDialog
        open={showYoutubeDialog}
        onOpenChange={setShowYoutubeDialog}
        youtubeUrl={youtubeUrl}
        setYoutubeUrl={setYoutubeUrl}
        onInsert={handleInsertYoutube}
      />

      <PromptDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        promptData={promptData}
        setPromptData={setPromptData}
        onInsert={handleInsertPrompt}
      />

      <SocialEmbedDialog
        open={showSocialEmbedDialog}
        onOpenChange={setShowSocialEmbedDialog}
        embedCode={socialEmbedCode}
        setEmbedCode={setSocialEmbedCode}
        onInsert={handleInsertSocialEmbed}
      />
    </div>
  );
};

export default TipTapEditor;
