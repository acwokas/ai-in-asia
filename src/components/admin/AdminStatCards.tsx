import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Mail, Folder, Tag, MessageSquare, User, UserMinus } from "lucide-react";

interface AdminStats {
  articles: number;
  authors: number;
  categories: number;
  tags: number;
  comments: number;
  subscribers: number;
  unsubscribes?: number;
}

interface AdminStatCardsProps {
  stats: AdminStats | undefined;
  userEmail?: string;
  onOpenAuthorsDialog: () => void;
}

export const AdminStatCards = ({ stats, userEmail, onOpenAuthorsDialog }: AdminStatCardsProps) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => navigate("/admin/articles")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.articles || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Click to manage all</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onOpenAuthorsDialog}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Authors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.authors || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Click to manage all</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => navigate("/admin/newsletter-manager")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Newsletter Subscribers</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.subscribers || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Click to manage newsletter</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Categories</CardTitle>
          <Folder className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.categories || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tags</CardTitle>
          <Tag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.tags || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Comments</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.comments || 0}</div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => navigate("/profile")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Profile</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{userEmail}</div>
          <p className="text-xs text-muted-foreground mt-1">Click to view profile</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => navigate("/admin/unsubscribes")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unsubscribes</CardTitle>
          <UserMinus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.unsubscribes || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const AdminStatCardsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    {[...Array(6)].map((_, i) => (
      <Card key={i}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    ))}
  </div>
);
