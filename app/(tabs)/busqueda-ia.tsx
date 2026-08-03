import { Feather, FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// --- CONFIGURACIÓN MAESTRA ---
const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://inmotechve.com'; 

export default function RadarInmoTechMobileScreen() {
  const [modoBusqueda, setModoBusqueda] = useState<'INTERNO' | 'WEB'>('INTERNO');
  
  // Estados Buscador Web
  const [busquedaWeb, setBusquedaWeb] = useState('');

  // Estados Base de Datos (Interno)
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({
    operacion: 'TODOS',
    tipo: 'TODOS',
    precio_max: '',
    habs_min: ''
  });
  
  // 🚀 ESTADO PARA EL CATÁLOGO DINÁMICO
  const [tiposInmueble, setTiposInmueble] = useState<any[]>([]);

  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalRecords, setTotalResultados] = useState(0);
  
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // 📥 CARGAR CATÁLOGO DESDE EL BACKEND WEB
  useEffect(() => {
    const cargarTipos = async () => {
      try {
        const res = await fetch(`${WEB_API_URL}/api/catalogos`);
        const json = await res.json();
        if (json.success && json.data && json.data.tipos_inmueble) {
          setTiposInmueble(json.data.tipos_inmueble);
        }
      } catch (error) {
        console.error("Error al cargar tipos de inmueble en móvil:", error);
      }
    };
    cargarTipos();
  }, []);

  // Reiniciar al cambiar de modo
  useEffect(() => {
    setHasSearched(false);
    setResultados([]);
    setTotalResultados(0);
    setPage(1);
    setExpandedCard(null);
    if (modoBusqueda === 'INTERNO') {
      ejecutarRadar(false);
    }
  }, [modoBusqueda]);

  // =====================================================================
  // 1. 📡 MOTOR INTERNO (Data Lake)
  // =====================================================================
  const ejecutarRadar = async (isLoadMore = false) => {
    const nextBatchPage = isLoadMore ? page + 1 : 1;
    
    if (!isLoadMore) {
      setLoading(true);
      setHasSearched(true);
      setResultados([]); 
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams();
      if (busqueda) params.append('q', busqueda);
      if (filtros.operacion !== 'TODOS') params.append('operacion', filtros.operacion);
      if (filtros.tipo !== 'TODOS') params.append('tipo', filtros.tipo);
      if (filtros.precio_max) params.append('precio_max', filtros.precio_max);
      if (filtros.habs_min) params.append('habs_min', filtros.habs_min);
      params.append('page', nextBatchPage.toString());

      const response = await fetch(`${WEB_API_URL}/api/radar/interno?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (isLoadMore) {
          setResultados(prev => [...prev, ...(data.resultados || [])]);
        } else {
          setResultados(data.resultados || []);
          setTotalResultados(data.total || 0);
        }
        setPage(nextBatchPage);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Fallo de red en el Radar:", error);
      Alert.alert("Error", "No se pudo conectar con el radar interno.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // =====================================================================
  // 2. 🚀 MOTOR WEB (IA + Google)
  // =====================================================================
  const ejecutarEscaneoWeb = async () => {
    if (!busquedaWeb.trim()) return Alert.alert("Aviso", "Ingresa un término de búsqueda.");

    setLoading(true);
    setHasSearched(true);
    setResultados([]);
    setTotalResultados(0);
    setHasMore(false); 

    try {
      const res = await fetch(`${WEB_API_URL}/api/radar/externo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busqueda_web: busquedaWeb })
      });

      if (res.ok) {
        const data = await res.json();
        const propiedadesMapeadas = (data.resultados || []).map((item: any, idx: number) => ({
          id: `web-${idx}-${Date.now()}`,
          tipo_operacion: item.tipo_operacion,
          tipo_inmueble: item.tipo_inmueble,
          zona: item.zona,
          precio: item.precio_usd,
          habitaciones: item.habitaciones,
          banos: item.banos,
          metros: item.metros_cuadrados,
          extras: item.extras,
          captador: item.captador,
          telefono: item.telefono,
          enlace: item.enlace,
          mensaje_original: item.mensaje_original || item.extras,
          fecha: item.fecha || new Date().toISOString() 
        }));

        setResultados(propiedadesMapeadas);
        setTotalResultados(propiedadesMapeadas.length);
      } else {
        Alert.alert("Aviso IA", "La IA tuvo problemas rastreando la web. Intenta con otra búsqueda más específica.");
      }
    } catch (error) {
      console.error("Error consultando a Gemini:", error);
      Alert.alert("Error de Conexión", "Fallo al contactar el agente IA.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================================
  // 3. ACCIONES NATIVAS Y HELPERS
  // =====================================================================
  const updateFiltro = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const toggleMensajeOriginal = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const lanzarChatWhatsApp = (telefono: string, tipo: string, zona: string, precio: number) => {
    if (!telefono) return;
    const clearNumber = telefono.replace(/\D/g, '');
    const precioTxt = precio ? `$${precio}` : 'Consultar Precio';
    const textMsg = `¡Hola! 👋 Vi tu captación de un ${tipo || 'inmueble'} en ${zona || 'su zona'} por ${precioTxt}. ¿Está disponible para punta compartida?`;
    Linking.openURL(`whatsapp://send?phone=${clearNumber}&text=${encodeURIComponent(textMsg)}`);
  };

  const abrirEnlaceWeb = (url: string) => {
    if (url) Linking.openURL(url);
  };

  const formatearFecha = (fechaRaw?: string) => {
    if (!fechaRaw) return '';
    try {
      const d = new Date(fechaRaw);
      return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }).replace('.', '');
    } catch (e) {
      return '';
    }
  };

  // =====================================================================
  // 🎨 RENDER DE TARJETA (CARD)
  // =====================================================================
  const renderItem = ({ item }: { item: any }) => {
    const isWeb = modoBusqueda === 'WEB';
    const themeColor = isWeb ? '#4f46e5' : '#0ea5e9'; 
    const bgBadge = isWeb ? '#e0e7ff' : '#e0f2fe';
    const isExpanded = expandedCard === item.id;
    const fechaMostrar = formatearFecha(item.fecha || item.fecha_creacion);

    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardHeader}>
          <View style={[styles.badgeTop, { backgroundColor: '#0f172a' }]}>
            <Text style={styles.badgeTopText}>{item.tipo_operacion || 'N/A'}</Text>
          </View>
          <Text style={[styles.priceText, { color: themeColor }]}>
            {item.precio ? `$${Number(item.precio).toLocaleString('en-US')}` : 'Consultar'}
          </Text>
        </View>

        <View style={styles.titleDateRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.tipo_inmueble || 'Inmueble Detectado'}</Text>
          {fechaMostrar ? (
            <View style={styles.dateBadge}>
              <Feather name="calendar" size={10} color="#94a3b8" />
              <Text style={styles.dateText}>{fechaMostrar}</Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={11} color={themeColor} /> 
          <Text style={styles.locationText} numberOfLines={1}>{item.zona}</Text>
        </View>

        <View style={styles.gridStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.habitaciones || '-'}</Text>
            <Text style={styles.statLabel}>HABS</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statValue}>{item.banos || '-'}</Text>
            <Text style={styles.statLabel}>BAÑOS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.metros || '-'}</Text>
            <Text style={styles.statLabel}>M² CONST</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnToggleMsg} onPress={() => toggleMensajeOriginal(item.id)}>
          <Text style={styles.btnToggleMsgText}>
            {isExpanded ? 'OCULTAR MENSAJE' : 'VER MENSAJE ORIGINAL'}
          </Text>
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#64748b" />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.originalMsgBox}>
            <Text style={styles.originalMsgText}>
              {item.mensaje_original || item.descripcion || "No hay mensaje original disponible para esta captación."}
            </Text>
          </View>
        )}

        {item.enlace && (
          <TouchableOpacity style={[styles.btnWebLink, { backgroundColor: bgBadge, borderColor: bgBadge }]} onPress={() => abrirEnlaceWeb(item.enlace)}>
            <Feather name="external-link" size={12} color={themeColor} />
            <Text style={[styles.btnWebLinkText, { color: themeColor }]}>VER PUBLICACIÓN ORIGINAL</Text>
          </TouchableOpacity>
        )}

        <View style={styles.agentFooterRow}>
          <View style={styles.agentInfo}>
            <Text style={styles.agentLabel}>{isWeb ? 'INMOBILIARIA / CAPTADOR' : 'ASESOR EMISOR'}</Text>
            <Text style={styles.agentName} numberOfLines={1}>{item.captador || 'Franquicia Externa'}</Text>
            {item.telefono ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.telefono.replace(/\D/g, '')}`)} style={styles.telRow}>
                <Feather name="phone" size={9} color={themeColor} />
                <Text style={[styles.telText, { color: themeColor }]}>{item.telefono}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noTelText}>SIN NÚMERO VISIBLE</Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.btnWhatsapp, !item.telefono && { backgroundColor: '#f1f5f9' }]} 
            disabled={!item.telefono}
            onPress={() => lanzarChatWhatsApp(item.telefono, item.tipo_inmueble, item.zona, item.precio)}
          >
            <FontAwesome5 name="whatsapp" size={16} color={item.telefono ? "#fff" : "#94a3b8"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <FlatList
        data={resultados}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled" 
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={styles.titleRow}>
              <View style={styles.titleContent}>
                <View style={[styles.iconWrap, modoBusqueda === 'WEB' ? {backgroundColor: '#e0e7ff'} : {backgroundColor: '#e0f2fe'}]}>
                  <Feather name={modoBusqueda === 'INTERNO' ? "crosshair" : "globe"} size={22} color={modoBusqueda === 'WEB' ? '#4f46e5' : '#0ea5e9'} />
                </View>
                <View>
                  <Text style={styles.mainTitle}>Busqueda Whatsapp IA</Text>
                  <Text style={styles.subTitle}>{modoBusqueda === 'INTERNO' ? 'CAPTADORES INMOTECH' : 'AGENTE WEB INTELIGENTE'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.segmentControl}>
              <TouchableOpacity style={[styles.segmentBtn, modoBusqueda === 'INTERNO' && styles.segmentBtnActiveInt]} onPress={() => setModoBusqueda('INTERNO')}>
                <Feather name="database" size={12} color={modoBusqueda === 'INTERNO' ? '#0369a1' : '#64748b'} />
                <Text style={[styles.segmentText, modoBusqueda === 'INTERNO' && {color: '#0369a1'}]}>BASE INTERNA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentBtn, modoBusqueda === 'WEB' && styles.segmentBtnActiveWeb]} onPress={() => setModoBusqueda('WEB')}>
                <Feather name="globe" size={12} color={modoBusqueda === 'WEB' ? '#4338ca' : '#64748b'} />
                <Text style={[styles.segmentText, modoBusqueda === 'WEB' && {color: '#4338ca'}]}>RASTREO WEB IA</Text>
              </TouchableOpacity>
            </View>

            {/* FORMULARIO INTERNO */}
            {modoBusqueda === 'INTERNO' && (
              <View style={styles.formCard}>
                <View style={styles.inputWrap}>
                  <Feather name="search" size={16} color="#0ea5e9" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="Ej:pozo+planta+valencia+trigal,mañongo,prebo" 
                    value={busqueda} 
                    onChangeText={setBusqueda} 
                    placeholderTextColor="#94a3b8" 
                  />
                </View>
                
                <Text style={styles.filterLabel}>Operación</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollPills}>
                  {['TODOS', 'VENTA', 'ALQUILER'].map(op => (
                    <TouchableOpacity key={op} style={[styles.pill, filtros.operacion === op && styles.pillActiveInt]} onPress={() => updateFiltro('operacion', op)}>
                      <Text style={[styles.pillText, filtros.operacion === op && styles.pillTextActiveInt]}>{op}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 🚀 SELECTOR DINÁMICO DE TIPOS DE INMUEBLE */}
                <Text style={styles.filterLabel}>Tipo Inmueble</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollPills}>
                  <TouchableOpacity style={[styles.pill, filtros.tipo === 'TODOS' && styles.pillActiveInt]} onPress={() => updateFiltro('tipo', 'TODOS')}>
                    <Text style={[styles.pillText, filtros.tipo === 'TODOS' && styles.pillTextActiveInt]}>CUALQUIERA</Text>
                  </TouchableOpacity>
                  
                  {tiposInmueble.map(t => (
                    <TouchableOpacity 
                      key={t.id_tipo} 
                      style={[styles.pill, filtros.tipo === t.nombre && styles.pillActiveInt]} 
                      onPress={() => updateFiltro('tipo', t.nombre)}
                    >
                      <Text style={[styles.pillText, filtros.tipo === t.nombre && styles.pillTextActiveInt]}>
                        {t.nombre.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.grid2Col}>
                  <View style={{flex: 1}}>
                    <Text style={styles.filterLabel}>Techo Precio ($)</Text>
                    <TextInput style={styles.textInputSmall} placeholder="Sin Límite" keyboardType="numeric" value={filtros.precio_max} onChangeText={t => updateFiltro('precio_max', t)} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.filterLabel}>Habs Mín.</Text>
                    <TextInput style={styles.textInputSmall} placeholder="0" keyboardType="numeric" value={filtros.habs_min} onChangeText={t => updateFiltro('habs_min', t)} />
                  </View>
                </View>

                <TouchableOpacity style={styles.btnActionInt} onPress={() => ejecutarRadar(false)} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color="#fff"/> : <Text style={styles.btnActionText}>ESCANEAR GRUPOS</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* FORMULARIO WEB (IA) */}
            {modoBusqueda === 'WEB' && (
              <View style={[styles.formCard, { borderColor: '#e0e7ff', backgroundColor: '#f5f7ff' }]}>
                <Text style={[styles.filterLabel, { color: '#4f46e5', marginBottom: 10 }]}>
                  <Feather name="zap" size={12}/> Ordena a la IA buscar en portales externos
                </Text>
                <View style={[styles.inputWrap, { backgroundColor: '#fff', borderColor: '#c7d2fe' }]}>
                  <Feather name="search" size={16} color="#4f46e5" style={styles.inputIcon} />
                  <TextInput 
                    style={[styles.textInput, { color: '#312e81' }]} 
                    placeholder="Ej: Apto en Valencia..." 
                    value={busquedaWeb} 
                    onChangeText={setBusquedaWeb} 
                    placeholderTextColor="#a5b4fc"
                    multiline
                  />
                </View>
                <TouchableOpacity style={styles.btnActionWeb} onPress={ejecutarEscaneoWeb} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color="#fff"/> : <Text style={styles.btnActionText}>RASTREAR LA WEB CON IA</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* RESULTADOS INFO */}
            {hasSearched && (
              <View style={styles.resultStatsRow}>
                <Text style={styles.resultStatsTitle}>Resultados Detectados</Text>
                {totalRecords > 0 && (
                  <View style={[styles.badgeStats, modoBusqueda === 'WEB' ? {backgroundColor: '#e0e7ff'} : {backgroundColor: '#e0f2fe'}]}>
                    <Text style={[styles.badgeStatsText, modoBusqueda === 'WEB' ? {color: '#4338ca'} : {color: '#0369a1'}]}>{totalRecords} CAPTACIONES</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (modoBusqueda === 'INTERNO' && hasMore && !loading && !loadingMore) {
            ejecutarRadar(true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color="#0ea5e9" style={{ marginVertical: 20 }} /> : null
        }
        ListEmptyComponent={
          !loading && hasSearched ? (
            <View style={styles.emptyState}>
              <Feather name={modoBusqueda === 'INTERNO' ? "inbox" : "cloud-off"} size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Espectro vacío</Text>
              <Text style={styles.emptySub}>No se encontraron coincidencias para esta búsqueda.</Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  
  headerContainer: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  titleContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  mainTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subTitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginTop: 2 },
  
  segmentControl: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  segmentBtnActiveInt: { backgroundColor: '#f0f9ff' },
  segmentBtnActiveWeb: { backgroundColor: '#eef2ff' },
  segmentText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  formCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 12, elevation: 3, marginBottom: 24 },
  inputWrap: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, marginBottom: 16 },
  inputIcon: { marginRight: 8 },
  textInput: { flex: 1, paddingVertical: 14, fontSize: 13, fontWeight: '600', color: '#334155', minHeight: 45 },
  textInputSmall: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontWeight: '700', color: '#0f172a' },
  filterLabel: { fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  
  scrollPills: { flexDirection: 'row', marginBottom: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pillActiveInt: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
  pillText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  pillTextActiveInt: { color: '#0284c7' },
  
  grid2Col: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  btnActionInt: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#0f172a', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  btnActionWeb: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnActionText: { color: '#ffffff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  resultStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  resultStatsTitle: { fontSize: 12, fontWeight: '900', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeStats: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeStatsText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  cardContainer: { backgroundColor: '#ffffff', borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  badgeTop: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeTopText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  priceText: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  
  titleDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', flex: 1, marginRight: 8, lineHeight: 18 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  dateText: { fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  locationText: { fontSize: 10, fontWeight: '700', color: '#64748b', flex: 1 },
  
  gridStats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9', paddingVertical: 10, marginBottom: 14 },
  statBox: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9' },
  statValue: { fontSize: 13, fontWeight: '900', color: '#334155' },
  statLabel: { fontSize: 8, fontWeight: '800', color: '#94a3b8', marginTop: 2, letterSpacing: 0.5 },
  
  btnToggleMsg: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f5f9', marginBottom: 10 },
  btnToggleMsgText: { fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 0.5 },
  originalMsgBox: { backgroundColor: '#fffbe1', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#fef08a' },
  originalMsgText: { fontSize: 11, fontWeight: '500', color: '#854d0e', lineHeight: 16, fontStyle: 'italic' },

  btnWebLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  btnWebLinkText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  agentFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 },
  agentInfo: { flex: 1 },
  agentLabel: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 2 },
  agentName: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
  telRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  telText: { fontSize: 10, fontWeight: '900' },
  noTelText: { fontSize: 8, fontWeight: '800', color: '#94a3b8', marginTop: 4, letterSpacing: 0.5 },
  btnWhatsapp: { width: 42, height: 42, backgroundColor: '#25D366', borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#25D366', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#475569', marginTop: 12 },
  emptySub: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }
});