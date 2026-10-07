"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  className: string;
  activeClassName: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  exact?: boolean;
}

/**
 * A Link that automatically applies activeClassName when the current
 * pathname matches the href (exact match or prefix match).
 */
export default function NavLink({
  href,
  className,
  activeClassName,
  children,
  style,
  exact = false,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`${className}${isActive ? ` ${activeClassName}` : ""}`}
      style={style}
    >
      {children}
    </Link>
  );
}
