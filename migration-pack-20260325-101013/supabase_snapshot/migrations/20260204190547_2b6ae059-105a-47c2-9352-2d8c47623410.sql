-- Grant WhatsApp permission to roles (data fix)
INSERT INTO public.role_permissions (role, permission)
SELECT 'admin'::public.app_role, 'whatsapp.manage'::public.permission_type
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions
  WHERE role = 'admin'::public.app_role
    AND permission = 'whatsapp.manage'::public.permission_type
);

INSERT INTO public.role_permissions (role, permission)
SELECT 'moderator'::public.app_role, 'whatsapp.manage'::public.permission_type
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions
  WHERE role = 'moderator'::public.app_role
    AND permission = 'whatsapp.manage'::public.permission_type
);