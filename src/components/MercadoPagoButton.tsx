"use client";

import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

interface MercadoPagoButtonProps {
  preferenceId: string;
  publicKey: string;
}

export default function MercadoPagoButton({ preferenceId, publicKey }: MercadoPagoButtonProps) {
  initMercadoPago(publicKey);

  return (
    <div className="w-full flex justify-center">
      <Wallet initialization={{ preferenceId }} />
    </div>
  );
}