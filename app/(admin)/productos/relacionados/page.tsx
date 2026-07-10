import RelatedProductsDashboard from "@/src/shared/components/dashboard/RelatedProductsDashboard";

import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
  title: "Dashboard de Productos Relacionados - Admin",
};

export default function RelatedProductsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <RelatedProductsDashboard />
    </div>
  );
}