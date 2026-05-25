// SDK de Mercado Pago
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Agrega credenciales
export const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN as string });