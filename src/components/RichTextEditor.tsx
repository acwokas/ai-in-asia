import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Minus, Image, Type, Table as TableIcon, Video, Sparkles, Upload, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { compressImage } from "@/lib/imageCompression";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (selectedText: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

const RichTextEditor = ({
  value,
  onChange,
  onSelect,
  placeholder = "Start writing...",
  label,
  className,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showYoutubeDialog, setShowYoutubeDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showSocialEmbedDialog, setShowSocialEmbedDialog] = useState(false);
  const [imageData, setImageData] = useState({ url: '', caption: '', alt: '', description: '', size: 'large' as 'small' | 'medium' | 'large' });
  const [linkData, setLinkData] = useState({ url: '', text: '', openInNewTab: false });
  const [tableData, setTableData] = useState({ rows: 3, columns: 3, hasHeader: true });
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [promptData, setPromptData] = useState({ title: '', content: '' });
  const [socialEmbedCode, setSocialEmbedCode] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [selectedLinkElement, setSelectedLinkElement] = useState<HTMLAnchorElement | null>(null);
  const [lastExternalValue, setLastExternalValue] = useState(value);
  const { toast } = useToast();

  // Helper function to generate URL-safe slugs
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Initial content load
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = convertMarkdownToHtml(value);
    }
  }, []);

  // Handle external content updates (like from Scout Assist)
  useEffect(() => {
    if (!editorRef.current) return;
    
    // Check if this is an external update (not from user typing)
    const currentMarkdown = convertHtmlToMarkdown(editorRef.current.innerHTML);
    const isExternalUpdate = value !== currentMarkdown && value !== lastExternalValue;
    
    if (isExternalUpdate) {
      editorRef.current.innerHTML = convertMarkdownToHtml(value);
      setLastExternalValue(value);
      setIsEmpty(!value);
    }
  }, [value]);

  const convertMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return "";

    // DEBUG: log a small sample of the incoming markdown so we can see
    // if headings are coming through correctly in the console
    try {
      console.log("[RichTextEditor] convertMarkdownToHtml sample:", markdown.slice(0, 300));
    } catch {
      // ignore logging errors in case console is unavailable
    }

    // First, preserve any existing HTML (prompt boxes, YouTube embeds, iframes) by converting to placeholders
    const preservedMatches: string[] = [];

    const hasPromptBoxes = markdown.includes('prompt-box');

    // Preserve prompt boxes
    let processed = markdown.replace(/<div class="prompt-box"[^>]*>.*?<\/div>/gs, (match) => {
      const index = preservedMatches.length;
      preservedMatches.push(match);
      return `__PRESERVED_${index}__`;
    });

    // Preserve YouTube embeds
    processed = processed.replace(/<div class="youtube-embed"[^>]*>.*?<\/div>/gs, (match) => {
      const index = preservedMatches.length;
      preservedMatches.push(match);
      return `__PRESERVED_${index}__`;
    });

    // Preserve social media embeds (Twitter, Instagram, TikTok)
    processed = processed.replace(/<div class="social-embed[^"]*"[^>]*>.*?<\/div>/gs, (match) => {
      const index = preservedMatches.length;
      preservedMatches.push(match);
      return `__PRESERVED_${index}__`;
    });

    if (!hasPromptBoxes) {
      // Normalize simple <div> wrappers from pasted content so markdown headings are detectable
      // e.g. "</div>## Heading" or "<div>paragraph</div>" coming from external rich-text editors
      processed = processed
        .replace(/<div>\s*<\/div>/g, '\n\n')
        .replace(/<\/div>\s*<div>/g, '\n\n')
        .replace(/<\/?div>/g, '');
    }


    // More robust line-by-line markdown handling, especially for headings
    const lines = processed.split(/\r?\n/);
    const htmlLines = lines.map((line) => {
      const trimmed = line.trim();

      // Headings (support up to ### for now)
      if (/^###\s+/.test(trimmed)) {
        return `<h3>${trimmed.replace(/^###\s+/, "")}</h3>`;
      }
      if (/^##\s+/.test(trimmed)) {
        return `<h2>${trimmed.replace(/^##\s+/, "")}</h2>`;
      }
      if (/^#\s+/.test(trimmed)) {
        return `<h1>${trimmed.replace(/^#\s+/, "")}</h1>`;
      }

      // Blockquote
      if (/^>\s+/.test(trimmed)) {
        return `<blockquote>${trimmed.replace(/^>\s+/, "")}</blockquote>`;
      }

      // Unordered list item
      if (/^-\s+/.test(trimmed)) {
        return `<li>${trimmed.replace(/^-\s+/, "")}</li>`;
      }

      // Ordered list item
      if (/^\d+\.\s+/.test(trimmed)) {
        return `<li>${trimmed.replace(/^\d+\.\s+/, "")}</li>`;
      }

      // Empty line
      if (trimmed === "") {
        return "";
      }

      // Fallback paragraph text (inline formatting and links will be handled later)
      return trimmed;
    });

    let html = htmlLines.join("\n");

    // Inline formatting and links
    html = html
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1<\/strong>")
      .replace(/\*(.+?)\*/g, "<em>$1<\/em>")
      // Handle links with new tab marker (^)
      .replace(/\[(.+?)\]\((.+?)\)\^/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>')
      // Handle regular links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1<\/a>');

    // Group consecutive list items into <ul> / <ol>
    html = html
      .replace(/(?:<li>.*?<\/li>\n?)+/gs, (match) => {
        // If it already has a parent list, leave as is
        if (/<ul>|<ol>/.test(match)) return match;
        // Heuristic: treat as unordered list for now
        return `<ul>${match}<\/ul>`;
      })
      // Convert single line-breaks to <br> and double to paragraph breaks
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>");

    // Wrap entire content in a paragraph if it doesn't start with a block-level element
    if (!/^\s*<(h[1-6]|ul|ol|blockquote|div|table|p|iframe)/i.test(html)) {
      html = `<p>${html}</p>`;
    }

    // Restore preserved elements
    preservedMatches.forEach((preserved, index) => {
      html = html.replace(`__PRESERVED_${index}__`, preserved);
    });

    return html;
  };

  const convertHtmlToMarkdown = (html: string): string => {
    if (!html) return '';

    // If the content contains our custom prompt cards, keep the raw HTML
    // so their layout (multiple cards, images, etc.) is preserved across saves.
    if (html.includes('class="prompt-box"')) {
      return html;
    }
    
    // First, preserve YouTube embeds, iframes, and prompt boxes by converting them to placeholder markers
    const preservedMatches: string[] = [];
    
    // Preserve prompt boxes
    let processed = html.replace(/<div class="prompt-box"[^>]*>.*?<\/div>/gs, (match) => {
      const index = preservedMatches.length;
      preservedMatches.push(match);
      return `__PRESERVED_${index}__`;
    });
    
    // Preserve YouTube embeds
    processed = processed.replace(/<div class="youtube-embed"[^>]*>.*?<\/div>/gs, (match) => {
      const index = preservedMatches.length;
      preservedMatches.push(match);
      return `__PRESERVED_${index}__`;
    });

    // Preserve social media embeds (Twitter, Instagram, TikTok)
    processed = processed.replace(/<div class="social-embed[^"]*"[^>]*>.*?<\/div>/gs, (match) => {
      const index = preservedMatches.length;
      preservedMatches.push(match);
      return `__PRESERVED_${index}__`;
    });
    
    // Also preserve standalone iframes
    processed = processed.replace(/<iframe[^>]*>.*?<\/iframe>/gs, (match) => {
      const index = preservedMatches.length;
      preservedMatches.push(match);
      return `__PRESERVED_${index}__`;
    });
    
    // First, normalize block elements to ensure they're properly separated
    let normalized = processed
      // Ensure block elements have line breaks before them if they don't already
      .replace(/([^\n>])(<h[123])/g, '$1\n\n$2')
      .replace(/([^\n>])(<blockquote)/g, '$1\n\n$2')
      .replace(/([^\n>])(<p[^>]*>)/g, '$1\n\n$2')
      .replace(/([^\n>])(<ul)/g, '$1\n\n$2')
      .replace(/([^\n>])(<ol)/g, '$1\n\n$2')
      // Ensure block closing tags have line breaks after them
      .replace(/(<\/h[123]>)([^\n])/g, '$1\n\n$2')
      .replace(/(<\/blockquote>)([^\n])/g, '$1\n\n$2')
      .replace(/(<\/p>)([^\n])/g, '$1\n\n$2')
      .replace(/(<\/ul>)([^\n])/g, '$1\n\n$2')
      .replace(/(<\/ol>)([^\n])/g, '$1\n\n$2');
    
    let markdown = normalized
      // Convert inline formatting first
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      // Convert headings (must be done before paragraphs)
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1')
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
      // Convert links - preserve target="_blank" with ^ marker
      .replace(/<a[^>]*href="([^"]*)"[^>]*target="_blank"[^>]*>(.*?)<\/a>/g, '[$2]($1)^')
      .replace(/<a[^>]*target="_blank"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)^')
      // Convert regular links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      // Convert ordered lists first
      .replace(/<ol[^>]*>(.*?)<\/ol>/gs, (match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gs, (_: string, item: string) => {
          return `${counter++}. ${item}\n`;
        });
      })
      // Convert unordered lists
      .replace(/<li[^>]*>(.*?)<\/li>/gs, '- $1\n')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gs, '$1')
      // Convert blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, '> $1')
      // Convert paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gs, '$1')
      // Convert breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Note: we intentionally keep remaining HTML tags (like custom prompt cards, images, etc.)
      // so complex layouts are preserved when saving and reloading content.
      // Decode HTML entities
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      // Clean up excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Restore preserved elements (prompt boxes, iframes, YouTube embeds) back to actual HTML
    preservedMatches.forEach((preserved, index) => {
      markdown = markdown.replace(`__PRESERVED_${index}__`, preserved);
    });
    
    return markdown;
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
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
        // Save the current selection before opening dialog
        const tableSel = window.getSelection();
        if (tableSel && tableSel.rangeCount > 0) {
          savedSelectionRef.current = tableSel.getRangeAt(0);
        }
        setShowTableDialog(true);
        break;
      case 'youtube':
        // Save the current selection before opening dialog
        const youtubeSel = window.getSelection();
        if (youtubeSel && youtubeSel.rangeCount > 0) {
          savedSelectionRef.current = youtubeSel.getRangeAt(0);
        }
        setShowYoutubeDialog(true);
        break;
      case 'prompt':
        // Save the current selection before opening dialog
        const promptSel = window.getSelection();
        if (promptSel && promptSel.rangeCount > 0) {
          savedSelectionRef.current = promptSel.getRangeAt(0);
        }
        setShowPromptDialog(true);
        break;
      case 'social':
        // Save the current selection before opening dialog
        const socialSel = window.getSelection();
        if (socialSel && socialSel.rangeCount > 0) {
          savedSelectionRef.current = socialSel.getRangeAt(0);
        }
        setShowSocialEmbedDialog(true);
        break;
      case 'image':
        // Save the current selection before opening dialog
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          savedSelectionRef.current = sel.getRangeAt(0);
        }
        imageInputRef.current?.click();
        break;
      case 'link':
        // Save the current selection before opening dialog
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          savedSelectionRef.current = selection.getRangeAt(0);
          
          // Check if the selection is inside an existing link
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
          
          // If we found a link, pre-populate the dialog for editing
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
        description: "Compressing and uploading image for best performance",
      });

      // Compress image before upload
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        maxSizeMB: 1,
      });

      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
      
      console.log(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`);

      // Generate filename
      const timestamp = Date.now();
      const fileExt = compressedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const sanitizedBaseName = generateSlug(baseName);
      const fileName = `${sanitizedBaseName}-${timestamp}.${fileExt}`;
      const filePath = `content/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      // Show dialog with the uploaded URL
      setImageData({ url: publicUrl, caption: '', alt: '', description: '', size: 'large' });
      setShowImageDialog(true);

      toast({
        title: "Image uploaded",
        description: `Optimized and uploaded (${originalSizeMB}MB → ${compressedSizeMB}MB)`,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleInsertImage = () => {
    if (!imageData.url) return;
    
    // Restore the saved selection
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    
    // Focus the editor before inserting
    editorRef.current?.focus();
    
    execCommand('insertImage', imageData.url);
    
    // Add alt text and other attributes after insertion
    setTimeout(() => {
      const imgs = editorRef.current?.querySelectorAll('img');
      if (imgs && imgs.length > 0) {
        // Get the last inserted image
        const imgElement = imgs[imgs.length - 1] as HTMLImageElement;
        
        if (imageData.alt) imgElement.setAttribute('alt', imageData.alt);
        if (imageData.description) imgElement.setAttribute('title', imageData.description);
        if (imageData.size) imgElement.setAttribute('data-size', imageData.size);
        
        // Apply size class based on selection
        const sizeClass = imageData.size === 'small' ? 'max-w-xs' : imageData.size === 'medium' ? 'max-w-md' : 'max-w-full';
        imgElement.className = `rounded-lg h-auto ${sizeClass}`;
        
        // Add caption as a wrapper
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
      
      // Trigger input event to update the markdown
      handleInput();
    }, 100);
    
    setShowImageDialog(false);
    setImageData({ url: '', caption: '', alt: '', description: '', size: 'large' });
    savedSelectionRef.current = null;
  };

  const handleInsertLink = () => {
    if (!linkData.url) return;
    
    // If editing existing link
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
      // Inserting new link
      // Restore the saved selection
      if (savedSelectionRef.current) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelectionRef.current);
        }
      }
      
      execCommand('createLink', linkData.url);
      
      // Add target="_blank" if user wants to open in new tab
      setTimeout(() => {
        const links = editorRef.current?.querySelectorAll('a');
        if (links && links.length > 0) {
          // Get the last inserted link
          const linkElement = links[links.length - 1] as HTMLAnchorElement;
          
          if (linkData.openInNewTab) {
            linkElement.setAttribute('target', '_blank');
            linkElement.setAttribute('rel', 'noopener noreferrer');
          }
        }
        
        // Trigger input event to update the markdown
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
      // Replace the link with just its text content
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
    
    // Restore the saved selection
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    
    // Focus the editor before inserting
    editorRef.current?.focus();
    
    // Create table HTML
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
    
    // Insert the table
    execCommand('insertHTML', tableHtml);
    
    // Trigger input event to update the markdown
    setTimeout(() => {
      handleInput();
    }, 100);
    
    setShowTableDialog(false);
    setTableData({ rows: 3, columns: 3, hasHeader: true });
    savedSelectionRef.current = null;
  };

  const handleInsertYoutube = () => {
    if (!youtubeUrl) return;
    
    let embedSrc = '';
    
    // Check if it's a playlist URL
    const playlistMatch = youtubeUrl.match(/[?&]list=([^&\s]+)/);
    
    if (playlistMatch) {
      const playlistId = playlistMatch[1];
      // Check if there's also a video ID (playlist with specific video start)
      const videoInPlaylistMatch = youtubeUrl.match(/[?&]v=([^&\s]+)/);
      if (videoInPlaylistMatch) {
        // Embed playlist starting from specific video
        embedSrc = `https://www.youtube.com/embed/${videoInPlaylistMatch[1]}?list=${playlistId}`;
      } else {
        // Embed entire playlist using videoseries
        embedSrc = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
      }
    } else {
      // Extract video ID from regular YouTube URL
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
    
    // Restore the saved selection
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    
    // Focus the editor before inserting
    editorRef.current?.focus();
    
    // Create YouTube embed HTML
    const embedHtml = `<div class="youtube-embed" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 2rem 0;"><iframe src="${embedSrc}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p><br></p>`;
    
    // Insert the embed
    execCommand('insertHTML', embedHtml);
    
    // Trigger input event to update the markdown
    setTimeout(() => {
      handleInput();
    }, 100);
    
    setShowYoutubeDialog(false);
    setYoutubeUrl('');
    savedSelectionRef.current = null;
  };

  const handleInsertPrompt = () => {
    if (!promptData.content) return;
    
    // Restore the saved selection
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    
    // Focus the editor before inserting
    editorRef.current?.focus();
    
    // Create prompt box HTML
    const promptTitle = promptData.title || 'Prompt';
    const promptHtml = `<div class="prompt-box" data-prompt-title="${promptTitle}" data-prompt-content="${promptData.content.replace(/"/g, '&quot;')}">
      <div class="prompt-box-header">
        <span class="prompt-box-icon">✨</span>
        <span class="prompt-box-title">${promptTitle}</span>
        <button class="prompt-box-copy" onclick="navigator.clipboard.writeText(this.closest('.prompt-box').dataset.promptContent); this.innerHTML = '✓ Copied!'; setTimeout(() => this.innerHTML = 'Copy', 2000);" type="button">Copy</button>
      </div>
      <div class="prompt-box-content">${promptData.content.replace(/\n/g, '<br>')}</div>
    </div><p><br></p>`;
    
    // Insert the prompt box
    execCommand('insertHTML', promptHtml);
    
    // Trigger input event to update the markdown
    setTimeout(() => {
      handleInput();
    }, 100);
    
    setShowPromptDialog(false);
    setPromptData({ title: '', content: '' });
    savedSelectionRef.current = null;
  };

  const handleInsertSocialEmbed = () => {
    if (!socialEmbedCode) return;
    
    const code = socialEmbedCode.trim();
    let embedHtml = '';
    
    // Detect if this is raw embed code (contains HTML tags) or a URL
    const isEmbedCode = code.includes('<') && code.includes('>');
    
    if (isEmbedCode) {
      // Detect platform from embed code and wrap appropriately
      let platform = 'generic';
      if (code.includes('twitter-tweet') || code.includes('twitter.com') || code.includes('x.com')) {
        platform = 'twitter';
      } else if (code.includes('instagram.com') || code.includes('instagram-media')) {
        platform = 'instagram';
      } else if (code.includes('tiktok.com') || code.includes('tiktok-embed')) {
        platform = 'tiktok';
      }
      
      // Wrap the embed code in our container div
      embedHtml = `<div class="social-embed ${platform}-embed" style="margin: 2rem 0;">
        ${code}
      </div><p><br></p>`;
    } else {
      // Handle as URL (backward compatibility)
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
    
    // Restore the saved selection
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    
    // Focus the editor before inserting
    editorRef.current?.focus();
    
    // Insert the embed
    execCommand('insertHTML', embedHtml);
    
    // Trigger input event to update the markdown
    setTimeout(() => {
      handleInput();
    }, 100);
    
    setShowSocialEmbedDialog(false);
    setSocialEmbedCode('');
    savedSelectionRef.current = null;
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    
    const content = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    
    setIsEmpty(text.trim().length === 0);
    
    const markdown = convertHtmlToMarkdown(content);
    onChange(markdown);
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
        
        // Check if we're inside a figure or figcaption
        let currentElement = node as HTMLElement;
        while (currentElement && currentElement !== editorRef.current) {
          if (currentElement.tagName === 'FIGURE' || currentElement.tagName === 'FIGCAPTION') {
            e.preventDefault();
            
            // Create a new paragraph after the figure
            const figure = currentElement.tagName === 'FIGURE' ? currentElement : currentElement.closest('figure');
            if (figure) {
              const newParagraph = document.createElement('p');
              newParagraph.innerHTML = '<br>'; // Empty paragraph with line break
              figure.parentNode?.insertBefore(newParagraph, figure.nextSibling);
              
              // Move cursor to the new paragraph
              const range = document.createRange();
              range.setStart(newParagraph, 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
            return;
          }
          currentElement = currentElement.parentElement as HTMLElement;
        }
      }
    }

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
          // Save the current selection before opening dialog
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            savedSelectionRef.current = sel.getRangeAt(0);
          }
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
      
      {/* Sticky toolbar that follows viewport scroll */}
      <div className="sticky top-20 z-[100] flex items-center gap-1 p-2 border border-input rounded-t-md bg-background flex-wrap shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('h1')}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('h2')}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('h3')}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('paragraph')}
          title="Paragraph"
        >
          <Type className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('list')}
          title="Bulleted List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('quote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('link')}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('hr')}
          title="Horizontal Line"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('image')}
          title="Insert Image"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('table')}
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('youtube')}
          title="Insert YouTube Video"
        >
          <Video className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('prompt')}
          title="Insert Prompt Box"
          className="text-primary hover:text-primary"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat('social')}
          title="Embed Social Media (Twitter/X, Instagram, TikTok)"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

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

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>
              Add optional details for your image
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {imageData.url && (
              <div>
                <img src={imageData.url} alt="Preview" className="w-full max-w-md h-48 object-cover rounded-lg border border-border" />
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImageData({ url: '', caption: '', alt: '', description: '', size: 'large' });
                      if (imageInputRef.current) {
                        imageInputRef.current.value = '';
                      }
                    }}
                    className="flex-1"
                  >
                    Remove Image
                  </Button>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="image-size">Display Size</Label>
              <Select value={imageData.size} onValueChange={(value: 'small' | 'medium' | 'large') => setImageData({ ...imageData, size: value })}>
                <SelectTrigger id="image-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (320px)</SelectItem>
                  <SelectItem value="medium">Medium (512px)</SelectItem>
                  <SelectItem value="large">Large (Full Width)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="image-caption">Caption (optional)</Label>
              <Input
                id="image-caption"
                placeholder="Image caption"
                value={imageData.caption}
                onChange={(e) => setImageData({ ...imageData, caption: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="image-alt">Alt Text</Label>
              <Input
                id="image-alt"
                placeholder="Describe the image"
                value={imageData.alt}
                onChange={(e) => setImageData({ ...imageData, alt: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="image-description">Description (for accessibility)</Label>
              <Textarea
                id="image-description"
                placeholder="Detailed description for screen readers"
                value={imageData.description}
                onChange={(e) => setImageData({ ...imageData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertImage}>Insert Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Table</DialogTitle>
            <DialogDescription>
              Configure your table dimensions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="table-rows">Number of Rows</Label>
              <Input
                id="table-rows"
                type="number"
                min="1"
                max="20"
                placeholder="3"
                value={tableData.rows}
                onChange={(e) => setTableData({ ...tableData, rows: parseInt(e.target.value) || 3 })}
              />
            </div>
            <div>
              <Label htmlFor="table-columns">Number of Columns</Label>
              <Input
                id="table-columns"
                type="number"
                min="1"
                max="10"
                placeholder="3"
                value={tableData.columns}
                onChange={(e) => setTableData({ ...tableData, columns: parseInt(e.target.value) || 3 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="table-header"
                checked={tableData.hasHeader}
                onCheckedChange={(checked) => 
                  setTableData({ ...tableData, hasHeader: checked as boolean })
                }
              />
              <Label htmlFor="table-header" className="cursor-pointer">
                Include header row
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertTable}>Insert Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingLink ? 'Edit Link' : 'Insert Link'}</DialogTitle>
            <DialogDescription>
              {isEditingLink ? 'Update or remove your link' : 'Add a link to your content'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                placeholder="Click here"
                value={linkData.text}
                onChange={(e) => setLinkData({ ...linkData, text: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkData.url}
                onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertLink();
                  }
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="link-newtab"
                checked={linkData.openInNewTab}
                onCheckedChange={(checked) => 
                  setLinkData({ ...linkData, openInNewTab: checked as boolean })
                }
              />
              <Label htmlFor="link-newtab" className="cursor-pointer">
                Open in new tab
              </Label>
            </div>
          </div>
          <DialogFooter>
            {isEditingLink && (
              <Button variant="destructive" onClick={handleRemoveLink}>
                Remove Link
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertLink}>
              {isEditingLink ? 'Update Link' : 'Insert Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YouTube Dialog */}
      <Dialog open={showYoutubeDialog} onOpenChange={setShowYoutubeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed YouTube Video</DialogTitle>
            <DialogDescription>
              Paste a YouTube video URL to embed it in your article
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertYoutube();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowYoutubeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertYoutube}>Embed Video</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt Box Dialog */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Insert Prompt Box
            </DialogTitle>
            <DialogDescription>
              Create a beautiful, copyable prompt box for your readers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt-title">Title (Optional)</Label>
              <Input
                id="prompt-title"
                placeholder="e.g., ChatGPT Prompt, AI Instruction..."
                value={promptData.title}
                onChange={(e) => setPromptData({ ...promptData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="prompt-content">Prompt Content</Label>
              <Textarea
                id="prompt-content"
                placeholder="Enter your prompt here..."
                value={promptData.content}
                onChange={(e) => setPromptData({ ...promptData, content: e.target.value })}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromptDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertPrompt} disabled={!promptData.content}>
              <Sparkles className="h-4 w-4 mr-2" />
              Insert Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Social Media Embed Dialog */}
      <Dialog open={showSocialEmbedDialog} onOpenChange={setShowSocialEmbedDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Embed Social Media Post
            </DialogTitle>
            <DialogDescription>
              Paste embed code or URL from Twitter/X, Instagram, or TikTok
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="social-embed">Embed Code or URL</Label>
              <Textarea
                id="social-embed"
                placeholder={'Paste embed code (e.g., <blockquote class="twitter-tweet">...) or URL'}
                value={socialEmbedCode}
                onChange={(e) => setSocialEmbedCode(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">How to get embed code:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Twitter/X: Click "..." → "Embed post" → Copy code</li>
                <li>Instagram: Click "..." → "Embed" → Copy code</li>
                <li>TikTok: Click "Share" → "Embed" → Copy code</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSocialEmbedDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertSocialEmbed} disabled={!socialEmbedCode}>
              <Share2 className="h-4 w-4 mr-2" />
              Embed Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RichTextEditor;
