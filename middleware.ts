export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/surveys/:path*",
    "/analytics/:path*",
    "/api/surveys/:path*",
    "/api/responses/:path*",
  ],
}