import { Suspense } from "react";

import { LoginView } from "./login-view";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams }: PageProps) {
  const roleParam = searchParams?.role;
  const initialRole =
    typeof roleParam === "string" ? roleParam : Array.isArray(roleParam) ? roleParam[0] : undefined;

  return (
    <Suspense fallback={null}>
      <LoginView initialRole={initialRole} />
    </Suspense>
  );
}
