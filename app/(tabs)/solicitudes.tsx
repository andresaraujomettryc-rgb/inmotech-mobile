import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bath, Bed, Car, CheckCircle2, DollarSign, MapPin, PauseCircle, PlayCircle, PlusCircle, Search, Target, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://inmotechve.com';

// Componente Interno para el Contador de Matches
const MatchCounterMobile = ({ id_solicitud, estatus_registro, token }: { id_solicitud: string, estatus_registro: string, token: string }) => {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (estatus_registro === 'INACTIVA') {
      setTotal(0);
      return;
    }
    fetch(`${API_URL}/api/solicitudes/${id_solicitud}/matches?countOnly=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (data.success) setTotal(data.totalMatches); })
      .catch(() => setTotal(0));
  }, [id_solicitud, estatus_registro]);

  if (total === null) return <ActivityIndicator size="small" color="#94a3b8" />;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: total > 0 ? '#ecfdf5' : '#f8fafc', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: total > 0 ? '#d1fae5' : '#f1f5f9' }}>
      {total > 0 && <CheckCircle2 size={12} color="#059669" style={{ marginRight: 4 }} />}
      <Text style={{ fontSize: 10, fontWeight: '900', color: total > 0 ? '#059669' : '#94a3b8' }}>{total} MATCHES</Text>
    </View>
  );
};

export default function SolicitudesTabScreen() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string>('');

  const cargarDatos = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSessionToken(session.access_token);

    const { data: userData } = await supabase.from('usuarios').select('id_oficina, id_usuario').eq('id_usuario', session.user.id).single();

    if (userData?.id_oficina) {
      try {
        const res = await fetch(`${API_URL}/api/solicitudes?id_oficina=${userData.id_oficina}&id_asesor=${userData.id_usuario}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const { data } = await res.json();
          setSolicitudes(data || []);
        }
      } catch (error) {
        console.error("Error API:", error);
      }
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));

  const handlePausa = async (id: string, estatus_actual: string) => {
    const nuevoEstatus = estatus_actual === 'INACTIVA' ? 'ACTIVA' : 'INACTIVA';
    await fetch(`${API_URL}/api/solicitudes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ id_solicitud: id, accion: 'CAMBIAR_ESTATUS', estatus_registro: nuevoEstatus })
    });
    cargarDatos();
  };

  const handleEliminar = (id: string) => {
    Alert.alert("Confirmar", "¿Eliminar Radar de Búsqueda?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          await fetch(`${API_URL}/api/solicitudes`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify({ id_solicitud: id, accion: 'ELIMINAR' })
          });
          cargarDatos();
        }
      }
    ]);
  };

  const filtradas = solicitudes.filter(s => (s.referencia_cliente || '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 40 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ backgroundColor: '#e0f2fe', padding: 6, borderRadius: 10, marginRight: 8 }}>
                <Target size={20} color="#0284c7" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>Radar Inmobiliario</Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' }}>Cruces Inteligentes en Vivo</Text>
          </View>
        </View>

        {/* Búsqueda y Botón */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', paddingHorizontal: 12, height: 50, marginBottom: 12 }}>
            <Search size={18} color="#94a3b8" />
            <TextInput 
              placeholder="Buscar referencia..." 
              value={busqueda} onChangeText={setBusqueda}
              style={{ flex: 1, marginLeft: 10, fontSize: 14, color: '#334155', fontWeight: '600' }}
            />
          </View>
          <TouchableOpacity onPress={() => router.push('/solicitudes/nueva' as any)} style={{ backgroundColor: '#0284c7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 16, shadowColor: '#0284c7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
            <PlusCircle size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>Nueva Solicitud</Text>
          </TouchableOpacity>
        </View>

        {/* Listado */}
        {loading ? <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} /> : 
          filtradas.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Target size={40} color="#cbd5e1" />
              <Text style={{ color: '#94a3b8', fontWeight: '700', marginTop: 10 }}>Espectro de búsqueda vacío</Text>
            </View>
          ) : (
          filtradas.map(item => {
            // Concatenador de Ubicación Inteligente
            const ubicacionArray = [item.nombre_estado, item.nombre_ciudad, item.nombre_municipio, item.nombre_urbanizacion].filter(Boolean);
            const ubicacionTexto = ubicacionArray.length > 0 ? ubicacionArray.join(', ') : 'Cualquier Zona';

            return (
              <TouchableOpacity 
                key={item.id_solicitud} 
                onPress={() => router.push(`/solicitudes/${item.id_solicitud}` as any)}
                style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#cbd5e1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, opacity: item.estatus_registro === 'INACTIVA' ? 0.6 : 1 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ backgroundColor: item.estatus_registro === 'INACTIVA' ? '#f59e0b' : '#0f172a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>{item.estatus_registro === 'INACTIVA' ? 'INACTIVA' : item.tipo_operacion}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => handlePausa(item.id_solicitud, item.estatus_registro)}>
                      {item.estatus_registro === 'INACTIVA' ? <PlayCircle size={20} color="#f59e0b" /> : <PauseCircle size={20} color="#94a3b8" />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleEliminar(item.id_solicitud)}>
                      <Trash2 size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 4 }}>{item.referencia_cliente}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284c7', marginBottom: 12 }}>{item.nombre_tipo_inmueble || 'Cualquier Inmueble'}</Text>

                {/* BLOQUE DE PARÁMETROS CONDICIONALES */}
                <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, marginBottom: 12 }}>
                  
                  {/* Ubicación */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: (item.precio_min || item.precio_max) ? 8 : 0 }}>
                    <MapPin size={12} color="#94a3b8" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', flex: 1 }} numberOfLines={2}>
                      {ubicacionTexto}
                    </Text>
                  </View>

                  {/* Precio */}
                  {(item.precio_min || item.precio_max) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <DollarSign size={12} color="#10b981" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                        ${item.precio_min ? Number(item.precio_min).toLocaleString() : 0} - ${item.precio_max ? Number(item.precio_max).toLocaleString() : 'MAX'}
                      </Text>
                    </View>
                  )}

                  {/* Etiquetas de Características (Mínimos y Máximos) */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {(item.habitaciones_min || item.habitaciones_max) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Bed size={10} color="#64748b" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748b' }}>{item.habitaciones_min || 0} a {item.habitaciones_max || 'Max'}</Text>
                      </View>
                    )}
                    {(item.banos_min || item.banos_max) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Bath size={10} color="#64748b" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748b' }}>{item.banos_min || 0} a {item.banos_max || 'Max'}</Text>
                      </View>
                    )}
                    {(item.estacionamientos_min || item.estacionamientos_max) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Car size={10} color="#64748b" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748b' }}>{item.estacionamientos_min || 0} a {item.estacionamientos_max || 'Max'}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 }}>
                  <MatchCounterMobile id_solicitud={item.id_solicitud} estatus_registro={item.estatus_registro} token={sessionToken} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#0284c7' }}>VER DETALLES &rarr;</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}