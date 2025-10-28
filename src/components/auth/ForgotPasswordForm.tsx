import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setMessage("Password reset link sent. Please check your email.");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">{error}</div>}
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">{message}</div>
      )}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full">
        Send Reset Link
      </Button>
    </form>
  );
}
