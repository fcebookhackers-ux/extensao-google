 import * as React from "react";
 import { formatDistanceToNow } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { Badge } from "@/components/ui/badge";
 import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { MessageSquare, MoreVertical, Send, Edit2, Trash2, CornerDownRight } from "lucide-react";
 import { useAuth } from "@/providers/AuthProvider";
 import { useEntityComments, useUnreadComments, type EntityType } from "@/hooks/useEntityComments";
 import { cn } from "@/lib/utils";
 
 interface CommentsPanelProps {
   entityType: EntityType;
   entityId: string;
   workspaceId?: string;
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function CommentsPanel({ entityType, entityId, workspaceId, open, onOpenChange }: CommentsPanelProps) {
   const { user } = useAuth();
   const {
     comments,
     isLoading,
     addComment,
     isAdding,
     updateComment,
     deleteComment,
     markAsRead,
   } = useEntityComments(entityType, entityId, workspaceId);
 
   const [newText, setNewText] = React.useState("");
   const [replyTo, setReplyTo] = React.useState<string | null>(null);
   const [editingId, setEditingId] = React.useState<string | null>(null);
   const [editText, setEditText] = React.useState("");
 
   React.useEffect(() => {
     if (open && entityId) {
       markAsRead();
     }
   }, [open, entityId, markAsRead]);
 
   const handleSubmit = () => {
     if (!newText.trim()) return;
     addComment({ text: newText.trim(), parentId: replyTo ?? undefined });
     setNewText("");
     setReplyTo(null);
   };
 
   const handleUpdate = (commentId: string) => {
     if (!editText.trim()) return;
     updateComment({ commentId, text: editText.trim() });
     setEditingId(null);
     setEditText("");
   };
 
   const startEdit = (id: string, text: string) => {
     setEditingId(id);
     setEditText(text);
   };
 
   const threaded = React.useMemo(() => {
     const parents = comments.filter((c) => !c.parent_comment_id);
     const childMap = new Map<string, typeof comments>();
     comments.forEach((c) => {
       if (c.parent_comment_id) {
         const arr = childMap.get(c.parent_comment_id) ?? [];
         arr.push(c);
         childMap.set(c.parent_comment_id, arr);
       }
     });
     return { parents, childMap };
   }, [comments]);
 
   const highlightMentions = (text: string) => {
     return text.split(/(@\w+)/g).map((part, i) =>
       part.startsWith("@") ? (
         <span key={i} className="font-semibold text-brand-primary-light">
           {part}
         </span>
       ) : (
         <span key={i}>{part}</span>
       )
     );
   };
 
   const renderComment = (comment: typeof comments[0], isReply = false) => {
     const isOwn = comment.user_id === user?.id;
     const editing = editingId === comment.id;
     const children = threaded.childMap.get(comment.id) ?? [];
 
     return (
       <div key={comment.id} className={cn("space-y-2", isReply && "ml-6 border-l-2 pl-3")}>
         <div className="rounded-lg border bg-background p-3">
           <div className="mb-1 flex items-start justify-between gap-2">
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <span className="font-semibold">{isOwn ? "Você" : "Usuário"}</span>
               <span>•</span>
               <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}</span>
             </div>
             {isOwn && (
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-6 w-6">
                     <MoreVertical className="h-3 w-3" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                   <DropdownMenuItem onClick={() => startEdit(comment.id, comment.comment_text)}>
                     <Edit2 className="mr-2 h-3 w-3" />
                     Editar
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => deleteComment(comment.id)} className="text-destructive">
                     <Trash2 className="mr-2 h-3 w-3" />
                     Excluir
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
             )}
           </div>
 
           {editing ? (
             <div className="space-y-2">
               <Textarea
                 value={editText}
                 onChange={(e) => setEditText(e.target.value)}
                 rows={2}
                 className="text-sm"
               />
               <div className="flex gap-2">
                 <Button size="sm" onClick={() => handleUpdate(comment.id)}>
                   Salvar
                 </Button>
                 <Button
                   size="sm"
                   variant="outline"
                   onClick={() => {
                     setEditingId(null);
                     setEditText("");
                   }}
                 >
                   Cancelar
                 </Button>
               </div>
             </div>
           ) : (
             <div className="whitespace-pre-wrap text-sm">{highlightMentions(comment.comment_text)}</div>
           )}
 
           {!editing && !isReply && (
             <Button
               variant="ghost"
               size="sm"
               className="mt-2 h-7 text-xs"
               onClick={() => setReplyTo(comment.id)}
             >
               <CornerDownRight className="mr-1 h-3 w-3" />
               Responder
             </Button>
           )}
         </div>
 
         {children.map((child) => renderComment(child, true))}
       </div>
     );
   };
 
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent side="right" className="w-full sm:max-w-md">
         <SheetHeader>
           <SheetTitle className="flex items-center gap-2">
             <MessageSquare className="h-5 w-5" />
             Comentários
           </SheetTitle>
           <SheetDescription>
             {comments.length} comentário{comments.length !== 1 ? "s" : ""}
           </SheetDescription>
         </SheetHeader>
 
         <div className="mt-6 flex flex-col gap-4">
           {isLoading ? (
             <div className="text-sm text-muted-foreground">Carregando comentários...</div>
           ) : threaded.parents.length === 0 ? (
             <div className="rounded-lg border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
               Nenhum comentário ainda. Seja o primeiro a comentar!
             </div>
           ) : (
             <div className="space-y-3">{threaded.parents.map((c) => renderComment(c))}</div>
           )}
 
           <div className="sticky bottom-0 space-y-2 border-t bg-background pt-4">
             {replyTo && (
               <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-xs">
                 <CornerDownRight className="h-3 w-3" />
                 <span>Respondendo...</span>
                 <Button variant="ghost" size="sm" className="ml-auto h-6" onClick={() => setReplyTo(null)}>
                   Cancelar
                 </Button>
               </div>
             )}
             <Textarea
               value={newText}
               onChange={(e) => setNewText(e.target.value)}
               placeholder="Escreva um comentário... Use @nome para mencionar"
               rows={3}
               onKeyDown={(e) => {
                 if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                   handleSubmit();
                 }
               }}
             />
             <Button onClick={handleSubmit} disabled={!newText.trim() || isAdding} className="w-full">
               <Send className="mr-2 h-4 w-4" />
               {isAdding ? "Enviando..." : "Enviar"}
             </Button>
           </div>
         </div>
       </SheetContent>
     </Sheet>
   );
 }
 
 export function CommentsTrigger({
   entityType,
   entityId,
   onClick,
 }: {
   entityType: EntityType;
   entityId: string;
   onClick: () => void;
 }) {
   const { data: unread } = useUnreadComments(entityType, entityId);
 
   return (
     <Button variant="outline" onClick={onClick} className="relative">
       <MessageSquare className="mr-2 h-4 w-4" />
       Comentários
       {(unread ?? 0) > 0 && (
         <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
           {unread}
         </Badge>
       )}
     </Button>
   );
 }