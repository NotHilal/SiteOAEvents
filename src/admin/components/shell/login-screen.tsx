"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { login } from "@/lib/session";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <span className="font-heading text-lg font-bold tracking-wide text-white">
          OA <span className="text-gold">Événementiel</span>
        </span>
        <div className="space-y-3">
          <p className="font-heading text-3xl font-semibold leading-tight text-white">Espace de gestion</p>
          <p className="max-w-sm text-sidebar-foreground/70">
            Matériel, stock, calendrier et commandes, au même endroit.
          </p>
        </div>
        <span className="text-xs text-sidebar-foreground/40">oa-evenementiel.fr</span>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold">Connexion</h1>
            <p className="text-sm text-muted-foreground">Accès réservé à l'équipe OA Événementiel.</p>
          </div>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </Field>
          </FieldGroup>
          {error && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
            {pending && <Spinner />}
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  );
}
