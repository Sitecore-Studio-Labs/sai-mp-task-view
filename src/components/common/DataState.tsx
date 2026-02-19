import { Card, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { mdiAlertOutline, mdiRefresh } from '@mdi/js';

export type DataStateStatus = 'loading' | 'error' | 'empty' | 'success';

interface DataStateProps {
  status: DataStateStatus;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  onRetry?: () => void;
  outline?: boolean;
}
export function DataState({
  status,
  loadingText = 'Loading…',
  errorText = 'Something went wrong.',
  emptyText = 'No data available.',
  onRetry,
  outline = true,
}: DataStateProps) {
  const contentMap: Record<
    Exclude<DataStateStatus, 'success'>,
    React.ReactNode
  > = {
    loading: (
      <CardTitle className="flex justify-center items-center gap-3 text-muted-foreground">
        <Spinner />
        <span className="text-sm">{loadingText}</span>
      </CardTitle>
    ),

    error: (
      <>
        <CardTitle className="flex flex-col items-center gap-3">
          <Icon path={mdiAlertOutline} colorScheme="danger" />
          <p className="text-sm text-center text-muted-foreground">
            {errorText}
          </p>
        </CardTitle>

        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <Icon path={mdiRefresh} colorScheme="neutral" className="mr-2" />
            Retry
          </Button>
        )}
      </>
    ),

    empty: (
      <CardTitle className="text-sm text-center text-muted-foreground">
        {emptyText}
      </CardTitle>
    ),
  };

  if (status === 'success') return null;

  return (
    <Card elevation="none" style={outline ? 'outline' : 'flat'}>
      {contentMap[status]}
    </Card>
  );
}
