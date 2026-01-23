import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

export const ArticleLoadingSkeleton = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="aspect-video rounded-lg mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ArticleLoadingSkeleton;
