import { AuthCardLayout } from "@/components/auth/AuthCardLayout";

export function AuthShell({ title, description, children }: React.PropsWithChildren<{ title: string; description: string }>) {
  return (
    <AuthCardLayout title={title} subtitle={description}>
      {children}
    </AuthCardLayout>
  );
}
