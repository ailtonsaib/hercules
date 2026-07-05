import { useEffect, useRef, useState } from "react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Trophy, CheckCircle2, Copy, Check, UserCheck, ShieldCheck, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import QRCode from "qrcode";

export default function ConvitePage() {
  const appUrl = window.location.origin;
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      void QRCode.toCanvas(canvasRef.current, appUrl, {
        width: 180,
        margin: 2,
        color: { dark: "#1e1b4b", light: "#ffffff" },
      });
    }
  }, [appUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      icon: <Smartphone className="w-5 h-5" />,
      title: "Acesse o link ou escaneie o QR Code",
      desc: "Abra o link no celular ou tablet que será usado.",
    },
    {
      icon: <UserCheck className="w-5 h-5" />,
      title: "Crie sua conta",
      desc: 'Clique em "Entrar" e cadastre-se com seu e-mail ou Google.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Aguarde a liberação",
      desc: "O administrador irá liberar seu acesso como operador. Você receberá o acesso em breve.",
    },
    {
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "Pronto!",
      desc: "Com acesso liberado, use o validador de cartelas e o app de vendas.",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center gap-8"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-xl">
            <Trophy className="w-8 h-8 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">BINGO Premier</h1>
            <p className="text-sm text-muted-foreground mt-1">Convite para operadores</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-4 shadow-md border">
          <canvas ref={canvasRef} />
        </div>

        {/* Link copy */}
        <div className="w-full bg-card border rounded-xl p-3 flex items-center gap-2">
          <span className="flex-1 text-sm text-muted-foreground truncate">{appUrl}</span>
          <Button size="sm" variant="secondary" className="shrink-0 gap-1.5" onClick={() => void handleCopy()}>
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </div>

        {/* Steps */}
        <div className="w-full space-y-3">
          <p className="text-sm font-bold text-foreground">Como acessar o sistema:</p>
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 bg-card border rounded-xl p-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 text-accent-foreground">
                {step.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="w-full">
          <SignInButton className="w-full" />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Após criar sua conta, aguarde o administrador liberar seu acesso como operador.
        </p>
      </motion.div>
    </div>
  );
}
