import { motion } from "framer-motion";

interface ReviewProgressBarProps {
  reviewedCount: number;
  totalDue: number;
}

export const ReviewProgressBar: React.FC<ReviewProgressBarProps> = ({
  reviewedCount,
  totalDue,
}) => {
  return (
    <div className="mb-6">
      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
        <span>{reviewedCount} reviewed</span>
        <span>{totalDue - reviewedCount} remaining</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full bg-cta"
          initial={{ width: 0 }}
          animate={{ width: totalDue > 0 ? `${(reviewedCount / totalDue) * 100}%` : "0%" }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
};
