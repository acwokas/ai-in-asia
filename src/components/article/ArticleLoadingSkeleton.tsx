import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

export const ArticleLoadingSkeleton = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero image with overlay content */}
        <div className="container mx-auto max-w-[1080px] mt-4 px-4">
          <div className="relative rounded-lg overflow-hidden">
            <Skeleton className="w-full h-[300px] md:h-[480px]" />
            {/* Gradient overlay simulation */}
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 space-y-3">
              {/* Category badge */}
              <Skeleton className="h-6 w-20 rounded-full" />
              {/* Title */}
              <Skeleton className="h-8 md:h-10 w-full max-w-[600px]" />
              <Skeleton className="h-8 md:h-10 w-3/4 max-w-[450px]" />
              {/* Excerpt */}
              <Skeleton className="h-4 w-full max-w-[500px] hidden md:block" />
              {/* Byline row: avatar + author + date + reading time */}
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-2" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="container mx-auto max-w-[1080px] px-4 mt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>

        {/* TLDR / AI Snapshot box */}
        <div className="container mx-auto max-w-[1080px] px-4 mt-8">
          <div className="max-w-[720px]">
            <div className="rounded-xl border border-border/50 p-5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>

        {/* Two-column layout: content + sidebar */}
        <div className="container mx-auto max-w-[1080px] px-4 mt-8">
          <div className="flex gap-10">
            {/* Main content column */}
            <div className="min-w-0 flex-1 max-w-[720px] space-y-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="pt-2" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="pt-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Sidebar (desktop only) */}
            <aside className="hidden min-[1200px]:block w-[300px] flex-shrink-0 space-y-6">
              {/* Table of contents */}
              <div className="rounded-xl border border-border/50 p-4 space-y-3">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              {/* Ad placeholder */}
              <Skeleton className="h-[250px] w-full rounded-lg" />
              {/* Related reading rail */}
              <div className="space-y-3">
                <Skeleton className="h-5 w-36" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-[80px] h-[60px] rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ArticleLoadingSkeleton;
