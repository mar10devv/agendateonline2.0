const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// 🔔 Función: cuando se elimina un turno
exports.notificarCancelacionTurno = onDocumentDeleted("Negocios/{negocioId}/Turnos/{turnoId}", async (event) => {
  const data = event.data.data(); // datos del turno eliminado
  if (!data || !data.uidCliente) return;

  try {
    // 1. Buscar token FCM del usuario
    const db = getFirestore();
    const userDoc = await db.collection("Usuarios").doc(data.uidCliente).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log("⚠️ Usuario sin token FCM");
      return;
    }

    // 2. Construir notificación
    const payload = {
      notification: {
        title: "Cita cancelada",
        body: `Tu turno con ${data.barbero} el ${data.fecha} a las ${data.hora} fue cancelado.`,
      },
      token: fcmToken,
    };

    // 3. Enviar notificación
    await getMessaging().send(payload);
    console.log("✅ Notificación enviada a:", data.uidCliente);
  } catch (error) {
    console.error("❌ Error enviando notificación:", error);
  }
});
