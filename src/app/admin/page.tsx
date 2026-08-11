import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UserList } from "@/components/admin/user-list";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Esconder el enlace no protege nada: cualquiera puede escribir /admin en la
  // barra del navegador. La puerta se cierra aquí, en el servidor.
  if (session.user.role !== "admin") redirect("/");

  const usuarios = await prisma.user.findMany({
    orderBy: [{ createdAt: "asc" }],
    include: {
      _count: { select: { transactions: true, recurring: true } },
    },
  });

  const adminsActivos = usuarios.filter(
    (u) => u.role === "admin" && u.banned !== true,
  );

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader
        name={session.user.name}
        role={session.user.role}
        activo="admin"
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Usuarios
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Aquí gestionas quién puede entrar. Las finanzas de cada usuario son
          privadas: ni siquiera desde aquí se pueden ver.
        </p>

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-4">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nuevo usuario
            </h2>
            <CreateUserForm />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {usuarios.length} {usuarios.length === 1 ? "usuario" : "usuarios"}
            </h2>
            <UserList
              yoId={session.user.id}
              otrosAdminsActivos={
                adminsActivos.filter((u) => u.id !== session.user.id).length
              }
              usuarios={usuarios.map((u) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role,
                banned: u.banned,
                createdAt: u.createdAt,
                movimientos: u._count.transactions,
                reglas: u._count.recurring,
              }))}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
