import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [from, navigate, user]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth`
      }
    });
    setGoogleLoading(false);
    if (error) {
      toast({ title: "Couldn't sign in with Google", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const COOLDOWN_MS = 10 * 60 * 1000;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const lastRequest = localStorage.getItem("nuance-last-reset-request");
    if (lastRequest && Date.now() - Number(lastRequest) < COOLDOWN_MS) {
      const minutesLeft = Math.ceil((COOLDOWN_MS - (Date.now() - Number(lastRequest))) / 60000);
      toast({ title: "Slow down a bit", description: `You can request another reset in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`, variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`
    });
    setForgotLoading(false);
    if (error) {
      toast({ title: "Couldn't send reset link", description: "Please check your email address and try again.", variant: "destructive" });
    } else {
      localStorage.setItem("nuance-last-reset-request", String(Date.now()));
      toast({ title: "Check your email", description: "We sent you a password reset link." });
      setShowForgot(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(signInEmail, signInPassword);
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't sign you in", description: "Please check your email and password and try again.", variant: "destructive" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedPrivacy) {
      toast({ title: "One more step", description: "Please accept the Privacy Policy to create your account.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(signUpEmail, signUpPassword, signUpName);
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't create your account", description: "This email may already be registered. Try signing in instead.", variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a verification link." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="flex items-center px-6 py-5 max-w-5xl mx-auto w-full">
        <button onClick={() => navigate("/")} className="hover:opacity-80 transition-opacity">
          <Logo className="h-8" />
        </button>
      </nav>

      {/* Auth Card */}
      <div className="flex-1 flex items-start justify-center px-6 pt-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl text-center mb-6 font-semibold">Welcome to Nuance</h1>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border bg-card font-semibold text-base hover:bg-muted/50 transition-colors disabled:opacity-50">
                
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                {googleLoading ? "Signing in…" : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3 my-5">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required />
                  
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <PasswordInput
                    id="signin-password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required />
                  
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-cta text-cta-foreground font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50ba">
                  
                  {loading ? "Signing in…" : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => {setShowForgot(true);setForgotEmail(signInEmail);}}
                  className="w-full text-base text-muted-foreground hover:text-foreground transition-colors mt-2">
                  
                  Forgot password?
                </button>
              </form>

              {showForgot &&
              <form onSubmit={handleForgotPassword} className="mt-4 space-y-3 border-t pt-4 border-border">
                  <p className="text-sm text-muted-foreground">Enter your email to receive a reset link.</p>
                  <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required />
                
                  <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 rounded-xl bg-cta text-cta-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                  
                    {forgotLoading ? "Sending…" : "Send Reset Link"}
                  </button>
                  <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  
                    Cancel
                  </button>
                </form>
              }
            </TabsContent>

            <TabsContent value="signup">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border bg-card font-semibold text-base hover:bg-muted/50 transition-colors disabled:opacity-50">
                
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                {googleLoading ? "Signing up…" : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3 my-5">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Display Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)} />
                  
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required />
                  
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput
                    id="signup-password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    minLength={6} />
                  
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="privacy-agree"
                    checked={agreedPrivacy}
                    onCheckedChange={(v) => setAgreedPrivacy(v === true)}
                    className="mt-0.5" />
                  
                  <Label htmlFor="privacy-agree" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                    I agree to the{" "}
                    <Link to="/privacy" className="text-cta underline hover:opacity-80" target="_blank">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                <button
                  type="submit"
                  disabled={loading || !agreedPrivacy}
                  className="w-full py-3 rounded-xl bg-cta text-cta-foreground font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50">
                  
                  {loading ? "Creating account…" : "Sign Up"}
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>);

};

export default Auth;