"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { user, loading: authLoading, getToken } = useAuth();
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const acceptInvite = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Missing invitation token.");
        return;
      }
      if (authLoading) return;
      if (!user) return;

      try {
        setStatus("loading");
        const idToken = await getToken();
        const response = await fetch("/api/store/users/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        if (!response.ok) {
          setStatus("error");
          setMessage(data?.error || "Failed to accept invitation.");
          return;
        }

        setStatus("success");
        setMessage(data?.message || "Invitation accepted. Waiting for approval.");
      } catch (err) {
        setStatus("error");
        setMessage(err?.message || "Failed to accept invitation.");
      }
    };

    acceptInvite();
  }, [token, user, authLoading, getToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Store Invitation
        </h1>
        <p className="text-slate-600 mb-6">
          Accept your invitation to join the store team.
        </p>

        {!token && (
          <div className="text-red-600 bg-red-50 border border-red-200 rounded p-3">
            Missing invitation token.
          </div>
        )}

        {token && authLoading && (
          <div className="text-slate-600">Checking your account…</div>
        )}

        {token && !authLoading && !user && (
          <div className="space-y-4">
            <div className="text-slate-700">
              Please sign in to accept this invitation.
            </div>
            <div className="flex items-center justify-center gap-3">
              <Link
                href={`/sign-in?redirect_to=/store/invite/accept?token=${token}`}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Sign in
              </Link>
              <Link
                href={`/sign-up?redirect_to=/store/invite/accept?token=${token}`}
                className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Create account
              </Link>
            </div>
          </div>
        )}

        {token && user && status === "loading" && (
          <div className="text-slate-600">Accepting invitation…</div>
        )}

        {token && user && status === "success" && (
          <div className="text-green-700 bg-green-50 border border-green-200 rounded p-3">
            {message}
            <div className="mt-3">
              <button
                onClick={() => router.push("/store")}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >
                Go to store dashboard
              </button>
            </div>
          </div>
        )}

        {token && user && status === "error" && (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
