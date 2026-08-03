import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';


export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorLog] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [modoLogin, setModoLogin] = useState<'PASSWORD' | 'MAGIC_LINK'>('PASSWORD');

  // 🚀 VIGÍA DE SESIÓN: Verifica si ya existe una sesión en el almacenamiento del celular
  useEffect(() => {
    const verificarSesionActiva = async () => {
      setLoading(true); // Encendemos el loader visualmente mientras revisa la bóveda
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
          console.log("✅ Sesión detectada en disco. Redirigiendo al inventario...");
          router.replace("/(tabs)/inventario");
        }
      } catch (err) {
        console.error("Error verificando sesión previa:", err);
      } finally {
        setLoading(false);
      }
    };

    verificarSesionActiva();

    // 🛡️ Opcional pero recomendado: Escuchar si el estado cambia (ej. si vuelve de un Magic Link)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
        router.replace("/(tabs)/inventario");
      }
    });

    // Limpieza del listener al desmontar la pantalla
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLoginSubmit = async () => {
    if (!email) {
      setErrorLog("Por favor, ingresa tu correo electrónico.");
      return;
    }

    setLoading(true);
    setErrorLog(null);
    setSuccessMsg(null);

    try {
      // 🛡️ PROTOCOLO DE SEGURIDAD COMÚN: Verificar si el correo existe
      const { data: usuarioRegistrado, error: errorDb } = await supabase
        .from('usuarios')
        .select('id_usuario, estatus')
        .ilike('email', email.trim())
        .maybeSingle();

      if (errorDb) {
         console.error("Error de Base de Datos:", errorDb);
      }

      if (!usuarioRegistrado) {
        throw new Error("Acceso denegado. Correo no registrado en el sistema. Contacta a gerencia.");
      }

      if (usuarioRegistrado.estatus?.toUpperCase() !== 'ACTIVO') {
        throw new Error("Esta cuenta se encuentra inactiva o suspendida. Contacta a soporte.");
      }

      if (modoLogin === 'PASSWORD') {
        // --- 🔑 MODO 1: LOGIN TRADICIONAL ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error("Credenciales inválidas. Verifica tu correo y contraseña.");
          }
          throw error;
        }

        if (data.session) {
          // 🚀 Redirección en Expo Router hacia las pestañas (Tabs)
          router.replace("/(tabs)/inventario"); 
        }

      } else {
        // --- 🪄 MODO 2: MAGIC LINK (PRIMER ACCESO) ---
        // Nota: En móviles, el Magic Link requiere configuración de "Deep Linking". 
        // Por ahora, enviaremos el enlace por defecto de Supabase.
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase()
        );

        if (authError) throw authError;

        setSuccessMsg("¡Enlace de acceso seguro enviado! Revisa tu bandeja de entrada.");
      }

    } catch (err: any) {
      console.error("Error de autenticación:", err.message);
      setErrorLog(err.message || "Ocurrió un error al procesar tu solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      
      {/* Círculos de luz de fondo (Efecto InmoTech Ecosistem) */}
      <View style={[styles.bgCircle, { top: -100, right: -100, backgroundColor: 'rgba(14, 165, 233, 0.15)' }]} />
      <View style={[styles.bgCircle, { bottom: -100, left: -100, backgroundColor: 'rgba(56, 189, 248, 0.1)' }]} />

      {/* Panel Central Glassmorphism Light */}
      <BlurView intensity={80} tint="light" style={styles.glassPanel}>
        
        {/* Cabecera / Logo */}
        <View style={styles.header}>
          <Text style={styles.brandText}>InmoTech <Text style={styles.brandAccent}>ERP</Text></Text>
          <Text style={styles.subBrandText}>SISTEMA ADMINISTRATIVO INMOBILIARIO</Text>
        </View>

        {/* Alertas */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {successMsg && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* Formulario */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
            <TextInput
              style={styles.input}
              placeholder="nombre@inmotechve.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading && successMsg === null}
            />
          </View>

          {modoLogin === 'PASSWORD' && (
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>CONTRASEÑA</Text>
                <TouchableOpacity onPress={() => {/* Opcional: Navegar a recuperar clave */}}>
                  <Text style={styles.forgotText}>¿Olvidó su clave?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, (loading || successMsg !== null) && styles.buttonDisabled]} 
            onPress={handleLoginSubmit}
            disabled={loading || successMsg !== null}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {successMsg 
                  ? "REVISA TU CORREO" 
                  : modoLogin === 'PASSWORD' ? "ENTRAR AL SISTEMA" : "SOLICITAR ENLACE SEGURO"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Modo Login */}
          <TouchableOpacity 
            style={styles.toggleButton} 
            onPress={() => {
              setModoLogin(modoLogin === 'PASSWORD' ? 'MAGIC_LINK' : 'PASSWORD');
              setErrorLog(null);
              setSuccessMsg(null);
            }}
          >
            <Text style={styles.toggleText}>
              {modoLogin === 'PASSWORD' 
                ? "¿Primer acceso? Ingresa con un enlace seguro" 
                : "¿Ya tienes contraseña? Inicia sesión aquí"}
            </Text>
          </TouchableOpacity>
        </View>

      </BlurView>

      {/* Firma Inferior */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Desarrollado por: <Text style={styles.footerBold}>Ing. Andres Araujo</Text></Text>
        <Text style={styles.footerSubText}>E & A Investment Group C.A. | RIF: J-504485552</Text>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f8fafc', // slate-50
  },
  bgCircle: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  glassPanel: {
    marginHorizontal: 24,
    padding: 32,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)', // Light Glassmorphism
    shadowColor: '#cbd5e1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a', // slate-900
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: '#0284c7', // sky-600
  },
  subBrandText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b', // slate-500
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#fff1f2', // rose-50
    borderColor: '#ffe4e6', // rose-100
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#e11d48', // rose-600
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#ecfdf5', // emerald-50
    borderColor: '#d1fae5', // emerald-100
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  successText: {
    color: '#059669', // emerald-600
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b', // slate-500
    marginBottom: 6,
    letterSpacing: 1,
  },
  forgotText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0284c7', // sky-600
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#334155', // slate-700
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0f172a', // slate-900
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8', // slate-400
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8', // slate-400
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  footerBold: {
    fontWeight: '700',
    color: '#64748b',
  },
  footerSubText: {
    fontSize: 9,
    color: '#cbd5e1',
    marginTop: 4,
  }
});