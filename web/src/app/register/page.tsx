"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/chat");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <AuthForm
        mode="register"
        onSubmit={async ({ email, password, name }) => {
          await register(email, password, name!);
          router.replace("/chat");
        }}
      />
    </div>
  );
}
