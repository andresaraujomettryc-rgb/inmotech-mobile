import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 🚀 IMPORTANTE: Añadido para borradores
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter // 🚀 IMPORTAMOS AQUÍ TAMBIÉN
  ,








  FlatList,
  Image, KeyboardAvoidingView,
  Linking // 🚀 AÑADE ESTO PARA ABRIR ENLACES
  ,






  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// --- CONFIGURACIÓN MAESTRA DEL SISTEMA MÓVIL ---
const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://inmotechve.com'; 

// =========================================================================
// 🧩 COMPONENTE PREMIUM: SELECTOR DESPLEGABLE BUSCABLE
// =========================================================================
const SelectorBuscableForm = ({ titulo, datos, valor, onSelect, campoId, campoNombre, placeholder, disabled }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const datosFiltrados = datos.filter((item: any) => 
    item[campoNombre]?.toLowerCase().includes(busqueda.toLowerCase())
  );
  const itemSeleccionado = datos.find((item: any) => item[campoId] === valor);

  return (
    <View style={{ marginBottom: 14, width: '100%' }}>
      <Text style={styles.labelInput}>{titulo}</Text>
      <TouchableOpacity 
        style={[styles.searchableInputBox, disabled && { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]} 
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={{ color: itemSeleccionado ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {itemSeleccionado ? itemSeleccionado[campoNombre] : placeholder}
        </Text>
        <Feather name={disabled ? "lock" : "chevron-down"} size={16} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.searchModalBg}>
          <View style={styles.searchModalContainer}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>Buscar {titulo}</Text>
              <TouchableOpacity onPress={() => {setModalVisible(false); setBusqueda('');}} style={styles.closeBtnModal}>
                <Feather name="x" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchModalInputBox}>
              <Feather name="search" size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Filtrar..."
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus={Platform.OS === 'ios'}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <FlatList
              data={datosFiltrados}
              keyExtractor={(item: any, idx: number) => item[campoId] ? item[campoId].toString() : idx.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  style={styles.searchModalRow}
                  onPress={() => { onSelect(item[campoId]); setModalVisible(false); setBusqueda(''); }}
                >
                  <Text style={styles.searchModalRowText}>{item[campoNombre]}</Text>
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
// 🚀 PANTALLA PRINCIPAL: FORMULARIO MAESTRO DE CAPTACIÓN
// =========================================================================
export default function NuevoInmuebleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEditMode = !!id;

  // 🛡️ ESTADO DE AUTENTICACIÓN REAL
  const [sesionUsuario, setSesionUsuario] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string>('');

  // Estados de UI y Control de Hilos
  const [activeTab, setActiveTab] = useState("generales");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // Catálogos
  const [catalogos, setCatalogos] = useState({
    estados: [] as any[], ciudades: [] as any[], municipios: [] as any[], 
    urbanizaciones: [] as any[], tipos: [] as any[], asesores: [] as any[], caracteristicas: [] as any[]
  });

  const opcionesNegocio = [{ id: 'Venta', nombre: 'Venta' }, { id: 'Alquiler', nombre: 'Alquiler' }];
  const opcionesPeriodo = [{ id: 'Mensual', nombre: 'Mensual' }, { id: 'Diario', nombre: 'Diario' }, { id: 'Anual', nombre: 'Anual' }];
  const opcionesEstatus = [{ id: 'Activo', nombre: 'Activo' }, { id: 'Destacado', nombre: 'Destacado' }, { id: 'Inactivo', nombre: 'Inactivo' }];
  const opcionesEstadoFisico = [{ id: 'Usado', nombre: 'Usado' }, { id: 'Nuevo', nombre: 'Nuevo' }, { id: 'En Construcción', nombre: 'En Construcción' }, { id: 'Proyecto', nombre: 'Proyecto' }];
  const opcionesComision = [{ id: 'PORCENTAJE', nombre: 'Porcentaje %' }, { id: 'FIJO', nombre: 'Cantidad Fija $' }];

  // 🔄 ESTADO MULTIMEDIA UNIFICADO (Fotos Locales + Fotos en Nube)
  const [archivos, setArchivos] = useState({ legales: [] as any[] });
  const [galeria, setGaleria] = useState<any[]>([]);
  const [documentosExistentes, setDocumentosExistentes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    sincronizar_wasi: false,
    datos_generales: {
      titulo: "", id_captador: "", estatus_publicacion: "Activo", identificador_oficial: "", estado_fisico: "Usado",
      id_tipo_inmueble: "", tipo_negocio: "Venta", period_alquiler: "Mensual", ano_construccion: "",
      habitaciones: 0, banos: 0, medio_bano: false, estacionamientos: 0, numero_piso: "", area_construida: "", area_terreno: "",
      disposicion: "Frente", orientacion: "Norte", superficie_balcon: "", aptos_por_piso: "", pisos_edificio: ""
    },
    ubicacion: { id_pais: "VE", id_estado: "", id_ciudad: "", id_municipio: "", id_urbanizacion: "", codigo_postal: "", direccion_exacta: "", latitud: 10.22345, longitud: -68.01234 },
    finanzas: { precio_venta: "", precio_alquiler: "", moneda: "USD", monto_administracion: "", moneda_administracion: "USD", tipo_comision_captador: "PORCENTAJE", valor_comision_captador: "", acepta_compartir: true, tipo_comision_compartida: "PORCENTAJE", valor_comision_compartida: "", es_exclusiva: false, fecha_vencimiento_exclusiva: "" },
    caracteristicas: [] as string[],
    multimedia: { descripcion: "", enlace_video: "", tour_virtual: "" },
    propietario: { nombres: "", apellidos: "", telefono: "", email: "", recibe_correo: true, observaciones: "" },
    id_oficina: "",
    id_usuario_creador: ""
  });

  // =====================================================================
  // 🚀 RECUPERACIÓN DE BORRADOR (AL MONTAR EL COMPONENTE)
  // =====================================================================
  useEffect(() => {
    const cargarBorrador = async () => {
      // Solo buscamos borrador si NO estamos editando un inmueble existente
      if (!isEditMode) {
        try {
          const draftStr = await AsyncStorage.getItem('@inmotech_draft');
          if (draftStr) {
            const draft = JSON.parse(draftStr);
            // Comprobamos que el borrador tenga datos reales (ej: un título)
            if (draft?.datos_generales?.titulo) {
              Alert.alert(
                "📝 Borrador Encontrado",
                "Tienes un inmueble sin terminar guardado en este dispositivo. ¿Deseas recuperar los datos?",
                [
                  { 
                    text: "No, descartar", 
                    style: "destructive",
                    onPress: async () => await AsyncStorage.removeItem('@inmotech_draft') 
                  },
                  { 
                    text: "Sí, recuperar", 
                    onPress: () => setFormData(draft) 
                  }
                ]
              );
            }
          }
        } catch (error) {
          console.log("Error leyendo borrador:", error);
        }
      }
    };
    cargarBorrador();
  }, [isEditMode]);

  // =====================================================================
  // 🚀 AUTO-GUARDADO SILENCIOSO (CADA VEZ QUE FORMDATA CAMBIA)
  // =====================================================================
  useEffect(() => {
    const guardarBorrador = async () => {
      // Solo guardamos si es un inmueble NUEVO y el usuario ya escribió un título
      if (!isEditMode && formData.datos_generales.titulo) {
        try {
          await AsyncStorage.setItem('@inmotech_draft', JSON.stringify(formData));
        } catch (error) {
          console.log("Error guardando borrador:", error);
        }
      }
    };
    
    // Pequeño delay (debounce) para no sobrecargar el disco en cada pulsación
    const timer = setTimeout(() => {
      guardarBorrador();
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, isEditMode]);


  // =====================================================================
  // 🟢 CARGA DE USUARIO Y AUDITORÍA NATIVA
  // =====================================================================
  useEffect(() => {
    const arrancarCore = async () => {
      try {
        const { data: authData } = await supabase.auth.getSession();
        let currentUser = null;

        if (authData?.session) {
          setSessionToken(authData.session.access_token);
          const { data: userData } = await supabase.from('usuarios').select('*').eq('id_usuario', authData.session.user.id).single();
          if (userData) {
            currentUser = userData;
            setSesionUsuario(userData);
          }
        }

        let flagWasiCalculado = false;
        if (currentUser?.id_oficina) {
          const { data: oficinaData } = await supabase.from('oficinas').select('id_marca').eq('id_oficina', currentUser.id_oficina).single();
          if (oficinaData?.id_marca) {
            const { data: marcaData } = await supabase.from('marca').select('sincronizar_wasi').eq('id_Marca', oficinaData.id_marca).single();
            if (marcaData) flagWasiCalculado = !!marcaData.sincronizar_wasi;
          }
        }

        const [dEst, dCiu, dMun, dUrb, dTip, dAses, dCarac] = await Promise.all([
          supabase.from('geo_estados').select('*').order('nombre'),
          supabase.from('geo_ciudades').select('*').order('nombre'),
          supabase.from('geo_municipios').select('*').order('nombre'),
          supabase.from('geo_urbanizaciones').select('*').order('nombre'),
          supabase.from('catalogo_tipos_inmueble').select('*').order('nombre'),
          supabase.from('usuarios').select('*').eq('estatus', 'Activo').order('nombre_completo'),
          supabase.from('caracteristicas_catalogo').select('*').order('nombre')
        ]);

        setCatalogos({
          estados: dEst.data || [], ciudades: dCiu.data || [], municipios: dMun.data || [],
          urbanizaciones: dUrb.data || [], tipos: dTip.data || [], asesores: dAses.data || [], caracteristicas: dCarac.data || []
        });

        // NOTA: No sobreescribimos formData si ya se cargó un borrador
        if (!isEditMode && currentUser) {
          setFormData(prev => ({ 
            ...prev, 
            sincronizar_wasi: flagWasiCalculado,
            id_oficina: currentUser.id_oficina,
            id_usuario_creador: currentUser.id_usuario,
            datos_generales: {
              ...prev.datos_generales,
              id_captador: currentUser.id_nivel === 3 ? currentUser.id_usuario : prev.datos_generales.id_captador || ""
            }
          }));
        }

        if (isEditMode) {
          const { data: resInm } = await supabase.from('inmuebles').select(`
            *, 
            inmuebles_caracteristicas(id_caracteristica), 
            inmuebles_imagenes(url_imagen, es_principal, orden),
            inmuebles_documentos(nombre_archivo, url_archivo, formato) 
          `).eq('id_inmueble', id).single();

          if (resInm) {
            setFormData(p => ({
              ...p, sincronizar_wasi: flagWasiCalculado,
              datos_generales: {
                titulo: resInm.titulo || "", id_captador: resInm.id_usuario_encargado || "",
                estatus_publicacion: resInm.estatus_publicacion || "Activo", identificador_oficial: resInm.codigo_interno || "",
                estado_fisico: resInm.tipo_estado || "Usado", id_tipo_inmueble: resInm.id_tipo_inmueble || "",
                tipo_negocio: resInm.tipo_negocio || "Venta", period_alquiler: resInm.periodo_alquiler || "Mensual",
                ano_construccion: resInm.ano_construccion?.toString() || "", habitaciones: resInm.habitaciones || 0,
                banos: resInm.banos || 0, medio_bano: resInm.medio_bano || false, estacionamientos: resInm.estacionamientos || 0,
                numero_piso: resInm.numero_piso || "", area_construida: resInm.area_construida?.toString() || "", area_terreno: resInm.area_terreno?.toString() || "",
                disposicion: resInm.detalles_extra?.disposicion || "Frente", orientacion: resInm.detalles_extra?.orientacion || "Norte",
                superficie_balcon: resInm.detalles_extra?.superficie_balcon || "", aptos_por_piso: resInm.detalles_extra?.aptos_por_piso || "", pisos_edificio: resInm.detalles_extra?.pisos_edificio || ""
              },
              ubicacion: { id_pais: "VE", id_estado: resInm.id_estado || "", id_ciudad: resInm.id_ciudad || "", id_municipio: resInm.id_municipio || "", id_urbanizacion: resInm.id_urbanizacion || "", codigo_postal: resInm.codigo_postal || "", direccion_exacta: resInm.direccion_exacta || "", latitud: resInm.latitud || 10.22345, longitud: resInm.longitud || -68.01234 },
              finanzas: { precio_venta: resInm.precio_venta?.toString() || "", precio_alquiler: resInm.precio_alquiler?.toString() || "", moneda: resInm.moneda || "USD", monto_administracion: resInm.monto_administracion?.toString() || "", moneda_administracion: resInm.moneda_administracion || "USD", tipo_comision_captador: resInm.tipo_comision_captador || "PORCENTAJE", valor_comision_captador: resInm.valor_comision_captador?.toString() || "", acepta_compartir: resInm.acepta_compartir ?? true, tipo_comision_compartida: resInm.tipo_comision_compartida || "PORCENTAJE", valor_comision_compartida: resInm.valor_comision_compartida?.toString() || "", es_exclusiva: resInm.es_exclusiva || false, fecha_vencimiento_exclusiva: resInm.fecha_vencimiento_exclusiva || "" },
              caracteristicas: resInm.inmuebles_caracteristicas?.map((c: any) => c.id_caracteristica) || [],
              multimedia: { descripcion: resInm.descripciondetallada || "", enlace_video: resInm.enlace_video || "", tour_virtual: resInm.tour_virtual || "" },
              propietario: { nombres: resInm.propietario_nombres || "", apellidos: "", telefono: "", email: "", recibe_correo: true, observaciones: "" },
              id_oficina: resInm.id_oficina,
              id_usuario_creador: resInm.id_usuario_creador
            }));

            const fotosNube = resInm.inmuebles_imagenes?.sort((a: any, b: any) => a.orden - b.orden).map((f:any) => ({
              type: 'cloud',
              url_imagen: f.url_imagen,
              ...f
            })) || [];
            
            setGaleria(fotosNube);
            setDocumentosExistentes(resInm.inmuebles_documentos || []);
          }
        }
      } catch (err) {
        console.error("🚨 Fallo en auditoría inicial:", err);
      } finally {
        setLoadingCatalogos(false);
      }
    };
    arrancarCore();
  }, [id, isEditMode]);

  const uGen = (c: string, v: any) => setFormData(p => ({ ...p, datos_generales: { ...p.datos_generales, [c]: v } }));
  const uFin = (c: string, v: any) => setFormData(p => ({ ...p, finanzas: { ...p.finanzas, [c]: v } }));
  const uPro = (c: string, v: any) => setFormData(p => ({ ...p, propietario: { ...p.propietario, [c]: v } }));
  const uMultimedia = (campo: string, valor: any) => setFormData(p => ({ ...p, multimedia: { ...p.multimedia, [campo]: valor } }));
  
  const uUbi = (campo: string, valor: any) => {
    setFormData(p => {
      const u = { ...p.ubicacion, [campo]: valor };
      if (campo === 'id_estado') { u.id_ciudad = ""; u.id_municipio = ""; u.id_urbanizacion = ""; }
      if (campo === 'id_ciudad') { u.id_municipio = ""; u.id_urbanizacion = ""; }
      
      // Autocompletar desde Municipio
      if (campo === 'id_municipio') { 
        u.id_urbanizacion = ""; 
        const mun = catalogos.municipios.find((m: any) => m.id_municipio === valor);
        u.codigo_postal = mun?.codigo_postal || u.codigo_postal;
      }
      
      // Autocompletar desde Urbanización (Prioridad más alta)
      if (campo === 'id_urbanizacion') {
        const urb = catalogos.urbanizaciones.find((ur: any) => ur.id_urbanizacion === valor);
        u.codigo_postal = urb?.codigo_postal || u.codigo_postal;
      }
      
      return { ...p, ubicacion: u };
    });
  };

  const toggleCaracteristica = (idCarac: string) => {
    setFormData(p => {
      const lista = p.caracteristicas.includes(idCarac) ? p.caracteristicas.filter(c => c !== idCarac) : [...p.caracteristicas, idCarac];
      return { ...p, caracteristicas: lista };
    });
  };

  const capturarGPS = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert("GPS", "Permiso denegado.");
    let location = await Location.getCurrentPositionAsync({});
    uUbi('latitud', location.coords.latitude);
    uUbi('longitud', location.coords.longitude);
  };

  const seleccionarFotos = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7 });
    if (!result.canceled) {
      const nuevas = result.assets.map(a => ({
        type: 'local', uri: a.uri, name: a.fileName || `IMG_${Date.now()}.jpg`, fileType: 'image/jpeg'
      }));
      setGaleria(p => [...p, ...nuevas]);
    }
  };

  const moverFoto = (index: number, direccion: number) => {
    if (direccion === -1 && index === 0) return;
    if (direccion === 1 && index === galeria.length - 1) return;
    const nuevaGaleria = [...galeria];
    const temp = nuevaGaleria[index];
    nuevaGaleria[index] = nuevaGaleria[index + direccion];
    nuevaGaleria[index + direccion] = temp;
    setGaleria(nuevaGaleria);
  };

  const eliminarFoto = (index: number) => {
    setGaleria(prev => prev.filter((_, i) => i !== index));
  };

  const seleccionarLegales = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
    if (!result.canceled) {
      setArchivos(p => ({ ...p, legales: [...p.legales, ...result.assets.map(a => ({ uri: a.uri, name: a.name, type: a.mimeType || 'application/pdf' }))] }));
    }
  };

  const generarCopyConIA = async () => {
    if (!formData.datos_generales.id_tipo_inmueble) {
      return Alert.alert("Aviso", "Por favor, indica el Tipo de Inmueble primero para darle contexto a la IA.");
    }
    setIsGeneratingAI(true);
    try {
      const payload = { 
        // 🔥 Buscamos el nombre del tipo de inmueble
        tipo_inmueble: catalogos.tipos.find((t:any) => t.id_tipo === formData.datos_generales.id_tipo_inmueble)?.nombre || "",
        tipo_negocio: formData.datos_generales.tipo_negocio, 
        habitaciones: formData.datos_generales.habitaciones, 
        banos: formData.datos_generales.banos, 
        area: formData.datos_generales.area_construida, 
        // Si quieres, aquí también puedes enviarle el estado y ciudad si los tienes a mano
        instrucciones_extra: "Actúa como copywriter inmobiliario experto. Redacta un texto persuasivo y elegante para la venta/alquiler. Omite precios." 
      };
      const res = await fetch(`${WEB_API_URL}/api/ia/generar-copy`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      if (!res.ok) throw new Error(`El servidor respondió con código ${res.status}`);
      const d = await res.json();
      if (d.success) {
        const textoGenerado = d.copyGenerado || d.copyGenerated || d.descripcion || d.texto || d.data || d.mensaje;
        if (textoGenerado) {
          setFormData(p => ({ ...p, multimedia: { ...p.multimedia, descripcion: textoGenerado } }));
        } else {
          Alert.alert("Misterio IA", "La IA procesó la solicitud, pero devolvió un texto vacío. Verifica el backend.");
        }
      } else {
        Alert.alert("Fallo en IA", d.error || "El servidor de IA rechazó la solicitud.");
      }
    } catch (e: any) { 
      Alert.alert("Error de Conexión", `No pudimos contactar al cerebro de IA: ${e.message}`);
    } finally { 
      setIsGeneratingAI(false); 
    }
  };

  // =====================================================================
  // 🚀 2. INTELIGENCIA TRANSACCIONAL (Auditado para Producción)
  // =====================================================================
  const guardarInmuebleCompleto = async () => {
    if (!formData.datos_generales.titulo) return Alert.alert("Validación", "El título público es requerido.");
    
    // 👇 NUEVA VALIDACIÓN INTELIGENTE DE LONGITUD DE TÍTULO
    const limiteCaracteres = isEditMode ? 70 : 60;
    if (formData.datos_generales.titulo.length > limiteCaracteres) {
      return Alert.alert(
        "Límite Excedido ⚠️", 
        `El título no puede superar los ${limiteCaracteres} caracteres.\n\nActualmente tiene ${formData.datos_generales.titulo.length}. Por favor, resúmelo un poco.`
      );
    }
    // 👆 FIN NUEVA VALIDACIÓN

    if (!formData.datos_generales.id_tipo_inmueble) return Alert.alert("Validación", "Debes seleccionar un Tipo de Inmueble.");
    if (formData.datos_generales.tipo_negocio === 'Venta' && (!formData.finanzas.precio_venta || formData.finanzas.precio_venta === "0")) return Alert.alert("Validación", "Debes indicar el precio de venta.");
    if (formData.datos_generales.tipo_negocio === 'Alquiler' && (!formData.finanzas.precio_alquiler || formData.finanzas.precio_alquiler === "0")) return Alert.alert("Validación", "Debes indicar el precio de alquiler.");

    setIsSubmitting(true);
    // ... (el resto del código queda exactamente igual)
    
    // 🚀 UX AVISO: Informamos al usuario que el proceso requiere la app abierta
    Alert.alert(
      "🚀 Procesando Inmueble", 
      "El inmueble se está subiendo de forma segura. Puedes seguir navegando en la app, pero por favor no la cierres por completo hasta terminar."
    );

    // 🚀 AVISAMOS AL INVENTARIO QUE EMPEZÓ LA SUBIDA
    DeviceEventEmitter.emit('inmueble_subiendo');

    // Redirigimos inmediatamente al dashboard para bloquear la edición
    router.back();

    // Eliminamos el borrador porque ya decidimos guardar
    if (!isEditMode) {
      await AsyncStorage.removeItem('@inmotech_draft');
    }

    try {
      const pipelineUpload = async (obj: any, bucket: string) => {
        const response = await fetch(obj.uri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();
        
        // 🛡️ Aseguramos no intentar hacer split a un nombre indefinido (Fallo común en iOS)
        const ext = obj.name?.split('.').pop() || 'jpg';
        const path = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        
        const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
          contentType: obj.type || 'image/jpeg',
        });
        
        if (error) throw error;
        return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      };

      // 🛡️ SOLUCIÓN ANTI-HEIC: Bucle secuencial con conversión obligatoria a Web-JPEG
      const imgsPayload = [];
      for (let idx = 0; idx < galeria.length; idx++) {
        const foto = galeria[idx];
        if (foto.type === 'local') {
          
          // 🚀 MAGIA ANTI-HEIC: Convertimos TODO a JPEG estándar web antes de subir
          const imgManipulada = await ImageManipulator.manipulateAsync(
            foto.uri,
            [{ resize: { width: 1200 } }], // Achicamos a 1200px para subir rápido y ahorrar datos
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );

          // Aseguramos que la extensión sea .jpg para que la web no se confunda
          const nombreSeguro = foto.name ? foto.name.replace(/\.[^/.]+$/, ".jpg") : `IMG_${Date.now()}.jpg`;

          const url = await pipelineUpload({ 
            uri: imgManipulada.uri, 
            name: nombreSeguro, 
            
            type: 'image/jpeg' 
          }, 'inmuebles_fotos');
          
          imgsPayload.push({ url_imagen: url, url_miniatura: url, es_nuevo: true, es_principal: idx === 0, orden: idx + 1 });
        } else {
          // Ya estaba en la nube, se mantiene igual
          imgsPayload.push({ ...foto, es_principal: idx === 0, orden: idx + 1, es_nuevo: false });
        }
      }

      // 🛡️ Secuencialidad igual para los documentos legales
      const docsPayload = [];
      for (let i = 0; i < archivos.legales.length; i++) {
        const d = archivos.legales[i];
        const url = await pipelineUpload({ uri: d.uri, name: d.name, type: d.type }, 'inmuebles_legales');
        docsPayload.push({ 
          tipo_documento: 'Soporte Legal Móvil', 
          nombre_archivo: d.name, 
          url_archivo: url, 
          formato: d.type, 
          es_nuevo: true 
        });
      }

      const payloadDocumentosFinal = [
        ...documentosExistentes, 
        ...docsPayload
      ];

      const jsonPayloadMaestro = { 
        id_inmueble: isEditMode ? id : undefined, 
        ...formData, 
        inmuebles_imagenes: imgsPayload, 
        inmuebles_documentos: payloadDocumentosFinal 
      };

      const res = await fetch(`${WEB_API_URL}/api/inmuebles`, { 
        method: isEditMode ? "PUT" : "POST", 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}` // Evita rechazos en Vercel
        }, 
        body: JSON.stringify(jsonPayloadMaestro) 
      });
      
      const result = await res.json();

      if (!result.success) {
        console.error("Fallo Core Background:", result.error);
        DeviceEventEmitter.emit('inmueble_error'); // 🚀 AVISAMOS DE ERROR
      } else {
        console.log("✅ Inmueble publicado con éxito en background");
        DeviceEventEmitter.emit('inmueble_exito'); // 🚀 AVISAMOS DE ÉXITO
      }

    } catch (e: any) {
      console.error("Error Crítico Background:", e);
      DeviceEventEmitter.emit('inmueble_error'); // 🚀 AVISAMOS DE ERROR
    } finally {
      setIsSubmitting(false);
    }
  };

  const TAB_LIST = [
    { id: 'generales', label: '1. Generales' }, { id: 'ubicacion', label: '2. Ubicación' },
    { id: 'caracteristicas', label: '3. Atributos' }, { id: 'multimedia', label: '4. Multimedia & IA' },
    { id: 'finanzas', label: '5. Finanzas' }, { id: 'propietario', label: '6. Expediente' }
  ];

  if (loadingCatalogos) return <View style={styles.center}><ActivityIndicator size="large" color="#0ea5e9"/><Text style={styles.loadingText}>Conectando Core...</Text></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}><Feather name="arrow-left" size={20} color="#0f172a" /></TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Editar Expediente' : 'Nueva Captación'}</Text>
        </View>
        <TouchableOpacity style={styles.btnSave} onPress={guardarInmuebleCompleto} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" size="small"/> : <Feather name="save" size={16} color="#fff" />}
          <Text style={styles.btnSaveText}>{isEditMode ? 'GUARDAR' : 'PUBLICAR'}</Text>
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TAB_LIST.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={[styles.tab, activeTab === t.id && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
        
        {/* FASE 1: GENERALES */}
        {activeTab === 'generales' && (
          <View style={styles.sheetSection}>
            <Text style={styles.labelInput}>Título Público Comercial</Text>
            <TextInput style={styles.inputBox} value={formData.datos_generales.titulo} onChangeText={t=>uGen('titulo', t)} placeholder="Ej. Casa en Venta Ubicacion e ID..." />

            <SelectorBuscableForm 
              titulo="ASESOR ENCARGADO / CAPTADOR" 
              datos={catalogos.asesores} 
              valor={formData.datos_generales.id_captador} 
              campoId="id_usuario" 
              campoNombre="nombre_completo" 
              placeholder="Seleccionar Asesor..." 
              onSelect={(v:any)=>uGen('id_captador', v)} 
              disabled={sesionUsuario?.id_nivel === 3} 
            />
            
            <SelectorBuscableForm titulo="TIPO DE INMUEBLE" datos={catalogos.tipos} valor={formData.datos_generales.id_tipo_inmueble} campoId="id_tipo" campoNombre="nombre" placeholder="Seleccionar Tipo..." onSelect={(v:any)=>uGen('id_tipo_inmueble', v)} />

            <View style={styles.inputRow}>
              <View style={styles.halfCol}>
                <SelectorBuscableForm titulo="OPERACIÓN" datos={opcionesNegocio} valor={formData.datos_generales.tipo_negocio} campoId="id" campoNombre="nombre" placeholder="Negocio" onSelect={(v:any)=>uGen('tipo_negocio', v)} />
              </View>
              <View style={styles.halfCol}>
                <SelectorBuscableForm titulo="PERIODO RENTA" datos={opcionesPeriodo} valor={formData.datos_generales.period_alquiler} campoId="id" campoNombre="nombre" placeholder="Periodo" onSelect={(v:any)=>uGen('period_alquiler', v)} />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.halfCol}>
                <SelectorBuscableForm titulo="ESTATUS PÚBLICO" datos={opcionesEstatus} valor={formData.datos_generales.estatus_publicacion} campoId="id" campoNombre="nombre" placeholder="Estatus" onSelect={(v:any)=>uGen('estatus_publicacion', v)} />
              </View>
              <View style={styles.halfCol}>
                <SelectorBuscableForm titulo="ESTADO FÍSICO" datos={opcionesEstadoFisico} valor={formData.datos_generales.estado_fisico} campoId="id" campoNombre="nombre" placeholder="Estado" onSelect={(v:any)=>uGen('estado_fisico', v)} />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.halfCol}><Text style={styles.labelInput}>HABITACIONES</Text><TextInput style={styles.inputBox} keyboardType="numeric" value={formData.datos_generales.habitaciones.toString()} onChangeText={t=>uGen('habitaciones', parseInt(t)||0)} /></View>
              <View style={styles.halfCol}><Text style={styles.labelInput}>BAÑOS COMPLETOS</Text><TextInput style={styles.inputBox} keyboardType="numeric" value={formData.datos_generales.banos.toString()} onChangeText={t=>uGen('banos', parseInt(t)||0)} /></View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.halfCol}><Text style={styles.labelInput}>ESTACIONAMIENTOS</Text><TextInput style={styles.inputBox} keyboardType="numeric" value={formData.datos_generales.estacionamientos.toString()} onChangeText={t=>uGen('estacionamientos', parseInt(t)||0)} /></View>
              <View style={styles.halfCol}><Text style={styles.labelInput}>NRO. PISO</Text><TextInput style={styles.inputBox} value={formData.datos_generales.numero_piso} onChangeText={t=>uGen('numero_piso', t)} placeholder="Ej. 3" /></View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.halfCol}><Text style={styles.labelInput}>ÁREA CONSTRUIDA (M²)</Text><TextInput style={styles.inputBox} keyboardType="numeric" value={formData.datos_generales.area_construida} onChangeText={t=>uGen('area_construida', t)} placeholder="m²" /></View>
              <View style={styles.halfCol}><Text style={styles.labelInput}>ÁREA TERRENO (M²)</Text><TextInput style={styles.inputBox} keyboardType="numeric" value={formData.datos_generales.area_terreno} onChangeText={t=>uGen('area_terreno', t)} placeholder="m²" /></View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.halfCol}><Text style={styles.labelInput}>AÑO CONSTRUCCIÓN</Text><TextInput style={styles.inputBox} keyboardType="numeric" value={formData.datos_generales.ano_construccion} onChangeText={t=>uGen('ano_construccion', t)} placeholder="Ej. 2010" /></View>
              <View style={styles.halfCol}><Text style={styles.labelInput}>DISPOSICIÓN</Text><TextInput style={styles.inputBox} value={formData.datos_generales.disposicion} onChangeText={t=>uGen('disposicion', t)} placeholder="Frente / Interno" /></View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.halfCol}><Text style={styles.labelInput}>ORIENTACIÓN</Text><TextInput style={styles.inputBox} value={formData.datos_generales.orientacion} onChangeText={t=>uGen('orientacion', t)} placeholder="Norte / Sur" /></View>
              <View style={styles.halfCol}><Text style={styles.labelInput}>APTOS POR PISO</Text><TextInput style={styles.inputBox} keyboardType="numeric" value={formData.datos_generales.aptos_por_piso} onChangeText={t=>uGen('aptos_por_piso', t)} placeholder="Ej. 4" /></View>
            </View>

            <View style={styles.switchBoxContainer}>
              <Text style={styles.labelInput}>¿POSEE MEDIO BAÑO DE VISITAS?</Text>
              <Switch value={formData.datos_generales.medio_bano} onValueChange={v=>uGen('medio_bano', v)} trackColor={{true: '#0ea5e9', false: '#cbd5e1'}} />
            </View>
          </View>
        )}

        {/* FASE 2: UBICACIÓN */}
        {activeTab === 'ubicacion' && (
          <View style={styles.sheetSection}>
            <Text style={styles.labelInput}>País Asignado</Text>
            <TextInput style={[styles.inputBox, {backgroundColor:'#f1f5f9', color:'#94a3b8'}]} editable={false} value="Venezuela 🇻🇪" />

            <SelectorBuscableForm titulo="ESTADO" datos={catalogos.estados} valor={formData.ubicacion.id_estado} campoId="id_estado" campoNombre="nombre" placeholder="Seleccionar Estado..." onSelect={(v:any)=>uUbi('id_estado', v)} />
            
            {formData.ubicacion.id_estado !== "" && (
              <SelectorBuscableForm titulo="CIUDAD" datos={catalogos.ciudades.filter((c:any)=>c.id_estado === formData.ubicacion.id_estado)} valor={formData.ubicacion.id_ciudad} campoId="id_ciudad" campoNombre="nombre" placeholder="Seleccionar Ciudad..." onSelect={(v:any)=>uUbi('id_ciudad', v)} />
            )}
            {formData.ubicacion.id_ciudad !== "" && (
              <SelectorBuscableForm titulo="MUNICIPIO" datos={catalogos.municipios.filter((m:any)=>m.id_ciudad === formData.ubicacion.id_ciudad)} valor={formData.ubicacion.id_municipio} campoId="id_municipio" campoNombre="nombre" placeholder="Seleccionar Municipio..." onSelect={(v:any)=>uUbi('id_municipio', v)} />
            )}
            {formData.ubicacion.id_municipio !== "" && (
              <SelectorBuscableForm titulo="URBANIZACIÓN" datos={catalogos.urbanizaciones.filter((u:any)=>u.id_municipio === formData.ubicacion.id_municipio)} valor={formData.ubicacion.id_urbanizacion} campoId="id_urbanizacion" campoNombre="nombre" placeholder="Seleccionar Urbanización..." onSelect={(v:any)=>uUbi('id_urbanizacion', v)} />
            )}

            <Text style={styles.labelInput}>Código Postal</Text>
            <TextInput style={styles.inputBox} value={formData.ubicacion.codigo_postal} onChangeText={t=>uUbi('codigo_postal', t)} placeholder="Ej. 2001" />

            <TouchableOpacity style={styles.btnGpsNativo} onPress={capturarGPS}>
              <Feather name="crosshair" size={16} color="#0369a1" />
              <Text style={styles.btnGpsNativoText}>CAPTURAR COORDENADAS GPS SATELITAL</Text>
            </TouchableOpacity>

            <View style={styles.inputRow}>
              <View style={styles.halfCol}><Text style={styles.labelInput}>Latitud</Text><TextInput style={[styles.inputBox, styles.mono]} value={formData.ubicacion.latitud.toString()} editable={false}/></View>
              <View style={styles.halfCol}><Text style={styles.labelInput}>Longitud</Text><TextInput style={[styles.inputBox, styles.mono]} value={formData.ubicacion.longitud.toString()} editable={false}/></View>
            </View>

            <Text style={styles.labelInput}>Dirección Exacta (Resguardo Confidencial)</Text>
            <TextInput style={[styles.inputBox, {height: 70}]} multiline value={formData.ubicacion.direccion_exacta} onChangeText={t=>uUbi('direccion_exacta', t)} placeholder="Av. Principal, Edificio Don Bosco, Apto 3B..." />
          </View>
        )}

        {/* FASE 3: ATRIBUTOS SEPARADOS */}
        {activeTab === 'caracteristicas' && (
          <View style={styles.sheetSection}>
            <Text style={styles.sectionHeadingTitle}>🏠 Características Internas</Text>
            <View style={[styles.badgeWrapFlex, {marginBottom: 20}]}>
              {catalogos.caracteristicas.filter((c:any)=>c.tipo === 'INTERNA').map((c: any) => (
                <TouchableOpacity key={c.id_caracteristica} onPress={() => toggleCaracteristica(c.id_caracteristica)} style={[styles.chipFeature, formData.caracteristicas.includes(c.id_caracteristica) && styles.chipFeatureActive]}>
                  <Text style={[styles.chipFeatureText, formData.caracteristicas.includes(c.id_caracteristica) && styles.chipFeatureTextActive]}>{c.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionHeadingTitle}>🌳 Características Externas</Text>
            <View style={styles.badgeWrapFlex}>
              {catalogos.caracteristicas.filter((c:any)=>c.tipo === 'EXTERNA').map((c: any) => (
                <TouchableOpacity key={c.id_caracteristica} onPress={() => toggleCaracteristica(c.id_caracteristica)} style={[styles.chipFeature, formData.caracteristicas.includes(c.id_caracteristica) && styles.chipFeatureActiveExt]}>
                  <Text style={[styles.chipFeatureText, formData.caracteristicas.includes(c.id_caracteristica) && styles.chipFeatureTextActiveExt]}>{c.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* FASE 4: MULTIMEDIA E IA */}
        {activeTab === 'multimedia' && (
          <View style={styles.sheetSection}>
            <View style={styles.aiWrapperBox}>
              <Text style={styles.labelInput}>Descripción Pública Comercial</Text>
              <TextInput style={[styles.inputBox, {height: 120}]} multiline value={formData.multimedia.descripcion} onChangeText={t=>uMultimedia('descripcion', t)} placeholder="Texto persuasivo de mercadeo..." />
              <TouchableOpacity style={styles.btnAiEngine} onPress={generarCopyConIA} disabled={isGeneratingAI}>
                {isGeneratingAI ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.btnAiEngineText}>✨ REDACTAR DESCRIPCIÓN CON IA GEMINI</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.photoWrapperBox}>
              <Text style={styles.labelInput}>Línea Multimedia de Fotos</Text>
              <TouchableOpacity style={styles.btnPickMedia} onPress={seleccionarFotos}>
                <Feather name="camera" size={16} color="#0ea5e9" /><Text style={styles.btnPickMediaText}>CARGAR FOTOS DESDE LA GALERÍA</Text>
              </TouchableOpacity>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 16}}>
                {galeria.map((f, i) => (
                  <View key={`foto-${i}`} style={styles.thumbWrapperGaleria}>
                    <Image source={{ uri: f.type === 'local' ? f.uri : f.url_imagen }} style={styles.imgThumbSquare} />
                    
                    <TouchableOpacity style={styles.btnEliminarFoto} onPress={() => eliminarFoto(i)}>
                      <Feather name="trash-2" size={12} color="#fff" />
                    </TouchableOpacity>

                    {i === 0 && (
                      <View style={styles.badgePortada}>
                        <Text style={styles.badgeLabelTextPortada}>PORTADA</Text>
                      </View>
                    )}

                    <View style={f.type === 'local' ? styles.badgeLabelLocal : styles.badgeLabelCloud}>
                      <Text style={styles.badgeLabelText}>{f.type === 'local' ? 'NUEVA' : 'NUBE'}</Text>
                    </View>

                    <View style={styles.controlesMover}>
                      {i > 0 ? (
                        <TouchableOpacity style={styles.btnMover} onPress={() => moverFoto(i, -1)}>
                          <Feather name="chevron-left" size={18} color="#fff" />
                        </TouchableOpacity>
                      ) : <View style={styles.btnSpacer} />}
                      
                      {i < galeria.length - 1 ? (
                        <TouchableOpacity style={styles.btnMover} onPress={() => moverFoto(i, 1)}>
                          <Feather name="chevron-right" size={18} color="#fff" />
                        </TouchableOpacity>
                      ) : <View style={styles.btnSpacer} />}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <Text style={[styles.labelInput, {marginTop: 15}]}>Enlace de Video Externo</Text>
            <TextInput style={styles.inputBox} value={formData.multimedia.enlace_video} onChangeText={t=>uMultimedia('enlace_video', t)} placeholder="https://youtube.com/watch?v=..." />
          </View>
        )}

        {/* FASE 5: FINANZAS */}
        {activeTab === 'finanzas' && (
          <View style={styles.sheetSection}>
            <View style={styles.inputRow}>
              <View style={styles.halfCol}><Text style={styles.labelInput}>Precio Venta ($)</Text><TextInput style={styles.inputBox} keyboardType="numeric" value={formData.finanzas.precio_venta} onChangeText={t=>uFin('precio_venta', t)} placeholder="0.00" /></View>
              <View style={styles.halfCol}><Text style={styles.labelInput}>Precio Alquiler ($)</Text><TextInput style={styles.inputBox} keyboardType="numeric" value={formData.finanzas.precio_alquiler} onChangeText={t=>uFin('precio_alquiler', t)} placeholder="0.00" /></View>
            </View>

            <Text style={styles.labelInput}>Monto de Condominio</Text>
            <TextInput style={styles.inputBox} keyboardType="numeric" value={formData.finanzas.monto_administracion} onChangeText={t=>uFin('monto_administracion', t)} placeholder="0.00" />

            <Text style={styles.sectionHeadingTitle}>💼 Comisión Punta Captadora</Text>
            <SelectorBuscableForm titulo="TIPO COMISIÓN" datos={opcionesComision} valor={formData.finanzas.tipo_comision_captador} campoId="id" campoNombre="nombre" placeholder="Forma de Cobro" onSelect={(v:any)=>uFin('tipo_comision_captador', v)} />
            <TextInput style={styles.inputBox} keyboardType="numeric" value={formData.finanzas.valor_comision_captador} onChangeText={t=>uFin('valor_comision_captador', t)} placeholder="Monto o %" />

            <Text style={styles.sectionHeadingTitle}>🤝 Comisión Aliados (Cobroke)</Text>
            <SelectorBuscableForm titulo="TIPO COMISIÓN COBROKE" datos={opcionesComision} valor={formData.finanzas.tipo_comision_compartida} campoId="id" campoNombre="nombre" placeholder="Forma de Cobro Aliado" onSelect={(v:any)=>uFin('tipo_comision_compartida', v)} />
            <TextInput style={styles.inputBox} keyboardType="numeric" value={formData.finanzas.valor_comision_compartida} onChangeText={t=>uFin('valor_comision_compartida', t)} placeholder="Monto o % Compartido" />

            <View style={styles.switchBoxContainer}>
              <Text style={styles.labelInput}>¿Contrato bajo Exclusividad?</Text>
              <Switch value={formData.finanzas.es_exclusiva} onValueChange={v=>uFin('es_exclusiva', v)} trackColor={{true: '#10b981', false: '#cbd5e1'}} />
            </View>
          </View>
        )}

        {/* FASE 6: EXPEDIENTE PRIVADO LEGAL */}
        {activeTab === 'propietario' && (
          <View style={styles.sheetSection}>
            <Text style={styles.labelInput}>Nombres del Propietario</Text>
            <TextInput style={styles.inputBox} value={formData.propietario.nombres} onChangeText={t=>uPro('nombres', t)} placeholder="Nombres" />
            <Text style={styles.labelInput}>Teléfono Principal</Text>
            <TextInput style={styles.inputBox} keyboardType="phone-pad" value={formData.propietario.telefono} onChangeText={t=>uPro('telefono', t)} placeholder="Teléfono" />

            <View style={styles.photoWrapperBox}>
              <Text style={styles.labelInput}>Bóveda Legal de Soporte</Text>
              <TouchableOpacity style={[styles.btnPickMedia, {backgroundColor:'#fff', borderColor:'#f59e0b'}]} onPress={seleccionarLegales}>
                <Feather name="file-text" size={16} color="#d97706" /><Text style={[styles.btnPickMediaText, {color:'#d97706'}]}>AÑADIR PDFs / CÉDULAS</Text>
              </TouchableOpacity>

              {/* ☁️ DOCUMENTOS EXISTENTES EN LA NUBE */}
              {documentosExistentes.length > 0 && <Text style={[styles.labelInput, {marginTop: 15}]}>Archivos en la Nube:</Text>}
              {documentosExistentes.map((doc: any, idx: number) => (
                <View key={`cloud-${idx}`} style={styles.docRowFile}>
                  <Feather name="cloud" size={14} color="#0ea5e9" />
                  <Text style={styles.docRowText} numberOfLines={1}>{doc.nombre_archivo || 'Documento Legal'}</Text>
                  
                  {/* Botón para Abrir/Descargar */}
                  <TouchableOpacity onPress={() => Linking.openURL(doc.url_archivo)} style={{padding: 6, marginRight: 5}}>
                    <Feather name="external-link" size={16} color="#10b981" />
                  </TouchableOpacity>
                  
                  {/* Botón para Eliminar */}
                  <TouchableOpacity onPress={() => {
                    Alert.alert("¿Eliminar?", "Se borrará al guardar los cambios.", [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Quitar", style: "destructive", onPress: () => setDocumentosExistentes(prev => prev.filter((_, i) => i !== idx)) }
                    ]);
                  }} style={{padding: 6}}>
                    <Feather name="trash-2" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* 📱 NUEVOS DOCUMENTOS LOCALES POR SUBIR */}
              {archivos.legales.length > 0 && <Text style={[styles.labelInput, {marginTop: 15}]}>Archivos por Subir:</Text>}
              {archivos.legales.map((doc: any, idx: number) => (
                <View key={`local-${idx}`} style={[styles.docRowFile, {borderColor: '#f59e0b', backgroundColor: '#fffbeb'}]}>
                  <Feather name="file" size={14} color="#d97706" />
                  <Text style={[styles.docRowText, {color: '#92400e'}]} numberOfLines={1}>{doc.name}</Text>
                  
                  {/* Botón para Quitar de la lista de subida */}
                  <TouchableOpacity onPress={() => setArchivos(p => ({...p, legales: p.legales.filter((_, i) => i !== idx)}))} style={{padding: 6}}>
                    <Feather name="x" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: Platform.OS === 'ios' ? 50 : 35 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 11, fontWeight: '900', color: '#64748b', marginTop: 10 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnBack: { width: 36, height: 36, backgroundColor: '#f1f5f9', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  btnSave: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  btnSaveText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  tabsScroll: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  tabActive: { backgroundColor: '#e0f2fe', borderColor: '#0ea5e9' },
  tabText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  tabTextActive: { color: '#0369a1' },

  formContent: { paddingHorizontal: 20, paddingBottom: 60 },
  sheetSection: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9', width: '100%' },
  labelInput: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  sectionHeadingTitle: { fontSize: 11, fontWeight: '900', color: '#1e293b', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 12 },
  inputBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 14, width: '100%' },
  inputRow: { flexDirection: 'row', gap: 12, width: '100%' },
  halfCol: { flex: 1 },
  switchBoxContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 14, borderRadius: 14, marginTop: 6, width: '100%' },
  
  btnGpsNativo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#e0f2fe', paddingVertical: 14, borderRadius: 12, marginBottom: 14, marginTop: 4, width: '100%' },
  btnGpsNativoText: { color: '#0369a1', fontSize: 10, fontWeight: '900' },

  searchableInputBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, backgroundColor: '#ffffff', marginBottom: 14, width: '100%' },
  searchModalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  searchModalContainer: { backgroundColor: '#ffffff', borderRadius: 24, maxHeight: '80%', padding: 20 },
  searchModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  searchModalTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  searchModalInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 15, height: 45, marginBottom: 15 },
  searchModalInput: { flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  searchModalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  searchModalRowText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  closeBtnModal: { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 10 },

  badgeWrapFlex: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' },
  chipFeature: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  chipFeatureActive: { backgroundColor: '#e0f2fe', borderColor: '#0ea5e9' },
  chipFeatureActiveExt: { backgroundColor: '#e6f4ea', borderColor: '#10b981' },
  chipFeatureText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  chipFeatureTextActive: { color: '#0369a1', fontWeight: '800' },
  chipFeatureTextActiveExt: { color: '#137333', fontWeight: '800' },

  aiWrapperBox: { backgroundColor: '#fdf4ff', padding: 14, borderRadius: 16, borderColor: '#fae8ff', borderWidth: 1, marginBottom: 16, width: '100%' },
  btnAiEngine: { backgroundColor: '#d946ef', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnAiEngineText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  photoWrapperBox: { backgroundColor: '#f0f9ff', padding: 14, borderRadius: 16, borderColor: '#e0f2fe', borderWidth: 1, marginTop: 4, width: '100%' },
  btnPickMedia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#bae6fd', paddingVertical: 12, borderRadius: 12, width: '100%' },
  btnPickMediaText: { color: '#0ea5e9', fontSize: 11, fontWeight: '900' },
  
  thumbWrapperGaleria: { position: 'relative', width: 120, height: 120, borderRadius: 12, overflow: 'hidden', marginRight: 12, borderWidth: 1, borderColor: '#bae6fd', backgroundColor: '#0f172a' },
  imgThumbSquare: { width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.85 },
  badgePortada: { position: 'absolute', top: 0, left: 0, backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 4, borderBottomRightRadius: 8, zIndex: 10 },
  badgeLabelTextPortada: { color: '#fff', fontSize: 9, fontWeight: '900' },
  badgeLabelCloud: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15,23,42,0.8)', paddingVertical: 4, zIndex: 10, alignItems: 'center' },
  badgeLabelLocal: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#10b981', paddingVertical: 4, zIndex: 10, alignItems: 'center' },
  badgeLabelText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  btnEliminarFoto: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(225,29,72,0.9)', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', zIndex: 15 },
  controlesMover: { position: 'absolute', top: '50%', marginTop: -15, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, zIndex: 10 },
  btnMover: { backgroundColor: 'rgba(255,255,255,0.25)', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnSpacer: { width: 30 },

  docRowFile: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', width: '100%' },
  docRowText: { fontSize: 11, fontWeight: '600', color: '#475569', flex: 1 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#0ea5e9', fontWeight: '700' }
});