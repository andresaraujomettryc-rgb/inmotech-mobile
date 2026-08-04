import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter // 🚀 IMPORTAMOS EL COMUNICADOR GLOBAL
  ,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// --- CONFIGURACIÓN ---
const PAGE_SIZE = 15;
const WEB_API_URL = 'https://inmotechve.com';

// 🚀 TRADUCTOR INTELIGENTE DE HTML A TEXTO MÓVIL
const formatearDescripcionMovil = (htmlText: string) => {
  if (!htmlText) return 'Sin descripción';
  return htmlText
    .replace(/<br\s*\/?>/gi, '\n')       // Convierte los <br> en saltos de línea
    .replace(/<\/p>/gi, '\n\n')          // Convierte los fines de párrafo en doble salto
    .replace(/<li>/gi, '• ')             // Convierte las listas HTML en viñetas reales
    .replace(/<\/li>/gi, '\n')           // Salto de línea al terminar la viñeta
    .replace(/&nbsp;/gi, ' ')            // Limpia espacios HTML
    .replace(/<[^>]+>/g, '')             // AHORA SÍ, borra cualquier otra etiqueta basura (<b>, <span>, etc)
    .trim();                             // Limpia espacios vacíos al inicio y final
};

interface InmuebleReal {
  id_inmueble: string; codigo_interno: string; codigo_wasi: string | null; titulo: string; 
  tipo_negocio: string; precio_venta: number; precio_alquiler: number; habitaciones: number; 
  banos: number; estacionamientos: number; area_construida: number; area_terreno: number | null;
  tipo_estado: string; estatus_publicacion: string; foto_portada: string; tipo_inmueble_nombre: string;
  pais_nombre: string; estado_nombre: string; ciudad_nombre: string; municipio_nombre: string; urbanizacion_nombre: string;
  id_usuario_encargado: string; asesor_nombre: string; asesor_telefono: string; observaciones: string | null;
}

