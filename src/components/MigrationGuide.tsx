import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen } from "lucide-react";

export default function MigrationGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <BookOpen className="mr-2 h-4 w-4" />
          View Migration Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Article Migration CSV Guide</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <h2>CSV Template Structure</h2>
            <p>Your CSV file should have the following columns in this exact order:</p>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
              title,slug,old_slug,content,excerpt,author,categories,tags,meta_title,meta_description,featured_image_url,featured_image_alt,published_at,article_type
            </pre>

            <h2>Column Definitions</h2>
            
            <h3>Required Fields</h3>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 min-w-[120px]">Column</th>
                    <th className="text-left p-2 min-w-[150px]">Description</th>
                    <th className="text-left p-2 min-w-[250px]">Example</th>
                    <th className="text-left p-2 min-w-[180px]">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 font-mono whitespace-nowrap">title</td>
                    <td className="p-2">Article title</td>
                    <td className="p-2">"AI Revolution in Asia: 2024 Trends"</td>
                    <td className="p-2">Max 200 characters</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-mono whitespace-nowrap">slug</td>
                    <td className="p-2">New URL slug</td>
                    <td className="p-2">"ai-revolution-asia-2024-trends"</td>
                    <td className="p-2">Lowercase, hyphens only</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-mono whitespace-nowrap">content</td>
                    <td className="p-2">Article body</td>
                    <td className="p-2">See content section below</td>
                    <td className="p-2">Plain text or JSON</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-mono whitespace-nowrap">old_slug</td>
                    <td className="p-2">Original slug from old site</td>
                    <td className="p-2">"2024/01/ai-revolution-asia"</td>
                    <td className="p-2">Used for redirect mapping</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Optional Fields</h3>
            <div className="space-y-2 text-sm">
              <p><strong>excerpt:</strong> Short summary (defaults to first 160 chars of content)</p>
              <p><strong>author:</strong> Author name (will use existing author or skip)</p>
              <p><strong>categories:</strong> Comma-separated list</p>
              <p><strong>tags:</strong> Comma-separated list</p>
              <p><strong>meta_title:</strong> SEO title (defaults to title field)</p>
              <p><strong>meta_description:</strong> SEO description (defaults to excerpt)</p>
              <p><strong>featured_image_url:</strong> Full image URL</p>
              <p><strong>featured_image_alt:</strong> Image alt text</p>
              <p><strong>published_at:</strong> ISO 8601 format date</p>
              <p><strong>article_type:</strong> "article", "event", "review", or "podcast"</p>
            </div>

            <h2>Content Formatting</h2>
            
            <h3>Plain Text (Recommended)</h3>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`title,slug,old_slug,content,excerpt
"Sample Article","sample-article","old-sample","This is paragraph one.

This is paragraph two.","Brief excerpt"`}
            </pre>

            <h3>HTML Content</h3>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`title,slug,old_slug,content,excerpt
"Sample Article","sample-article","old-sample","<p>This is paragraph one.</p><p>This is <strong>bold</strong>.</p>","Brief excerpt"`}
            </pre>

            <h2>Exporting from WordPress</h2>

            <div className="space-y-4">
              <div className="border rounded p-4 bg-primary/10 border-primary/30">
                <h3 className="font-semibold mb-2 text-primary">✨ Method 1: WordPress Plugin (EASIEST)</h3>
                <p className="text-sm mb-2">Download the plugin: <a href="/ai-in-asia-exporter-plugin.php" download className="text-primary underline font-semibold">ai-in-asia-exporter-plugin.php</a></p>
                
                <div className="space-y-3">
                  <div className="bg-background/50 p-3 rounded">
                    <p className="font-semibold text-sm mb-1">Option A: FTP Upload (Recommended)</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Download the plugin file above</li>
                      <li>Connect to your site via FTP (FileZilla, etc.)</li>
                      <li>Create a new folder: <code className="bg-muted px-1">/wp-content/plugins/ai-in-asia-exporter/</code></li>
                      <li>Upload the PHP file into this new folder</li>
                      <li>Go to <strong>WordPress Admin → Plugins</strong></li>
                      <li>Find "AI in Asia Content Exporter" and click <strong>Activate</strong></li>
                      <li>Navigate to <strong>Tools → AI in Asia Export</strong></li>
                      <li>Click <strong>Download CSV Export</strong></li>
                    </ol>
                  </div>
                  
                  <div className="bg-background/50 p-3 rounded">
                    <p className="font-semibold text-sm mb-1">Option B: Upload as ZIP</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Download the plugin file above</li>
                      <li>Create a new folder named <code className="bg-muted px-1">ai-in-asia-exporter</code></li>
                      <li>Move the downloaded PHP file into this folder</li>
                      <li>Zip the folder (right-click → Compress/Send to → Compressed folder)</li>
                      <li>Go to <strong>WordPress Admin → Plugins → Add New → Upload Plugin</strong></li>
                      <li>Upload the ZIP file and click <strong>Install Now</strong></li>
                      <li>Click <strong>Activate Plugin</strong></li>
                      <li>Navigate to <strong>Tools → AI in Asia Export</strong></li>
                      <li>Click <strong>Download CSV Export</strong></li>
                    </ol>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Why this is best:</strong> Works directly in WordPress admin, includes Yoast SEO data, handles UTF-8 properly, most reliable method.
                </p>
              </div>

              <div className="border rounded p-4 bg-muted/30">
                <h3 className="font-semibold mb-2">Method 2: Standalone PHP Script (Alternative)</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Download the export script: <a href="/wordpress-export-script.php" download className="underline">wordpress-export-script.php</a></li>
                  <li>Upload it to your WordPress site root (same folder as wp-config.php)</li>
                  <li>Log in to WordPress as administrator</li>
                  <li>Visit: <code className="bg-muted px-1">https://yoursite.com/wordpress-export-script.php</code></li>
                  <li>CSV will download automatically</li>
                  <li><strong className="text-destructive">Delete the script file after use</strong> for security</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>⚠️ Troubleshooting:</strong> If you see PHP code instead of a download, use Method 1 (plugin) instead. Some servers don't execute standalone scripts properly.
                </p>
              </div>

              <div className="border rounded p-4 bg-muted/30">
                <h3 className="font-semibold mb-2">Method 3: Built-in WordPress Exporter</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to <strong>Tools → Export</strong> in WordPress admin</li>
                  <li>Select <strong>Posts</strong></li>
                  <li>Click <strong>Download Export File</strong> (exports to XML)</li>
                  <li>Convert XML to CSV using an online converter</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Note:</strong> This exports basic fields only. For SEO data and custom fields, use Method 1 or 2.
                </p>
              </div>

              <div className="border rounded p-4 bg-muted/30">
                <h3 className="font-semibold mb-2">Method 4: WP All Import (with All Export addon)</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Install <strong>WP All Import</strong> plugin</li>
                  <li>Install <strong>WP All Export</strong> addon (Pro recommended)</li>
                  <li>Go to <strong>All Export → New Export</strong></li>
                  <li>Select <strong>Posts</strong> and configure columns</li>
                  <li>Export as CSV with UTF-8 encoding</li>
                </ol>
                <div className="mt-2 text-xs">
                  <p className="font-semibold mb-1">Field Mappings:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>title: <code>{`{post_title}`}</code></li>
                    <li>slug: <code>{`{post_name}`}</code></li>
                    <li>content: <code>{`{post_content}`}</code></li>
                    <li>categories: <code>{`{categories, sep=,}`}</code></li>
                    <li>Yoast meta_title: <code>{`{yoast_wpseo_title}`}</code></li>
                    <li>Yoast meta_description: <code>{`{yoast_wpseo_metadesc}`}</code></li>
                  </ul>
                </div>
              </div>

              <div className="border rounded p-4 bg-muted/30">
                <h3 className="font-semibold mb-2">Method 5: phpMyAdmin SQL Query</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Access phpMyAdmin from your hosting panel</li>
                  <li>Select your WordPress database</li>
                  <li>Go to <strong>SQL</strong> tab</li>
                  <li>Run a SELECT query for posts</li>
                  <li>Export results as CSV</li>
                </ol>
              </div>
            </div>

            <h2>Special Characters & Escaping</h2>
            <div className="space-y-2 text-sm">
              <p><strong>1. Wrap fields with commas in quotes:</strong> <code>"Technology, AI, Machine Learning"</code></p>
              <p><strong>2. Escape quotes with double quotes:</strong> <code>"He said ""Hello"" to everyone"</code></p>
              <p><strong>3. Line breaks:</strong> Use actual line breaks inside quoted fields</p>
              <p><strong>4. Encoding:</strong> Save file as UTF-8 for international characters</p>
            </div>

            <h2>Pre-Migration Checklist</h2>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>All required columns present (title, slug, old_slug, content)</li>
              <li>Slugs are URL-friendly (lowercase, hyphens only)</li>
              <li>No duplicate slugs in the file</li>
              <li>Content properly escaped (quotes, commas)</li>
              <li>File saved as UTF-8 encoding</li>
              <li>Test with 10-20 articles first</li>
              <li>Backup original data</li>
            </ul>

            <h2>Testing Your CSV</h2>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>Open CSV in a text editor (not Excel) to verify format</li>
              <li>Check first and last rows are complete</li>
              <li>Verify no extra commas or quotes</li>
              <li>Test import with 5 articles first</li>
              <li>Check imported articles in system</li>
              <li>Verify URL mappings created correctly</li>
            </ol>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold mb-2">💡 Pro Tips:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li>Always test with a small batch (10-20 articles) first</li>
                <li>Backup your WordPress database before exporting</li>
                <li>For large sites (1000+ posts), export in batches</li>
                <li>Download the template CSV files from the Bulk Import page</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
