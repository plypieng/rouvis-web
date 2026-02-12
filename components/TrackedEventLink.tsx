'use client';

import Link, { type LinkProps } from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

import { trackUXEvent, type UXEventProperties } from '@/lib/analytics';

type TrackedEventLinkProps = LinkProps & {
  className?: string;
  children: ReactNode;
  eventName: string;
  eventProperties?: UXEventProperties;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  'data-testid'?: string;
};

export default function TrackedEventLink({
  className,
  children,
  eventName,
  eventProperties,
  onClick,
  ...linkProps
}: TrackedEventLinkProps) {
  return (
    <Link
      {...linkProps}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        void trackUXEvent(eventName, eventProperties);
      }}
    >
      {children}
    </Link>
  );
}
