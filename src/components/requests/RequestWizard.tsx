"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryRow } from "@/lib/database.types";
import { createServiceRequest, type CreateRequestState } from "@/lib/actions/requests";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { compressImageForUpload } from "@/lib/imageCompression";
import { trackClientEvent } from "@/lib/analytics.client";
import { IMAGE_UPLOAD_RULES } from "@/lib/uploads";
import {
  REQUEST_DRAFT_STORAGE_KEY,
  REQUEST_STEP_LABELS,
  TIME_SLOTS,
  URGENCY_OPTIONS,
  buildServiceRequestPayload,
  createEmptyRequestDraft,
  formatRequestDate,
  getNextRequestStep,
  getPreviousRequestStep,
  getRequestLoginUrl,
  parseStoredRequestDraft,
  requestPayloadToFormData,
  resolveDesiredDate,
  validateRequestStep,
  type RequestDraft,
  type RequestTimeSlot,
  type RequestUrgency,
  type RequestWizardStep,
} from "@/lib/request-flow";

// Abaixo do bodySizeLimit das server actions (next.config.js), com folga para os campos do formulário.
const MAX_TOTAL_PHOTO_BYTES = 3.5 * 1024 * 1024;

type RequestWizardProps = {
  categories: CategoryRow[];
  initialCategorySlug?: string;
  initialQuery?: string;
  canPersist: boolean;
  isPreview: boolean;
};