// =========================================================================
// 🧩 COMPONENTE UI: SELECTOR BUSCABLE ÚNICO (ESTADO, CIUDAD, MUNICIPIO)
// =========================================================================
const SelectorBuscable = ({ titulo, datos, valor, onSelect, campoId, campoNombre, placeholder }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const datosFiltrados = datos.filter((item: any) => 
    item[campoNombre]?.toLowerCase().includes(busqueda.toLowerCase())
  );
  
  const datosConOpcionTodos = [{ [campoId]: '', [campoNombre]: 'Cualquiera / Todos' }, ...datosFiltrados];
  const itemSeleccionado = datos.find((item: any) => item[campoId] === valor);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sheetLabel}>{titulo}</Text>
      <TouchableOpacity style={styles.searchableInput} onPress={() => setModalVisible(true)}>
        <Text style={{ color: itemSeleccionado ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {itemSeleccionado ? itemSeleccionado[campoNombre] : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.searchModalBg}>
          <View style={styles.searchModalContainer}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>Buscar {titulo}</Text>
              <TouchableOpacity onPress={() => {setModalVisible(false); setBusqueda('');}} style={styles.closeBtn}>
                <Feather name="x" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchModalInputBox}>
              <Feather name="search" size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Escribe para filtrar..."
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus={Platform.OS === 'ios'}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <FlatList
              data={datosConOpcionTodos}
              keyExtractor={(item, index) => item[campoId] ? item[campoId].toString() : `todos-${index}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchModalRow}
                  onPress={() => { onSelect(item[campoId]); setModalVisible(false); setBusqueda(''); }}
                >
                  <Text style={[styles.searchModalRowText, item[campoId] === '' && {color: '#0ea5e9', fontWeight: '900'}]}>
                    {item[campoNombre]}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{padding:20, textAlign:'center', color:'#94a3b8'}}>No hay resultados.</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// =========================================================================
// 🚀 COMPONENTE UI PARA SELECCIÓN MÚLTIPLE (URBANIZACIONES)
// =========================================================================
const SelectorMultipleBuscable = ({ titulo, datos, valores, onSelect, campoId, campoNombre, placeholder }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const datosFiltrados = datos.filter((item: any) => 
    item[campoNombre]?.toLowerCase().includes(busqueda.toLowerCase())
  );
  
  const toggleItem = (id: string) => {
    if (valores.includes(id)) {
      onSelect(valores.filter((v: string) => v !== id)); // Quitar si ya está
    } else {
      onSelect([...valores, id]); // Agregar nuevo
    }
  };

  const renderValorTexto = () => {
    if (!valores || valores.length === 0) return placeholder;
    if (valores.length === 1) {
      const item = datos.find((d: any) => d[campoId] === valores[0]);
      return item ? item[campoNombre] : placeholder;
    }
    return `${valores.length} Zonas Seleccionadas`;
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sheetLabel}>{titulo}</Text>
      <TouchableOpacity style={styles.searchableInput} onPress={() => setModalVisible(true)}>
        <Text style={{ color: valores?.length > 0 ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {renderValorTexto()}
        </Text>
        <Feather name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.searchModalBg}>
          <View style={styles.searchModalContainer}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>Zonas Múltiples</Text>
              <TouchableOpacity onPress={() => {setModalVisible(false); setBusqueda('');}} style={styles.closeBtn}>
                <Feather name="x" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchModalInputBox}>
              <Feather name="search" size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Escribe para buscar zonas..."
                value={busqueda}
                onChangeText={setBusqueda}
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Opcion limpiar selección / Todas */}
            <TouchableOpacity style={styles.searchModalRow} onPress={() => onSelect([])}>
              <Text style={[styles.searchModalRowText, valores.length === 0 && {color: '#0ea5e9', fontWeight: '900'}]}>
                Cualquiera / Todas las Zonas
              </Text>
            </TouchableOpacity>

            <FlatList
              data={datosFiltrados}
              keyExtractor={(item) => item[campoId].toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = valores.includes(item[campoId]);
                return (
                  <TouchableOpacity
                    style={[styles.searchModalRow, { flexDirection: 'row', justifyContent: 'space-between' }]}
                    onPress={() => toggleItem(item[campoId])}
                  >
                    <Text style={[styles.searchModalRowText, isSelected && {color: '#0ea5e9', fontWeight: '900'}]}>
                      {item[campoNombre]}
                    </Text>
                    {isSelected && <Feather name="check-square" size={18} color="#0ea5e9" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={{padding:20, textAlign:'center', color:'#94a3b8'}}>No hay resultados.</Text>}
            />

            {/* Botón flotante para confirmar y cerrar el modal múltiple */}
            {valores.length > 0 && (
              <TouchableOpacity style={[styles.btnApplyFilters, { marginTop: 10 }]} onPress={() => {setModalVisible(false); setBusqueda('');}}>
                <Text style={styles.btnApplyFiltersText}>LISTO ({valores.length} SELECCIONADAS)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};


// =========================================================================
// 🚀 PANTALLA PRINCIPAL: INVENTARIO
// =========================================================================
export default function InventarioScreen() {
  const router = useRouter();

  // 🛡️ ESTADO DE AUTENTICACIÓN REAL
  const [sesionUsuario, setSesionUsuario] = useState<{ id_usuario: string, id_nivel: number, id_oficina: string } | null>(null);

  const [inmuebles, setInmuebles] = useState<InmuebleReal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // 🚀 NUEVO: ESTADO PARA MOSTRAR/OCULTAR EL AVISO DE SEGUNDO PLANO
  const [showSyncWarning, setShowSyncWarning] = useState(false);

  // Paginación y Totales
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  
  // Modales
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedInmueble, setSelectedInmueble] = useState<InmuebleReal | null>(null);
  const [fichaCompleta, setFichaCompleta] = useState<any>(null);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [activeFotoIndex, setActiveFotoIndex] = useState(0);

  // 🛠️ FILTROS: Adaptado con Ordenamiento
  const [searchQuery, setSearchQuery] = useState("");
  const [filtros, setFiltros] = useState({
    tipo_negocio: 'TODOS', id_tipo_inmueble: 'TODOS', estatus_publicacion: 'Activo', id_usuario_encargado: '',
    habMin: '', habMax: '', mtMin: '', mtMax: '', precioMin: '', precioMax: '',
    id_estado: '', id_ciudad: '', id_municipio: '', 
    id_urbanizaciones: [] as string[],
    ordenarPor: 'Mas Recientes'
  });

  const [catalogos, setCatalogos] = useState({ estados: [], ciudades: [], municipios: [], urbanizaciones: [], tipos: [], asesores: [] });

  useEffect(() => {
    const arrancarCore = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data: userData } = await supabase
            .from('usuarios')
            .select('id_usuario, id_nivel, id_oficina')
            .eq('id_usuario', authData.user.id)
            .single();
            
          if (userData) setSesionUsuario(userData);
        }

        const [dEst, dCiu, dMun, dUrb, dTip, dAses] = await Promise.all([
          supabase.from('geo_estados').select('*').order('nombre'),
          supabase.from('geo_ciudades').select('*').order('nombre'),
          supabase.from('geo_municipios').select('*').order('nombre'),
          supabase.from('geo_urbanizaciones').select('*').order('nombre'),
          supabase.from('catalogo_tipos_inmueble').select('*').order('nombre'),
          supabase.from('usuarios').select('*').eq('estatus', 'Activo').order('nombre_completo')
        ]);
        setCatalogos({
          estados: dEst.data || [] as any, ciudades: dCiu.data || [] as any, municipios: dMun.data || [] as any,
          urbanizaciones: dUrb.data || [] as any, tipos: dTip.data || [] as any, asesores: dAses.data || [] as any
        });
      } catch (err) { console.error("Error Core:", err); }
    };
    arrancarCore();
  }, []);

  // 🚀 ESCUCHADOR DE EVENTOS DE SEGUNDO PLANO
  useEffect(() => {
    // Cuando el formulario avise que empezó a subir, prendemos el banner
    const subStart = DeviceEventEmitter.addListener('inmueble_subiendo', () => {
      setShowSyncWarning(true);
    });

    // Cuando el formulario avise que terminó, apagamos el banner y recargamos la lista
    const subSuccess = DeviceEventEmitter.addListener('inmueble_exito', () => {
      setShowSyncWarning(false);
      handleRefresh(); // 🚀 Recarga el inventario mágicamente para mostrar la nueva casa
      Alert.alert("¡Inmueble Publicado!", "El inmueble y sus fotos se subieron correctamente en segundo plano.");
    });

    // Si hubo un error en segundo plano, apagamos el banner y avisamos
    const subError = DeviceEventEmitter.addListener('inmueble_error', () => {
      setShowSyncWarning(false);
      Alert.alert("Error de Subida", "Hubo un problema subiendo el inmueble en segundo plano. Revisa tu conexión.");
    });

    // Limpiamos los escuchadores si se cierra la pantalla
    return () => {
      subStart.remove();
      subSuccess.remove();
      subError.remove();
    };
  }, []);
  
  const fetchInmuebles = async (pageNumber: number, isRefresh = false) => {
    if (isRefresh) { setLoading(true); } else { setIsLoadingMore(true); }

    try {
      let query = supabase.from('inmuebles').select(`
        id_inmueble, codigo_interno, codigo_wasi, titulo, tipo_negocio, precio_venta, precio_alquiler,
        area_construida, area_terreno, habitaciones, banos, estacionamientos, tipo_estado, estatus_publicacion, observaciones,
        id_usuario_encargado, geo_paises(nombre), geo_estados(nombre), geo_ciudades(nombre), geo_municipios(nombre), geo_urbanizaciones(nombre),
        catalogo_tipos_inmueble(nombre), usuarios!id_usuario_encargado(nombre_completo, celular_1), 
        inmuebles_imagenes(url_imagen, orden, es_principal) 
      `, { count: 'exact' });

      if (searchQuery) query = query.or(`titulo.ilike.%${searchQuery}%,codigo_interno.ilike.%${searchQuery}%`);
      
      if (filtros.tipo_negocio !== 'TODOS') query = query.eq('tipo_negocio', filtros.tipo_negocio);
      if (filtros.id_tipo_inmueble !== 'TODOS') query = query.eq('id_tipo_inmueble', filtros.id_tipo_inmueble);
      if (filtros.estatus_publicacion !== 'TODOS') query = query.eq('estatus_publicacion', filtros.estatus_publicacion);
      
      if (filtros.id_usuario_encargado) query = query.eq('id_usuario_encargado', filtros.id_usuario_encargado);
      if (filtros.id_estado) query = query.eq('id_estado', filtros.id_estado);
      if (filtros.id_ciudad) query = query.eq('id_ciudad', filtros.id_ciudad);
      if (filtros.id_municipio) query = query.eq('id_municipio', filtros.id_municipio);
      
      if (filtros.id_urbanizaciones && filtros.id_urbanizaciones.length > 0) {
        query = query.in('id_urbanizacion', filtros.id_urbanizaciones);
      }

      if (filtros.habMin) query = query.gte('habitaciones', parseInt(filtros.habMin));
      if (filtros.habMax) query = query.lte('habitaciones', parseInt(filtros.habMax));
      if (filtros.mtMin) query = query.gte('area_construida', parseFloat(filtros.mtMin));
      if (filtros.mtMax) query = query.lte('area_construida', parseFloat(filtros.mtMax));
      
      if (filtros.precioMin) query = query.or(`precio_venta.gte.${filtros.precioMin},precio_alquiler.gte.${filtros.precioMin}`);
      if (filtros.precioMax) query = query.or(`and(precio_venta.gt.0,precio_venta.lte.${filtros.precioMax}),and(precio_alquiler.gt.0,precio_alquiler.lte.${filtros.precioMax})`);

      if (filtros.ordenarPor === "Mas Recientes") {
        query = query.order('fecha_creacion', { ascending: false });
      } else if (filtros.ordenarPor === "Menos Recientes") {
        query = query.order('fecha_creacion', { ascending: true });
      } else if (filtros.ordenarPor === "Mayor Precio") {
        query = query.order('precio_venta', { ascending: false }).order('precio_alquiler', { ascending: false });
      } else if (filtros.ordenarPor === "Menor Precio") {
        query = query.order('precio_venta', { ascending: true }).order('precio_alquiler', { ascending: true });
      }

      const from = (pageNumber - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      if (data) {
        const mapeados = data.map((row: any) => {
          let urlPortada = "https://placehold.co/600x400/f1f5f9/64748b?text=SIN+FOTOGRAFIA";
          
          if (row.inmuebles_imagenes && row.inmuebles_imagenes.length > 0) {
            const imgsOrdenadas = [...row.inmuebles_imagenes].sort((a, b) => {
              if (a.es_principal && !b.es_principal) return -1;
              if (!a.es_principal && b.es_principal) return 1;
              return (a.orden || 99) - (b.orden || 99);
            });
            urlPortada = imgsOrdenadas[0].url_imagen;
          }

          return {
            ...row,
            foto_portada: urlPortada,
            pais_nombre: row.geo_paises?.nombre || 'Venezuela',
            estado_nombre: row.geo_estados?.nombre || '',
            ciudad_nombre: row.geo_ciudades?.nombre || '',
            municipio_nombre: row.geo_municipios?.nombre || '',
            urbanizacion_nombre: row.geo_urbanizaciones?.nombre || '',
            tipo_inmueble_nombre: row.catalogo_tipos_inmueble?.nombre || 'Inmueble',
            asesor_nombre: row.usuarios?.nombre_completo || 'Sin Asignar',
            asesor_telefono: row.usuarios?.celular_1 || '',
          };
        });

        if (isRefresh || pageNumber === 1) {
          setInmuebles(mapeados);
        } else {
          setInmuebles(prev => [...prev, ...mapeados]);
        }
        if (count !== null) setTotalRegistros(count);
      }
    } catch (err) { console.error("Error Bóveda:", err); } 
    finally { setLoading(false); setIsLoadingMore(false); }
  };

  useEffect(() => {
    setCurrentPage(1);
    const delay = setTimeout(() => { fetchInmuebles(1, true); }, 450);
    return () => clearTimeout(delay);
  }, [searchQuery, filtros]);

  const handleLoadMore = () => {
    if (!loading && !isLoadingMore && inmuebles.length < totalRegistros) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchInmuebles(nextPage, false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    await fetchInmuebles(1, true);
    setIsRefreshing(false);
  };

  const updateFiltro = (campo: string, valor: any) => {
    setFiltros(prev => {
      const n = { ...prev, [campo]: valor };
      if (campo === 'id_estado') { n.id_ciudad = ''; n.id_municipio = ''; n.id_urbanizaciones = []; }
      if (campo === 'id_ciudad') { n.id_municipio = ''; n.id_urbanizaciones = []; }
      if (campo === 'id_municipio') { n.id_urbanizaciones = []; }
      return n;
    });
  };

  const limpiarFiltros = () => {
    setSearchQuery("");
    setFiltros({
      tipo_negocio: 'TODOS', id_tipo_inmueble: 'TODOS', estatus_publicacion: 'Activo', id_usuario_encargado: '',
      habMin: '', habMax: '', mtMin: '', mtMax: '', precioMin: '', precioMax: '', 
      id_estado: '', id_ciudad: '', id_municipio: '', id_urbanizaciones: [],
      ordenarPor: 'Mas Recientes'
    });
    setShowFiltersModal(false);
  };

  const openFichaProfunda = async (inm: InmuebleReal) => {
    setSelectedInmueble(inm); 
    setFichaCompleta(null); 
    setActiveFotoIndex(0);
    setLoadingFicha(true); 
    
    try {
      const { data, error } = await supabase.from('inmuebles').select(`
        id_inmueble, descripciondetallada, enlace_video,
        inmuebles_imagenes(url_imagen, orden),
        inmuebles_caracteristicas(
          caracteristicas_catalogo:caracteristicas_catalogo!id_caracteristica(nombre, tipo)
        )
      `).eq('id_inmueble', inm.id_inmueble).single();

      if (error) throw error;

      if (data) {
        const galeria = data.inmuebles_imagenes?.sort((a: any, b: any) => a.orden - b.orden).map((img: any) => img.url_imagen) || [inm.foto_portada];
        const caracteristicas = data.inmuebles_caracteristicas?.map((ic: any) => ({
          nombre: ic.caracteristicas_catalogo?.nombre || '',
          tipo: ic.caracteristicas_catalogo?.tipo?.toUpperCase() === 'EXTERNA' ? 'Externa' : 'Interna'
        })) || [];
        setFichaCompleta({ ...data, galeria, caracteristicas });
      }
    } catch (err) { 
      console.error("Error Ficha:", err); 
      Alert.alert("Error", "No se pudo cargar la ficha profunda.");
      setSelectedInmueble(null);
    } 
    finally { setLoadingFicha(false); }
  };

  const shareFichaPublica = async (inm: InmuebleReal) => {
    const url = `${WEB_API_URL}/p/${inm.id_inmueble}`;
    const precio = inm.tipo_negocio === 'Venta' ? inm.precio_venta : inm.precio_alquiler;
    
    let msg = `*${inm.titulo}*\n`;
    msg += `• Precio (${inm.tipo_negocio}): $${precio.toLocaleString()}\n`;
    if (inm.area_construida || inm.area_terreno) msg += `• ${inm.area_construida || inm.area_terreno} m²\n`;
    if (inm.habitaciones > 0) msg += `• Habitaciones: ${inm.habitaciones}\n`;
    if (inm.banos > 0) msg += `• Baños: ${inm.banos}\n`;
    if (inm.estacionamientos > 0) msg += `• Estacionamiento: ${inm.estacionamientos}\n`;
    msg += `\nMás información y fotos: ${url}`;

    try { await Share.share({ message: msg, url: url }); } catch (e) { console.error(e); }
  };

  const manejarEliminar = async (id: string) => {
    Alert.alert(
      "Eliminar Inmueble",
      "⚠️ ¿Estás seguro de eliminar este inmueble permanentemente? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await supabase.from('inmuebles').delete().eq('id_inmueble', id);
              
              if (error) {
                if (error.code === '23503' || error.message.toLowerCase().includes('foreign key')) {
                  Alert.alert("Imposible Eliminar", "❌ El inmueble tiene registros relacionados (ej. Negociaciones, Ofertas activas) que impiden su borrado para mantener la integridad de los datos. Cambia su estatus a 'Inactivo' en su lugar.");
                } else {
                  Alert.alert("Error", `⚠️ Error al eliminar: ${error.message}`);
                }
              } else {
                Alert.alert("Éxito", "✅ Inmueble eliminado con éxito.");
                setInmuebles(prev => prev.filter(inm => inm.id_inmueble !== id));
                setTotalRegistros(prev => prev - 1);
                setSelectedInmueble(null);
              }
            } catch (err) {
              Alert.alert("Error", "📡 Ocurrió un error de red al intentar eliminar.");
            }
          }
        }
      ]
    );
  };

  const puedeEditar = sesionUsuario && (
    sesionUsuario.id_nivel === 1 || 
    sesionUsuario.id_nivel === 2 || 
    selectedInmueble?.id_usuario_encargado === sesionUsuario.id_usuario
  );

  const puedeEliminar = sesionUsuario && (
    sesionUsuario.id_nivel === 1 || 
    selectedInmueble?.id_usuario_encargado === sesionUsuario.id_usuario
  );

  const renderCard = ({ item }: { item: InmuebleReal }) => {
    const precio = item.tipo_negocio === 'Venta' ? item.precio_venta : item.precio_alquiler;
    return (
      <View style={styles.card}>
        <ImageBackground source={{ uri: item.foto_portada }} style={styles.cardHero} imageStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <View style={styles.heroOverlay}>
            <View style={styles.badgesRow}>
              <BlurView intensity={70} tint="dark" style={styles.badgeGlass}><Text style={styles.badgeText}>{item.codigo_interno}</Text></BlurView>
              <View style={[styles.badgeSolid, item.estatus_publicacion === 'Activo' ? styles.bgEmerald : styles.bgRose]}><Text style={styles.badgeTextSolid}>{item.estatus_publicacion}</Text></View>
            </View>
            <BlurView intensity={80} tint="light" style={styles.priceGlass}><Text style={styles.priceTag}>${precio?.toLocaleString()} <Text style={styles.priceLabel}>{item.tipo_negocio}</Text></Text></BlurView>
          </View>
        </ImageBackground>

        <View style={styles.cardBody}>
          <TouchableOpacity onPress={() => openFichaProfunda(item)}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.titulo}</Text>
          </TouchableOpacity>

          <Text style={styles.cardLocation}>
            <Feather name="map-pin" size={11} color="#0ea5e9"/> {item.estado_nombre} • {item.ciudad_nombre} • {item.municipio_nombre} • {item.urbanizacion_nombre}
          </Text>
          
          <View style={styles.miniFeatures}>
            <Text style={styles.miniFeatureText}>📐 {item.area_construida || 0} m²</Text>
            <Text style={styles.miniFeatureText}>🛏️ {item.habitaciones} H</Text>
            <Text style={styles.miniFeatureText}>🛁 {item.banos} B</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.agentRow}>
            <View style={styles.agentInfo}>
              <Text style={styles.agentLabel}>ASESOR ENCARGADO</Text>
              <Text style={styles.agentName}><Feather name="user" size={12} color="#64748b"/> {item.asesor_nombre}</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(`whatsapp://send?phone=${item.asesor_telefono.replace(/\D/g, '')}`)} style={styles.btnWhatsapp}>
              <FontAwesome5 name="whatsapp" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnSharePrimary} onPress={() => shareFichaPublica(item)}>
            <Feather name="share-2" size={14} color="#ffffff" />
            <Text style={styles.btnSharePrimaryText}>COMPARTIR FICHA RESUMEN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.headerTitle}>Inventario Mettryc Realty</Text>
            <Text style={styles.headerSubtitle}>
              {loading && currentPage === 1 ? 'Calculando bóveda...' : `${totalRegistros} inmuebles encontrados`}
            </Text>
          </View>
          <TouchableOpacity style={styles.btnAgregar} onPress={() => router.push('/inventario/nuevo')}>
                <Feather name="plus" size={20} color="#ffffff" />
            </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#94a3b8" />
            <TextInput style={styles.searchInput} placeholder="Buscar por código, título..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#94a3b8" />
          </View>
          <TouchableOpacity style={[styles.filterBtn, showFiltersModal && styles.filterBtnActive]} onPress={() => setShowFiltersModal(true)}>
            <Feather name="sliders" size={16} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 🚀 BANNER INFORMATIVO DE SINCRONIZACIÓN EN SEGUNDO PLANO */}
      {showSyncWarning && (
        <View style={styles.syncWarningBanner}>
          <Feather name="info" size={16} color="#0369a1" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.syncWarningTitle}>Sincronización en Segundo Plano</Text>
            <Text style={styles.syncWarningText}>
              Si acabas de publicar un inmueble, por favor no cierres la aplicación de golpe para garantizar que todas las fotos se suban correctamente.
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSyncWarning(false)} style={{ padding: 4 }}>
            <Feather name="x" size={18} color="#0369a1" />
          </TouchableOpacity>
        </View>
      )}

      {loading && currentPage === 1 ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#0ea5e9" /><Text style={styles.loadingText}>Conectando con Base de Datos...</Text></View>
      ) : (
        <FlatList 
          data={inmuebles} 
          keyExtractor={(item) => item.id_inmueble} 
          renderItem={renderCard} 
          contentContainerStyle={styles.listContent} 
          showsVerticalScrollIndicator={false} 
          refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#0ea5e9" /> }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#0ea5e9" style={{ marginVertical: 20 }} /> : null}
        />
      )}

      {/* ========================================================================= */}
      {/* 🧭 SÚPER MODAL DE FILTROS AVANZADOS COMPLETO (BOTTOM SHEET)               */}
      {/* ========================================================================= */}
      <Modal visible={showFiltersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filtrado Avanzado</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)} style={styles.closeBtn}><Feather name="x" size={20} color="#0f172a" /></TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              <Text style={styles.sheetLabel}>ORDENAR POR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                {['Mas Recientes', 'Menos Recientes', 'Mayor Precio', 'Menor Precio'].map(o => (
                  <TouchableOpacity key={o} onPress={() => updateFiltro('ordenarPor', o)} style={[styles.pill, filtros.ordenarPor === o && styles.pillActive]}>
                    <Text style={[styles.pillText, filtros.ordenarPor === o && styles.pillTextActive]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sheetLabel}>UBICACIÓN GEOGRÁFICA</Text>
              
              <SelectorBuscable titulo="ESTADO" datos={catalogos.estados} valor={filtros.id_estado} campoId="id_estado" campoNombre="nombre" placeholder="Cualquier Estado..." onSelect={(v:any) => updateFiltro('id_estado', v)} />
              {filtros.id_estado !== '' && (
                <SelectorBuscable titulo="CIUDAD" datos={catalogos.ciudades.filter((c:any) => c.id_estado === filtros.id_estado)} valor={filtros.id_ciudad} campoId="id_ciudad" campoNombre="nombre" placeholder="Cualquier Ciudad..." onSelect={(v:any) => updateFiltro('id_ciudad', v)} />
              )}
              {filtros.id_ciudad !== '' && (
                <SelectorBuscable titulo="MUNICIPIO" datos={catalogos.municipios.filter((m:any) => m.id_ciudad === filtros.id_ciudad)} valor={filtros.id_municipio} campoId="id_municipio" campoNombre="nombre" placeholder="Cualquier Municipio..." onSelect={(v:any) => updateFiltro('id_municipio', v)} />
              )}
              {filtros.id_municipio !== '' && (
                <SelectorMultipleBuscable 
                  titulo="URBANIZACIÓN / ZONA (MÚLTIPLE)" 
                  datos={catalogos.urbanizaciones.filter((u:any) => u.id_municipio === filtros.id_municipio)} 
                  valores={filtros.id_urbanizaciones} 
                  campoId="id_urbanizacion" 
                  campoNombre="nombre" 
                  placeholder="Selecciona varias zonas..." 
                  onSelect={(v:any) => updateFiltro('id_urbanizaciones', v)} 
                />
              )}

              <View style={{marginTop: 10}}>
                <SelectorBuscable titulo="ASESOR ENCARGADO" datos={catalogos.asesores} valor={filtros.id_usuario_encargado} campoId="id_usuario" campoNombre="nombre_completo" placeholder="Cualquier Asesor..." onSelect={(v:any) => updateFiltro('id_usuario_encargado', v)} />
              </View>

              <Text style={styles.sheetLabel}>TIPO DE INMUEBLE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                <TouchableOpacity onPress={() => updateFiltro('id_tipo_inmueble', 'TODOS')} style={[styles.pill, filtros.id_tipo_inmueble === 'TODOS' && styles.pillActive]}><Text style={[styles.pillText, filtros.id_tipo_inmueble === 'TODOS' && styles.pillTextActive]}>Todos</Text></TouchableOpacity>
                {catalogos.tipos.map((t: any) => (
                  <TouchableOpacity key={t.id_tipo} onPress={() => updateFiltro('id_tipo_inmueble', t.id_tipo)} style={[styles.pill, filtros.id_tipo_inmueble === t.id_tipo && styles.pillActive]}>
                    <Text style={[styles.pillText, filtros.id_tipo_inmueble === t.id_tipo && styles.pillTextActive]}>{t.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sheetLabel}>OPERACIÓN Y ESTATUS</Text>
              <View style={styles.rowGap}>
                {['TODOS', 'Venta', 'Alquiler'].map(n => (
                  <TouchableOpacity key={n} onPress={() => updateFiltro('tipo_negocio', n)} style={[styles.pill, filtros.tipo_negocio === n && styles.pillActive]}><Text style={filtros.tipo_negocio === n ? styles.pillTextActive : styles.pillText}>{n}</Text></TouchableOpacity>
                ))}
              </View>
              <View style={[styles.rowGap, {marginTop: 10}]}>
                {['TODOS', 'Activo', 'Inactivo'].map(est => (
                  <TouchableOpacity key={est} onPress={() => updateFiltro('estatus_publicacion', est)} style={[styles.pill, filtros.estatus_publicacion === est && styles.pillActive]}><Text style={filtros.estatus_publicacion === est ? styles.pillTextActive : styles.pillText}>{est}</Text></TouchableOpacity>
                ))}
              </View>

              {/* RANGOS NUMÉRICOS */}
              <View style={[styles.gridInputsForm, {marginTop: 20}]}>
                <View style={styles.halfWidth}><Text style={styles.sheetLabel}>HAB. MÍN</Text><TextInput style={styles.inputSheet} keyboardType="number-pad" placeholder="0" value={filtros.habMin} onChangeText={t=>updateFiltro('habMin',t)}/></View>
                <View style={styles.halfWidth}><Text style={styles.sheetLabel}>HAB. MÁX</Text><TextInput style={styles.inputSheet} keyboardType="number-pad" placeholder="Max" value={filtros.habMax} onChangeText={t=>updateFiltro('habMax',t)}/></View>
              </View>

              <View style={styles.gridInputsForm}>
                <View style={styles.halfWidth}><Text style={styles.sheetLabel}>PRECIO MÍN ($)</Text><TextInput style={styles.inputSheet} keyboardType="number-pad" placeholder="0" value={filtros.precioMin} onChangeText={t=>updateFiltro('precioMin',t)}/></View>
                <View style={styles.halfWidth}><Text style={styles.sheetLabel}>PRECIO MÁX ($)</Text><TextInput style={styles.inputSheet} keyboardType="number-pad" placeholder="Max" value={filtros.precioMax} onChangeText={t=>updateFiltro('precioMax',t)}/></View>
              </View>

              <View style={styles.gridInputsForm}>
                <View style={styles.halfWidth}><Text style={styles.sheetLabel}>M² MÍN</Text><TextInput style={styles.inputSheet} keyboardType="number-pad" placeholder="0" value={filtros.mtMin} onChangeText={t=>updateFiltro('mtMin',t)}/></View>
                <View style={styles.halfWidth}><Text style={styles.sheetLabel}>M² MÁX</Text><TextInput style={styles.inputSheet} keyboardType="number-pad" placeholder="Max" value={filtros.mtMax} onChangeText={t=>updateFiltro('mtMax',t)}/></View>
              </View>
              
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.btnResetFilters} onPress={limpiarFiltros}><Text style={styles.btnResetFiltersText}>LIMPIAR FILTROS</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnApplyFilters} onPress={() => setShowFiltersModal(false)}><Text style={styles.btnApplyFiltersText}>APLICAR</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 🖼️ MODAL DE FICHA RESUMEN PROFUNDA COMPLETA */}
      {/* ========================================================================= */}
      <Modal visible={!!selectedInmueble} animationType="slide">
        <View style={styles.fullModalContainer}>
          {loadingFicha || !fichaCompleta ? (
             <View style={styles.center}><ActivityIndicator size="large" color="#0ea5e9" /><Text style={styles.loadingText}>Cargando expediente completo...</Text></View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 50}}>
              
              <View style={styles.carouselContainer}>
                <Image source={{ uri: fichaCompleta?.galeria?.[activeFotoIndex] || selectedInmueble?.foto_portada }} style={styles.carouselImg} />
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
                <Text style={styles.fCode}>{selectedInmueble?.codigo_interno} • {selectedInmueble?.tipo_inmueble_nombre}</Text>
                
                <View style={styles.fPriceBox}>
                  <Text style={styles.fPriceText}>VALOR DE {selectedInmueble?.tipo_negocio?.toUpperCase()}: ${ (selectedInmueble?.tipo_negocio === 'Venta' ? selectedInmueble?.precio_venta : selectedInmueble?.precio_alquiler)?.toLocaleString() }</Text>
                </View>

                <Text style={styles.sectionHeadingTitle}>Descripción Detallada</Text>
                <Text style={styles.bodyParagraph}>
                    {formatearDescripcionMovil(fichaCompleta?.descripciondetallada)}
                </Text>

                <Text style={styles.sectionHeadingTitle}>Observaciones Internas</Text>
                <Text style={styles.bodyParagraph}>{selectedInmueble?.observaciones || 'Sin observaciones registradas.'}</Text>

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
                <Text style={styles.sectionHeadingTitle}>Acciones de Gestión</Text>
                
                <TouchableOpacity 
                  style={[styles.btnSharePrimary, { backgroundColor: '#0ea5e9', marginBottom: 10 }]} 
                  onPress={() => {
                    if (selectedInmueble) {
                      const idParaFlyer = selectedInmueble.id_inmueble;
                      setSelectedInmueble(null); 
                      router.push(`/inventario/flyer/${idParaFlyer}` as any);
                    }
                  }}
                >
                  <Feather name="image" size={16} color="#ffffff" />
                  <Text style={styles.btnSharePrimaryText}>GENERAR FLYER PARA RRSS</Text>
                </TouchableOpacity>

                {puedeEditar ? (
                  <View style={styles.managementActionsRow}>
                    <TouchableOpacity 
                      style={styles.btnModificar} 
                      onPress={() => {
                        if (selectedInmueble) {
                          const idEditar = selectedInmueble.id_inmueble;
                          setSelectedInmueble(null);
                          router.push(`/inventario/nuevo?id=${idEditar}` as any);
                        }
                      }}
                    >
                      <Feather name="edit" size={14} color="#ffffff" />
                      <Text style={styles.btnMgmtText}>MODIFICAR</Text>
                    </TouchableOpacity>
                    
                    {puedeEliminar && (
                      <TouchableOpacity 
                        style={styles.btnEliminar} 
                        onPress={() => {
                          if(selectedInmueble) manejarEliminar(selectedInmueble.id_inmueble);
                        }}
                      >
                        <Feather name="trash-2" size={14} color="#ffffff" />
                        <Text style={styles.btnMgmtText}>ELIMINAR</Text>
                      </TouchableOpacity>
                    )}

                  </View>
                ) : (
                  <View style={styles.alertRestringido}>
                    <Feather name="shield" size={16} color="#ef4444" />
                    <Text style={styles.alertRestringidoText}>Modificación restringida: Solo el captador del inmueble o gerencia pueden editar este expediente.</Text>
                  </View>
                )}

              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 11, color: '#64748b', fontWeight: '900', marginTop: 10, letterSpacing: 1 },
  noReg: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },

  header: { paddingHorizontal: 20, paddingBottom: 15, paddingTop: Platform.OS === 'ios' ? 50 : 35 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  headerSubtitle: { fontSize: 11, fontWeight: '700', color: '#38bdf8', marginTop: 2, letterSpacing: 0.5 },
  btnAgregar: { width: 38, height: 38, backgroundColor: '#0f172a', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 15, height: 48, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '500', color: '#334155' },
  filterBtn: { width: 48, height: 48, backgroundColor: '#ffffff', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  filterBtnActive: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },

  // 🚀 ESTILOS DEL NUEVO BANNER DE ADVERTENCIA
  syncWarningBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f0f9ff', marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#bae6fd' },
  syncWarningTitle: { fontSize: 11, color: '#0369a1', fontWeight: '900', marginBottom: 2 },
  syncWarningText: { fontSize: 10, color: '#0284c7', fontWeight: '600', lineHeight: 14 },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  card: { backgroundColor: '#ffffff', borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHero: { width: '100%', height: 210 },
  heroOverlay: { flex: 1, justifyContent: 'space-between', padding: 16 },
  badgesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  badgeGlass: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.4)' },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  badgeSolid: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  bgEmerald: { backgroundColor: '#10b981' },
  bgRose: { backgroundColor: '#f43f5e' },
  badgeTextSolid: { color: '#ffffff', fontSize: 9, fontWeight: '900' },
  priceGlass: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden', backgroundColor:'rgba(255,255,255,0.85)' },
  priceTag: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  priceLabel: { fontSize: 9, color: '#64748b', fontWeight: '700' },

  cardBody: { padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0ea5e9', lineHeight: 22, textTransform: 'uppercase', textDecorationLine: 'underline' },
  cardLocation: { fontSize: 11, color: '#475569', fontWeight: '600', marginTop: 8, lineHeight: 15 },
  miniFeatures: { flexDirection: 'row', gap: 15, marginTop: 10 },
  miniFeatureText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },

  agentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  agentInfo: { flex: 1 },
  agentLabel: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
  agentName: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  btnWhatsapp: { width: 36, height: 36, backgroundColor: '#25D366', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnSharePrimary: { backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnSharePrimaryText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.6)' },
  modalSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '80%', paddingVertical: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  closeBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 12 },
  sheetBody: { paddingHorizontal: 24 },
  sheetLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 },
  inputSheet: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 13, backgroundColor: '#ffffff', fontWeight: '600', marginBottom: 12 },
  pillScroll: { flexDirection: 'row', marginBottom: 15 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#e0f2fe', borderColor: '#0ea5e9' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  pillTextActive: { color: '#0284c7' },
  rowGap: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  gridInputsForm: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  halfWidth: { flex: 1 },
  sheetFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btnResetFilters: { flex: 1, backgroundColor: '#fff1f2', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnResetFiltersText: { color: '#f43f5e', fontSize: 12, fontWeight: '900' },
  btnApplyFilters: { flex: 1, backgroundColor: '#0ea5e9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnApplyFiltersText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },

  searchableInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, backgroundColor: '#ffffff' },
  searchModalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 20 },
  searchModalContainer: { backgroundColor: '#ffffff', borderRadius: 24, maxHeight: '80%', padding: 20 },
  searchModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  searchModalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  searchModalInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 15, height: 45, marginBottom: 15 },
  searchModalInput: { flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  searchModalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  searchModalRowText: { fontSize: 13, fontWeight: '600', color: '#334155' },

  fullModalContainer: { flex: 1, backgroundColor: '#ffffff' },
  carouselContainer: { width: '100%', height: 260, backgroundColor: '#000' },
  carouselImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  closeFullModalBtn: { position: 'absolute', top: 40, left: 20, width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
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
  bodyParagraph: { fontSize: 13, color: '#334155', lineHeight: 20, fontWeight: '500' },
  featuresBadgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  fBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  fBadgeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  
  managementActionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnModificar: { flex: 1, backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnEliminar: { flex: 1, backgroundColor: '#e11d48', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnMgmtText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  
  alertRestringido: { flexDirection: 'row', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginTop: 10, alignItems: 'center', gap: 10 },
  alertRestringidoText: { flex: 1, color: '#ef4444', fontSize: 10, fontWeight: '700', lineHeight: 14 }
});