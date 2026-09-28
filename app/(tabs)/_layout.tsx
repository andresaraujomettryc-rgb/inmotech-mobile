import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router'; // 👈 Se agregó 'router'
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native'; // 👈 Se agregó 'Alert'
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://inmotechve.com';

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  const insets = useSafeAreaInsets();

  // 🚀 Vigía de Notificaciones para el menú inferior
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch(`${API_URL}/api/notificaciones`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const data = await res.json();
        if (data.success) {
          const unread = data.notificaciones.filter((n: any) => !n.leida).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.log("Silencio: Error obteniendo conteo de notificaciones");
      }
    };

    fetchUnreadCount();
  }, []);

  // 🔴 NUEVO: Vigía de Estatus de Usuario en Tiempo Real
  useEffect(() => {
    let statusChannel: any;

    const setupRealtimeListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Si no hay usuario, no hacemos nada

      // Creamos el canal para escuchar cambios específicamente en este usuario
      statusChannel = supabase
        .channel('mobile-usuario-estatus-listener')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'usuarios',
            filter: `id_usuario=eq.${user.id}`
          },
          async (payload) => {
            // Si el estatus cambia a algo distinto de 'Activo'
            if (payload.new.estatus !== 'Activo') {
              Alert.alert(
                "Sesión Terminada",
                "Tu cuenta de afiliado ha sido inactivada por un administrador.",
                [
                  {
                    text: "Entendido",
                    onPress: async () => {
                      await supabase.auth.signOut();
                      // Expulsamos al usuario a la pantalla de login. 
                      // Ajusta la ruta '/login' o '/' según el nombre de tu archivo de inicio.
                      router.replace('/'); 
                    }
                  }
                ]
              );
            }
          }
        )
        .subscribe();
    };

    setupRealtimeListener();

    // Limpieza del canal al desmontar
    return () => {
      if (statusChannel) {
        supabase.removeChannel(statusChannel);
      }
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Ocultamos la cabecera nativa fea
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 10, // Le da una sombra suave en Android para separarlo del contenido
          shadowColor: '#000', // Sombra para iOS
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          backgroundColor: '#38bdf8', // 🔵 AZUL CLARO SÓLIDO (Tailwind sky-400)
          
          // Mantenemos tu magia de insets para evitar los botones de navegación nativos
          paddingBottom: Platform.OS === 'android' ? insets.bottom + 10 : insets.bottom,
          height: Platform.OS === 'android' ? 60 + insets.bottom : 85,
        },
        tabBarActiveTintColor: '#ffffff', // Letras/Iconos BLANCOS cuando está seleccionado
        tabBarInactiveTintColor: '#0f172a', // Letras/Iconos NEGROS (slate-900) cuando no está seleccionado
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 8,
          letterSpacing: 0.5,
        },
      }}
    >
      {/* 1. INMUEBLES */}
      <Tabs.Screen
        name="inventario"
        options={{
          title: 'Inmuebles',
          tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
        }}
      />

      {/* 2. BÚSQUEDA I.A (Radar M.I.A) */}
      <Tabs.Screen
        name="busqueda-ia"
        options={{
          title: 'Radar I.A',
          tabBarIcon: ({ color }) => <Feather name="cpu" size={20} color={color} />,
        }}
      />

      {/* 3. SOLICITUDES */}
      <Tabs.Screen
        name="solicitudes"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color }) => <Feather name="clipboard" size={20} color={color} />,
        }}
      />

      {/* 4. NOTIFICACIONES (Con Badge Dinámico) */}
      <Tabs.Screen
        name="notificaciones"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color }) => (
            <View>
              <Feather name="bell" size={20} color={color} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -6,
                  backgroundColor: '#ef4444', // rose-500
                  borderRadius: 8,
                  width: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#38bdf8' // 🔵 Combinado con el nuevo fondo azul claro
                }}>
                  <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* 5. PERFIL */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}