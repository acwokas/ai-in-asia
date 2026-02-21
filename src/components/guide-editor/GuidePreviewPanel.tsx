import GuideRenderer from "@/components/guide/GuideRenderer";

interface GuidePreviewPanelProps {
  formData: any;
}

const GuidePreviewPanel = ({ formData }: GuidePreviewPanelProps) => {
  return (
    <div className="p-6">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-4">Preview</div>
      <GuideRenderer formData={formData} />
    </div>
  );
};

export default GuidePreviewPanel;
