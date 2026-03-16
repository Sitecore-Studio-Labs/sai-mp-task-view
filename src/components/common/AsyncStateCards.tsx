"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { mdiAlertOutline, mdiRefresh } from "@mdi/js";

export function LoadingCard({ message = "Loading…", isFlat = false }: { message?: string; isFlat?: boolean }) {
  return (
    <Card elevation="none" style={isFlat ? "flat" : "outline"}>
      <CardTitle className="flex justify-center items-center gap-3 text-muted-foreground">
        <Spinner />
        <span className="text-sm">{message}</span>
      </CardTitle>
    </Card>
  );
}

export function ErrorCard({
  message = "Something went wrong.",
  onRetry,
  isFlat = false,
}: {
  message?: string;
  onRetry?: () => void;
  isFlat?: boolean;
}) {
  return (
    <Card elevation="none" style={isFlat ? "flat" : "outline"}>
      <CardTitle className="flex flex-col items-center gap-3">
        <Icon path={mdiAlertOutline} variant="subtle" colorScheme="danger" />
        <p className="text-sm text-center text-muted-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <Icon path={mdiRefresh} colorScheme="neutral" className="mr-2" />
            Retry
          </Button>
        )}
      </CardTitle>
    </Card>
  );
}

export function EmptyCard({ message="Nothing to show", isFlat = false }: { message?: string; isFlat?: boolean }) {
  return (
    <Card elevation="none" style={isFlat ? "flat" : "outline"}>
      <CardTitle className="text-sm text-muted-foreground text-center">
        {message}
      </CardTitle>
    </Card>
  );
}
