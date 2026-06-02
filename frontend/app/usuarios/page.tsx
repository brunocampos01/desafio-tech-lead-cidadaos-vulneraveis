"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { grantUserRole, listUsers, revokeUserRole, UserRole } from "@/lib/api-client";

const ROLE_LABELS: Record<UserRole, string> = {
  operador: "Operador",
  admin: "Admin",
  super_admin: "Super admin",
};

function UsuariosContent() {
  const { user: actor, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled: isAdmin,
  });

  const grantMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      grantUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => revokeUserRole(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Acesso restrito a administradores. Seu papel: {actor?.role ?? "—"}.
      </p>
    );
  }

  function grantableRoles(): UserRole[] {
    if (actor?.role === "super_admin") return ["operador", "admin"];
    if (actor?.role === "admin") return ["operador"];
    return [];
  }

  const options = grantableRoles();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Usuários e papéis</h2>
        <p className="text-sm text-muted-foreground">
          Gestão RBAC (§6). Você está logado como {actor?.name} ({ROLE_LABELS[actor!.role]}).
        </p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando usuários...</p> : null}
      {error ? <p className="text-sm text-red-600">Erro ao carregar usuários.</p> : null}

      <div className="grid gap-4">
        {users?.map((u) => (
          <Card key={u.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{u.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{u.email}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                {ROLE_LABELS[u.role]}
              </span>
              {u.id !== actor?.id && options.length > 0 ? (
                <>
                  {options.map((role) => (
                    <Button
                      key={role}
                      className="h-8 px-3 text-xs"
                      variant="outline"
                      disabled={u.role === role || grantMutation.isPending}
                      onClick={() => grantMutation.mutate({ userId: u.id, role })}
                    >
                      Conceder {ROLE_LABELS[role]}
                    </Button>
                  ))}
                  {u.role !== "operador" ? (
                    <Button
                      className="h-8 border-red-500/50 px-3 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      variant="outline"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(u.id)}
                    >
                      Rebaixar para operador
                    </Button>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
        <UsuariosContent />
      </Suspense>
    </AppShell>
  );
}
