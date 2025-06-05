import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center text-sm text-gray-600">
          <Link href="/" className="hover:text-accent">
            ホーム
          </Link>
          
          {items.map((item, index) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="mx-2 h-4 w-4" />
              {item.href ? (
                <Link href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">{item.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
