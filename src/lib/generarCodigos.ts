import { db } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";

// Función para generar código de 15 cifras aleatorias
function generarCodigo(): string {
  return Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join("");
}

export async function crearCodigos() {
  const codigosRef = collection(db, "Codigos");

  for (let i = 0; i < 10; i++) {
    const codigo = generarCodigo();

    await setDoc(doc(codigosRef, codigo), {
      codigo,
      valido: true,
      plan: "agenda", // 👈 o "web", según quieras
      usadoPor: null,
      creadoEn: new Date().toISOString(),
    });

    console.log(`✅ Código creado: ${codigo}`);
  }
}
