// src/db/seed.ts
import { db } from "./index"; 
import { payments, refunds, disbursements} from "./schema";
import { TransactionStatus } from "@/types/transaction"; // <-- 1. IMPORTAMOS EL TIPO ESTRICTO

async function seedPayments() {
  console.log("🌱 Iniciando la inyección de transacciones de prueba...");

  const mockPayments = [];
  
  // 2. TIPAMOS ESTRICTAMENTE EL ARREGLO
  const statuses: TransactionStatus[] = [
    "COMPLETED", "COMPLETED", "COMPLETED", 
    "PENDING", "PENDING", 
    "FAILED", 
    "CANCELLED"
  ];

  for (let i = 1; i <= 20; i++) {
    const randomDaysAgo = Math.floor(Math.random() * 30);
    const randomHoursAgo = Math.floor(Math.random() * 24);
    const date = new Date();
    date.setDate(date.getDate() - randomDaysAgo);
    date.setHours(date.getHours() - randomHoursAgo);

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isCompleted = status === "COMPLETED";

    mockPayments.push({
      trip_id: `TRP-${8000 + i}`,
      id_user: 1, 
      amount: (Math.random() * 45000 + 5000).toFixed(2), 
      external_id: isCompleted ? `mp_${Math.floor(Math.random() * 9999999999)}` : null,
      status: status, // ¡Ahora TypeScript sabe que esto es 100% seguro!
      created_at: date,
      updated_at: date,
    });
  }

  try {
    await db.insert(payments).values(mockPayments);
    console.log("✅ ¡20 transacciones insertadas exitosamente para el usuario 1!");
  } catch (error) {
    console.error("❌ Error crítico al insertar los datos:", error);
  } finally {
    process.exit(0);
  }
}

async function seedRefunds() {
  console.log("🌱 Iniciando la inyección de reembolsos de prueba...");

  const mockRefunds = [];
  
  // 2. TIPAMOS ESTRICTAMENTE EL ARREGLO
  const statuses: TransactionStatus[] = ["COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "FAILED", "CANCELLED"];
  const refundTypes = ["TOTAL", "TOTAL", "PARTIAL"] as const; 

  for (let i = 1; i <= 21; i++) {
    const randomDaysAgo = Math.floor(Math.random() * 30);
    const randomHoursAgo = Math.floor(Math.random() * 24);
    const date = new Date();
    date.setDate(date.getDate() - randomDaysAgo);
    date.setHours(date.getHours() - randomHoursAgo);

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const refundType = refundTypes[Math.floor(Math.random() * refundTypes.length)];
    const isCompleted = status === "COMPLETED";

    mockRefunds.push({
      trip_id: `TRP-${9000 + i}`, 
      id_user: 1, 
      amount: (Math.random() * 15000 + 1500).toFixed(2), 
      refund_type: refundType, 
      external_id: isCompleted ? `ref_mp_${Math.floor(Math.random() * 99999999)}` : null,
      status: status,
      created_at: date,
    });
  }

  try {
    await db.insert(refunds).values(mockRefunds);
    console.log("✅ ¡21 reembolsos insertados exitosamente para el usuario 1!");
  } catch (error) {
    console.error("❌ Error al insertar los reembolsos:", error);
  } finally {
    process.exit(0);
  }
}

async function seedDisbursements() {
  console.log("🌱 Iniciando la inyección de desembolsos (liquidaciones) de prueba...");

  const mockDisbursements = [];
  
  // 2. TIPAMOS ESTRICTAMENTE EL ARREGLO
  const statuses: TransactionStatus[] = ["COMPLETED", "COMPLETED", "PENDING", "FAILED"];

  for (let i = 1; i <= 10; i++) {
    const randomDaysAgo = Math.floor(Math.random() * 30);
    const randomHoursAgo = Math.floor(Math.random() * 24);
    const date = new Date();
    date.setDate(date.getDate() - randomDaysAgo);
    date.setHours(date.getHours() - randomHoursAgo);

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isCompleted = status === "COMPLETED";

    const baseAmount = Math.random() * 40000 + 5000;
    const platformFee = baseAmount * 0.15;
    const finalAmount = baseAmount - platformFee;

    mockDisbursements.push({
      trip_id: `TRP-${8000 + i}`, 
      id_user: 1, 
      amount: finalAmount.toFixed(2),
      platform_fee: platformFee.toFixed(2),
      payment_alias: "conductor.towit.mp",
      external_id: isCompleted ? `disb_mp_${Math.floor(Math.random() * 99999999)}` : null,
      status: status,
      created_at: date,
    });
  }

  try {
    await db.insert(disbursements).values(mockDisbursements);
    console.log(`✅ ¡${mockDisbursements.length} liquidaciones insertadas exitosamente para el usuario 1!`);
  } catch (error) {
    console.error("❌ Error al insertar los desembolsos:", error);
  } finally {
    process.exit(0);
  }
}

// Ejecutamos las funciones
// seedPayments();
// seedRefunds();
seedDisbursements();