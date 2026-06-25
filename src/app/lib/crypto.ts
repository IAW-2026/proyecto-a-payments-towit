import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

const getEncryptionKey = () => {
  const key = process.env.COOKIE_ENCRYPTION_KEY;
  if (!key) throw new Error("Falta la variable ENCRYPTION_KEY en el entorno");
  return Buffer.from(key, "base64");
};

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16); // Vector de inicialización único
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Guardamos las 3 piezas necesarias para desencriptar: IV + Texto + AuthTag
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

export function decrypt(encryptedData: string): string | null {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(":");
    
    if (parts.length !== 3) return null;

    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const authTag = Buffer.from(parts[2], "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // Si la cookie fue manipulada o la clave es incorrecta, cae acá
    console.warn("Intento de manipulación de cookie detectado.");
    return null;
  }
}