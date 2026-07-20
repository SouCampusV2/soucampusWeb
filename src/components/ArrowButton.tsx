import { ArrowCircle } from "@/components/ArrowCircle";

type Props = {
  direction: "left" | "right";
  onClick: () => void;
  disabled?: boolean;
  colorClassName?: string;
};

export const ArrowButton = ({
  direction,
  onClick,
  disabled = false,
  colorClassName = "bg-orange-500 hover:bg-orange-600 dark:bg-orange-400 dark:hover:bg-orange-500 text-white",
}: Props) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={direction === "left" ? "Previous" : "Next"}
    className="cursor-pointer transition-transform active:scale-90 disabled:cursor-default disabled:opacity-30"
  >
    <ArrowCircle direction={direction} className="h-11 w-11" colorClassName={colorClassName} />
  </button>
);
