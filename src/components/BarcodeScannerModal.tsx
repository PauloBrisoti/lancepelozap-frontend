import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  aberto: boolean;
  onFechar: () => void;
  onCodigo: (codigo: string) => void;
  titulo?: string;
}

const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
];

export function BarcodeScannerModal({ aberto, onFechar, onCodigo, titulo = 'Ler código de barras' }: BarcodeScannerModalProps) {
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [instanceId] = useState(() => `barcode-reader-${Math.random().toString(36).slice(2, 10)}`);
  const [iniciando, setIniciando] = useState(false);
  const [erroCamera, setErroCamera] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const processadoRef = useRef(false);
  const onCodigoRef = useRef(onCodigo);
  const onFecharRef = useRef(onFechar);

  useEffect(() => {
    onCodigoRef.current = onCodigo;
    onFecharRef.current = onFechar;
  }, [onCodigo, onFechar]);

  const pararScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
      } catch { /* já parado */ }
      try {
        scanner.clear();
      } catch { /* elemento já removido */ }
    }
  }, []);

  const processarCodigo = useCallback((codigo: string) => {
    if (!codigo || processadoRef.current) return;
    processadoRef.current = true;
    pararScanner().then(() => {
      onCodigoRef.current(codigo.trim());
      onFecharRef.current();
    });
  }, [pararScanner]);

  const iniciarCamera = useCallback(async () => {
    if (!readerRef.current) return;
    setIniciando(true);
    setErroCamera(false);

    try {
      const scanner = new Html5Qrcode(instanceId, {
        formatsToSupport: FORMATS,
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 120 },
          aspectRatio: 1.5,
        },
        (decodedText) => processarCodigo(decodedText),
        () => { /* frame sem leitura — continua escaneando */ },
      );
      setIniciando(false);
    } catch (error: any) {
      console.error('Erro ao iniciar câmera:', error);
      setIniciando(false);
      setErroCamera(true);
      scannerRef.current = null;
    }
  }, [processarCodigo, instanceId]);

  useEffect(() => {
    if (!aberto) return;

    processadoRef.current = false;
    setModoManual(false);
    setCodigoManual('');
    setErroCamera(false);
    setIniciando(true);

    let ativo = true;
    const timer = setTimeout(() => {
      if (ativo) iniciarCamera();
    }, 150);

    return () => {
      ativo = false;
      clearTimeout(timer);
      pararScanner();
      setIniciando(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (modoManual && inputRef.current) inputRef.current.focus();
  }, [modoManual]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1" aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!erroCamera ? (
            <div className="rounded-xl overflow-hidden bg-black">
              <div id={instanceId} ref={readerRef} className="w-full [&_video]:w-full" />
              {iniciando && (
                <div className="text-center text-white/90 text-sm py-3 bg-black/60">
                  {typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
                    ? 'Solicitando permissão da câmera...'
                    : 'Preparando leitura...'}
                </div>
              )}
              <div className="text-center text-white/90 text-sm py-1 bg-black/60">
                Aponte a câmera para o código de barras
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 space-y-3">
              <p>
                {modoManual
                  ? 'Digite o código de barras (EAN) abaixo. Se estiver usando um leitor físico, é só escanear — ele digita sozinho.'
                  : 'Não foi possível abrir a câmera. Verifique se a permissão foi concedida ao navegador nas configurações do celular, ou digite o código manualmente.'}
              </p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  autoFocus={modoManual}
                  value={codigoManual}
                  onChange={e => setCodigoManual(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') processarCodigo(codigoManual);
                  }}
                  placeholder="Ex.: 7891234567890"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={() => processarCodigo(codigoManual)}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition"
                >
                  OK
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Digitação rápida: código + Enter</span>
                <button onClick={() => setCodigoManual('')} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                  Limpar
                </button>
              </div>
              {!modoManual && (
                <button
                  onClick={() => { setErroCamera(false); setModoManual(true); }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Digitar código
                </button>
              )}
              {!modoManual && (
                <button
                  onClick={() => { setErroCamera(false); iniciarCamera(); }}
                  className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition"
                >
                  Tentar abrir câmera de novo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
