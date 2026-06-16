"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (data: { email: string; password: string; name?: string }) => Promise<void>;
}

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onSubmit({ email, password, name: mode === "register" ? name : undefined });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-600/30">
          C
        </div>
        <h1 className="text-2xl font-bold text-white">CampusWeb</h1>
        <p className="mt-2 text-sm text-slate-400">
          {mode === "login"
            ? "Sign in to connect with your campus"
            : "Create your account and join the conversation"}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur"
      >
        {mode === "register" && (
          <div className="mb-4">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-300">
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Alex Johnson"
            />
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="you@university.edu"
          />
          {mode === "register" && (
            <p className="mt-1.5 text-xs text-slate-500">
              University emails (.edu, .ac.in, .in.ac) or Gmail accepted
            </p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-400">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-indigo-400 hover:text-indigo-300">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
