"use client";

import { FormEvent, useState } from "react";
import { Angry, Frown, Laugh, Smile, X } from "lucide-react";
import { Drawer } from "vaul";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePath: string;
};

type Category = "sugestoes" | "experiencia" | "bugs";
type Satisfaction = "very_bad" | "bad" | "ok" | "great";

const SATISFACTION_OPTIONS: Array<{
  value: Satisfaction;
  label: string;
  icon: typeof Angry;
}> = [
  { value: "very_bad", label: "Muito insatisfeito", icon: Angry },
  { value: "bad", label: "Insatisfeito", icon: Frown },
  { value: "ok", label: "Neutro", icon: Smile },
  { value: "great", label: "Muito satisfeito", icon: Laugh },
];

export default function FeedbackDialog({
  open,
  onOpenChange,
  sourcePath,
}: FeedbackDialogProps) {
  const [category, setCategory] = useState<Category | "">("");
  const [feedback, setFeedback] = useState("");
  const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleClose() {
    if (submitting) return;
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category || feedback.trim().length < 5 || !satisfaction) {
      setError("Selecione uma categoria, satisfação e escreva pelo menos 5 caracteres.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          feedback: feedback.trim(),
          satisfaction,
          sourcePath,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Falha ao enviar feedback.",
        );
      }

      setSuccess(true);
      setCategory("");
      setFeedback("");
      setSatisfaction(null);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 800);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Não foi possível enviar o feedback.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[94] bg-black/55 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[95] h-auto max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-border bg-background outline-none sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(90vw,640px)] sm:max-h-[86dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          aria-label="Enviar feedback"
        >
          <div className="mt-3 mx-auto h-1.5 w-14 rounded-full bg-border sm:hidden" />

          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <Drawer.Title className="text-base font-semibold">
              Enviar feedback
            </Drawer.Title>
            <button
              aria-label="Fechar modal de feedback"
              className="hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
              onClick={handleClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form className="space-y-3 p-3 sm:p-4" onSubmit={handleSubmit}>
            <Select
              onValueChange={(value) => setCategory(value as Category)}
              value={category}
            >
              <SelectTrigger className="h-12 rounded-xl text-base">
                <SelectValue placeholder="Selecione um tópico..." />
              </SelectTrigger>
              <SelectContent className="z-[120]">
                <SelectItem className="text-base" value="sugestoes">
                  Sugestões
                </SelectItem>
                <SelectItem className="text-base" value="experiencia">
                  Experiência
                </SelectItem>
                <SelectItem className="text-base" value="bugs">
                  Bugs
                </SelectItem>
              </SelectContent>
            </Select>

            <textarea
              className="min-h-[170px] w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Escreva o seu feedback..."
              value={feedback}
            />

            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex items-center gap-2">
                {SATISFACTION_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = satisfaction === option.value;
                  return (
                    <button
                      key={option.value}
                      aria-label={option.label}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                        active
                          ? "border-foreground text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setSatisfaction(option.value)}
                      type="button"
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>

              <button
                className="rounded-xl bg-foreground px-6 py-2.5 text-base font-medium text-background transition disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
                type="submit"
              >
                {success ? "Enviado" : "Enviar"}
              </button>
            </div>

            {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
