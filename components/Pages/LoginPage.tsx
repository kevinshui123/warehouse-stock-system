"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useAuth } from "@/contexts";
import { useLanguage } from "@/contexts/language-context";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const testAccounts = {
  "guest-user": {
    email: "test@admin.com",
    password: "12345678",
  },
  "guest-supplier": {
    email: "test@supplier.com",
    password: "12345678",
  },
  "guest-client": {
    email: "test@client.com",
    password: "12345678",
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigatingToHome, setIsNavigatingToHome] = useState(false);
  const [selectMounted, setSelectMounted] = useState(false);
  const { login, isLoggedIn, user } = useAuth();
  const { t } = useLanguage();

  useLayoutEffect(() => {
    setSelectMounted(true);
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const navigatingFromSubmitRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn && !navigatingFromSubmitRef.current) {
      const dest =
        user?.role === "client"
          ? "/client"
          : user?.role === "supplier"
            ? "/supplier"
            : "/";
      window.location.href = dest;
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      let errorMessage = t("auth.oauthError");

      switch (error) {
        case "oauth_not_configured":
          errorMessage = t("auth.oauthNotConfigured");
          break;
        case "oauth_failed":
          errorMessage = t("auth.oauthCancelled");
          break;
        case "invalid_state":
          errorMessage = t("auth.invalidOAuthState");
          break;
        case "no_code":
          errorMessage = t("auth.oauthCodeMissing");
          break;
        case "token_exchange_failed":
          errorMessage = t("auth.tokenExchangeFailed");
          break;
        case "fetch_user_failed":
          errorMessage = t("auth.fetchUserFailed");
          break;
        case "no_email":
          errorMessage = t("auth.emailRequired");
          break;
        case "oauth_processing_failed":
        case "oauth_error":
          errorMessage = t("auth.oauthProcessingError");
          break;
        default:
          errorMessage = `OAuth error: ${error}. ${t("auth.pleaseTryAgain")}`;
      }

      toast({
        title: t("auth.googleSignInFailed"),
        description: errorMessage,
        variant: "destructive",
      });

      router.replace("/login");
    }
  }, [searchParams, router, toast, t]);

  const handleRoleSelect = (value: string) => {
    if (value === "clear") {
      setSelectedRole("");
      setEmail("");
      setPassword("");
    } else {
      setSelectedRole(value);
      const account = testAccounts[value as keyof typeof testAccounts];
      if (account) {
        setEmail(account.email);
        setPassword(account.password);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const redirectUrl = searchParams.get("redirect") || "/";
      const oauthUrl = `/api/auth/oauth/google?callback=${encodeURIComponent(
        redirectUrl,
      )}`;
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      toast({
        title: t("auth.oauthError"),
        description: t("auth.failedToInitiateOAuth"),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userData = await login(email, password);

      const userName = userData.name || userData.email.split("@")[0] || "User";

      navigatingFromSubmitRef.current = true;
      setIsNavigatingToHome(true);

      toast({
        title: t("auth.welcomeUser", { name: userName }),
        description: t("auth.loginSuccess"),
      });

      setEmail("");
      setPassword("");
      setSelectedRole("");

      const dest =
        userData.role === "client"
          ? "/client"
          : userData.role === "supplier"
            ? "/supplier"
            : "/";
      window.location.href = dest;
    } catch (error: unknown) {
      const axiosErr = error as {
        response?: { data?: { error?: string }; status?: number };
      };
      const serverMessage = axiosErr?.response?.data?.error;
      toast({
        title: t("auth.loginFailed"),
        description:
          serverMessage || t("auth.invalidCredentials"),
        variant: "destructive",
      });
    } finally {
      if (!navigatingFromSubmitRef.current) setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.12),transparent_65%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.12),transparent_65%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.3),transparent_60%)] dark:bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05),transparent_60%)]"></div>

      <div className="relative z-10 w-full flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md rounded-[28px] border border-sky-400/30 dark:border-white/10 bg-gradient-to-br from-sky-500/25 via-sky-500/10 to-sky-500/5 dark:from-white/5 dark:via-white/5 dark:to-white/5 backdrop-blur-sm shadow-[0_30px_80px_rgba(2,132,199,0.35)] dark:shadow-lg p-4 sm:p-8 transition-all duration-300 hover:shadow-[0_40px_100px_rgba(2,132,199,0.5)] dark:hover:shadow-[0_40px_100px_rgba(2,132,199,0.4)] hover:border-sky-300/50 dark:hover:border-sky-300/30">
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl sm:text-2xl font-semibold text-gray-900 dark:text-white text-center">
              {t("auth.welcomeBack")}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-white/70 text-center">
              {t("auth.signInToContinue")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-white/80">
                {t("demo.testAccountsToLoginWith")}
              </label>
              {!selectMounted ? (
                <div
                  className="flex h-11 w-full items-center justify-between rounded-md border border-sky-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-500 dark:text-white/40"
                  aria-hidden
                >
                  {t("demo.selectRoleBasedTestAccount")}
                </div>
              ) : (
                <Select
                  key={`select-${selectedRole || "empty"}`}
                  value={selectedRole || undefined}
                  onValueChange={handleRoleSelect}
                >
                  <SelectTrigger className="w-full border-sky-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus:border-sky-400 focus:ring-sky-500/50">
                    <SelectValue placeholder={t("demo.selectRoleBasedTestAccount")} />
                  </SelectTrigger>
                  <SelectContent
                    className="border-sky-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm z-[100]"
                    position="popper"
                    sideOffset={5}
                    align="start"
                  >
                    <SelectItem
                      value="guest-user"
                      className="cursor-pointer text-gray-900 dark:text-white focus:bg-sky-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                    >
                      {t("demo.adminAccount")}
                    </SelectItem>
                    <SelectItem
                      value="guest-supplier"
                      className="cursor-pointer text-gray-900 dark:text-white focus:bg-sky-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                    >
                      {t("demo.supplierAccount")}
                    </SelectItem>
                    <SelectItem
                      value="guest-client"
                      className="cursor-pointer text-gray-900 dark:text-white focus:bg-sky-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                    >
                      {t("demo.clientAccount")}
                    </SelectItem>
                    {selectedRole && (
                      <SelectItem
                        value="clear"
                        className="cursor-pointer text-gray-500 dark:text-white/60 opacity-60 focus:bg-sky-100 dark:focus:bg-white/10 focus:text-gray-500 dark:focus:text-white/60"
                      >
                        {t("demo.clearSelection")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700 dark:text-white/80"
              >
                {t("auth.email")}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.enterYourEmail")}
                required
                className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-sky-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-sky-400 focus-visible:ring-sky-500/50 shadow-[0_10px_30px_rgba(2,132,199,0.15)]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700 dark:text-white/80"
              >
                {t("auth.password")}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.enterYourPassword")}
                required
                className="w-full bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-sky-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-sky-400 focus-visible:ring-sky-500/50 shadow-[0_10px_30px_rgba(2,132,199,0.15)]"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl border border-sky-400/30 dark:border-sky-400/40 bg-gradient-to-r from-sky-500/70 via-sky-500/50 to-sky-500/30 dark:from-sky-500/80 dark:via-sky-500/60 dark:to-sky-500/40 text-white shadow-[0_15px_35px_rgba(2,132,199,0.45)] backdrop-blur-sm transition duration-200 hover:border-sky-300/60 dark:hover:border-sky-300/60 hover:from-sky-500/90 hover:via-sky-500/70 hover:to-sky-500/50 dark:hover:from-sky-500/90 dark:hover:via-sky-500/70 dark:hover:to-sky-500/50 hover:shadow-[0_20px_45px_rgba(2,132,199,0.6)]"
              disabled={isLoading || isNavigatingToHome}
            >
              {isNavigatingToHome ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.loadingDashboard")}
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.signingIn")}
                </>
              ) : (
                t("auth.signIn")
              )}
            </Button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-sky-400/20 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-gray-600 dark:text-white/60">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isNavigatingToHome}
            className="w-full border-sky-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-gray-900 dark:text-white hover:bg-white/20 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white mb-6"
          >
            <svg
              className="mr-2 h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("auth.continueWithGoogle")}
          </Button>

          <div className="text-center text-sm">
            <p className="text-gray-600 dark:text-white/70">
              {t("auth.dontHaveAccount")}{" "}
              <Link
                href="/register"
                className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors font-medium"
              >
                {t("auth.signUp")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
