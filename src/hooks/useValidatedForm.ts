import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormProps } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

export function useValidatedForm<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, "resolver">
) {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    ...options,
  });

  const handleFormError = (errors: unknown) => {
    const record = errors as Record<string, any>;
    const firstError = Object.values(record ?? {})[0] as any;
    if (firstError?.message) toast.error(String(firstError.message));
    else toast.error("Verifique os campos do formulário");
  };

  return {
    ...form,
    handleSubmit: (onValid: (data: z.infer<TSchema>) => void | Promise<void>) => form.handleSubmit(onValid, handleFormError),
  };
}
