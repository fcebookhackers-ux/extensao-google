import { cn } from "@/lib/utils";

type Strength = "empty" | "weak" | "medium" | "strong";

function getStrength(password: string): Strength {
  if (!password) return "empty";
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z\d]/.test(password);
  const longEnough = password.length >= 10;

  const score = [hasLetter, hasNumber, hasSpecial, longEnough].filter(Boolean).length;
  if (password.length < 8) return "weak";
  if (score <= 2) return "medium";
  return "strong";
}

export function PasswordStrength({ password }: { password: string }) {
  const strength = getStrength(password);
  const bars = strength === "empty" ? 0 : strength === "weak" ? 1 : strength === "medium" ? 2 : 3;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-1 rounded-full bg-muted",
              idx < bars &&
                (strength === "weak"
                  ? "bg-destructive"
                  : strength === "medium"
                    ? "bg-secondary"
                    : "bg-brand-primary-light"),
            )}
          />
        ))}
      </div>
      {strength !== "empty" && (
        <p
          className={cn(
            "text-xs",
            strength === "weak"
              ? "text-destructive"
              : strength === "medium"
                ? "text-muted-foreground"
                : "text-brand-primary-light",
          )}
        >
          Força da senha: {strength === "weak" ? "fraca" : strength === "medium" ? "média" : "forte"}
        </p>
      )}
    </div>
  );
}
