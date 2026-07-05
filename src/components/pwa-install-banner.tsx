import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install.ts";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobile() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export function PwaInstallBanner() {
  const { canInstall, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile
    if (!isMobile()) return;
    // Don't show if already installed (standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if dismissed this session
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    // Show after 3 seconds
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  const handleInstall = async () => {
    if (isIOS()) {
      setShowIOSGuide(true);
    } else {
      await install();
      setDismissed(true);
    }
  };

  const show = visible && !dismissed && (canInstall || isIOS());

  return (
    <>
      <AnimatePresence>
        {show && !showIOSGuide && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl shadow-2xl border border-violet-500/30 bg-gradient-to-r from-violet-900 to-indigo-900 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Instalar app na tela inicial</p>
                <p className="text-violet-300 text-xs mt-0.5">Acesse mais rápido, sem precisar do navegador</p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-white/40 hover:text-white/80 transition-colors p-1 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleInstall}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 transition-colors text-white font-bold text-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Adicionar à tela inicial
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS step-by-step guide */}
      <AnimatePresence>
        {showIOSGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-violet-900 to-indigo-900 border border-violet-500/30 shadow-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-white font-bold text-base">Instalar no iPhone / iPad</p>
                <button onClick={() => { setShowIOSGuide(false); handleDismiss(); }} className="text-white/40 hover:text-white/80 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {[
                { step: "1", text: 'Toque no botão de compartilhar  ⬆  na barra do Safari' },
                { step: "2", text: 'Role para baixo e toque em "Adicionar à Tela de Início"' },
                { step: "3", text: 'Toque em "Adicionar" no canto superior direito' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-black">{step}</span>
                  </div>
                  <p className="text-violet-200 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
              <p className="text-violet-400 text-xs text-center">O app aparecerá na sua tela inicial como qualquer outro app</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
