import { useState, useRef, useCallback } from 'react';

/**
 * Conecta num monitor de frequência cardíaca real (cinta peitoral,
 * relógio, braçadeira -- qualquer um que siga o padrão Bluetooth GATT
 * "Heart Rate Service", que é praticamente universal: Polar, Garmin,
 * Wahoo, Xiaomi Mi Band, a maioria dos relógios esportivos, etc).
 *
 * Usa a Web Bluetooth API direto do navegador -- sem app nativo, sem
 * SDK de fabricante. Só funciona no Chrome Android (é o navegador-alvo
 * do resto do app) -- Web Bluetooth não existe no Safari/iOS.
 *
 * Serviço e característica são os IDs padrão do Bluetooth SIG, os
 * mesmos em qualquer monitor de mercado que siga o protocolo:
 *   0x180D = Heart Rate Service
 *   0x2A37 = Heart Rate Measurement (characteristic, notifica a cada batimento)
 */
const HEART_RATE_SERVICE = 0x180d;
const HEART_RATE_MEASUREMENT = 0x2a37;

/** Decodifica o valor bruto da característica seguindo o formato oficial
 *  do Bluetooth SIG (o primeiro bit do flags diz se o BPM vem em 8 ou
 *  16 bits -- a maioria dos aparelhos usa 8 bits/uint8, mas alguns
 *  mandam 16 bits pra frequências muito altas). */
function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x1) !== 0;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
}

export type HeartRateMonitorStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useHeartRateMonitor() {
  const [status, setStatus] = useState<HeartRateMonitorStatus>('disconnected');
  const [bpm, setBpm] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<any>(null);

  const supported = typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;

  const disconnect = useCallback(() => {
    try {
      deviceRef.current?.gatt?.disconnect();
    } catch {}
    deviceRef.current = null;
    setStatus('disconnected');
    setBpm(null);
    setDeviceName(null);
  }, []);

  const connect = useCallback(async () => {
    if (!supported) {
      setError('Bluetooth não é suportado neste navegador (funciona no Chrome Android).');
      setStatus('error');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      // Só mostra na lista aparelhos que anunciam o serviço de
      // frequência cardíaca -- evita listar toda coisa Bluetooth por
      // perto (fones, etc) que não servem pra isso.
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
      });

      deviceRef.current = device;
      setDeviceName(device.name || 'Monitor cardíaco');

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        setBpm(null);
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HEART_RATE_SERVICE);
      const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);

      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value as DataView;
        setBpm(parseHeartRate(value));
      });

      await characteristic.startNotifications();
      setStatus('connected');
    } catch (e: any) {
      // Cancelou o seletor de aparelhos -- não é erro de verdade, só
      // volta pro estado desconectado sem alarme.
      if (e?.name === 'NotFoundError') {
        setStatus('disconnected');
        return;
      }
      console.warn('Falha ao conectar monitor cardíaco:', e);
      setError(e?.message || 'Falha ao conectar.');
      setStatus('error');
    }
  }, [supported]);

  return { status, bpm, deviceName, error, supported, connect, disconnect };
}
