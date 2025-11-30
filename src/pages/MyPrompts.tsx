import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { Navigate } from "react-router-dom";

export const MyPrompts = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/auth" />;

  // Fetch bookmarked prompts
  const { data: bookmarks } = useQuery({
    queryKey: ['user-bookmarks', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_bookmarks')
        .select('*, articles!inner(title, slug, top_list_items)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch rated prompts
  const { data: ratings } = useQuery({
    queryKey: ['user-ratings', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_ratings')
        .select('*, articles!inner(title, slug, top_list_items)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch recently viewed
  const { data: recentViews } = useQuery({
    queryKey: ['user-views', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_views')
        .select('*, articles!inner(title, slug, top_list_items)')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Prompts</h1>
      
      <Tabs defaultValue="bookmarks">
        <TabsList>
          <TabsTrigger value="bookmarks">Saved ({bookmarks?.length || 0})</TabsTrigger>
          <TabsTrigger value="rated">Rated ({ratings?.length || 0})</TabsTrigger>
          <TabsTrigger value="recent">Recently Viewed</TabsTrigger>
        </TabsList>

        <TabsContent value="bookmarks" className="space-y-4 mt-6">
          {bookmarks?.map(bookmark => {
            const item = (bookmark.articles as any).top_list_items?.find((i: any) => i.id === bookmark.prompt_item_id);
            return item ? (
              <Card key={bookmark.id}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <div className="bg-muted/30 rounded p-3">
                    <pre className="whitespace-pre-wrap font-mono text-xs">{item.prompt}</pre>
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })}
        </TabsContent>

        <TabsContent value="rated" className="space-y-4 mt-6">
          {ratings?.map(rating => {
            const item = (rating.articles as any).top_list_items?.find((i: any) => i.id === rating.prompt_item_id);
            return item ? (
              <Card key={rating.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    <StarRating rating={rating.rating} />
                  </div>
                  <div className="bg-muted/30 rounded p-3">
                    <pre className="whitespace-pre-wrap font-mono text-xs">{item.prompt}</pre>
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4 mt-6">
          {recentViews?.map(view => {
            const item = (view.articles as any).top_list_items?.find((i: any) => i.id === view.prompt_item_id);
            return item ? (
              <Card key={view.id}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <div className="bg-muted/30 rounded p-3">
                    <pre className="whitespace-pre-wrap font-mono text-xs">{item.prompt}</pre>
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};