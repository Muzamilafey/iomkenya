import { useSettings } from '../../context/SettingsContext';

export default function WhatsAppButton() {
  const { settings } = useSettings();
  if (!settings.whatsappNumber) return null;
  const text = encodeURIComponent(`Hello ${settings.agencyName}, I would like some help with my application.`);
  return (
    <a
      href={`https://wa.me/${settings.whatsappNumber}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-green-300"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M16.003 3C9.374 3 4 8.373 4 15c0 2.385.697 4.61 1.898 6.483L4 29l7.73-1.864A11.94 11.94 0 0016.003 27C22.63 27 28 21.627 28 15S22.63 3 16.003 3zm0 21.818a9.79 9.79 0 01-4.99-1.366l-.358-.213-4.588 1.107 1.13-4.47-.233-.37A9.78 9.78 0 016.182 15c0-5.415 4.406-9.818 9.821-9.818 5.414 0 9.815 4.403 9.815 9.818 0 5.416-4.401 9.818-9.815 9.818zm5.385-7.352c-.295-.148-1.745-.861-2.016-.96-.27-.098-.467-.147-.664.148-.197.295-.762.96-.934 1.157-.172.197-.344.221-.639.074-.295-.148-1.246-.459-2.373-1.464-.877-.782-1.469-1.748-1.641-2.043-.172-.295-.018-.455.13-.602.132-.132.295-.344.442-.516.148-.172.197-.295.295-.492.098-.197.05-.369-.024-.516-.074-.148-.664-1.6-.91-2.19-.24-.576-.483-.498-.664-.507l-.565-.01a1.085 1.085 0 00-.787.369c-.27.295-1.032 1.008-1.032 2.459 0 1.45 1.057 2.852 1.204 3.049.148.197 2.08 3.176 5.04 4.453.705.304 1.254.486 1.682.622.707.225 1.35.193 1.858.117.567-.085 1.745-.713 1.991-1.402.246-.689.246-1.279.172-1.402-.073-.123-.27-.197-.565-.344z" />
      </svg>
    </a>
  );
}
