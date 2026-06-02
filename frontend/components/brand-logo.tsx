import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  href?: string;
  className?: string;
  imageClassName?: string;
}

export function BrandLogo({ href = "/dashboard", className, imageClassName }: BrandLogoProps) {
  const image = (
    <Image
      src="/logo-pequenos-cariocas.png"
      alt="Programa Pequenos Cariocas — Prefeitura do Rio"
      width={220}
      height={80}
      priority
      className={cn("h-14 w-auto object-contain sm:h-16", imageClassName)}
    />
  );

  if (!href) {
    return <div className={className}>{image}</div>;
  }

  return (
    <Link href={href} className={cn("inline-flex shrink-0", className)}>
      {image}
    </Link>
  );
}
