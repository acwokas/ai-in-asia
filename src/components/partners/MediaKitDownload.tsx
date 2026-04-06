import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useFadeInOnScroll } from "./useFadeInOnScroll";

export default function MediaKitDownload() {
  const { ref, isVisible } = useFadeInOnScroll();

  return (
    <section
      ref={ref}
      className={`py-16 md:py-20 border-t border-border/50 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="container mx-auto px-4 max-w-3xl">
        <Card className="bg-card/50 border-border/50 overflow-hidden">
          <CardContent className="pt-0 p-0">
            <div className="flex flex-col md:flex-row items-center">
              <div className="w-full md:w-48 h-48 bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-16 w-16 text-primary/50" />
              </div>
              <div className="p-6 md:p-8 flex-1">
                <h2 className="headline text-xl md:text-2xl font-bold mb-2">Media Kit</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Download our media kit for detailed audience demographics, traffic data, partnership pricing, and brand guidelines.
                </p>
                <Button className="gap-2" asChild>
                  <a href="/media-kit.pdf" target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
