import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 533.5 544.3" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.2H272v95h146.9c-6.3 34-25 62.8-53.3 82v68h86.2c50.5-46.5 81.7-115 81.7-194.8z"
      />
      <path
        fill="#34A853"
        d="M272 544.3c72.6 0 133.6-24.1 178.1-65.3l-86.2-68c-24 16.1-54.7 25.6-91.9 25.6-70.6 0-130.5-47.7-152-111.7h-89v70.2C75.7 475.2 167.2 544.3 272 544.3z"
      />
      <path
        fill="#FBBC05"
        d="M120 324.9c-10.5-31.5-10.5-65.3 0-96.8V158H31c-39 77.9-39 170.4 0 248.3l89-70.2z"
      />
      <path
        fill="#EA4335"
        d="M272 107.7c39.5-.6 77.6 14 106.6 40.9l79.4-79.4C406.3 24.7 345.3 0 272 0 167.2 0 75.7 69.1 31 158l89 70.1C141.5 155.4 201.4 107.7 272 107.7z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void;
  loading?: boolean;
  label: string;
}) {
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick} disabled={loading}>
      <GoogleIcon />
      {label}
    </Button>
  );
}
