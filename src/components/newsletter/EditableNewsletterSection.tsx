 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { Sparkles, Pencil, Check, X, Loader2 } from "lucide-react";
 
 interface EditableNewsletterSectionProps {
   label: string;
   description?: string;
   value: string;
   onChange: (value: string) => void;
   onGenerate?: () => Promise<void>;
   onSave: () => void;
   isGenerating?: boolean;
   isSaving?: boolean;
   maxWords?: number;
   placeholder?: string;
   rows?: number;
   disabled?: boolean;
 }
 
 export function EditableNewsletterSection({
   label,
   description,
   value,
   onChange,
   onGenerate,
   onSave,
   isGenerating = false,
   isSaving = false,
   maxWords,
   placeholder,
   rows = 3,
   disabled = false,
 }: EditableNewsletterSectionProps) {
   const [isEditing, setIsEditing] = useState(false);
   const [originalValue, setOriginalValue] = useState(value);
 
   const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
   const isOverLimit = maxWords ? wordCount > maxWords : false;
 
   const handleStartEdit = () => {
     setOriginalValue(value);
     setIsEditing(true);
   };
 
   const handleCancel = () => {
     onChange(originalValue);
     setIsEditing(false);
   };
 
   const handleSave = () => {
     onSave();
     setIsEditing(false);
   };
 
   const handleGenerate = async () => {
     if (onGenerate) {
       await onGenerate();
       setIsEditing(false);
     }
   };
 
   return (
     <div className="p-4 border rounded-lg">
       <div className="flex items-center justify-between mb-3">
         <div className="flex items-center gap-2">
           <Label className="text-base font-semibold">{label}</Label>
           {maxWords && (
             <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
               ({wordCount}/{maxWords} words)
             </span>
           )}
         </div>
         <div className="flex gap-2">
           {onGenerate && (
             <Button
               size="sm"
               variant="outline"
               onClick={handleGenerate}
               disabled={isGenerating || disabled}
               className="bg-purple-500/10 border-purple-500/50 text-purple-700 hover:bg-purple-500/20"
             >
               {isGenerating ? (
                 <Loader2 className="h-3 w-3 animate-spin" />
               ) : (
                 <>
                   <Sparkles className="h-3 w-3 mr-1" />
                   Generate
                 </>
               )}
             </Button>
           )}
           {!isEditing && value && (
             <Button
               size="sm"
               variant="ghost"
               onClick={handleStartEdit}
               disabled={disabled}
             >
               <Pencil className="h-3 w-3 mr-1" />
               Edit
             </Button>
           )}
         </div>
       </div>
 
       {description && (
         <p className="text-xs text-muted-foreground mb-2">{description}</p>
       )}
 
       {isEditing || !value ? (
         <div className="space-y-2">
           <Textarea
             rows={rows}
             placeholder={placeholder}
             value={value}
             onChange={(e) => onChange(e.target.value)}
             className="font-serif"
             disabled={disabled}
           />
           {isEditing && (
             <div className="flex justify-end gap-2">
               <Button size="sm" variant="ghost" onClick={handleCancel}>
                 <X className="h-3 w-3 mr-1" />
                 Cancel
               </Button>
               <Button size="sm" onClick={handleSave} disabled={isSaving}>
                 {isSaving ? (
                   <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                 ) : (
                   <Check className="h-3 w-3 mr-1" />
                 )}
                 Save
               </Button>
             </div>
           )}
         </div>
       ) : (
         <div className="p-3 bg-muted/50 rounded-md font-serif text-sm leading-relaxed">
           {value}
         </div>
       )}
     </div>
   );
 }