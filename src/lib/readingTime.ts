/**
 * Calculate reading time for article content
 * @param content - Article content (can be string or JSON array)
 * @param title - Article title
 * @returns Reading time in minutes (minimum 1 minute)
 */
export function calculateReadingTime(content: any, title: string): number {
  let wordCount = 0;

  // Count words in title
  if (title) {
    wordCount += title.split(/\s+/).filter(word => word.length > 0).length;
  }

  // If content is a string (markdown), parse it
  if (typeof content === 'string') {
    // Remove markdown formatting and count words
    const plainText = content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .trim();
    
    wordCount += plainText.split(/\s+/).filter((word: string) => word.length > 0).length;
  } 
  // If content is JSON array (block format)
  else if (Array.isArray(content)) {
    for (const block of content) {
      if (block.content) {
        if (typeof block.content === 'string') {
          wordCount += block.content.split(/\s+/).filter((word: string) => word.length > 0).length;
        } else if (Array.isArray(block.content)) {
          for (const item of block.content) {
            if (typeof item === 'string') {
              wordCount += item.split(/\s+/).filter((word: string) => word.length > 0).length;
            } else if (Array.isArray(item)) {
              for (const cell of item) {
                if (typeof cell === 'string') {
                  wordCount += cell.split(/\s+/).filter((word: string) => word.length > 0).length;
                }
              }
            }
          }
        }
      }
    }
  }

  // Average reading speed is 200 words per minute, round up
  return Math.max(1, Math.ceil(wordCount / 200));
}
