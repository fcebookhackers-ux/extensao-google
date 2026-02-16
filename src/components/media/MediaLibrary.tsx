 import { useState } from 'react';
 import { useMediaLibrary, useDeleteMedia } from '@/hooks/useMediaUpload';
 import { MediaUploader } from './MediaUploader';
import { StorageQuotaIndicator } from './StorageQuotaIndicator';
 import type { MediaFile, MediaType } from '@/types/media';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { Skeleton } from '@/components/ui/skeleton';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
 } from '@/components/ui/dialog';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import { 
   Image as ImageIcon, 
   Video, 
   FileText, 
   Music,
   Search,
   MoreVertical,
   Trash2,
   Copy,
   ExternalLink
 } from 'lucide-react';
 import { formatBytes } from '@/lib/format';
 import { toast } from 'sonner';
 import { cn } from '@/lib/utils';
 
 interface MediaLibraryProps {
   onSelect?: (media: MediaFile) => void;
   selectable?: boolean;
 }
 
 export function MediaLibrary({ onSelect, selectable = false }: MediaLibraryProps) {
   const [selectedType, setSelectedType] = useState<string>('all');
   const [searchQuery, setSearchQuery] = useState('');
   const [showUploader, setShowUploader] = useState(false);
 
   const { data: allMedia, isLoading } = useMediaLibrary();
   const { mutate: deleteMedia } = useDeleteMedia();
 
   const filteredMedia = allMedia?.filter(media => {
     const matchesType = selectedType === 'all' || media.file_type === selectedType;
     const matchesSearch = media.file_name.toLowerCase().includes(searchQuery.toLowerCase());
     return matchesType && matchesSearch;
   });
 
   const getIcon = (type: MediaType) => {
     switch (type) {
       case 'image': return ImageIcon;
       case 'video': return Video;
       case 'audio': return Music;
       case 'document': return FileText;
     }
   };
 
   const copyUrl = (url: string) => {
     navigator.clipboard.writeText(url);
     toast.success('URL copiada!');
   };
 
   return (
     <div className="space-y-6">
      {/* Storage Quota Indicator */}
      <StorageQuotaIndicator />

       <div className="flex items-center gap-4">
         <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Buscar arquivos..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="pl-10"
           />
         </div>
 
         <Button onClick={() => setShowUploader(true)}>
           Upload de Arquivos
         </Button>
       </div>
 
       <Tabs value={selectedType} onValueChange={setSelectedType}>
         <TabsList>
           <TabsTrigger value="all">Todos</TabsTrigger>
           <TabsTrigger value="image">Imagens</TabsTrigger>
           <TabsTrigger value="video">Vídeos</TabsTrigger>
           <TabsTrigger value="document">Documentos</TabsTrigger>
           <TabsTrigger value="audio">Áudio</TabsTrigger>
         </TabsList>
 
         <TabsContent value={selectedType} className="mt-6">
           {isLoading ? (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
               {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                 <Skeleton key={i} className="aspect-square rounded-lg" />
               ))}
             </div>
           ) : filteredMedia && filteredMedia.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
               {filteredMedia.map(media => {
                 const Icon = getIcon(media.file_type);
 
                 return (
                   <div
                     key={media.id}
                     className={cn(
                       "group relative aspect-square rounded-lg border bg-card overflow-hidden",
                       selectable && "cursor-pointer hover:border-primary"
                     )}
                     onClick={() => selectable && onSelect?.(media)}
                   >
                     <div className="absolute inset-0">
                       {media.file_type === 'image' ? (
                         <img
                           src={media.thumbnail_url || media.public_url}
                           alt={media.file_name}
                           className="w-full h-full object-cover"
                         />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-muted">
                           <Icon className="h-12 w-12 text-muted-foreground" />
                         </div>
                       )}
                     </div>
 
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                       <div className="absolute bottom-0 left-0 right-0 p-3">
                         <div className="flex items-start justify-between gap-2">
                           <p className="text-white text-xs font-medium truncate flex-1">
                             {media.file_name}
                           </p>
                           <div className="flex items-center gap-1">
                             <Badge variant="secondary" className="text-xs">
                               {formatBytes(media.file_size)}
                             </Badge>
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-white">
                                   <MoreVertical className="h-4 w-4" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => copyUrl(media.public_url)}>
                                   <Copy className="h-4 w-4 mr-2" />
                                   Copiar URL
                                 </DropdownMenuItem>
                                 <DropdownMenuItem asChild>
                                   <a
                                     href={media.public_url}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                   >
                                     <ExternalLink className="h-4 w-4 mr-2" />
                                     Abrir em nova aba
                                   </a>
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                   onClick={() => deleteMedia(media.id)}
                                   className="text-destructive"
                                 >
                                   <Trash2 className="h-4 w-4 mr-2" />
                                   Excluir
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                         </div>
                       </div>
                     </div>
 
                     {media.tags.length > 0 && (
                       <div className="absolute top-2 left-2 flex gap-1">
                         {media.tags.slice(0, 2).map(tag => (
                           <Badge key={tag} variant="secondary" className="text-xs">
                             {tag}
                           </Badge>
                         ))}
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="text-center py-12">
               <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
               <p className="text-muted-foreground">Nenhum arquivo encontrado</p>
             </div>
           )}
         </TabsContent>
       </Tabs>
 
       <Dialog open={showUploader} onOpenChange={setShowUploader}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Upload de Arquivos</DialogTitle>
             <DialogDescription>
               Envie imagens, vídeos ou documentos para usar em suas automações
             </DialogDescription>
           </DialogHeader>
           <MediaUploader
             onUploadComplete={() => {
               setShowUploader(false);
             }}
           />
         </DialogContent>
       </Dialog>
     </div>
   );
 }