export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/8615072414348"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar pelo WhatsApp"
      className="fixed bottom-5 right-5 z-[60] inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition hover:scale-105 hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40 sm:bottom-6 sm:right-6"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="h-7 w-7 shrink-0 fill-current"
      >
        <path d="M16.04 3A12.86 12.86 0 0 0 5.12 22.65L3.4 29l6.5-1.7A12.99 12.99 0 1 0 16.04 3Zm0 23.75c-2.1 0-4.16-.57-5.94-1.65l-.43-.26-3.86 1.01 1.03-3.75-.28-.44a10.75 10.75 0 1 1 9.48 5.09Zm5.9-8.04c-.32-.16-1.9-.94-2.2-1.05-.29-.11-.5-.16-.71.16-.21.33-.82 1.05-1.01 1.27-.18.21-.37.24-.69.08-.32-.16-1.36-.5-2.59-1.6a9.68 9.68 0 0 1-1.79-2.23c-.18-.32-.02-.5.14-.66.15-.14.32-.37.48-.56.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.36-.26-.62-.52-.54-.71-.55h-.61c-.22 0-.56.08-.85.4-.3.33-1.12 1.1-1.12 2.67s1.15 3.1 1.31 3.31c.16.22 2.26 3.45 5.48 4.84.77.33 1.36.53 1.83.68.77.25 1.47.21 2.03.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.14-.29-.22-.62-.38Z" />
      </svg>
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
