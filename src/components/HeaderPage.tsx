import { ArrowLeft } from "lucide-react";

interface HeaderPageProps {
  handleBack: () => void;
  title: string;
  subtitle?: string;
}
export const HeaderPage: React.FC<HeaderPageProps> = ({ handleBack, title, subtitle }) => {
  return (
    <header
      className={`flex gap-3 px-5 pb-4 pt-6 md:mx-auto md:w-full md:max-w-[900px] ${subtitle ? "items-start" : "items-center"}`}
    >
      <button onClick={handleBack} className="-ml-2 rounded-full p-2">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div>
        <h1 className="text-lg font-medium">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  );
};
