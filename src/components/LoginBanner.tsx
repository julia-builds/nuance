import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

interface LoginBannerProps {
  className?: string;
}

const LoginBanner = ({ className = "" }: LoginBannerProps) => {
  const navigate = useNavigate();

  return (
    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-2xl ${className}`}>
      <div className="flex flex-col items-center gap-3 text-center px-4">
        <div className="w-10 h-10 rounded-full bg-cta/15 flex items-center justify-center">
          <Lock className="w-5 h-5 text-cta" />
        </div>
        <p className="text-sm font-semibold text-foreground">Create free account to save progress</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/auth");
          }}
          className="px-6 py-2 rounded-xl bg-cta text-cta-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default LoginBanner;
