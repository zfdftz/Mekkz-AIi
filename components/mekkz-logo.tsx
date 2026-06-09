import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

type MekkzLogoProps = {
  size?: number;
  showText?: boolean;
  textClassName?: string;
  className?: string;
  href?: Route;
};

export function MekkzLogo({
  size = 40,
  showText = true,
  textClassName = "text-base font-semibold tracking-[0.12em] sm:text-lg",
  className = "",
  href
}: MekkzLogoProps) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/icon-192.png"
        alt="mekkz AI Logo"
        width={size}
        height={size}
        className="rounded-xl object-cover shadow-[0_0_18px_rgba(34,197,94,0.35)]"
        priority
      />
      {showText ? <span className={textClassName}>mekkz AI</span> : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
