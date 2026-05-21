// src/db/seed.ts
import { db } from "./index"; // Asegurate de que esta ruta apunte a tu export de la conexión Neon/Drizzle
import { payments } from "./schema";

async function seedPayments() {
  console.log("🌱 Iniciando la inyección de transacciones de prueba...");

  const mockPayments = [];
  // Proporciones realistas: Más completados que fallidos
  const statuses = [
    "COMPLETED", "COMPLETED", "COMPLETED", 
    "PENDING", "PENDING", 
    "FAILED", 
    "CANCELLED"
  ];

  for (let i = 1; i <= 20; i++) {
    // Generar una fecha aleatoria en los últimos 30 días
    const randomDaysAgo = Math.floor(Math.random() * 30);
    const randomHoursAgo = Math.floor(Math.random() * 24);
    const date = new Date();
    date.setDate(date.getDate() - randomDaysAgo);
    date.setHours(date.getHours() - randomHoursAgo);

    // Seleccionar estado aleatorio
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Solo asignar ID de MercadoPago si está completado
    const isCompleted = status === "COMPLETED";

    mockPayments.push({
      trip_id: `TRP-${8000 + i}`, // Ejemplo: TRP-8001
      id_user: 1, // Forzado al usuario 1 como pediste
      amount: (Math.random() * 45000 + 5000).toFixed(2), // Montos aleatorios entre 5.000 y 50.000
      external_id: isCompleted ? `mp_${Math.floor(Math.random() * 9999999999)}` : null,
      status: status,
      created_at: date,
      updated_at: date,
    });
  }

  try {
    // Insertamos todo el array en una sola consulta eficiente
    await db.insert(payments).values(mockPayments);
    console.log("✅ ¡20 transacciones insertadas exitosamente para el usuario 1!");
  } catch (error) {
    console.error("❌ Error crítico al insertar los datos:", error);
  } finally {
    // Es importante cerrar el proceso para que la terminal no se quede colgada
    process.exit(0);
  }
}

// Ejecutamos la función
seedPayments();