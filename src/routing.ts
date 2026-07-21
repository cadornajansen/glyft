export type Route = "landing" | "editor" | "notfound";

export function resolveAppRoute(pathname: string): Route {
  // Normalize path: trim trailing slash unless it's just "/"
  const cleanPath =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  const normalized = cleanPath.toLowerCase();
  if (normalized === "/" || normalized === "/index.html" || normalized === "") {
    return "landing";
  }
  if (normalized === "/editor") {
    return "editor";
  }
  return "landing";
}
