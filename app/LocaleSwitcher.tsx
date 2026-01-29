import Link from "next/link";
import { locales, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
};

export default function LocaleSwitcher({ locale }: Props) {
  return (
    <div className="locale-switch">
      {locales.map((item) => (
        <Link
          key={item}
          href={`/${item}`}
          className={item === locale ? "active" : ""}
        >
          {item.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
