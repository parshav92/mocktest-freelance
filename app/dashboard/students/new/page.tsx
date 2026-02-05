"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Copy, Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import Link from "next/link";

function CreateStudentForm() {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdStudent, setCreatedStudent] = useState<{
    student_id: string;
    full_name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const subscriptionId = searchParams.get("subscription");

  useEffect(() => {
    if (!subscriptionId) {
      router.replace("/dashboard");
    }
  }, [subscriptionId, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          password,
          subscriptionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create student");
      }

      setCreatedStudent(data.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (createdStudent) {
      await navigator.clipboard.writeText(
        `Student ID: ${createdStudent.student_id}\nPassword: ${password}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!subscriptionId) {
    return null;
  }

  // Success state
  if (createdStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl">Student Created!</CardTitle>
              <p className="text-muted-foreground mt-2">
                Share these credentials with your student
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Student Name</p>
                  <p className="font-semibold">{createdStudent.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Student ID</p>
                  <p className="font-mono text-lg font-bold text-emerald-600">
                    {createdStudent.student_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Password</p>
                  <p className="font-mono text-lg font-bold">{password}</p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Credentials
                  </>
                )}
              </Button>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Important:</strong> Save these credentials now. The password cannot be recovered later (you can reset it though).
                </p>
              </div>

              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-neutral-900/80">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                  <GraduationCap className="h-7 w-7 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">Create Student Profile</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Enter details for your student account
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Student&apos;s Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Enter student's name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">6-Digit Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••"
                        value={password}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setPassword(val);
                        }}
                        inputMode="numeric"
                        maxLength={6}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter exactly 6 digits. This will be the student&apos;s login password.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={isLoading || password.length !== 6 || !fullName.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Student"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function CreateStudentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <CreateStudentForm />
    </Suspense>
  );
}
