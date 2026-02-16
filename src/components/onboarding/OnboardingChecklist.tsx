import * as React from "react";
import { ArrowRight, CheckCircle2, Circle, ExternalLink, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { steps, completionRate, nextStep, isCompleted, completedSteps, totalSteps, isLoading } = useOnboarding();

  const dismissedKey = React.useMemo(
    () => (user ? `onboarding_checklist_dismissed_${user.id}` : null),
    [user],
  );
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (!dismissedKey) return;
    try {
      setDismissed(localStorage.getItem(dismissedKey) === "true");
    } catch {
      setDismissed(false);
    }
  }, [dismissedKey]);

  const dismiss = () => {
    setDismissed(true);
    if (!dismissedKey) return;
    try {
      localStorage.setItem(dismissedKey, "true");
    } catch {
      // ignore
    }
  };

  if (!user) return null;
  if (isCompleted || dismissed) return null;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2">
              Configure sua conta
              <Badge variant="secondary" className="font-normal">
                {completedSteps}/{totalSteps} concluídos
              </Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Complete estes passos para aproveitar ao máximo o ZapFllow.</p>
          </div>

          <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dispensar checklist">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-medium">{Math.round(completionRate * 100)}%</span>
          </div>
          <Progress value={Math.round(completionRate * 100)} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando onboarding…</div>
        ) : (
          <ul className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const isNext = nextStep?.id === step.id;

              return (
                <li key={step.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 rounded-md border bg-muted p-2">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {step.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="truncate text-sm font-medium">{step.title}</div>
                        {isNext ? <Badge variant="outline">Próximo</Badge> : null}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{step.description}</div>

                      {step.helpArticle && !step.completed ? (
                        <a
                          href={step.helpArticle}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                        >
                          Saiba mais <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {!step.completed && step.action ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (step.action?.onClick) return step.action.onClick();
                        if (step.action?.path) navigate(step.action.path);
                      }}
                      className="shrink-0"
                    >
                      {step.action.label}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
