import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  locale: string;
  items: Crumb[];
};

export default function Breadcrumbs({ locale, items }: Props) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? (
            <Link className="hover:text-zinc-900" href={`/${locale}${item.href}`}>
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-700">{item.label}</span>
          )}
          {index < items.length - 1 ? <span className="text-zinc-300">/</span> : null}
        </span>
      ))}
    </nav>
  );
}
