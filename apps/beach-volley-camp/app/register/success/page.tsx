export default function RegisterPaymentSuccessPage() {
  return (
    <main className="mx-auto max-w-3xl px-7 py-16 text-[#111111]">
      <h1 className="text-3xl font-semibold">Pagamento confirmado</h1>
      <p className="mt-3 text-[rgba(17,17,17,0.72)]">
        Recebemos o teu pagamento com sucesso. Em breve vais receber um email com os próximos passos.
      </p>
      <a
        href="/register"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-[#CEEC58] px-6 py-3 text-sm font-semibold text-[#111111]"
      >
        Voltar à inscrição
      </a>
    </main>
  );
}
