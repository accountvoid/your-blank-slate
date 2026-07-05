import { ReactNode } from 'react';
import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  children?: ReactNode;
}

export const AdminPlaceholder = ({ title, description, children }: Props) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold tracking-wide">{title}</h1>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
    <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
      <Construction className="h-8 w-8 mx-auto text-primary mb-3" />
      Coming in the next phase.
      {children}
    </div>
  </div>
);

export default AdminPlaceholder;
