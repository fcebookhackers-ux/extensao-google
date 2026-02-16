import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/logo_zapfllow_novo.png";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthCardLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link
            to="/"
            className="grid h-12 w-12 place-items-center rounded-xl bg-muted p-1"
            aria-label="Ir para a página inicial"
          >
            <img src={logo} alt="Logo ZapFllow" className="h-10 w-10" />
          </Link>
          <p className="mt-3 text-sm font-semibold">ZapFllow</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
