// netlify/functions/actualizar-trials.js
const admin = require("firebase-admin");

// Misma inicialización que en recordatorios.ts
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

exports.handler = async function () {
  try {
    const ahora = new Date();
    console.log("⏰ Ejecutando actualizar-trials:", ahora.toISOString());

    // Negocios en trial
    const snapshot = await db
      .collection("Negocios")
      .where("trialActivo", "==", true)
      .get();

    console.log("📌 Negocios con trialActivo=true:", snapshot.size);

    if (snapshot.empty) {
      return {
        statusCode: 200,
        body: "OK - No hay trials activos para actualizar",
      };
    }

    const batch = db.batch();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};

      const actual =
        typeof data.trialDiasRestantes === "number"
          ? data.trialDiasRestantes
          : 0;

      // Si ya está en 0, no hacemos nada
      if (actual <= 0) return;

      const nuevo = Math.max(actual - 1, 0);

      const cambios = { trialDiasRestantes: nuevo };

      if (nuevo === 0) {
        cambios.trialActivo = false;
        cambios.estadoAgenda = "bloqueada_pago";
      }

      batch.update(docSnap.ref, cambios);
    });

    await batch.commit();

    return {
      statusCode: 200,
      body: "OK - Trials actualizados",
    };
  } catch (e) {
    console.error("❌ Error en actualizar-trials:", e);
    return {
      statusCode: 500,
      body: "Error al actualizar trials",
    };
  }
};
