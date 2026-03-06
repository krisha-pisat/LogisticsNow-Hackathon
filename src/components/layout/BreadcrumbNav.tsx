'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from 'react';

function capitalizeFirstLetter(string: string) {
  // Handle hyphenated routes like 'lane-analysis'
  return string.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function BreadcrumbNav() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  if (paths.length === 0) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
        </BreadcrumbItem>
        {paths.map((path, index) => {
          const isLast = index === paths.length - 1;
          const href = `/${paths.slice(0, index + 1).join('/')}`;

          return (
            <React.Fragment key={path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{capitalizeFirstLetter(path)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{capitalizeFirstLetter(path)}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
