"use client";

import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/login");
        router.refresh();
      }}
      className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
    >
      Cerrar sesión
    </button>
  );
}
