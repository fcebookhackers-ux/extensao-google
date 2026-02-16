-- Allow owners to delete their own automations without explicit permission.
-- Keep admin/permission-based deletes for other cases.

-- Remove conflicting/legacy policies if they exist.
drop policy if exists "Users can delete own automations" on public.automations;
drop policy if exists "Users can delete own automations with permission" on public.automations;
drop policy if exists workspace_members_delete_automations on public.automations;

-- New policy: owner can delete; otherwise requires permission within workspace.
create policy workspace_members_delete_automations
on public.automations
for delete
to authenticated
using (
  auth.uid() = user_id
  or (
    workspace_id is not null
    and public.is_workspace_member(workspace_id, auth.uid())
    and public.has_permission('automations.delete', workspace_id)
  )
);
