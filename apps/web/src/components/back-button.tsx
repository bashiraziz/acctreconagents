import Link from "next/link";

interface BackButtonProps {
  href: string;
  label: string;
}

export function BackButton({ href, label }: BackButtonProps) {
  return (
    <Link href={href} className="btn btn-secondary btn-sm w-fit">
      ← {label}
    </Link>
  );
}
