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
}

export function DataState({
  status,
  loadingText = 'Loading…',
  errorText = 'Something went wrong.',
  emptyText = 'No data available.',
  onRetry,
}: DataStateProps) {
  if (status === 'loading') {
    return (
      <Card elevation="none" style="outline">
        <CardTitle className="flex justify-center items-center gap-3 text-gray-700">
          <Spinner />
          <span className="text-sm">{loadingText}</span>
        </CardTitle>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card elevation="none" style="outline">
        <CardTitle className="flex flex-col items-center gap-3">
          <Icon path={mdiAlertOutline} colorScheme="danger" />
          <p className="text-sm text-center text-gray-700">{errorText}</p>
        </CardTitle>

        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <Icon path={mdiRefresh} colorScheme="neutral" className="mr-2" />
            Retry
          </Button>
        )}
      </Card>
    );
  }

  if (status === 'empty') {
    return (
      <Card elevation="none" style="outline">
        <CardTitle className="text-sm text-center text-gray-700">
          {emptyText}
        </CardTitle>
      </Card>
    );
  }

  return null;
}
