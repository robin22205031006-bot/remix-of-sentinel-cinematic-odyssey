import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { next: location.pathname } });
    const { data: banned } = await supabase.rpc("is_banned", { _uid: data.user.id });
    if (banned) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { banned: "1" } });
    }
  },
  component: () => (
    <div className="morph-in">
      <Outlet />
    </div>
  ),
});
