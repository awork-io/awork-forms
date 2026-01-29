import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmptyStateCardProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  iconWrapperClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function EmptyStateCard({
  icon,
  title,
  description,
  action,
  className,
  headerClassName,
  contentClassName,
  iconWrapperClassName,
  titleClassName,
  descriptionClassName,
}: EmptyStateCardProps) {
  return (
    <Card className={className}>
      <CardHeader className={cn('text-center', headerClassName)}>
        <div className={cn('mx-auto flex items-center justify-center', iconWrapperClassName)}>
          {icon}
        </div>
        <CardTitle className={titleClassName}>{title}</CardTitle>
        {description ? (
          <CardDescription className={descriptionClassName}>{description}</CardDescription>
        ) : null}
      </CardHeader>
      {action ? (
        <CardContent className={cn('text-center', contentClassName)}>{action}</CardContent>
      ) : null}
    </Card>
  );
}
