import { Card } from '@/components/ui/card';

interface ProfileBookmarksProps {
  bookmarks: any[];
}

const ProfileBookmarks = ({ bookmarks }: ProfileBookmarksProps) => {
  if (bookmarks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No bookmarks yet. Start saving articles!</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookmarks.map((bookmark) => {
        const categorySlug = (bookmark.articles.categories as any)?.slug || 'uncategorized';
        return (
          <Card key={bookmark.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <a href={`/${categorySlug}/${bookmark.articles.slug}`}>
              {bookmark.articles.featured_image_url && (
                <img
                  src={bookmark.articles.featured_image_url}
                  alt={bookmark.articles.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">{bookmark.articles.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{bookmark.articles.excerpt}</p>
              </div>
            </a>
          </Card>
        );
      })}
    </div>
  );
};

export default ProfileBookmarks;
