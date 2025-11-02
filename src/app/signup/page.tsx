import { Suspense } from "react";

import { SignupView } from "./signup-view";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function SignupPage({ searchParams }: PageProps) {
  const roleParam = searchParams?.role;
  const initialRole = Array.isArray(roleParam) ? roleParam[0] : roleParam;

  return (
    <Suspense fallback={null}>
      <SignupView initialRole={initialRole} />
    </Suspense>
  );
}
