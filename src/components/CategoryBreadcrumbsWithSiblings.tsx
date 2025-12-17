import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "./ui/breadcrumb";
import { Badge } from "./ui/badge";

interface CategoryBreadcrumbsWithSiblingsProps {
  currentCategorySlug: string;
  currentCategoryName: string;
}

const mainCategories = [
  { name: "News", slug: "news" },
  { name: "Business", slug: "business" },
  { name: "Life", slug: "life" },
  { name: "Learn", slug: "learn" },
  { name: "Create", slug: "create" },
  { name: "Voices", slug: "voices" },
];

const CategoryBreadcrumbsWithSiblings = ({ 
  currentCategorySlug, 
  currentCategoryName 
}: CategoryBreadcrumbsWithSiblingsProps) => {
  // Get sibling categories (exclude current)
  const siblingCategories = mainCategories.filter(c => c.slug !== currentCategorySlug);

  return (
    <div className="mb-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{currentCategoryName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Sibling category suggestions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Also explore:</span>
        {siblingCategories.slice(0, 4).map((category) => (
          <Link key={category.slug} to={`/${category.slug}`}>
            <Badge 
              variant="secondary" 
              className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer text-xs"
            >
              {category.name}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CategoryBreadcrumbsWithSiblings;
