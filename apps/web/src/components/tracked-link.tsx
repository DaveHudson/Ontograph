'use client';

import { usePostHog } from 'posthog-js/react';

interface TrackedLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  event: string;
  properties?: Record<string, string>;
}

export function TrackedLink({ event, properties, children, ...props }: TrackedLinkProps) {
  const ph = usePostHog();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: analytics wrapper — href is always provided by caller
    <a
      {...props}
      // biome-ignore lint/a11y/useValidAnchor: analytics wrapper — href is always provided by caller
      onClick={(e) => {
        ph?.capture(event, properties);
        props.onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
