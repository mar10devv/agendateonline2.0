// netlify/functions/create-payment.ts

import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// Inicializar Firebase Admin
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

export const handler: Handler = async (event) => {
    // ⚠️ ATENCIÓN: Solo aceptamos peticiones POST desde el frontend
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido. Use POST.' };
    }

    // 1. OBTENER DATOS REALES DE LA PETICIÓN (desde el frontend/Bricks)
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, body: 'Error al parsear JSON.' };
    }

    // Datos que deben venir del frontend (que usará Mercado Pago Bricks)
    const { 
        montoSenia, 
        negocioId, 
        negocioUserId, // ⬅️ Este es el receiver_id (ID de Martin Martínez)
        cardToken,     // ⬅️ Token de pago generado por Bricks
        paymentMethodId, // ID del medio de pago (ej: visa, debvisa, abitab)
        emailCliente,
        docType,
        docNumber
    } = body;


    // 2. VALIDACIONES DE DATOS
    if (!negocioUserId || !cardToken || !paymentMethodId || !montoSenia || !emailCliente) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ 
                error: "Faltan datos de pago esenciales (negocio, token, monto, o email)." 
            }) 
        };
    }
    
    try {
        // ⚠️ TU ACCESS TOKEN DE PLATAFORMA (OBTENIDO DE LAS VARIABLES DE ENTORNO)
        const PLATFORM_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN_PLATFORM;

        if (!PLATFORM_ACCESS_TOKEN) {
            return { statusCode: 500, body: "❌ Falta Token de Plataforma (MP_ACCESS_TOKEN_PLATFORM)" };
        }

        // 3. COMISIÓN: Cero para la plataforma, como solicitaste.
        const applicationFee = 0; 

        // 4. CONFIGURAR EL PAYLOAD PARA EL PAGO API (V1/PAYMENTS)
        const payload = {
            transaction_amount: montoSenia,
            description: "Pago de seña - AgendateOnline",
            installments: 1, 
            token: cardToken,
            payment_method_id: paymentMethodId, 
            
            payer: {
                email: emailCliente,
                identification: { type: docType || "CI", number: docNumber || "99999999" },
            },
            
            // CLAVE 1: TU COMISIÓN (application_fee = 0)
            application_fee: applicationFee, 
            
            // CLAVE 2: EL RECEPTOR DE LOS FONDOS RESTANTES (el negocio)
            receiver_id: negocioUserId, 

            external_reference: `${negocioId}_${Date.now()}`,
            capture: true,
        };

        // 5. CREAR PAGO EN MERCADO PAGO
        const response = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${PLATFORM_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const rawText = await response.text();

        if (!response.ok) {
            console.error("📦 Respuesta MP (Error):", rawText);
            // Intenta parsear el error para dar mejor feedback al frontend
            const errorData = JSON.parse(rawText); 
            throw new Error(`Pago rechazado: ${errorData.message || response.statusText}`);
        }

        const data = JSON.parse(rawText);

        // 6. RESPUESTA DE ÉXITO O PENDIENTE
        if (data.status === 'approved' || data.status === 'pending') {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: "Pago procesado exitosamente con la nueva API.",
                    status: data.status,
                    paymentId: data.id,
                    // Devolver la URL de efectivo si aplica (Abitab/RedPagos)
                    ...(data.status === 'pending' && data.point_of_interaction?.transaction_data?.ticket_url && { 
                        ticket_url: data.point_of_interaction.transaction_data.ticket_url 
                    }),
                }),
            };
        }

        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Pago rechazado o no aprobado", data }),
        };

    } catch (err: any) {
        console.error("❌ Error en create-payment:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: err.message,
            }),
        };
    }
};