const inputClass =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-action-500 focus:ring-4 focus:ring-action-100";

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function choiceClass(selected: boolean) {
  return `min-h-16 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2 ${
    selected
      ? "border-action-600 bg-action-50 text-action-950 shadow-sm"
      : "border-neutral-200 bg-white text-neutral-800 hover:border-action-300 hover:bg-action-50/40"
  }`;
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="min-h-11 rounded-lg px-2 text-sm font-semibold text-action-700 hover:bg-action-50"
        >
          Editar
        </button>
      </div>
      <div className="text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

export function RequestWizard({
  categories,
  initialCategorySlug = "",
  initialQuery = "",
  canPersist,
  isPreview,
}: RequestWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<RequestWizardStep>(1);
  const [draft, setDraft] = useState<RequestDraft>(() => createEmptyRequestDraft(initialQuery));
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<CreateRequestState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const today = localToday();

  useEffect(() => {
    let stored: RequestDraft | null = null;
    try {
      stored = parseStoredRequestDraft(sessionStorage.getItem(REQUEST_DRAFT_STORAGE_KEY));
    } catch {
      stored = null;
    }
    const next = stored ?? createEmptyRequestDraft(initialQuery);
    const preferredSlug = next.categorySlug || initialCategorySlug;
    const selectedCategory = categories.find((category) => category.slug === preferredSlug);

    setDraft({
      ...next,
      searchQuery: next.searchQuery || initialQuery,
      ...(selectedCategory
        ? {
            categoryId: selectedCategory.id,
            categorySlug: selectedCategory.slug,
            categoryName: selectedCategory.name,
            categoryIcon: selectedCategory.icon,
          }
        : {}),
    });
    // Categoria escolhida na busca/home: o cliente já começa descrevendo o problema.
    if (!stored && selectedCategory && selectedCategory.slug === initialCategorySlug) {
      setStep(2);
    }
    setHydrated(true);
  }, [categories, initialCategorySlug, initialQuery]);

  useEffect(() => {
    // Só na abertura do wizard. search_started é registrado na tela /buscar.
    trackClientEvent("request_started", { has_category: Boolean(initialCategorySlug), from_search: Boolean(initialQuery) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(REQUEST_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // O fluxo continua na sessão atual mesmo se o navegador bloquear o storage.
    }
  }, [draft, hydrated]);

  const filteredCategories = useMemo(() => {
    const query = draft.searchQuery.trim().toLocaleLowerCase("pt-BR");
    if (!query) return categories;
    return categories.filter((category) =>
      `${category.name} ${category.slug}`.toLocaleLowerCase("pt-BR").includes(query),
    );
  }, [categories, draft.searchQuery]);

  const desiredDate = draft.dateChoice ? resolveDesiredDate(draft, today) : "";

  function updateDraft(patch: Partial<RequestDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setMessage(null);
    setSubmitState({});
  }

  function selectCategory(category: CategoryRow) {
    if (category.id !== draft.categoryId) {
      trackClientEvent("category_selected", { category_slug: category.slug });
    }
    updateDraft({
      categoryId: category.id,
      categorySlug: category.slug,
      categoryName: category.name,
      categoryIcon: category.icon,
    });
  }

  function selectUrgency(urgency: Exclude<RequestUrgency, "">) {
    const dateChoice =
      urgency === "now" || urgency === "today"
        ? "today"
        : urgency === "week"
          ? "tomorrow"
          : "custom";
    updateDraft({ urgency, dateChoice });
  }

  function selectDateChoice(dateChoice: RequestDraft["dateChoice"]) {
    const urgency =
      dateChoice !== "today" && (draft.urgency === "now" || draft.urgency === "today")
        ? "scheduled"
        : draft.urgency;
    updateDraft({ dateChoice, urgency });
  }

  function goForward() {
    const validationError = validateRequestStep(draft, step);
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setStep(getNextRequestStep(step));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelRequest() {
    if (!window.confirm("Cancelar este pedido? O que você preencheu será descartado.")) return;
    try {
      sessionStorage.removeItem(REQUEST_DRAFT_STORAGE_KEY);
    } catch {
      // storage indisponível: nada a limpar
    }
    router.push("/");
  }

  function goBack() {
    setStep(getPreviousRequestStep(step));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitRequest() {
    setSubmitState({});
    setMessage(null);

    if (!canPersist) {
      setSubmitState({
        environmentBlocked: true,
        error:
          "A criação está bloqueada neste ambiente: configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      });
      return;
    }

    try {
      const payload = buildServiceRequestPayload(draft, today);
      setIsSubmitting(true);
      const formData = requestPayloadToFormData(payload);
      const compressedPhotos = await Promise.all(photos.map((photo) => compressImageForUpload(photo)));
      const totalPhotoBytes = compressedPhotos.reduce((sum, photo) => sum + photo.size, 0);
      if (totalPhotoBytes > MAX_TOTAL_PHOTO_BYTES) {
        setSubmitState({ error: "As fotos ficaram grandes demais para envio. Remova algumas e tente de novo." });
        return;
      }
      compressedPhotos.forEach((photo) => formData.append("photos", photo));
      const result = await createServiceRequest({}, formData);
      setSubmitState(result);

      if (result.authRequired) {
        router.push(getRequestLoginUrl());
        return;
      }

      if (result.requestId) {
        sessionStorage.removeItem(REQUEST_DRAFT_STORAGE_KEY);
        router.push(`/pedidos/${result.requestId}${result.photoWarning ? "?aviso=fotos" : ""}`);
      }
    } catch (error) {
      setSubmitState({
        error: error instanceof Error ? error.message : "Revise os dados do pedido.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-neutral-500">
          <span>
            Etapa {step} de {REQUEST_STEP_LABELS.length}
          </span>
          <span>{REQUEST_STEP_LABELS[step - 1]}</span>
        </div>
        <div className="grid grid-cols-5 gap-1" aria-label={`Progresso: etapa ${step} de 5`}>
          {REQUEST_STEP_LABELS.map((label, index) => (
            <span
              key={label}
              className={`h-1.5 rounded-full ${index < step ? "bg-action-600" : "bg-neutral-200"}`}
            />
          ))}
        </div>
      </div>

      {isPreview && (
        <Alert>
          Modo de desenvolvimento: categorias demonstrativas. Nenhum pedido será criado sem a configuração do
          Supabase.
        </Alert>
      )}

      <div className="mt-5 rounded-3xl border border-neutral-200 bg-neutral-50/70 p-4 shadow-sm sm:p-6">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-action-700">Vamos começar</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">
                Qual serviço você precisa?
              </h1>
              <p className="mt-1 text-sm text-neutral-500">Busque ou escolha uma categoria.</p>
            </div>

            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-neutral-400"
              />
              <input
                type="search"
                value={draft.searchQuery}
                onChange={(event) => updateDraft({ searchQuery: event.target.value })}
                placeholder="Ex.: eletricista, encanador..."
                aria-label="Buscar categoria de serviço"
                className={`${inputClass} pl-12`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredCategories.map((category) => {
                const selected = draft.categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={choiceClass(selected)}
                    aria-pressed={selected}
                    onClick={() => selectCategory(category)}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-action-50 text-action-700" aria-hidden="true">
                      <Icon name={getCategoryIcon(category)} className="h-5 w-5" />
                    </span>
                    <span className="mt-1 block text-sm font-bold leading-tight">{category.name}</span>
                  </button>
                );
              })}
            </div>

            {filteredCategories.length === 0 && (
              <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
                Nenhuma categoria encontrada. Tente um termo mais curto.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-action-700">{draft.categoryName}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">
                O que está acontecendo?
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Quanto mais claro, mais fácil encontrar o profissional certo.
              </p>
            </div>

            <div>
              <label htmlFor="request-description" className="text-sm font-bold text-neutral-800">
                Descreva o problema
              </label>
              <textarea
                id="request-description"
                value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value.slice(0, 600) })}
                rows={5}
                placeholder="Ex.: a tomada da cozinha parou de funcionar desde ontem..."
                className="mt-1.5 w-full resize-none rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-action-500 focus:ring-4 focus:ring-action-100"
              />
              <p className="mt-1 text-right text-xs text-neutral-500">{draft.description.length}/600</p>
            </div>

            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-xl" aria-hidden="true">
                  📷
                </span>
                <div className="min-w-0 flex-1">
                  <label htmlFor="request-photos" className="block text-sm font-bold text-neutral-800">
                    Fotos do problema (opcional)
                  </label>
                  <p className="text-xs text-neutral-500">Até {IMAGE_UPLOAD_RULES.maxRequestPhotos} fotos (JPEG, PNG ou WEBP). Só você e os profissionais do pedido veem.</p>
                </div>
              </div>
              <input
                id="request-photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) =>
                  setPhotos(Array.from(event.target.files ?? []).slice(0, IMAGE_UPLOAD_RULES.maxRequestPhotos))
                }
                className="mt-3 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
              />
              {photos.length > 0 && (
                <p className="mt-2 truncate text-xs text-neutral-500">
                  {photos.length} foto(s) selecionada(s): {photos.map((photo) => photo.name).join(", ")}
                </p>
              )}
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-neutral-800">Quando você precisa?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {URGENCY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={choiceClass(draft.urgency === option.value)}
                    aria-pressed={draft.urgency === option.value}
                    onClick={() => selectUrgency(option.value)}
                  >
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-action-700">Localização</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">
                Onde será o serviço?
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                O endereço completo será confirmado no agendamento.
              </p>
            </div>

            <div>
              <label htmlFor="request-neighborhood" className="text-sm font-bold text-neutral-800">
                Bairro
              </label>
              <input
                id="request-neighborhood"
                value={draft.neighborhood}
                onChange={(event) => updateDraft({ neighborhood: event.target.value })}
                autoComplete="address-level3"
                placeholder="Ex.: Centro"
                className={`mt-1.5 ${inputClass}`}
              />
            </div>

            <div>
              <label htmlFor="request-city" className="text-sm font-bold text-neutral-800">
                Cidade
              </label>
              <input
                id="request-city"
                value={draft.city}
                onChange={(event) => updateDraft({ city: event.target.value })}
                autoComplete="address-level2"
                placeholder="Ex.: São Paulo"
                className={`mt-1.5 ${inputClass}`}
              />
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-action-50 p-3 text-sm text-action-900">
              <Icon name="map-pin" className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Usamos bairro e cidade apenas para encontrar profissionais que atendem a sua região.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-action-700">Disponibilidade</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">
                Qual o melhor dia e período?
              </h1>
              <p className="mt-1 text-sm text-neutral-500">O profissional ainda poderá sugerir outro horário.</p>
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-neutral-800">Dia desejado</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className={choiceClass(draft.dateChoice === "today")}
                  aria-pressed={draft.dateChoice === "today"}
                  onClick={() => selectDateChoice("today")}
                >
                  <span className="block text-sm font-bold">Hoje</span>
                </button>
                <button
                  type="button"
                  className={choiceClass(draft.dateChoice === "tomorrow")}
                  aria-pressed={draft.dateChoice === "tomorrow"}
                  onClick={() => selectDateChoice("tomorrow")}
                >
                  <span className="block text-sm font-bold">Amanhã</span>
                </button>
                <button
                  type="button"
                  className={`${choiceClass(draft.dateChoice === "custom")} col-span-2 sm:col-span-1`}
                  aria-pressed={draft.dateChoice === "custom"}
                  onClick={() => selectDateChoice("custom")}
                >
                  <span className="block text-sm font-bold">Escolher data</span>
                </button>
              </div>
            </fieldset>

            {draft.dateChoice === "custom" && (
              <div>
                <label htmlFor="request-date" className="text-sm font-bold text-neutral-800">
                  Data
                </label>
                <input
                  id="request-date"
                  type="date"
                  min={today}
                  value={draft.customDate}
                  onChange={(event) => updateDraft({ customDate: event.target.value })}
                  className={`mt-1.5 ${inputClass}`}
                />
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-bold text-neutral-800">Período</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(Object.entries(TIME_SLOTS) as Array<[
                  Exclude<RequestTimeSlot, "">,
                  (typeof TIME_SLOTS)[Exclude<RequestTimeSlot, "">],
                ]>).map(([value, slot]) => (
                  <button
                    key={value}
                    type="button"
                    className={choiceClass(draft.timeSlot === value)}
                    aria-pressed={draft.timeSlot === value}
                    onClick={() => updateDraft({ timeSlot: value })}
                  >
                    <span className="block text-sm font-bold">{slot.label}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{slot.detail}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-action-700">Última etapa</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Revise seu pedido</h1>
              <p className="mt-1 text-sm text-neutral-500">Confira os dados antes de enviar. Não há cobrança nesta etapa.</p>
            </div>

            <ReviewBlock title="Serviço" onEdit={() => setStep(1)}>
              <p className="flex items-center gap-2 font-semibold text-neutral-900">
                <Icon name={getCategoryIcon({ name: draft.categoryName, slug: draft.categorySlug })} className="h-4 w-4 text-action-700" />
                {draft.categoryName}
              </p>
            </ReviewBlock>

            <ReviewBlock title="Problema e urgência" onEdit={() => setStep(2)}>
              <p>{draft.description}</p>
              <p className="mt-2 font-semibold text-neutral-800">
                {URGENCY_OPTIONS.find((option) => option.value === draft.urgency)?.label}
              </p>
            </ReviewBlock>

            <ReviewBlock title="Localização" onEdit={() => setStep(3)}>
              <p>
                {draft.neighborhood}, {draft.city}
              </p>
              <p className="mt-1 text-xs">O endereço completo será confirmado no agendamento.</p>
            </ReviewBlock>

            <ReviewBlock title="Data e período" onEdit={() => setStep(4)}>
              <p>{desiredDate ? formatRequestDate(desiredDate) : "Data não definida"}</p>
              <p>{draft.timeSlot ? TIME_SLOTS[draft.timeSlot].detail : "Período não definido"}</p>
            </ReviewBlock>

            {!canPersist && (
              <Alert tone="error">
                Ambiente sem credenciais do Supabase. Você pode revisar o fluxo, mas a confirmação real está
                bloqueada e nenhum ID será inventado.
              </Alert>
            )}

            {submitState.error && <Alert tone="error">{submitState.error}</Alert>}
          </div>
        )}

        {message && (
          <div className="mt-5">
            <Alert tone="error">{message}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3 border-t border-neutral-200 pt-4">
          <button
            type="button"
            onClick={cancelRequest}
            className="order-last min-h-11 w-full rounded-xl text-sm font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 sm:order-first sm:w-auto sm:px-3"
          >
            Cancelar
          </button>
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="min-h-12 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Voltar
            </button>
          )}
          {step < 5 ? (
            <button
              type="button"
              onClick={goForward}
              className="min-h-12 flex-1 rounded-xl bg-action-700 px-5 text-sm font-bold text-white hover:bg-action-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={submitRequest}
              disabled={isSubmitting}
              className="min-h-12 flex-1 rounded-xl bg-action-700 px-5 text-sm font-bold text-white hover:bg-action-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {isSubmitting ? "Criando pedido..." : canPersist ? "Confirmar pedido" : "Verificar configuração"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
