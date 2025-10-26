import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MapPin, Phone } from "lucide-react";
import { z } from "zod";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  subject: z.string()
    .trim()
    .min(1, { message: "Subject is required" })
    .max(200, { message: "Subject must be less than 200 characters" }),
  message: z.string()
    .trim()
    .min(10, { message: "Message must be at least 10 characters" })
    .max(2000, { message: "Message must be less than 2000 characters" })
});

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const rawData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    };

    try {
      // Validate input
      const validatedData = contactSchema.parse(rawData);

      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: validatedData.name,
          email: validatedData.email,
          subject: validatedData.subject,
          message: validatedData.message
        });

      if (error) throw error;

      // Handle newsletter subscription if checked
      if (subscribeNewsletter) {
        const { data: existing } = await supabase
          .from("newsletter_subscribers")
          .select("id")
          .eq("email", validatedData.email)
          .maybeSingle();

        if (!existing) {
          await supabase
            .from("newsletter_subscribers")
            .insert({ email: validatedData.email });
        }
      }

      toast({
        title: "Message sent",
        description: subscribeNewsletter 
          ? "We'll get back to you within 48 hours. You've also been subscribed to our newsletter!"
          : "We'll get back to you within 48 hours.",
      });
      
      (e.target as HTMLFormElement).reset();
      setSubscribeNewsletter(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Contact AI in ASIA - Get In Touch</title>
        <meta name="description" content="Contact AI in ASIA for story tips, partnership enquiries, or general questions. We're here to help with your AI news and insights needs." />
        <link rel="canonical" href="https://aiinasia.com/contact" />
        <meta property="og:title" content="Contact AI in ASIA - Get In Touch" />
        <meta property="og:description" content="Contact AI in ASIA for story tips, partnership enquiries, or general questions." />
        <meta property="og:url" content="https://aiinasia.com/contact" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Contact AI in ASIA" />
        <meta name="twitter:description" content="Get in touch with AI in ASIA for story tips and enquiries." />
      </Helmet>

      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Contact</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h1 className="headline text-4xl md:text-5xl mb-6">Get In Touch</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Have a story tip, partnership enquiry, or general question? We'd love to hear from you.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-muted-foreground">editorial@aiinasia.com</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Location</h3>
                  <p className="text-muted-foreground">Singapore • Hong Kong • Tokyo</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Media Enquiries</h3>
                  <p className="text-muted-foreground">press@aiinasia.com</p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-6 mt-8">
              <h3 className="font-semibold mb-2">For Partnership Opportunities</h3>
              <p className="text-sm text-muted-foreground">
                Interested in advertising, sponsored content, or strategic partnerships? Contact our partnerships team at partnerships@aiinasia.com
              </p>
            </div>
          </div>
          
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Name *
                </label>
                <Input 
                  id="name" 
                  name="name" 
                  required 
                  maxLength={100}
                  placeholder="Your full name" 
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email *
                </label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  maxLength={255}
                  placeholder="your@email.com" 
                />
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                  Subject *
                </label>
                <Input 
                  id="subject" 
                  name="subject" 
                  required 
                  maxLength={200}
                  placeholder="What's this about?" 
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message *
                </label>
                <Textarea 
                  id="message"
                  name="message"
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder="Tell us more..."
                  className="min-h-[150px]"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="newsletter" 
                  checked={subscribeNewsletter}
                  onCheckedChange={(checked) => setSubscribeNewsletter(checked as boolean)}
                />
                <label
                  htmlFor="newsletter"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Subscribe to our newsletter for weekly AI insights
                </label>
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                By submitting this form, you agree to our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </form>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;
