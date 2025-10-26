import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, CheckCircle, XCircle } from "lucide-react";
import Header from "@/components/Header";

interface UploadStatus {
  filename: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

const UploadAuthorAvatars = () => {
  const [uploading, setUploading] = useState(false);
  const [statuses, setStatuses] = useState<UploadStatus[]>([
    { filename: 'adrian-watkins.jpeg', status: 'pending' },
    { filename: 'koo-ping-shung.jpeg', status: 'pending' },
    { filename: 'victoria-watkins.jpeg', status: 'pending' },
    { filename: 'intelligence-desk.png', status: 'pending' },
  ]);

  const uploadAvatars = async () => {
    setUploading(true);
    
    const avatars = [
      { filename: 'adrian-watkins.jpeg', path: '/temp-avatars/adrian-watkins.jpeg' },
      { filename: 'koo-ping-shung.jpeg', path: '/temp-avatars/koo-ping-shung.jpeg' },
      { filename: 'victoria-watkins.jpeg', path: '/temp-avatars/victoria-watkins.jpeg' },
      { filename: 'intelligence-desk.png', path: '/temp-avatars/intelligence-desk.png' },
    ];

    for (const avatar of avatars) {
      try {
        // Update status to uploading
        setStatuses(prev => prev.map(s => 
          s.filename === avatar.filename 
            ? { ...s, status: 'uploading' }
            : s
        ));

        // Fetch the file from public folder
        const response = await fetch(avatar.path);
        const blob = await response.blob();
        
        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('author-avatars')
          .upload(avatar.filename, blob, {
            cacheControl: '3600',
            upsert: true,
            contentType: blob.type
          });

        if (error) throw error;

        // Update status to success
        setStatuses(prev => prev.map(s => 
          s.filename === avatar.filename 
            ? { ...s, status: 'success', message: 'Uploaded successfully' }
            : s
        ));

      } catch (error: any) {
        console.error(`Error uploading ${avatar.filename}:`, error);
        setStatuses(prev => prev.map(s => 
          s.filename === avatar.filename 
            ? { ...s, status: 'error', message: error.message }
            : s
        ));
      }
    }

    setUploading(false);
    
    const successCount = statuses.filter(s => s.status === 'success').length;
    if (successCount === avatars.length) {
      toast.success('All author avatars uploaded successfully!');
    } else {
      toast.warning(`Uploaded ${successCount} of ${avatars.length} avatars`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'uploading':
        return <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Upload Author Avatars</h1>
              <p className="text-muted-foreground">
                Click the button below to upload all featured author avatars to Supabase Storage.
              </p>
            </div>

            <div className="space-y-3">
              {statuses.map((status) => (
                <div 
                  key={status.filename}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.status)}
                    <span className="font-medium">{status.filename}</span>
                  </div>
                  {status.message && (
                    <span className="text-sm text-muted-foreground">
                      {status.message}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <Button 
              onClick={uploadAvatars} 
              disabled={uploading || statuses.every(s => s.status === 'success')}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload All Avatars'}
            </Button>

            {statuses.every(s => s.status === 'success') && (
              <div className="text-center text-sm text-green-600">
                ✓ All avatars uploaded! You can now delete the /public/temp-avatars folder.
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
};

export default UploadAuthorAvatars;
