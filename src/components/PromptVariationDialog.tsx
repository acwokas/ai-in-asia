import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface PromptVariationDialogProps {
  promptItemId: string;
  articleId: string;
  originalPrompt: string;
}

export const PromptVariationDialog = ({ 
  promptItemId, 
  articleId, 
  originalPrompt 
}: PromptVariationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [variation, setVariation] = useState('');
  const [explanation, setExplanation] = useState('');

  const submitVariation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from('prompt_variations')
        .insert({
          user_id: user.id,
          original_prompt_id: promptItemId,
          original_article_id: articleId,
          variation_text: variation,
          explanation: explanation,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-variations'] });
      setOpen(false);
      setVariation('');
      setExplanation('');
      toast({
        title: "Variation submitted!",
        description: "Your variation will be reviewed. You'll earn 25 points if approved!",
      });
    },
    onError: (error: Error) => {
      if (error.message === "Must be logged in") {
        toast({
          title: "Sign in required",
          description: "Please sign in to submit variations.",
          action: (
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          ),
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit variation",
          variant: "destructive",
        });
      }
    },
  });

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/auth')}
        className="gap-2"
      >
        <Lightbulb className="h-4 w-4" />
        Share Variation
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Lightbulb className="h-4 w-4" />
          Share Variation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Your Variation</DialogTitle>
          <DialogDescription>
            Improve this prompt and earn 25 points if approved!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Original Prompt</Label>
            <div className="mt-2 p-3 bg-muted/50 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {originalPrompt}
              </pre>
            </div>
          </div>

          <div>
            <Label htmlFor="variation">Your Improved Version *</Label>
            <Textarea
              id="variation"
              value={variation}
              onChange={(e) => setVariation(e.target.value)}
              placeholder="Enter your improved prompt..."
              className="min-h-[120px] font-mono text-sm mt-2"
            />
          </div>

          <div>
            <Label htmlFor="explanation">What Makes It Better? *</Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain how your variation improves the original prompt..."
              className="min-h-[80px] mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => submitVariation.mutate()}
            disabled={!variation.trim() || !explanation.trim() || submitVariation.isPending}
          >
            Submit for Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};