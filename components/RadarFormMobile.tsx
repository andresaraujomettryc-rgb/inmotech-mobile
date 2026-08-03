import { supabase } from '@/lib/supabase';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, Database, Globe } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageBackground, Linking, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://inmotechve.com';

interface RadarFormProps { idSolicitud?: string; }

// Componente Auxiliar para Selectores Nativos Glassmorphism
const SelectModal = ({ label, value, options, onSelect, disabled = false }: any) => {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o:any) => o.value === value)?.label || 'Seleccionar...';
  
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>{label}</Text>
      <TouchableOpacity 
        onPress={() => !disabled && setVisible(true)} 
        style={{ backgroundColor: disabled ? '#f1f5f9' : '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, height: 50, justifyContent: 'center', opacity: disabled ? 0.6 : 1 }}
      >
        <Text style={{ fontSize: 14, color: disabled ? '#94a3b8' : '#334155', fontWeight: '600' }} numberOfLines={1}>{selectedLabel}</Text>
      </TouchableOpacity>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, maxHeight: '80%' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 16 }}>Selecciona {label}</Text>
            <ScrollView>
              <TouchableOpacity onPress={() => { onSelect(''); setVisible(false); }} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '600' }}>Cualquiera / Todos</Text>
              </TouchableOpacity>
              {options.map((opt:any) => (
                <TouchableOpacity key={opt.value} onPress={() => { onSelect(opt.value); setVisible(false); }} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                  <Text style={{ fontSize: 15, color: '#0f172a', fontWeight: '700' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setVisible(false)} style={{ marginTop: 20, backgroundColor: '#f1f5f9', padding: 16, borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ fontWeight: '900', color: '#64748b' }}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function RadarFormMobile({ idSolicitud }: RadarFormProps) {
  const router = useRouter();
  const isEditMode = !!idSolicitud;
  
  const [currentId, setCurrentId] = useState<string | null>(idSolicitud || null);
  const [activeTab, setActiveTab] = useState<'PARAMETROS' | 'MATCHES'>('PARAMETROS');
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [perfil, setPerfil] = useState<any>(null);

  // Catálogos
  const [tipos, setTipos] = useState<any[]>([]);
  const [estados, setEstados] = useState<any[]>([]);
  const [ciudades, setCiudades] = useState<any[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [urbanizaciones, setUrbanizaciones] = useState<any[]>([]);
  
  // Resultados Matches
  const [matchesInternos, setMatchesInternos] = useState<any[]>([]);
  const [matchesExternos, setMatchesExternos] = useState<any[]>([]);
  const [showInternos, setShowInternos] = useState(true);
  const [showExternos, setShowExternos] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Modal Ficha Profunda (Internos)
  const [selectedInmueble, setSelectedInmueble] = useState<any | null>(null);
  const [fichaCompleta, setFichaCompleta] = useState<any>(null);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [activeFotoIndex, setActiveFotoIndex] = useState(0);

  // 🚀 MEJORA CORE: Estado multi-zona usando arreglo 'id_urbanizaciones'
  const [formData, setFormData] = useState<{
    referencia_cliente: string; tipo_operacion: string; id_tipo_inmueble: string;
    habitaciones_min: string; habitaciones_max: string; 
    banos_min: string; banos_max: string; 
    estacionamientos_min: string; estacionamientos_max: string;
    precio_min: string; precio_max: string; 
    id_estado: string; id_ciudad: string; id_municipio: string; 
    id_urbanizaciones: string[];
  }>({
    referencia_cliente: '', tipo_operacion: 'VENTA', id_tipo_inmueble: '',
    habitaciones_min: '', habitaciones_max: '', 
    banos_min: '', banos_max: '', 
    estacionamientos_min: '', estacionamientos_max: '',
    precio_min: '', precio_max: '', 
    id_estado: '', id_ciudad: '', id_municipio: '', 
    id_urbanizaciones: []
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSessionToken(session.access_token);
      const { data: userData } = await supabase.from('usuarios').select('id_oficina, id_usuario').eq('id_usuario', session.user.id).single();
      setPerfil(userData);

      const resT = await fetch(`${API_URL}/api/solicitudes/catalogos?action=tipos_inmueble`);
      const dataT = await resT.json();
      if(dataT.data) setTipos(dataT.data.map((t:any)=>({label: t.nombre, value: t.id_tipo})));

      const resE = await fetch(`${API_URL}/api/solicitudes/catalogos?action=estados`);
      const dataE = await resE.json();
      if(dataE.data) setEstados(dataE.data.map((e:any)=>({label: e.nombre, value: e.id_estado})));

      if (isEditMode && idSolicitud) {
        const resSol = await fetch(`${API_URL}/api/solicitudes/${idSolicitud}`, { headers: { 'Authorization': `Bearer ${session.access_token}` }});
        if (resSol.ok) {
          const { data } = await resSol.json();
          
          // 🚀 FIX: Parseo Inteligente de UUIDs Múltiples para el Móvil
          let urbsArray: string[] = [];
          const zonasCrudas = data.id_urbanizaciones || data.id_urbanizacion;
          if (zonasCrudas) {
            urbsArray = Array.isArray(zonasCrudas) 
              ? zonasCrudas.map(String) 
              : String(zonasCrudas).split(',').map(s => s.trim()).filter(Boolean);
          }

          const clean = Object.keys(data).reduce((acc:any, key) => { 
            if(key === 'id_urbanizaciones' || key === 'id_urbanizacion') return acc;
            acc[key] = data[key]===null?'':String(data[key]); 
            return acc; 
          }, {});
          
          setFormData(prev => ({...prev, ...clean, id_urbanizaciones: urbsArray}));
          
          // 🚀 FIX: Usamos los helpers locales para que transformen los datos a {label, value}
          if(data.id_estado) cargarCiudades(data.id_estado);
          if(data.id_ciudad) cargarMunicipios(data.id_ciudad);
          if(data.id_municipio) cargarUrbanizaciones(data.id_municipio);
        }
      }
      setLoading(false);
    };
    init();
  }, [idSolicitud, isEditMode]);

  const cargarCiudades = async (id_est: string) => {
    if(!id_est) { setCiudades([]); return; }
    const res = await fetch(`${API_URL}/api/solicitudes/catalogos?action=ciudades&id_estado=${id_est}`);
    const data = await res.json();
    if(data.data) setCiudades(data.data.map((c:any)=>({label: c.nombre, value: c.id_ciudad})));
  };
  const cargarMunicipios = async (id_ciu: string) => {
    if(!id_ciu) { setMunicipios([]); return; }
    const res = await fetch(`${API_URL}/api/solicitudes/catalogos?action=municipios&id_ciudad=${id_ciu}`);
    const data = await res.json();
    if(data.data) setMunicipios(data.data.map((m:any)=>({label: m.nombre, value: m.id_municipio})));
  };
  const cargarUrbanizaciones = async (id_mun: string) => {
    if(!id_mun) { setUrbanizaciones([]); return; }
    const res = await fetch(`${API_URL}/api/solicitudes/catalogos?action=urbanizaciones&id_municipio=${id_mun}`);
    const data = await res.json();
    if(data.data) setUrbanizaciones(data.data.map((u:any)=>({label: u.nombre, value: u.id_urbanizacion})));
  };

  const handleEstadoChange = (val: string) => {
    setFormData({...formData, id_estado: val, id_ciudad: '', id_municipio: '', id_urbanizaciones: []});
    setCiudades([]); setMunicipios([]); setUrbanizaciones([]);
    cargarCiudades(val);
  };
  const handleCiudadChange = (val: string) => {
    setFormData({...formData, id_ciudad: val, id_municipio: '', id_urbanizaciones: []});
    setMunicipios([]); setUrbanizaciones([]);
    cargarMunicipios(val);
  };
  const handleMunicipioChange = (val: string) => {
    setFormData({...formData, id_municipio: val, id_urbanizaciones: []});
    setUrbanizaciones([]);
    cargarUrbanizaciones(val);
  };

  // 🚀 HANDLERS MULTIZONA
  const handleSelectUrbanizacion = (val: string) => {
    if (!val || val === '') return;
    if (!formData.id_urbanizaciones.includes(val)) {
      setFormData(prev => ({ ...prev, id_urbanizaciones: [...prev.id_urbanizaciones, val] }));
    }
  };
  const handleRemoveUrbanizacion = (id: string) => {
    setFormData(prev => ({ ...prev, id_urbanizaciones: prev.id_urbanizaciones.filter(item => item !== id) }));
  };

  const cargarMatches = async (targetId: string = currentId!) => {
    if (!targetId) return;
    const res = await fetch(`${API_URL}/api/solicitudes/${targetId}/matches?page=1&limit=20`, { headers: { 'Authorization': `Bearer ${sessionToken}` }});
    if (res.ok) {
      const d = await res.json();
      setMatchesInternos(d.internos || []);
      setMatchesExternos(d.externos || []);
    }
  };

  useEffect(() => { if (activeTab === 'MATCHES' && currentId) cargarMatches(); }, [activeTab, currentId]);

  const handleSubmit = async () => {
    if (!formData.referencia_cliente) { Alert.alert("Falta Información", "Por favor, ingresa una referencia de cliente"); return; }
    setSaving(true);
    try {
      const payload = JSON.parse(JSON.stringify(formData, (k, v) => v === "" ? null : v));
      
      // 🚀 TRUCO DE INGENIERÍA: Array a String antes de enviar
      if (payload.id_urbanizaciones && payload.id_urbanizaciones.length > 0) {
        payload.id_urbanizacion = payload.id_urbanizaciones.join(',');
      } else {
        payload.id_urbanizacion = null;
      }
      delete payload.id_urbanizaciones;

      const method = currentId ? 'PUT' : 'POST';
      const url = currentId ? `${API_URL}/api/solicitudes/${currentId}` : `${API_URL}/api/solicitudes`;
      
      const body = currentId ? payload : { ...payload, id_oficina: perfil.id_oficina, id_usuario_asesor: perfil.id_usuario };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        if (!currentId) {
          const resp = await res.json();
          const newId = resp.data?.id_solicitud || resp.id_solicitud;
          setCurrentId(newId);
          Alert.alert("¡Radar Activado!", "Buscando coincidencias...");
          setActiveTab('MATCHES');
          cargarMatches(newId);
        } else {
          Alert.alert("¡Actualizado!", "Filtros recalculados exitosamente.");
          setActiveTab('MATCHES');
          cargarMatches(currentId);
        }
      } else {
         Alert.alert("Error", "No se pudo guardar la solicitud.");
      }
    } catch(e) { Alert.alert("Error", "Problema de conexión con el servidor."); }
    setSaving(false);
  };

  const openFichaProfunda = async (inm: any) => {
    setSelectedInmueble(inm); 
    setFichaCompleta(null); 
    setActiveFotoIndex(0);
    setLoadingFicha(true); 
    
    try {
      const { data, error } = await supabase.from('inmuebles').select(`
        id_inmueble, descripciondetallada, observaciones,
        inmuebles_imagenes(url_imagen, orden),
        inmuebles_caracteristicas(
          caracteristicas_catalogo:caracteristicas_catalogo!id_caracteristica(nombre, tipo)
        )
      `).eq('id_inmueble', inm.id).single();

      if (error) throw error;

      if (data) {
        const galeria = data.inmuebles_imagenes?.sort((a: any, b: any) => a.orden - b.orden).map((img: any) => img.url_imagen) || [inm.imagen];
        const caracteristicas = data.inmuebles_caracteristicas?.map((ic: any) => ({
          nombre: ic.caracteristicas_catalogo?.nombre || '',
          tipo: ic.caracteristicas_catalogo?.tipo?.toUpperCase() === 'EXTERNA' ? 'Externa' : 'Interna'
        })) || [];
        setFichaCompleta({ ...data, galeria, caracteristicas });
      }
    } catch (err) { 
      Alert.alert("Error", "No se pudo cargar la ficha profunda.");
      setSelectedInmueble(null);
    } 
    finally { setLoadingFicha(false); }
  };

  const shareFichaPublica = async (inm: any) => {
    const url = `${API_URL}/p/${inm.id || inm.id_inmueble}`;
    const precioStr = inm.precio?.toLocaleString() || '0';
    let msg = `*${inm.titulo}*\n`;
    msg += `• Precio (${inm.tipo_operacion || 'Venta'}): $${precioStr}\n`;
    if (inm.habitaciones) msg += `• Habitaciones: ${inm.habitaciones}\n`;
    if (inm.banos) msg += `• Baños: ${inm.banos}\n`;
    msg += `\nMás información y fotos: ${url}`;

    try { await Share.share({ message: msg, url: url }); } catch (e) { console.error(e); }
  };

  const openWhatsApp = (tel: string, msg: string) => {
    if(!tel) return;
    const num = tel.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}&phone=${num}`);
  };

  if (loading) return <ActivityIndicator size="large" color="#0284c7" style={{flex:1, justifyContent:'center'}} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header Fijo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 10, backgroundColor: '#f8fafc', borderRadius: 12 }}><ArrowLeft size={20} color="#64748b" /></TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>{currentId ? 'Modificar Radar' : 'Nuevo Radar'}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={saving} style={{ backgroundColor: '#0284c7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>{saving ? '...' : 'GUARDAR'}</Text>
        </TouchableOpacity>
      </View>

      {/* Pestañas */}
      {currentId && (
        <View style={{ flexDirection: 'row', padding: 16, backgroundColor: '#fff' }}>
          <TouchableOpacity onPress={() => setActiveTab('PARAMETROS')} style={{ flex: 1, alignItems: 'center', padding: 12, borderBottomWidth: 3, borderBottomColor: activeTab === 'PARAMETROS' ? '#0284c7' : 'transparent' }}>
            <Text style={{ fontWeight: '900', color: activeTab === 'PARAMETROS' ? '#0284c7' : '#94a3b8' }}>PARÁMETROS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('MATCHES')} style={{ flex: 1, alignItems: 'center', padding: 12, borderBottomWidth: 3, borderBottomColor: activeTab === 'MATCHES' ? '#10b981' : 'transparent' }}>
            <Text style={{ fontWeight: '900', color: activeTab === 'MATCHES' ? '#10b981' : '#94a3b8' }}>RESULTADOS</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* =========================================
            PESTAÑA DE PARÁMETROS (FORMULARIO)
        =========================================== */}
        {activeTab === 'PARAMETROS' && (
          <View>
            <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 16, borderBottomWidth: 1, borderColor: '#f1f5f9', paddingBottom: 8 }}>Clasificación de Demanda</Text>
              
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 6 }}>REFERENCIA DE CLIENTE</Text>
              <TextInput value={formData.referencia_cliente} onChangeText={(t)=>setFormData({...formData, referencia_cliente: t})} style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, fontSize: 14, fontWeight: '600', marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' }} placeholder="Ej: Familia Pérez - Casa en el Este" />
              
              <SelectModal label="Tipo de Operación" value={formData.tipo_operacion} options={[{label:'VENTA', value:'VENTA'}, {label:'ALQUILER', value:'ALQUILER'}]} onSelect={(v:any)=>setFormData({...formData, tipo_operacion:v})} />
              <SelectModal label="Tipo de Inmueble" value={formData.id_tipo_inmueble} options={tipos} onSelect={(v:any)=>setFormData({...formData, id_tipo_inmueble:v})} />
            </View>

            <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 16, borderBottomWidth: 1, borderColor: '#f1f5f9', paddingBottom: 8 }}>Límites Métricos</Text>
              
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 6 }}>HABITACIONES</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TextInput keyboardType="numeric" value={formData.habitaciones_min} onChangeText={(t)=>setFormData({...formData, habitaciones_min: t})} style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, textAlign: 'center', fontWeight: 'bold' }} placeholder="Mínimo" />
                <TextInput keyboardType="numeric" value={formData.habitaciones_max} onChangeText={(t)=>setFormData({...formData, habitaciones_max: t})} style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, textAlign: 'center', fontWeight: 'bold' }} placeholder="Máximo" />
              </View>

              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 6 }}>BAÑOS</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TextInput keyboardType="numeric" value={formData.banos_min} onChangeText={(t)=>setFormData({...formData, banos_min: t})} style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, textAlign: 'center', fontWeight: 'bold' }} placeholder="Mínimo" />
                <TextInput keyboardType="numeric" value={formData.banos_max} onChangeText={(t)=>setFormData({...formData, banos_max: t})} style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, textAlign: 'center', fontWeight: 'bold' }} placeholder="Máximo" />
              </View>

              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 6 }}>PUESTOS DE ESTACIONAMIENTO</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TextInput keyboardType="numeric" value={formData.estacionamientos_min} onChangeText={(t)=>setFormData({...formData, estacionamientos_min: t})} style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, textAlign: 'center', fontWeight: 'bold' }} placeholder="Mínimo" />
                <TextInput keyboardType="numeric" value={formData.estacionamientos_max} onChangeText={(t)=>setFormData({...formData, estacionamientos_max: t})} style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, textAlign: 'center', fontWeight: 'bold' }} placeholder="Máximo" />
              </View>
              
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 6 }}>PRESUPUESTO (RANGO USD)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput keyboardType="numeric" value={formData.precio_min} onChangeText={(t)=>setFormData({...formData, precio_min: t})} style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, fontWeight: 'bold' }} placeholder="$ Mínimo" />
                <TextInput keyboardType="numeric" value={formData.precio_max} onChangeText={(t)=>setFormData({...formData, precio_max: t})} style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, fontWeight: 'bold' }} placeholder="$ Máximo" />
              </View>
            </View>

            <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 16, borderBottomWidth: 1, borderColor: '#f1f5f9', paddingBottom: 8 }}>Ubicación Geográfica</Text>
              <SelectModal label="Estado" value={formData.id_estado} options={estados} onSelect={handleEstadoChange} />
              <SelectModal label="Ciudad" value={formData.id_ciudad} options={ciudades} onSelect={handleCiudadChange} disabled={!formData.id_estado} />
              <SelectModal label="Municipio" value={formData.id_municipio} options={municipios} onSelect={handleMunicipioChange} disabled={!formData.id_ciudad} />
              
              {/* 🚀 ARQUITECTURA SELECCIÓN MÚLTIPLE (MÓVIL) */}
              <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 }}>
                <SelectModal 
                  label="Añadir Urbanización / Zona" 
                  value="" // Vacío para que funcione como botón sumador
                  options={urbanizaciones} 
                  onSelect={handleSelectUrbanizacion} 
                  disabled={!formData.id_municipio} 
                />

                <View style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginTop: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
                    Zonas especificadas ({formData.id_urbanizaciones.length})
                  </Text>
                  
                  {formData.id_urbanizaciones.length === 0 ? (
                    <Text style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                      🌍 Búsqueda global en todo el municipio.
                    </Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {formData.id_urbanizaciones.map((urbId) => {
                        const nombreZona = urbanizaciones.find((u:any) => String(u.value) === String(urbId))?.label || 'Cargando...';
                        return (
                          <View 
                            key={urbId} 
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingLeft: 10, paddingRight: 4, paddingVertical: 6 }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155', marginRight: 8 }}>
                              {nombreZona}
                            </Text>
                            <TouchableOpacity 
                              onPress={() => handleRemoveUrbanizacion(urbId)}
                              style={{ backgroundColor: '#fee2e2', padding: 4, borderRadius: 6 }}
                            >
                              <Feather name="x" size={10} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>

            </View>

            <TouchableOpacity onPress={handleSubmit} disabled={saving} style={{ backgroundColor: '#0284c7', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 24, shadowColor: '#0284c7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 }}>{saving ? 'PROCESANDO...' : 'GUARDAR Y BUSCAR COINCIDENCIAS'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* =========================================
            PESTAÑA DE RESULTADOS (MATCHES)
        =========================================== */}
        {activeTab === 'MATCHES' && (
          <View>
            {/* 🟦 SECCIÓN INTERNOS (INMOTECH METTRYC) */}
            <TouchableOpacity onPress={() => setShowInternos(!showInternos)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f2fe', padding: 16, borderRadius: 16, marginBottom: showInternos ? 16 : 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Database size={20} color="#0284c7" />
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#0284c7', marginLeft: 10 }}>INVENTARIO METTRYC ({matchesInternos.length})</Text>
              </View>
              {showInternos ? <ChevronUp size={20} color="#0284c7" /> : <ChevronDown size={20} color="#0284c7" />}
            </TouchableOpacity>
            
            {showInternos && matchesInternos.map(inm => (
              <TouchableOpacity key={`int-${inm.id}`} onPress={() => openFichaProfunda(inm)} style={styles.card}>
                {/* Foto Hero */}
                <ImageBackground 
                  source={{ uri: inm.imagen || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80' }} 
                  style={styles.cardHero} 
                  imageStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
                >
                  <View style={styles.heroOverlay}>
                    <View style={styles.badgesRow}>
                      <BlurView intensity={70} tint="dark" style={styles.badgeGlass}><Text style={styles.badgeText}>{inm.codigo}</Text></BlurView>
                    </View>
                    <BlurView intensity={80} tint="light" style={styles.priceGlass}><Text style={styles.priceTag}>${Number(inm.precio).toLocaleString()} <Text style={styles.priceLabel}>{inm.tipo_operacion}</Text></Text></BlurView>
                  </View>
                </ImageBackground>

                {/* Info Inmueble */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{inm.titulo}</Text>
                  
                  <View style={styles.miniFeatures}>
                    {inm.metros && <Text style={styles.miniFeatureText}>📐 {inm.metros} m²</Text>}
                    {inm.habitaciones && <Text style={styles.miniFeatureText}>🛏️ {inm.habitaciones} H</Text>}
                    {inm.banos && <Text style={styles.miniFeatureText}>🛁 {inm.banos} B</Text>}
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.agentRow}>
                    <View style={styles.agentInfo}>
                      <Text style={styles.agentLabel}>ASESOR ENCARGADO</Text>
                      <Text style={styles.agentName}><Feather name="user" size={12} color="#64748b"/> {inm.asesor_nombre}</Text>
                    </View>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); openWhatsApp(inm.asesor_telefono, `Hola, vi tu inmueble ${inm.codigo} en el Radar InmoTech.`); }} style={styles.btnWhatsapp}>
                      <FontAwesome5 name="whatsapp" size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* 🟪 SECCIÓN EXTERNOS (WHATSAPP GROUPS) */}
            <TouchableOpacity onPress={() => setShowExternos(!showExternos)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0e7ff', padding: 16, borderRadius: 16, marginBottom: showExternos ? 16 : 24, marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Globe size={20} color="#4f46e5" />
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#4f46e5', marginLeft: 10 }}>RADAR EXTERNO (WA) ({matchesExternos.length})</Text>
              </View>
              {showExternos ? <ChevronUp size={20} color="#4f46e5" /> : <ChevronDown size={20} color="#4f46e5" />}
            </TouchableOpacity>

            {showExternos && matchesExternos.map((ext, idx) => (
              <View key={`ext-${idx}`} style={{ backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e0e7ff' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', backgroundColor: '#4f46e5', color: '#fff', padding: 4, borderRadius: 6 }}>{ext.tipo_operacion || 'EXTERNO'}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#4f46e5' }}>${ext.precio ? Number(ext.precio).toLocaleString() : 'Consultar'}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>{ext.titulo}</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 12 }}>
                  <Calendar size={12} color="#0ea5e9" />
                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748b' }}>
                    {ext.fecha_mensaje ? new Date(ext.fecha_mensaje).toLocaleDateString() : 'FECHA DESCONOCIDA'}
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={() => setExpandedCard(expandedCard === ext.id ? null : ext.id)}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', borderBottomWidth: expandedCard === ext.id ? 0 : 1, borderBottomColor: '#f1f5f9', marginBottom: 12 }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {expandedCard === ext.id ? 'OCULTAR MENSAJE ORIGINAL' : 'VER MENSAJE ORIGINAL'}
                  </Text>
                  {expandedCard === ext.id ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                </TouchableOpacity>

                {expandedCard === ext.id && (
                  <View style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fde68a' }}>
                    <Text style={{ fontSize: 11, color: '#92400e', fontStyle: 'italic', lineHeight: 18 }}>"{ext.mensaje_original || 'Sin texto original'}"</Text>
                  </View>
                )}

                <TouchableOpacity onPress={() => openWhatsApp(ext.asesor_telefono, `Hola, vi tu inmueble ${ext.titulo} en un grupo. ¿Disponible para punta compartida?`)} style={{ backgroundColor: '#4f46e5', padding: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                  <FontAwesome5 name="whatsapp" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12 }}>CONTACTAR A {ext.asesor_nombre}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* 🖼️ MODAL DE FICHA RESUMEN PROFUNDA (INMUEBLES INTERNOS)                 */}
      {/* ========================================================================= */}
      <Modal visible={!!selectedInmueble} animationType="slide" onRequestClose={() => setSelectedInmueble(null)}>
        <View style={styles.fullModalContainer}>
          {loadingFicha || !fichaCompleta ? (
             <View style={styles.center}><ActivityIndicator size="large" color="#0ea5e9" /><Text style={styles.loadingText}>Cargando expediente de InmoTech...</Text></View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 50}}>
              
              {/* Carrusel de Fotos */}
              <View style={styles.carouselContainer}>
                <Image source={{ uri: fichaCompleta?.galeria?.[activeFotoIndex] || selectedInmueble?.imagen }} style={styles.carouselImg} />
                <TouchableOpacity style={styles.closeFullModalBtn} onPress={() => setSelectedInmueble(null)}>
                  <Feather name="arrow-left" size={20} color="#0f172a" />
                </TouchableOpacity>
                {fichaCompleta?.galeria?.length > 1 && (
                  <View style={styles.carouselControls}>
                    <TouchableOpacity onPress={() => setActiveFotoIndex(p => p === 0 ? fichaCompleta.galeria.length - 1 : p - 1)} style={styles.cBtn}><Text style={styles.cBtnText}>◀</Text></TouchableOpacity>
                    <Text style={styles.cIndexText}>{activeFotoIndex + 1} / {fichaCompleta.galeria.length}</Text>
                    <TouchableOpacity onPress={() => setActiveFotoIndex(p => (p + 1) % fichaCompleta.galeria.length)} style={styles.cBtn}><Text style={styles.cBtnText}>▶</Text></TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.modalBodyPadding}>
                <Text style={styles.fTitle}>{selectedInmueble?.titulo}</Text>
                <Text style={styles.fCode}>{selectedInmueble?.codigo} • {selectedInmueble?.tipo_operacion}</Text>
                
                <View style={styles.fPriceBox}>
                  <Text style={styles.fPriceText}>VALOR DE {selectedInmueble?.tipo_operacion?.toUpperCase()}: ${ Number(selectedInmueble?.precio)?.toLocaleString() }</Text>
                </View>

                <Text style={styles.sectionHeadingTitle}>Descripción Detallada</Text>
                <Text style={styles.bodyParagraph}>{fichaCompleta?.descripciondetallada?.replace(/<[^>]+>/g, '') || 'Sin descripción'}</Text>

                <Text style={styles.sectionHeadingTitle}>Características Internas</Text>
                <View style={styles.featuresBadgeWrap}>
                  {fichaCompleta?.caracteristicas?.filter((c:any)=>c.tipo==='Interna').length > 0 ? (
                    fichaCompleta.caracteristicas.filter((c:any)=>c.tipo==='Interna').map((c:any,i:number)=>(
                      <View key={i} style={styles.fBadge}><Text style={styles.fBadgeText}>{c.nombre}</Text></View>
                    ))
                  ) : <Text style={styles.noReg}>Ninguna cargada.</Text>}
                </View>

                <Text style={styles.sectionHeadingTitle}>Características Externas</Text>
                <View style={styles.featuresBadgeWrap}>
                  {fichaCompleta?.caracteristicas?.filter((c:any)=>c.tipo==='Externa').length > 0 ? (
                    fichaCompleta.caracteristicas.filter((c:any)=>c.tipo==='Externa').map((c:any,i:number)=>(
                      <View key={i} style={[styles.fBadge, {borderColor:'#bbf7d0'}]}><Text style={[styles.fBadgeText, {color:'#166534'}]}>{c.nombre}</Text></View>
                    ))
                  ) : <Text style={styles.noReg}>Ninguna cargada.</Text>}
                </View>

                <View style={styles.divider} />
                <Text style={styles.sectionHeadingTitle}>Acciones Rápidas</Text>
                
                <TouchableOpacity 
                  style={styles.btnSharePrimary} 
                  onPress={() => shareFichaPublica(selectedInmueble)}
                >
                  <Feather name="share-2" size={16} color="#ffffff" />
                  <Text style={styles.btnSharePrimaryText}>COMPARTIR FICHA</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btnSharePrimary, { backgroundColor: '#25D366', marginTop: 10 }]} 
                  onPress={() => openWhatsApp(selectedInmueble.asesor_telefono, `Hola, vi tu inmueble ${selectedInmueble.codigo} en el Radar InmoTech. Tengo un cliente.`)}
                >
                  <FontAwesome5 name="whatsapp" size={16} color="#ffffff" />
                  <Text style={styles.btnSharePrimaryText}>CONTACTAR AL ASESOR</Text>
                </TouchableOpacity>

              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

    </View>
  );
}

// ==========================================
// ESTILOS DE APOYO
// ==========================================
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 11, color: '#64748b', fontWeight: '900', marginTop: 10, letterSpacing: 1 },
  noReg: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  card: { backgroundColor: '#ffffff', borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardHero: { width: '100%', height: 180 },
  heroOverlay: { flex: 1, justifyContent: 'space-between', padding: 16 },
  badgesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  badgeGlass: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.5)' },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  priceGlass: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden', backgroundColor:'rgba(255,255,255,0.9)' },
  priceTag: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  priceLabel: { fontSize: 9, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0ea5e9', lineHeight: 20 },
  miniFeatures: { flexDirection: 'row', gap: 15, marginTop: 10 },
  miniFeatureText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  agentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  agentInfo: { flex: 1 },
  agentLabel: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
  agentName: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  btnWhatsapp: { width: 36, height: 36, backgroundColor: '#25D366', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  fullModalContainer: { flex: 1, backgroundColor: '#ffffff' },
  carouselContainer: { width: '100%', height: 300, backgroundColor: '#000' },
  carouselImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  closeFullModalBtn: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  carouselControls: { position: 'absolute', bottom: 15, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
  cBtn: { width: 30, height: 30, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  cBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  cIndexText: { color: '#fff', fontSize: 11, fontWeight: '900', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  modalBodyPadding: { padding: 24 },
  fTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  fCode: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#0ea5e9', fontWeight: '800', marginTop: 4 },
  fPriceBox: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#e0f2fe', borderRadius: 14, padding: 14, marginVertical: 15 },
  fPriceText: { fontSize: 14, fontWeight: '900', color: '#0369a1' },
  sectionHeadingTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  bodyParagraph: { fontSize: 13, color: '#334155', lineHeight: 22, fontWeight: '500' },
  featuresBadgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  fBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  fBadgeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  btnSharePrimary: { backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnSharePrimaryText: { color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});