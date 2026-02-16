import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MediaFile, MediaType, UploadProgress } from '@/types/media';
import { toast } from 'sonner';
import { useCheckQuotaAvailable } from './useStorageQuota';
import { getMediaStoragePath, getThumbnailStoragePath } from '@/lib/supabase/storage-paths';
import { compressImageFileIfNeeded } from '@/lib/image-compression';
 
 export function useMediaUpload() {
   const queryClient = useQueryClient();
   const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const checkQuota = useCheckQuotaAvailable();
 
   const getMediaType = (mimeType: string): MediaType => {
     if (mimeType.startsWith('image/')) return 'image';
     if (mimeType.startsWith('video/')) return 'video';
     if (mimeType.startsWith('audio/')) return 'audio';
     return 'document';
   };
 
   const generateThumbnail = async (file: File, userId: string): Promise<string | null> => {
     if (!file.type.startsWith('image/')) return null;
 
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (e) => {
         const img = new Image();
         img.onload = async () => {
           const canvas = document.createElement('canvas');
           const MAX_SIZE = 300;
           let width = img.width;
           let height = img.height;
 
           if (width > height) {
             if (width > MAX_SIZE) {
               height *= MAX_SIZE / width;
               width = MAX_SIZE;
             }
           } else {
             if (height > MAX_SIZE) {
               width *= MAX_SIZE / height;
               height = MAX_SIZE;
             }
           }
 
           canvas.width = width;
           canvas.height = height;
           const ctx = canvas.getContext('2d');
           ctx?.drawImage(img, 0, 0, width, height);
 
           canvas.toBlob(async (blob) => {
             if (!blob) {
               resolve(null);
               return;
             }
 
             // Upload thumbnail to storage
            // Security: Use helper to generate path (ensures user_id isolation)
            const thumbPath = getThumbnailStoragePath(userId);
             const { error } = await supabase.storage
               .from('thumbnails')
               .upload(thumbPath, blob, {
                 contentType: 'image/jpeg',
                 cacheControl: '3600'
               });
 
             if (error) {
               console.error('Thumbnail upload error:', error);
               resolve(null);
               return;
             }
 
             const { data: { publicUrl } } = supabase.storage
               .from('thumbnails')
               .getPublicUrl(thumbPath);
 
             resolve(publicUrl);
           }, 'image/jpeg', 0.8);
         };
         img.onerror = () => resolve(null);
         img.src = e.target?.result as string;
       };
       reader.onerror = () => resolve(null);
       reader.readAsDataURL(file);
     });
   };
 
    const uploadMutation = useMutation({
      mutationFn: async (file: File) => {
        // Security: Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Você precisa estar autenticado para fazer upload de arquivos');
        }

        // Optional: compress large images before quota/validation/upload
        const compression = file.type.startsWith('image/')
          ? await compressImageFileIfNeeded(file, {
              maxWidth: 1920,
              maxHeight: 1080,
              quality: 0.8,
              mimeType: 'image/webp',
              minBytesToCompress: 500 * 1024,
            })
          : {
              file,
              didCompress: false,
              originalSizeBytes: file.size,
              finalSizeBytes: file.size,
              width: undefined as any,
              height: undefined as any,
            };

        const finalFile = compression.file;

        // Check quota BEFORE any upload
        const quotaCheck = checkQuota(finalFile.size);
        if (!quotaCheck.available) {
          throw new Error(quotaCheck.reason || 'Quota de armazenamento excedida');
        }

       // Update progress
        const fileId = crypto.randomUUID();
       setUploadProgress(prev => ({
         ...prev,
         [fileId]: {
           fileName: file.name,
            originalSizeBytes: compression.originalSizeBytes,
            finalSizeBytes: compression.finalSizeBytes,
            compressed: compression.didCompress,
           progress: 0,
           status: 'uploading'
         }
       }));
 
        // Server-side validation via Edge Function (magic bytes + nome seguro)
        try {
          const slice = finalFile.slice(0, 512);
          const arrayBuffer = await slice.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const firstBytesBase64 = btoa(binary);

          const { data, error } = await supabase.functions.invoke('validate-upload', {
            body: {
              fileName: finalFile.name,
              mimeType: finalFile.type,
              firstBytesBase64,
               fileSizeBytes: finalFile.size,
            },
          });

          if (error || !data?.ok) {
            const message = (data as any)?.error || error?.message || 'Arquivo inválido para upload.';
            throw new Error(message);
          }

          // Usa nome sanitizado retornado pela função
          const safeName = (data as any).sanitizedFileName || finalFile.name;

          // Security: Use helper to generate path (ensures user_id isolation)
          const filePath = getMediaStoragePath(user.id, safeName);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media-library')
            .upload(filePath, finalFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('media-library')
            .getPublicUrl(filePath);

          // Update progress
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: 50,
              status: 'processing'
            }
          }));

          // Generate thumbnail for images
          let thumbnailUrl: string | null = null;
          let width: number | undefined;
          let height: number | undefined;

          if (finalFile.type.startsWith('image/')) {
            thumbnailUrl = await generateThumbnail(finalFile, user.id);
            width = compression.width;
            height = compression.height;
          }

          // Security: Ensure user_id is set correctly (RLS enforcement)
          const { data: mediaData, error: dbError } = await supabase
            .from('media_library')
            .insert([{
              user_id: user.id, // CRITICAL: Must match auth.uid() for RLS
              file_name: safeName,
              file_type: getMediaType(file.type),
              file_size: finalFile.size,
              mime_type: finalFile.type,
              storage_path: filePath,
              public_url: publicUrl,
              thumbnail_url: thumbnailUrl || undefined,
              width: width || undefined,
              height: height || undefined
            }])
            .select()
            .single();

          if (dbError) throw dbError;

          // Update progress
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: 100,
              status: 'completed'
            }
          }));

          // Clear progress after delay
          setTimeout(() => {
            setUploadProgress(prev => {
              const next = { ...prev };
              delete next[fileId];
              return next;
            });
          }, 3000);

          return mediaData as MediaFile;
        } catch (err) {
          // Re-lança para ser tratado pelo onError do mutation
          throw err;
        }
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['media-library'] });
        queryClient.invalidateQueries({ queryKey: ['storage-quota'] });
       toast.success('Arquivo enviado com sucesso');
     },
     onError: (error: any, file) => {
       const fileId = Object.keys(uploadProgress).find(
         id => uploadProgress[id].fileName === file.name
       );
       
       if (fileId) {
         setUploadProgress(prev => ({
           ...prev,
           [fileId]: {
             ...prev[fileId],
             status: 'error',
             error: error.message
           }
         }));
       }
 
       toast.error(`Erro ao enviar ${file.name}`);
     }
   });
 
   const uploadMultiple = async (files: File[]) => {
     const uploads = files.map(file => uploadMutation.mutateAsync(file));
     return Promise.allSettled(uploads);
   };
 
   return {
     upload: uploadMutation.mutate,
     uploadMultiple,
     uploadProgress,
     isUploading: uploadMutation.isPending
   };
 }
 
 export function useMediaLibrary(filters?: {
   type?: MediaType;
   tags?: string[];
 }) {
   return useQuery({
     queryKey: ['media-library', filters],
     queryFn: async () => {
      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para visualizar a biblioteca de mídia');
      }

       let query = supabase
         .from('media_library')
         .select('*')
        .eq('user_id', user.id) // Explicit filter (RLS also enforces this)
         .order('created_at', { ascending: false });
 
       if (filters?.type) {
         query = query.eq('file_type', filters.type);
       }
 
       if (filters?.tags && filters.tags.length > 0) {
         query = query.contains('tags', filters.tags);
       }
 
       const { data, error } = await query;
       if (error) throw error;
 
       return data as MediaFile[];
     }
   });
 }
 
 export function useDeleteMedia() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (mediaId: string) => {
      // Security: Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Você precisa estar autenticado para excluir arquivos');
      }

       // Get media info
       const { data: media } = await supabase
         .from('media_library')
         .select('storage_path, thumbnail_url')
         .eq('id', mediaId)
        .eq('user_id', user.id) // Explicit check (RLS also enforces this)
         .single();
 
       if (!media) throw new Error('Media not found');
 
       // Delete from storage
       const { error: storageError } = await supabase.storage
         .from('media-library')
         .remove([media.storage_path]);
 
       if (storageError) throw storageError;
 
       // Delete thumbnail if exists
       if (media.thumbnail_url) {
         const thumbPath = new URL(media.thumbnail_url).pathname.split('/').slice(-2).join('/');
         await supabase.storage.from('thumbnails').remove([thumbPath]);
       }
 
       // Delete from database
       const { error: dbError } = await supabase
         .from('media_library')
         .delete()
         .eq('id', mediaId);
 
       if (dbError) throw dbError;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['media-library'] });
        queryClient.invalidateQueries({ queryKey: ['storage-quota'] });
       toast.success('Arquivo excluído');
     },
     onError: (error: any) => {
       toast.error('Erro ao excluir arquivo');
     }
   });
 }