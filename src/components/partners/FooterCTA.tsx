import { Mail } from "lucide-react";

export default function FooterCTA() {
  return (
    <section className="py-16 md:py-20 border-t border-border/50">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <h2 className="headline text-2xl md:text-3xl font-bold mb-4">
          Ready to reach Asia-Pacific's AI community?
        </h2>
        <p className="text-muted-foreground mb-6">
          Whether you have a specific partnership in mind or want to explore options, we would love to hear from you.
        </p>
        <a
          href="mailto:partnerships@aiinasia.com"
          className="inline-flex items-center gap-2 text-primary hover:underline text-lg font-medium"
        >
          <Mail className="h-5 w-5" />
          partnerships@aiinasia.com
        </a>
      </div>
    </section>
  );
}
