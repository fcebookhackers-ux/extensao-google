import * as React from "react";
import { Sparkles } from "lucide-react";

import type { Contact } from "@/types/contacts";
import { useContactDetails, useEnrichContact, useReviewContactEnrichment } from "@/hooks/useContactDetails";
import { cn } from "@/lib/utils";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function hasSuggestions(contact: Contact) {
  return Boolean(
    (contact.ai_name_suggestion && contact.ai_name_suggestion.trim()) ||
      (contact.ai_category_suggestion && contact.ai_category_suggestion.trim()) ||
      (contact.ai_tags_suggestion && contact.ai_tags_suggestion.length) ||
      (contact.ai_sentiment_suggestion && contact.ai_sentiment_suggestion.trim()) ||
      (contact.ai_summary_suggestion && contact.ai_summary_suggestion.trim()),
  );
}

export function ContactEnrichmentReviewSheet({
  open,
  onOpenChange,
  contactId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string | null;
}) {
  const contactQuery = useContactDetails(open ? contactId : null);
  const review = useReviewContactEnrichment();
  const enrich = useEnrichContact();

  const contact = contactQuery.data;
  const pending = contact?.ai_review_status === "pending";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Contato</SheetTitle>
          <SheetDescription>Detalhes e enriquecimento por IA.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {contactQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-[60%]" />
              <Skeleton className="h-4 w-[40%]" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : contactQuery.isError || !contact ? (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Não foi possível carregar o contato.
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm font-semibold">{contact.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{contact.phone ?? "—"}</div>
                {contact.email ? <div className="mt-1 text-sm text-muted-foreground">{contact.email}</div> : null}
                {(contact.tags ?? []).length ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {contact.tags.slice(0, 8).map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full">
                        {t}
                      </Badge>
                    ))}
                    {contact.tags.length > 8 ? (
                      <Badge variant="outline" className="rounded-full">
                        +{contact.tags.length - 8}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <Separator />

              {!hasSuggestions(contact) ? (
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Sem sugestões de IA</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Se já existirem mensagens suficientes para este contato, você pode rodar o enrichment agora.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!contactId || enrich.isPending}
                      onClick={() => contactId && enrich.mutate({ contactId })}
                    >
                      {enrich.isPending ? "Analisando..." : "Rodar IA"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>Enriquecimento de IA disponível</AlertTitle>
                  <AlertDescription>
                    <div className="mt-3 space-y-3">
                      {contact.ai_name_suggestion ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Nome sugerido</p>
                          <p className="text-sm font-medium">{contact.ai_name_suggestion}</p>
                        </div>
                      ) : null}

                      {contact.ai_category_suggestion ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Categoria</p>
                            <Badge variant="outline" className="mt-1 rounded-full">
                              {contact.ai_category_suggestion}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Status: {contact.ai_review_status ?? "pending"}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Status: {contact.ai_review_status ?? "pending"}</div>
                      )}

                      {contact.ai_tags_suggestion?.length ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Interesses / tags sugeridas</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {contact.ai_tags_suggestion.slice(0, 12).map((t) => (
                              <Badge key={t} variant="secondary" className="rounded-full">
                                {t}
                              </Badge>
                            ))}
                            {contact.ai_tags_suggestion.length > 12 ? (
                              <Badge variant="outline" className="rounded-full">
                                +{contact.ai_tags_suggestion.length - 12}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {contact.ai_sentiment_suggestion ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Sentimento</p>
                          <p className="text-sm font-medium">{contact.ai_sentiment_suggestion}</p>
                        </div>
                      ) : null}

                      {contact.ai_summary_suggestion ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Resumo / contexto</p>
                          <p className={cn("text-sm", "whitespace-pre-wrap")}>{contact.ai_summary_suggestion}</p>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          disabled={!pending || review.accept.isPending}
                          onClick={() => review.accept.mutate({ contact })}
                        >
                          {review.accept.isPending ? "Aplicando..." : "Aceitar sugestões"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!pending || review.reject.isPending}
                          onClick={() => contactId && review.reject.mutate({ contactId })}
                        >
                          {review.reject.isPending ? "Salvando..." : "Ignorar"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!contactId || enrich.isPending}
                          onClick={() => contactId && enrich.mutate({ contactId })}
                        >
                          {enrich.isPending ? "Reanalisando..." : "Recalcular"}
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
