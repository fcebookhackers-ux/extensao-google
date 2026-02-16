import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HelpCircle,
  Search,
  BookOpen,
  Video,
  MessageCircle,
  ExternalLink,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  videoUrl?: string;
}

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "1",
    title: "Como criar sua primeira automação",
    category: "Começando",
    content:
      "Passo a passo completo para criar e publicar sua primeira automação...",
    videoUrl: "https://youtube.com/watch?v=...",
  },
  {
    id: "2",
    title: "Importando contatos em massa",
    category: "Contatos",
    content:
      "Aprenda a importar milhares de contatos de uma vez usando CSV...",
  },
  {
    id: "3",
    title: "Entendendo variáveis em automações",
    category: "Automações",
    content: "Como usar variáveis para personalizar mensagens...",
  },
  {
    id: "4",
    title: "Configurando webhooks",
    category: "Integrações",
    content: "Integre suas automações com sistemas externos...",
  },
];

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(
    null,
  );

  const filteredArticles = HELP_ARTICLES.filter((article) =>
    `${article.title} ${article.content}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full shadow-lg"
          variant="default"
          data-tour="help-button"
          aria-label="Central de ajuda"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Central de Ajuda</DialogTitle>
          <DialogDescription>
            Encontre respostas, tutoriais e suporte.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="docs" className="mt-4">
          <TabsList>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentação
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Vídeos
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Suporte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="docs" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Busque por palavras-chave (ex: automações, contatos)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ScrollArea className="h-72 rounded-md border p-2 md:col-span-1">
                <div className="space-y-2">
                  {filteredArticles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => setSelectedArticle(article)}
                      className="w-full rounded-md border bg-card px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{article.category}</Badge>
                        {article.videoUrl && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                            <Play className="h-3 w-3" /> Vídeo
                          </span>
                        )}
                      </div>
                      <div className="font-medium">{article.title}</div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {article.content}
                      </p>
                    </button>
                  ))}
                  {filteredArticles.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum artigo encontrado para sua pesquisa.
                    </p>
                  )}
                </div>
              </ScrollArea>

              <div className="md:col-span-2">
                {selectedArticle ? (
                  <div className="space-y-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedArticle(null)}
                    >
                      ← Voltar
                    </Button>
                    <div className="space-y-2 rounded-md border bg-card p-4">
                      <Badge variant="outline" className="mb-1">
                        {selectedArticle.category}
                      </Badge>
                      <h3 className="text-lg font-semibold">
                        {selectedArticle.title}
                      </h3>
                      <p className="whitespace-pre-line text-sm text-muted-foreground">
                        {selectedArticle.content}
                      </p>

                      {selectedArticle.videoUrl && (
                        <div className="mt-4 flex items-center justify-between rounded-md bg-muted p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Play className="h-4 w-4" />
                            <span>Tutorial em Vídeo</span>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={selectedArticle.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Assistir no YouTube
                              <ExternalLink className="ml-2 h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    Selecione um artigo na lista ao lado para ver os detalhes.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="videos" className="mt-4">
            <div className="flex h-72 flex-col items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              <Video className="mb-2 h-6 w-6" />
              Biblioteca de vídeos em breve.
            </div>
          </TabsContent>

          <TabsContent value="support" className="mt-4 space-y-4">
            <div className="rounded-md border bg-card p-4">
              <h3 className="mb-1 flex items-center gap-2 text-base font-semibold">
                <MessageCircle className="h-4 w-4" />
                Fale com o Suporte
              </h3>
              <p className="text-sm text-muted-foreground">
                Nossa equipe está disponível para ajudar você.
              </p>
              <Button className="mt-3" variant="default">
                Abrir Chat de Suporte
              </Button>
            </div>

            <div className="rounded-md border bg-card p-4 text-sm">
              <h4 className="mb-2 font-medium">Email</h4>
              <p className="text-muted-foreground">suporte@zapfllow.com</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
