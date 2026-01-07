import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { loginConGoogle } from "../../lib/auth";

export default function GoogleAuthModal() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toastMessage, setToastMessage] = useState("Conectando con Google...");

  useEffect(() => {
    // Verificar si ya se mostró en esta sesión
    const alreadyShown = sessionStorage.getItem("authShown");

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setCheckingAuth(false);

      if (alreadyShown) {
        // Ya se mostró, no hacer nada
        setUser(firebaseUser);
        return;
      }

      if (firebaseUser) {
        // ✅ Usuario CON sesión → Toast pequeño
        setUser(firebaseUser);
        setToastMessage("Conectando con Google...");
        setShowToast(true);

        // Después de 1s mostrar "Conectado" y luego cerrar
        setTimeout(() => {
          setToastMessage(`¡Hola, ${firebaseUser.displayName?.split(" ")[0]}! 👋`);
        }, 1000);

        setTimeout(() => {
          setShowToast(false);
          sessionStorage.setItem("authShown", "true");
        }, 2500);
      } else {
        // ❌ Usuario SIN sesión → Modal grande
        setUser(null);
        setTimeout(() => setShowModal(true), 300);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginConGoogle();
      sessionStorage.setItem("authShown", "true");
      setShowModal(false);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
    setIsLoggingIn(false);
  };

  const handleCloseModal = () => {
    sessionStorage.setItem("authShown", "true");
    setShowModal(false);
  };

  return (
    <>
      {/* ==================== TOAST PEQUEÑO (Usuario con sesión) ==================== */}
      {showToast && user && (
        <div
          className="fixed top-24 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
          style={{
            background: "white",
            animation: "slideInRight 0.4s ease-out",
            boxShadow: "0 10px 40px rgba(124, 58, 237, 0.2)",
          }}
        >
          {/* Icono Google o foto de usuario */}
          <div className="relative">
            {toastMessage.includes("Conectando") ? (
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <GoogleIcon size={24} />
              </div>
            ) : (
              <img
                src={user.photoURL || ""}
                alt=""
                className="w-10 h-10 rounded-full border-2 border-purple-400"
                referrerPolicy="no-referrer"
              />
            )}
            {/* Spinner o check */}
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: toastMessage.includes("Conectando") ? "#f3f4f6" : "#22c55e",
              }}
            >
              {toastMessage.includes("Conectando") ? (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    border: "2px solid #d1d5db",
                    borderTopColor: "#7c3aed",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
              ) : (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>

          {/* Texto */}
          <div>
            <p className="text-sm font-medium text-gray-800">{toastMessage}</p>
            <p className="text-xs text-gray-500">
              {toastMessage.includes("Conectando") ? "Verificando sesión..." : user.email}
            </p>
          </div>
        </div>
      )}

      {/* ==================== MODAL GRANDE (Usuario sin sesión) ==================== */}
      {showModal && !user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(88, 28, 135, 0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: "fadeIn 0.3s ease-out",
          }}
          onClick={handleCloseModal}
        >
          {/* Modal Card */}
          <div
            className="relative w-full max-w-md overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)",
              borderRadius: "24px",
              boxShadow: "0 25px 50px -12px rgba(88, 28, 135, 0.4), 0 0 0 1px rgba(255,255,255,0.2)",
              animation: "slideUp 0.4s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative gradient bar */}
            <div
              style={{
                height: "4px",
                background: "linear-gradient(90deg, #7c3aed, #a855f7, #7c3aed)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2s linear infinite",
              }}
            />

            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className="p-8 pt-6">
              {checkingAuth ? (
                /* Loading State */
                <div className="flex flex-col items-center py-8">
                  <div
                    className="w-12 h-12 rounded-full"
                    style={{
                      border: "3px solid #e9d5ff",
                      borderTopColor: "#7c3aed",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <p className="mt-4 text-gray-500 text-sm">Verificando sesión...</p>
                </div>
              ) : (
                /* Usuario No Registrado */
                <div className="text-center">
                  {/* Logo o ícono */}
                  <div
                    className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                      boxShadow: "0 8px 20px rgba(124, 58, 237, 0.3)",
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    ¡Bienvenido!
                  </h3>
                  <p className="text-gray-500 mb-8">
                    Inicia sesión para gestionar tus turnos
                  </p>

                  {/* Botón Google */}
                  <button
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="w-full py-3.5 px-6 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 flex items-center justify-center gap-3 transition-all duration-200 hover:border-purple-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoggingIn ? (
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{
                          border: "2px solid #e5e7eb",
                          borderTopColor: "#7c3aed",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    ) : (
                      <>
                        <GoogleIcon size={20} />
                        <span>Continuar con Google</span>
                      </>
                    )}
                  </button>

                  {/* Texto legal pequeño */}
                  <p className="mt-6 text-xs text-gray-400 leading-relaxed">
                    Al continuar, aceptas nuestros{" "}
                    <a href="/terminos" className="text-purple-500 hover:underline">
                      Términos
                    </a>{" "}
                    y{" "}
                    <a href="/privacidad" className="text-purple-500 hover:underline">
                      Política de Privacidad
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.96); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        @keyframes slideInRight {
          from { 
            opacity: 0; 
            transform: translateX(100px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}

// Componente del ícono de Google
function GoogleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}