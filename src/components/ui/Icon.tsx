import type { SVGProps } from "react";

export type IconName =
  | "arrow-right"
  | "bell"
  | "bolt"
  | "brick"
  | "briefcase"
  | "chevron-right"
  | "clipboard"
  | "droplet"
  | "home"
  | "map-pin"
  | "paint"
  | "plus"
  | "search"
  | "snowflake"
  | "user"
  | "wrench";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

export function Icon({ name, className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {name === "arrow-right" && (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      )}
      {name === "bell" && (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </>
      )}
      {name === "bolt" && <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />}
      {name === "brick" && (
        <>
          <path d="M3 5h18v14H3z" />
          <path d="M3 10h18M3 15h18M8 5v5m8-5v5m-5 0v5m-5 0v4m10-4v4" />
        </>
      )}
      {name === "briefcase" && (
        <>
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
        </>
      )}
      {name === "chevron-right" && <path d="m9 18 6-6-6-6" />}
      {name === "clipboard" && (
        <>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4.5V3h6v1.5M9 10h6m-6 4h6m-6 4h3" />
        </>
      )}
      {name === "droplet" && <path d="M12 2S5 9.4 5 14a7 7 0 0 0 14 0c0-4.6-7-12-7-12Z" />}
      {name === "home" && (
        <>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h14V10M9 20v-6h6v6" />
        </>
      )}
      {name === "map-pin" && (
        <>
          <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      )}
      {name === "paint" && (
        <>
          <path d="M4 5h11v6H4zM15 8h3a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-6v3" />
          <path d="M10 16h4v6h-4z" />
        </>
      )}
      {name === "plus" && <path d="M12 5v14M5 12h14" />}
      {name === "search" && (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </>
      )}
      {name === "snowflake" && (
        <>
          <path d="M12 2v20M4.2 6.5l15.6 11M4.2 17.5l15.6-11" />
          <path d="m9 4 3 2 3-2M9 20l3-2 3 2M4.5 10l3 .2.8-2.8m11.2 6.6-3-.2-.8 2.8M4.5 14l3-.2.8 2.8m11.2-6.6-3 .2-.8-2.8" />
        </>
      )}
      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
      {name === "wrench" && (
        <path d="M21 6.5a6 6 0 0 1-7.8 5.7L6.4 19A2 2 0 0 1 3.6 16.2l6.8-6.8A6 6 0 0 1 17.5 2L14 5.5l4.5 4.5L21 6.5Z" />
      )}
    </svg>
  );
}
