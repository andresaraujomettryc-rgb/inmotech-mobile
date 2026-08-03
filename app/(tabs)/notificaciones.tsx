import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, Bell, Check, Info } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://inmotechve.com';

interface Notificacion {
  id_notificacion: string;
  tipo_notificacion: string;
  titulo: string;
  mensaje: string;
  metadata: { url?: string };
  leida: boolean;
  fecha_creacion: string;
}

export default function NotificacionesMobileScreen() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string>('');

  const cargarNotificaciones = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSessionToken(session.access_token);

    try {
      // Hacemos ping a la API web con nuestro token móvil
      const res = await fetch(`${API_URL}/api/notificaciones`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotificaciones(data.notificaciones);
      }
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const marcarComoLeida = async (id: string, url?: string) => {
    // 1. Optimismo de UI: Lo marcamos como leído en la pantalla al instante
    setNotificaciones(prev => 
      prev.map(n => n.id_notificacion === id ? { ...n, leida: true } : n)
    );

    // 2. Disparamos la actualización al servidor en background
    try {
      await fetch(`${API_URL}/api/notificaciones`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}` 
        },
        body: JSON.stringify({ id_notificacion: id })
      });
    } catch (error) {
      console.error("Fallo al marcar como leída");
    }

    // 3. Enrutamiento móvil si hay URL
    if (url) {
      // Si la URL que viene de la API web (ej: /solicitudes/123) encaja con las rutas móviles, 
      // la navegamos directamente usando "as any" para esquivar el tipado estricto.
      router.push(url as any); 
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      
      {/* HEADER FIJO */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 10, backgroundColor: '#f8fafc', borderRadius: 12 }}>
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Bell size={18} color="#0f172a" />
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>Centro de Alertas</Text>
        </View>

        <TouchableOpacity onPress={cargarNotificaciones} style={{ padding: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#0284c7' }}>RECARGAR</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO */}
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : notificaciones.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Check size={48} color="#10b981" style={{ opacity: 0.3, marginBottom: 16 }} />
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#334155' }}>Estás al día</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 4 }}>No hay nuevas alertas en tu radar.</Text>
          </View>
        ) : (
          notificaciones.map((notif) => (
            <TouchableOpacity
              key={notif.id_notificacion}
              onPress={() => marcarComoLeida(notif.id_notificacion, notif.metadata?.url)}
              style={{ 
                flexDirection: 'row', 
                backgroundColor: notif.leida ? '#ffffff' : '#f0f9ff', // Celeste si es nueva, Blanca si es leída
                borderRadius: 20, 
                padding: 16, 
                marginBottom: 12, 
                borderWidth: 1, 
                borderColor: notif.leida ? '#f1f5f9' : '#bae6fd',
                opacity: notif.leida ? 0.6 : 1
              }}
            >
              <View style={{ 
                backgroundColor: notif.tipo_notificacion === 'MATCH_INVENTARIO' ? '#e0f2fe' : '#f1f5f9', 
                padding: 10, 
                borderRadius: 14, 
                marginRight: 12, 
                height: 40,
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {notif.tipo_notificacion === 'MATCH_INVENTARIO' ? <AlertCircle size={20} color="#0284c7" /> : <Info size={20} color="#64748b" />}
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 4 }} numberOfLines={1}>{notif.titulo}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 8, lineHeight: 18 }} numberOfLines={3}>{notif.mensaje}</Text>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {new Date(notif.fecha_creacion).toLocaleDateString('es-VE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {!notif.leida && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0284c7', position: 'absolute', top: 16, right: 16 }} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}