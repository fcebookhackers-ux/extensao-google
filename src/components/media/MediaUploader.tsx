 import { useCallback } from 'react';
 import { useDropzone } from 'react-dropzone';
 import { useMediaUpload } from '@/hooks/useMediaUpload';
 import { Upload, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
 import { Progress } from '@/components/ui/progress';
 import { cn } from '@/lib/utils';
 import type { MediaFile } from '@/types/media';
 
 interface MediaUploaderProps {
   onUploadComplete?: (files: MediaFile[]) => void;
   acceptedTypes?: string[];
   maxSize?: number;
   multiple?: boolean;
 }
 
 export function MediaUploader({
   onUploadComplete,
   acceptedTypes = ['image/*', 'video/*', 'application/pdf'],
   maxSize = 50 * 1024 * 1024,
   multiple = true
 }: MediaUploaderProps) {
   const { upload, uploadMultiple, uploadProgress, isUploading } = useMediaUpload();
 
   const onDrop = useCallback(async (acceptedFiles: File[]) => {
     if (multiple) {
       await uploadMultiple(acceptedFiles);
     } else if (acceptedFiles[0]) {
       upload(acceptedFiles[0]);
     }
   }, [upload, uploadMultiple, multiple]);
 
   const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
     onDrop,
     accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
     maxSize,
     multiple
   });
 
   const progressEntries = Object.entries(uploadProgress);
 
   return (
     <div className="space-y-4">
       <div
         {...getRootProps()}
         className={cn(
           "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
           "hover:border-primary hover:bg-accent/50",
           isDragActive && "border-primary bg-accent",
           isUploading && "pointer-events-none opacity-50"
         )}
       >
         <input {...getInputProps()} />
         <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
         
         {isDragActive ? (
           <p className="text-lg font-medium">Solte os arquivos aqui...</p>
         ) : (
           <>
             <p className="text-lg font-medium mb-2">
               Arraste arquivos aqui ou clique para selecionar
             </p>
             <p className="text-sm text-muted-foreground">
               Aceita imagens, vídeos e PDFs até {maxSize / 1024 / 1024}MB
             </p>
           </>
         )}
       </div>
 
       {fileRejections.length > 0 && (
         <div className="space-y-2">
           {fileRejections.map(({ file, errors }) => (
             <div
               key={file.name}
               className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
             >
               <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
               <div className="flex-1 min-w-0">
                 <p className="font-medium text-sm truncate">{file.name}</p>
                 <p className="text-sm text-destructive">{errors[0]?.message}</p>
               </div>
             </div>
           ))}
         </div>
       )}
 
       {progressEntries.length > 0 && (
         <div className="space-y-3">
           {progressEntries.map(([id, progress]) => (
             <div key={id} className="p-4 rounded-lg border bg-card">
               <div className="flex items-center gap-3 mb-2">
                 {progress.status === 'uploading' && (
                   <Loader2 className="h-4 w-4 animate-spin text-primary" />
                 )}
                 {progress.status === 'completed' && (
                   <CheckCircle className="h-4 w-4 text-green-600" />
                 )}
                 {progress.status === 'error' && (
                   <AlertCircle className="h-4 w-4 text-destructive" />
                 )}
 
                 <div className="flex-1 min-w-0">
                   <p className="font-medium text-sm truncate">{progress.fileName}</p>
                   {progress.status === 'error' ? (
                     <p className="text-sm text-destructive">{progress.error}</p>
                   ) : (
                     <Progress value={progress.progress} className="h-2 mt-1" />
                   )}
                 </div>
 
                 <span className="text-sm font-medium text-muted-foreground">
                   {progress.progress}%
                 </span>
               </div>
             </div>
           ))}
         </div>
       )}
     </div>
   );
 }