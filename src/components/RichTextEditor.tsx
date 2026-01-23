import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageCompression";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { convertMarkdownToHtml, convertHtmlToMarkdown, generateSlug } from "@/lib/markdownConversion";
import EditorToolbar from "@/components/editor/EditorToolbar";
import {
  ImageDialog,
  LinkDialog,
  TableDialog,
  YouTubeDialog,
  PromptDialog,
  SocialEmbedDialog,
} from "@/components/editor/EditorDialogs";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (selectedText: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  keyphraseSynonyms?: string;
}

const RichTextEditor = ({
  value,
  onChange,
  onSelect,
  placeholder = "Start writing...",
  label,
  className,
  keyphraseSynonyms,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const imageUploadCounterRef = useRef(0);
  
  // Dialog visibility states
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showYoutubeDialog, setShowYoutubeDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showSocialEmbedDialog, setShowSocialEmbedDialog] = useState(false);
  
  // Dialog data states
  const [imageData, setImageData] = useState({ url: '', caption: '', alt: '', description: '', size: 'large' as 'small' | 'medium' | 'large', filename: '' });
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [linkData, setLinkData] = useState({ url: '', text: '', openInNewTab: false });
  const [tableData, setTableData] = useState({ rows: 3, columns: 3, hasHeader: true });
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [promptData, setPromptData] = useState({ title: '', content: '' });
  const [socialEmbedCode, setSocialEmbedCode] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [selectedLinkElement, setSelectedLinkElement] = useState<HTMLAnchorElement | null>(null);
  const [lastExternalValue, setLastExternalValue] = useState(value);
  const { toast } = useToast();

  // Initial content load
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = convertMarkdownToHtml(value);
    }
  }, []);

  // Handle external content updates (like from Scout Assist)
  useEffect(() => {
    if (!editorRef.current) return;
    
    const currentMarkdown = convertHtmlToMarkdown(editorRef.current.innerHTML);
    const isExternalUpdate = value !== currentMarkdown && value !== lastExternalValue;
    
    if (isExternalUpdate) {
      editorRef.current.innerHTML = convertMarkdownToHtml(value);
      setLastExternalValue(value);
      setIsEmpty(!value);
    }
  }, [value]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
  };

  const handleFormat = (format: string) => {
    switch (format) {
      case 'bold':
        execCommand('bold');
        break;
      case 'italic':
        execCommand('italic');
        break;
      case 'h1':
        execCommand('formatBlock', '<h1>');
        break;
      case 'h2':
        execCommand('formatBlock', '<h2>');
        break;
      case 'h3':
        execCommand('formatBlock', '<h3>');
        break;
      case 'paragraph':
        execCommand('formatBlock', '<p>');
        break;
      case 'list':
        execCommand('insertUnorderedList');
        break;
      case 'orderedList':
        execCommand('insertOrderedList');
        break;
      case 'quote':
        execCommand('formatBlock', '<blockquote>');
        break;
      case 'hr':
        execCommand('insertHorizontalRule');
        break;
      case 'table':
        saveSelection();
        setShowTableDialog(true);
        break;
      case 'youtube':
        saveSelection();
        setShowYoutubeDialog(true);
        break;
      case 'prompt':
        saveSelection();
        setShowPromptDialog(true);
        break;
      case 'social':
        saveSelection();
        setShowSocialEmbedDialog(true);
        break;
      case 'image':
        saveSelection();
        imageInputRef.current?.click();
        break;
      case 'link':
        saveSelection();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          let linkElement: HTMLAnchorElement | null = null;
          let node = selection.anchorNode;
          
          if (node) {
            if (node.nodeType === Node.TEXT_NODE) {
              node = node.parentElement;
            }
            
            while (node && node !== editorRef.current) {
              if ((node as HTMLElement).tagName === 'A') {
                linkElement = node as HTMLAnchorElement;
                break;
              }
              node = (node as HTMLElement).parentElement;
            }
          }
          
          if (linkElement) {
            setSelectedLinkElement(linkElement);
            setIsEditingLink(true);
            setLinkData({
              url: linkElement.href,
              text: linkElement.textContent || '',
              openInNewTab: linkElement.target === '_blank'
            });
          } else {
            setIsEditingLink(false);
            setSelectedLinkElement(null);
            setLinkData({ url: '', text: selection.toString(), openInNewTab: false });
          }
        }
        setShowLinkDialog(true);
        break;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast({
        title: "Optimizing image...",
        description: "Compressing for best performance",
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
        const synonyms = keyphraseSynonyms.split(',').map(s => s.trim()).filter(s => s.length > 0);
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
        filename: suggestedName 
      });
      setShowImageDialog(true);

      toast({
        title: "Image ready",
        description: `Optimized (${originalSizeMB}MB → ${compressedSizeMB}MB). Edit filename and click Insert.`,
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process image",
        variant: "destructive",
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    
    const content = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    
    setIsEmpty(text.trim().length === 0);
    
    const markdown = convertHtmlToMarkdown(content);
    onChange(markdown);
  };

  const handleInsertImage = async () => {
    if (!pendingImageFile && !imageData.url) return;
    
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

        const { data: { publicUrl } } = supabase.storage
          .from('article-images')
          .getPublicUrl(filePath);
        
        finalUrl = publicUrl;
        
        if (imageData.url.startsWith('blob:')) {
          URL.revokeObjectURL(imageData.url);
        }
        
        toast({
          title: "Image uploaded",
          description: `Saved as ${fileName}`,
        });
      }
      
      restoreSelection();
      editorRef.current?.focus();
      execCommand('insertImage', finalUrl);
      
      setTimeout(() => {
        const imgs = editorRef.current?.querySelectorAll('img');
        if (imgs && imgs.length > 0) {
          const imgElement = imgs[imgs.length - 1] as HTMLImageElement;
          
          if (imageData.alt) imgElement.setAttribute('alt', imageData.alt);
          if (imageData.description) imgElement.setAttribute('title', imageData.description);
          if (imageData.size) imgElement.setAttribute('data-size', imageData.size);
          
          const sizeClass = imageData.size === 'small' ? 'max-w-xs' : imageData.size === 'medium' ? 'max-w-md' : 'max-w-full';
          imgElement.className = `rounded-lg h-auto ${sizeClass}`;
          
          if (imageData.caption) {
            const figure = document.createElement('figure');
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = imageData.caption;
            figcaption.className = 'text-sm text-muted-foreground mt-2 text-center italic';
            
            imgElement.parentNode?.insertBefore(figure, imgElement);
            figure.appendChild(imgElement);
            figure.appendChild(figcaption);
          }
        }
        
        handleInput();
      }, 100);
      
      setShowImageDialog(false);
      setImageData({ url: '', caption: '', alt: '', description: '', size: 'large', filename: '' });
      setPendingImageFile(null);
      savedSelectionRef.current = null;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleInsertLink = () => {
    if (!linkData.url) return;
    
    if (isEditingLink && selectedLinkElement) {
      selectedLinkElement.href = linkData.url;
      selectedLinkElement.textContent = linkData.text;
      
      if (linkData.openInNewTab) {
        selectedLinkElement.setAttribute('target', '_blank');
        selectedLinkElement.setAttribute('rel', 'noopener noreferrer');
      } else {
        selectedLinkElement.removeAttribute('target');
        selectedLinkElement.removeAttribute('rel');
      }
      
      handleInput();
    } else {
      restoreSelection();
      execCommand('createLink', linkData.url);
      
      setTimeout(() => {
        const links = editorRef.current?.querySelectorAll('a');
        if (links && links.length > 0) {
          const linkElement = links[links.length - 1] as HTMLAnchorElement;
          
          if (linkData.openInNewTab) {
            linkElement.setAttribute('target', '_blank');
            linkElement.setAttribute('rel', 'noopener noreferrer');
          }
        }
        handleInput();
      }, 100);
    }
    
    setShowLinkDialog(false);
    setLinkData({ url: '', text: '', openInNewTab: false });
    setIsEditingLink(false);
    setSelectedLinkElement(null);
    savedSelectionRef.current = null;
    editorRef.current?.focus();
  };

  const handleRemoveLink = () => {
    if (selectedLinkElement) {
      const textNode = document.createTextNode(selectedLinkElement.textContent || '');
      selectedLinkElement.parentNode?.replaceChild(textNode, selectedLinkElement);
      handleInput();
    }
    
    setShowLinkDialog(false);
    setLinkData({ url: '', text: '', openInNewTab: false });
    setIsEditingLink(false);
    setSelectedLinkElement(null);
    editorRef.current?.focus();
  };

  const handleInsertTable = () => {
    if (!tableData.rows || !tableData.columns) return;
    
    restoreSelection();
    editorRef.current?.focus();
    
    let tableHtml = '<table class="editor-table"><tbody>';
    
    for (let i = 0; i < tableData.rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < tableData.columns; j++) {
        if (i === 0 && tableData.hasHeader) {
          tableHtml += '<th>Header</th>';
        } else {
          tableHtml += '<td>Cell</td>';
        }
      }
      tableHtml += '</tr>';
    }
    
    tableHtml += '</tbody></table><p><br></p>';
    
    execCommand('insertHTML', tableHtml);
    
    setTimeout(() => handleInput(), 100);
    
    setShowTableDialog(false);
    setTableData({ rows: 3, columns: 3, hasHeader: true });
    savedSelectionRef.current = null;
  };

  const handleInsertYoutube = () => {
    if (!youtubeUrl) return;
    
    let embedSrc = '';
    const playlistMatch = youtubeUrl.match(/[?&]list=([^&\s]+)/);

    if (playlistMatch) {
      const playlistId = playlistMatch[1];
      embedSrc = `https://www.youtube.com/embed?listType=playlist&list=${playlistId}`;
    } else {
      let videoId = '';
      const urlPatterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
        /youtube\.com\/embed\/([^&\s]+)/
      ];

      for (const pattern of urlPatterns) {
        const match = youtubeUrl.match(pattern);
        if (match) {
          videoId = match[1];
          break;
        }
      }

      if (!videoId) {
        alert('Invalid YouTube URL. Please enter a valid YouTube video or playlist URL.');
        return;
      }

      embedSrc = `https://www.youtube.com/embed/${videoId}`;
    }
    
    restoreSelection();
    editorRef.current?.focus();
    
    const embedHtml = `<div class="youtube-embed"><iframe src="${embedSrc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p><br></p>`;
    
    execCommand('insertHTML', embedHtml);
    
    setTimeout(() => handleInput(), 100);
    
    setShowYoutubeDialog(false);
    setYoutubeUrl('');
    savedSelectionRef.current = null;
  };

  const handleInsertPrompt = () => {
    if (!promptData.content) return;
    
    restoreSelection();
    editorRef.current?.focus();
    
    const promptTitle = promptData.title || 'Prompt';
    const promptHtml = `<div class="prompt-box" data-prompt-title="${promptTitle}" data-prompt-content="${promptData.content.replace(/"/g, '&quot;')}">
      <div class="prompt-box-header">
        <span class="prompt-box-icon">✨</span>
        <span class="prompt-box-title">${promptTitle}</span>
        <button class="prompt-box-copy" onclick="navigator.clipboard.writeText(this.closest('.prompt-box').dataset.promptContent); this.innerHTML = '✓ Copied!'; setTimeout(() => this.innerHTML = 'Copy', 2000);" type="button">Copy</button>
      </div>
      <div class="prompt-box-content">${promptData.content.replace(/\n/g, '<br>')}</div>
    </div><p><br></p>`;
    
    execCommand('insertHTML', promptHtml);
    
    setTimeout(() => handleInput(), 100);
    
    setShowPromptDialog(false);
    setPromptData({ title: '', content: '' });
    savedSelectionRef.current = null;
  };

  const handleInsertSocialEmbed = () => {
    if (!socialEmbedCode) return;
    
    const code = socialEmbedCode.trim();
    let embedHtml = '';
    
    const isEmbedCode = code.includes('<') && code.includes('>');
    
    if (isEmbedCode) {
      let platform = 'generic';
      if (code.includes('twitter-tweet') || code.includes('twitter.com') || code.includes('x.com')) {
        platform = 'twitter';
      } else if (code.includes('instagram.com') || code.includes('instagram-media')) {
        platform = 'instagram';
      } else if (code.includes('tiktok.com') || code.includes('tiktok-embed')) {
        platform = 'tiktok';
      }
      
      embedHtml = `<div class="social-embed ${platform}-embed" style="margin: 2rem 0;">
        ${code}
      </div><p><br></p>`;
    } else {
      const url = code;
      
      if (url.includes('twitter.com') || url.includes('x.com')) {
        const tweetId = url.match(/status\/(\d+)/)?.[1];
        if (tweetId) {
          embedHtml = `<div class="social-embed twitter-embed" data-url="${url}" style="margin: 2rem 0;">
            <blockquote class="twitter-tweet" data-dnt="true">
              <a href="${url}">Loading tweet...</a>
            </blockquote>
            <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
          </div><p><br></p>`;
        } else {
          alert('Invalid Twitter/X URL. Please enter a valid tweet URL or paste embed code.');
          return;
        }
      } else if (url.includes('instagram.com')) {
        const postMatch = url.match(/instagram\.com\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
        if (postMatch) {
          const embedUrl = `https://www.instagram.com/${postMatch[1]}/${postMatch[2]}/embed`;
          embedHtml = `<div class="social-embed instagram-embed" data-url="${url}" style="margin: 2rem 0; max-width: 540px;">
            <iframe src="${embedUrl}" width="100%" height="600" frameborder="0" scrolling="no" allowtransparency="true" style="border-radius: 12px;"></iframe>
          </div><p><br></p>`;
        } else {
          alert('Invalid Instagram URL. Please enter a valid Instagram post or reel URL, or paste embed code.');
          return;
        }
      } else if (url.includes('tiktok.com')) {
        const videoMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/) || url.match(/tiktok\.com\/t\/([A-Za-z0-9]+)/);
        if (videoMatch) {
          embedHtml = `<div class="social-embed tiktok-embed" data-url="${url}" style="margin: 2rem 0; max-width: 325px;">
            <blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoMatch[1]}" style="max-width: 325px; min-width: 325px;">
              <section><a target="_blank" href="${url}">Loading TikTok...</a></section>
            </blockquote>
            <script async src="https://www.tiktok.com/embed.js"></script>
          </div><p><br></p>`;
        } else {
          alert('Invalid TikTok URL. Please enter a valid TikTok video URL, or paste embed code.');
          return;
        }
      } else {
        alert('Unsupported format. Please paste embed code from Twitter/X, Instagram, or TikTok, or enter a valid URL.');
        return;
      }
    }
    
    restoreSelection();
    editorRef.current?.focus();
    execCommand('insertHTML', embedHtml);
    
    setTimeout(() => handleInput(), 100);
    
    setShowSocialEmbedDialog(false);
    setSocialEmbedCode('');
    savedSelectionRef.current = null;
  };

  const handleSelection = () => {
    if (!onSelect) return;
    
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      onSelect(selection.toString());
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    // Handle Enter key after image/figure
    if (e.key === 'Enter' && !modKey) {
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
        let node = selection.anchorNode;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentElement;
        }
        
        let currentElement = node as HTMLElement;
        while (currentElement && currentElement !== editorRef.current) {
          if (currentElement.tagName === 'FIGURE' || currentElement.tagName === 'FIGCAPTION') {
            e.preventDefault();
            
            const figure = currentElement.tagName === 'FIGURE' 
              ? currentElement 
              : currentElement.closest('figure');
            
            if (figure) {
              const newParagraph = document.createElement('p');
              newParagraph.innerHTML = '<br>';
              figure.parentNode?.insertBefore(newParagraph, figure.nextSibling);
              
              const range = document.createRange();
              range.setStart(newParagraph, 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              
              handleInput();
            }
            return;
          }
          currentElement = currentElement.parentElement as HTMLElement;
        }
      }
    }

    // Keyboard shortcuts
    if (modKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          handleFormat('italic');
          break;
        case 'k':
          e.preventDefault();
          saveSelection();
          setShowLinkDialog(true);
          break;
      }
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      
      {/* Modular Toolbar Component */}
      <EditorToolbar onFormat={handleFormat} />

      {/* Scrollable editor content */}
      <div className="border border-t-0 border-input rounded-b-md overflow-hidden">
        <div className="max-h-[700px] overflow-y-auto">
          <div className="relative">
            {isEmpty && (
              <div className="absolute top-3 left-4 text-muted-foreground pointer-events-none z-10">
                {placeholder}
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onSelect={handleSelection}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              className={cn(
                "min-h-[500px] w-full bg-background px-4 py-3",
                "focus-visible:outline-none",
                "prose prose-slate max-w-none",
                "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:font-display",
                "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:font-display",
                "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-display",
                "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-4",
                "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-4",
                "[&_li]:my-1",
                "[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4",
                "[&_a]:text-primary [&_a]:underline [&_a]:hover:no-underline",
                "[&_strong]:font-bold",
                "[&_em]:italic",
                "[&_hr]:border-t [&_hr]:border-border [&_hr]:my-4",
                "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-4",
                "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4",
                "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold",
                "[&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-2",
                "[&_.youtube-embed]:my-8",
                "[&_.social-embed]:my-8"
              )}
              suppressContentEditableWarning
            />
          </div>
        </div>
      </div>

      {/* Modular Dialog Components */}
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

export default RichTextEditor;
