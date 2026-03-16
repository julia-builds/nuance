interface LetterAvatarProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-9 h-9 text-sm",
  md: "w-14 h-14 text-lg",
  lg: "w-20 h-20 text-2xl",
};

const LetterAvatar = ({ name, email, avatarUrl, size = "md", className = "" }: LetterAvatarProps) => {
  const display = name || email || "?";
  const letter = display.charAt(0).toUpperCase();
  
  if (avatarUrl) {
    return (
      <div className={`rounded-full overflow-hidden shrink-0 ${sizeMap[size]} ${className}`}>
        <img src={avatarUrl} alt={display} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0 ${sizeMap[size]} ${className}`}
    >
      {letter}
    </div>
  );
};

export default LetterAvatar;
