export default function RegisterPaymentCancelPage() {
  return (
    <main className="mx-auto max-w-3xl px-7 py-16 text-[#111111]">
      <h1 className="text-3xl font-semibold">Pagamento cancelado</h1>
      <p className="mt-3 text-[rgba(17,17,17,0.72)]">
        O pagamento não foi concluído. Podes tentar novamente quando quiseres.
      </p>
      <a
        href="/register"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white"
      >
        Tentar novamente
      </a>
    </main>
  );
}
