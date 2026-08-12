import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { supabase } from '../../../lib/supabase'; // Asegúrate que esta ruta a Supabase sea correcta

// Definición de Tipos de Modelos equivalentes a la versión Web
export type ModeloFlyer = "MODELO_1" | "MODELO_2" | "MODELO_3" | "MODELO_4" | "MODELO_5" | "MODELO_6";

export default function GeneradorFlyerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const viewRef = useRef<View>(null);

  // Estados de control
  const [inmueble, setInmueble] = useState<any>(null);
  const [asesor, setAsesor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Estados de Configuración del Flyer
  const [modeloSeleccionado, setModeloSeleccionado] = useState<ModeloFlyer>("MODELO_4");
  const [tonoTexto, setTonoTexto] = useState<"TONO_1" | "TONO_2">("TONO_1");
  const [marcaBlanca, setMarcaBlanca] = useState(false);

  useEffect(() => {
    const fetchFlyerData = async () => {
      try {
        const { data: prop, error } = await supabase
          .from("inmuebles")
          .select("*, inmuebles_imagenes(url_imagen, orden)")
          .eq("id_inmueble", id)
          .single();

        if (error || !prop) throw new Error("Inmueble no localizado");

        if (prop.inmuebles_imagenes) {
          prop.inmuebles_imagenes.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
        }

        if (prop.id_usuario_encargado) {
          const { data: user } = await supabase
            .from("usuarios")
            .select("nombre_completo, celular_1, foto")
            .eq("id_usuario", prop.id_usuario_encargado)
            .single();
          if (user) setAsesor(user);
        }

        // Resolviendo Geografía Rápida
        let zonaResumida = "Ubicación Privada";
        if (prop.id_urbanizacion) {
          const { data: urb } = await supabase.from("geo_urbanizaciones").select("nombre").eq("id_urbanizacion", prop.id_urbanizacion).single();
          if (urb) zonaResumida = urb.nombre;
        } else if (prop.id_ciudad) {
          const { data: ciu } = await supabase.from("geo_ciudades").select("nombre").eq("id_ciudad", prop.id_ciudad).single();
          if (ciu) zonaResumida = ciu.nombre;
        }

        setInmueble({ ...prop, zona_resumida: zonaResumida });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchFlyerData();
  }, [id]);

  // 🚀 EL DISPARADOR NATIVO
  const descargarFlyer = async () => {
    setIsExporting(true);
    try {
      const uri = await captureRef(viewRef, {
        format: 'jpg',
        quality: 1,
        width: 1080, // Lona forzada en alta resolución publicitaria
        height: 1080
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: `Flyer_${inmueble?.codigo_interno}.jpg`,
        });
      } else {
        alert("Tu dispositivo no soporta compartir imágenes directamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al compilar el lienzo.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Compilando lienzos multimedia...</Text>
      </View>
    );
  }

  // 📸 Extracción dinámica de 6 Fotos (Igual que en Web)
  const fotos = inmueble?.inmuebles_imagenes || [];
  const f1 = fotos[0]?.url_imagen || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800";
  const f2 = fotos[1]?.url_imagen || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600";
  const f3 = fotos[2]?.url_imagen || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600";
  const f4 = fotos[3]?.url_imagen || "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600";
  const f5 = fotos[4]?.url_imagen || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600";
  const f6 = fotos[5]?.url_imagen || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600";

  const precioFormateado = (inmueble?.tipo_negocio === "Alquiler" ? inmueble?.precio_alquiler : inmueble?.precio_venta)?.toLocaleString("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  // 🎨 CONFIGURADOR DE TEMAS REACT NATIVE (Traducción de Tailwind a StyleSheet Objects)
  const getThemeStyles = () => {
    switch (modeloSeleccionado) {
      case "MODELO_1": // Claro
        return {
          container: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1 },
          accentText: tonoTexto === "TONO_1" ? '#0284c7' : '#1d4ed8',
          badgeBg: tonoTexto === "TONO_1" ? '#0284c7' : '#1d4ed8',
          badgeText: '#ffffff',
          subCardBg: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1 },
          subTextColor: '#64748b',
          priceBg: tonoTexto === "TONO_1" ? '#0284c7' : '#1d4ed8',
          textColor: '#0f172a',
          shadowStyle: null
        };
      case "MODELO_2": // Azul Marino (Branding Mettryc)
        return {
          container: { backgroundColor: '#0c1e3e', borderColor: '#1e3a8a', borderWidth: 1 },
          accentText: tonoTexto === "TONO_1" ? '#ef4444' : '#38bdf8',
          badgeBg: tonoTexto === "TONO_1" ? '#dc2626' : '#0ea5e9',
          badgeText: '#ffffff',
          subCardBg: { backgroundColor: 'rgba(30,58,138,0.4)', borderColor: '#1e3a8a', borderWidth: 1 },
          subTextColor: tonoTexto === "TONO_1" ? '#fecaca' : '#bae6fd',
          priceBg: tonoTexto === "TONO_1" ? '#dc2626' : '#0ea5e9',
          textColor: '#ffffff',
          shadowStyle: null
        };
      case "MODELO_3": // 4 Fotos Fondo Nítido
      case "MODELO_6": // 6 Fotos Fondo Nítido
        return {
          container: { backgroundColor: '#020617', borderWidth: 0 },
          accentText: tonoTexto === "TONO_1" ? '#38bdf8' : '#fbbf24',
          badgeBg: tonoTexto === "TONO_1" ? '#0ea5e9' : '#f59e0b',
          badgeText: '#0f172a',
          subCardBg: { backgroundColor: 'transparent', borderWidth: 0 },
          subTextColor: '#f1f5f9',
          priceBg: tonoTexto === "TONO_1" ? '#0ea5e9' : '#f59e0b',
          textColor: '#ffffff',
          shadowStyle: { textShadowColor: 'rgba(0, 0, 0, 0.95)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }
        };
      case "MODELO_5": // Metálico Plata
        return {
          container: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', borderWidth: 1 },
          accentText: tonoTexto === "TONO_1" ? '#334155' : '#0369a1',
          badgeBg: tonoTexto === "TONO_1" ? '#1e293b' : '#0284c7',
          badgeText: '#ffffff',
          subCardBg: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 },
          subTextColor: '#64748b',
          priceBg: tonoTexto === "TONO_1" ? '#334155' : '#0369a1',
          textColor: '#0f172a',
          shadowStyle: null
        };
      case "MODELO_4": // Oscuro Original
      default:
        return {
          container: { backgroundColor: '#0f172a', borderWidth: 0 },
          accentText: tonoTexto === "TONO_1" ? '#38bdf8' : '#fbbf24',
          badgeBg: tonoTexto === "TONO_1" ? '#0ea5e9' : '#f59e0b',
          badgeText: '#0f172a',
          subCardBg: { backgroundColor: 'rgba(30,41,59,0.5)', borderColor: '#1e293b', borderWidth: 1 },
          subTextColor: '#94a3b8',
          priceBg: tonoTexto === "TONO_1" ? '#0ea5e9' : '#f59e0b',
          textColor: '#ffffff',
          shadowStyle: null
        };
    }
  };

  const theme = getThemeStyles();
  const isBackgroundModel = modeloSeleccionado === "MODELO_3" || modeloSeleccionado === "MODELO_6";

  return (
    <View style={styles.appContainer}>
      
      {/* HEADER DE CONTROL SUPERIOR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Estudio Gráfico RRSS</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* PANEL DE OPCIONES DE CONTROL (Scrollable para teléfonos pequeños) */}
        <View style={styles.controlPanel}>
          {/* Selector de Modelos Simulando un Botón (En Native se requiere Modal o Botones, usaremos Botones en fila scrollable) */}
          <Text style={styles.controlLabel}>1. SELECCIONAR MODELO (6 DISPONIBLES)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
            {["MODELO_1", "MODELO_2", "MODELO_3", "MODELO_4", "MODELO_5", "MODELO_6"].map((mod) => (
              <TouchableOpacity key={mod} onPress={() => setModeloSeleccionado(mod as ModeloFlyer)} style={[styles.modelBtn, modeloSeleccionado === mod && styles.modelBtnActive]}>
                <Text style={[styles.modelBtnText, modeloSeleccionado === mod && styles.modelBtnTextActive]}>
                  {mod.replace("MODELO_", "M")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.controlLabel}>2. TONOS DE COLORES</Text>
          <View style={styles.togglesRow}>
            <TouchableOpacity style={[styles.toggleBtn, tonoTexto === "TONO_1" && styles.toggleBtnActiveSky]} onPress={() => setTonoTexto("TONO_1")}>
              <Text style={[styles.toggleText, tonoTexto === "TONO_1" && styles.toggleTextActive]}>TONO PRIMARIO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, tonoTexto === "TONO_2" && styles.toggleBtnActiveSky]} onPress={() => setTonoTexto("TONO_2")}>
              <Text style={[styles.toggleText, tonoTexto === "TONO_2" && styles.toggleTextActive]}>TONO SECUNDARIO</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.controlLabel}>3. CONFIGURACIÓN DE MARCA</Text>
          <View style={styles.togglesRow}>
            <TouchableOpacity style={[styles.toggleBtn, !marcaBlanca && styles.toggleBtnActiveDark]} onPress={() => setMarcaBlanca(false)}>
              <Feather name="user-check" size={14} color={!marcaBlanca ? "#fff" : "#64748b"} />
              <Text style={[styles.toggleText, !marcaBlanca && styles.toggleTextActive]}>CON DATOS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, marcaBlanca && styles.toggleBtnActiveRose]} onPress={() => setMarcaBlanca(true)}>
              <Feather name="eye-off" size={14} color={marcaBlanca ? "#fff" : "#64748b"} />
              <Text style={[styles.toggleText, marcaBlanca && styles.toggleTextActive]}>MARCA BLANCA</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🌟 LONA MAESTRA DEL FLYER (Contenedor Exacto Cuadrado) */}
        <View style={styles.canvasWrapper}>
          <View ref={viewRef} collapsable={false} style={[styles.canvas, theme.container]}>
            
            {/* 📸 FONDOS FOTOGRÁFICOS CONDICIONALES PARA M3 Y M6 */}
            {isBackgroundModel && (
              <View style={StyleSheet.absoluteFill}>
                {modeloSeleccionado === "MODELO_3" ? (
                  <View style={styles.bgGrid2x2}>
                     <Image source={{uri: f1}} style={styles.bgImg} />
                     <Image source={{uri: f2}} style={styles.bgImg} />
                     <Image source={{uri: f3}} style={styles.bgImg} />
                     <Image source={{uri: f4}} style={styles.bgImg} />
                  </View>
                ) : (
                  <View style={styles.bgGrid3x2}>
                     <Image source={{uri: f1}} style={styles.bgImg3} />
                     <Image source={{uri: f2}} style={styles.bgImg3} />
                     <Image source={{uri: f3}} style={styles.bgImg3} />
                     <Image source={{uri: f4}} style={styles.bgImg3} />
                     <Image source={{uri: f5}} style={styles.bgImg3} />
                     <Image source={{uri: f6}} style={styles.bgImg3} />
                  </View>
                )}
              </View>
            )}

            {/* SECCIÓN A: HEADER DEL FLYER */}
            <View style={[styles.fHeader, isBackgroundModel ? { backgroundColor: 'transparent' } : null]}>
              <View style={styles.fHeaderData}>
                <View style={styles.fBadges}>
                  <View style={[styles.fBadge, {backgroundColor: theme.badgeBg}]}>
                    <Text style={[styles.fBadgeText, {color: theme.badgeText}]}>{inmueble?.tipo_negocio?.toUpperCase() || "VENTA"}</Text>
                  </View>
                  <Text style={[styles.fBadgeRef, {color: theme.subTextColor}, theme.shadowStyle]}>REF: {inmueble?.codigo_interno}</Text>
                </View>
                <Text style={[styles.fTitle, {color: theme.textColor}, theme.shadowStyle]}>{inmueble?.titulo?.toUpperCase()}</Text>
                <Text style={[styles.fLocation, {color: theme.subTextColor}, theme.shadowStyle]}>📍 {inmueble?.zona_resumida}</Text>
              </View>
              {!marcaBlanca && (
                <View style={[styles.fLogoWrapper, isBackgroundModel && { backgroundColor: 'rgba(255,255,255,0.1)', padding: 4, borderRadius: 8 }]}>
                  {/* IMPORTANTE: Logo extraído de assets locales de Expo */}
                  <Image source={require('../../../assets/images/logomettryc.png')} style={styles.fLogoMettryc} />
                </View>
              )}
            </View>

            {/* SECCIÓN B: COLLAGES INTERNOS PARA M1, M2, M4 y M5 */}
            {!isBackgroundModel && (
              <View style={styles.fCollageBlock}>
                {modeloSeleccionado === "MODELO_5" ? (
                  // Grid Especial de 5 Fotos para el Modelo 5
                  <View style={{flex: 1, flexDirection: 'row', gap: 5}}>
                    <View style={{flex: 2, borderRadius: 10, overflow: 'hidden', position: 'relative'}}>
                      <Image source={{uri: f1}} style={StyleSheet.absoluteFill} />
                      <View style={styles.fPriceFloatBox}><Text style={[styles.fPriceFloatText, {backgroundColor: theme.priceBg}]}>{precioFormateado}</Text></View>
                    </View>
                    <View style={{flex: 1, gap: 5}}>
                      <Image source={{uri: f2}} style={{flex: 1, borderRadius: 8}} />
                      <Image source={{uri: f3}} style={{flex: 1, borderRadius: 8}} />
                      <Image source={{uri: f4}} style={{flex: 1, borderRadius: 8}} />
                    </View>
                  </View>
                ) : (
                  // Grid Clásico de 4 Fotos (Principal grande + 3 minis a la derecha)
                  <View style={{flex: 1, flexDirection: 'row', gap: 6}}>
                    <View style={{flex: 2, borderRadius: 12, overflow: 'hidden', position: 'relative'}}>
                      <Image source={{uri: f1}} style={StyleSheet.absoluteFill} />
                      <View style={styles.fPriceDarkOverlay}>
                         <View style={[styles.fPricePill, {backgroundColor: theme.priceBg}]}>
                            <Text style={styles.fPriceFloatText}>{precioFormateado}</Text>
                         </View>
                      </View>
                    </View>
                    <View style={{flex: 1, gap: 6}}>
                      <Image source={{uri: f2}} style={{flex: 1, borderRadius: 8}} />
                      <View style={{flex: 1, flexDirection: 'row', gap: 6}}>
                        <Image source={{uri: f3}} style={{flex: 1, borderRadius: 8}} />
                        <Image source={{uri: f4}} style={{flex: 1, borderRadius: 8}} />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* PRECIO CENTRAL FLOTANTE (Solo para M3 y M6 que tienen fondo fotográfico completo) */}
            {isBackgroundModel && (
              <View style={styles.fCenterPriceContainer}>
                 <Text style={[styles.fCenterPriceText, {backgroundColor: theme.priceBg}]}>{precioFormateado}</Text>
              </View>
            )}

            {/* SECCIÓN C & D: FOOTER FLOTANTE */}
            <View style={styles.fFooterBlock}>
              
              {/* Matriz Técnica */}
              <View style={[styles.fMatrix, theme.subCardBg]}>
                <View style={[styles.fMatrixItem, {borderRightColor: theme.container.borderColor || 'rgba(255,255,255,0.1)'}]}>
                   <Feather name="maximize" size={13} color={theme.accentText} style={theme.shadowStyle} />
                   <Text style={[styles.fMatrixVal, {color: theme.accentText}, theme.shadowStyle]}>{inmueble?.area_construida || 0} m²</Text>
                   <Text style={[styles.fMatrixLab, {color: theme.subTextColor}, theme.shadowStyle]}>ÁREA</Text>
                </View>
                <View style={[styles.fMatrixItem, {borderRightColor: theme.container.borderColor || 'rgba(255,255,255,0.1)'}]}>
                   <FontAwesome5 name="bed" size={13} color={theme.accentText} style={theme.shadowStyle} />
                   <Text style={[styles.fMatrixVal, {color: theme.accentText}, theme.shadowStyle]}>{inmueble?.habitaciones || 0}</Text>
                   <Text style={[styles.fMatrixLab, {color: theme.subTextColor}, theme.shadowStyle]}>HABS</Text>
                </View>
                <View style={[styles.fMatrixItem, {borderRightColor: theme.container.borderColor || 'rgba(255,255,255,0.1)'}]}>
                   <FontAwesome5 name="bath" size={13} color={theme.accentText} style={theme.shadowStyle} />
                   <Text style={[styles.fMatrixVal, {color: theme.accentText}, theme.shadowStyle]}>{Number(inmueble?.banos || 0) + (inmueble?.medio_bano ? 0.5 : 0)}</Text>
                   <Text style={[styles.fMatrixLab, {color: theme.subTextColor}, theme.shadowStyle]}>BAÑOS</Text>
                </View>
                <View style={styles.fMatrixItem}>
                   <FontAwesome5 name="car" size={13} color={theme.accentText} style={theme.shadowStyle} />
                   <Text style={[styles.fMatrixVal, {color: theme.accentText}, theme.shadowStyle]}>{inmueble?.estacionamientos || 0}</Text>
                   <Text style={[styles.fMatrixLab, {color: theme.subTextColor}, theme.shadowStyle]}>PUESTOS</Text>
                </View>
              </View>

              {/* Firma y Contacto */}
              <View style={[styles.fContactBar, {borderTopColor: theme.container.borderColor || 'rgba(255,255,255,0.1)'}]}>
                
                {/* IZQUIERDA: Marca o Asesor */}
                {marcaBlanca ? (
                  <View style={styles.fAgentRow}>
                    <Feather name="shield" size={16} color={theme.accentText} style={theme.shadowStyle} />
                    <View style={styles.fAgentTextCol}>
                       <Text style={[styles.fSystemBrand, {color: theme.subTextColor}, theme.shadowStyle]}>INVENTARIO ALIANZA</Text>
                       <Text style={[styles.fAgentName, {color: theme.textColor}, theme.shadowStyle]}>PROPIEDAD DISPONIBLE</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.fAgentRow}>
                    {asesor?.foto ? (
                      <Image source={{uri: asesor.foto}} style={styles.fAgentPic} />
                    ) : (
                      <View style={styles.fAgentPicPh}><Text style={{fontSize: 10}}>👤</Text></View>
                    )}
                    <View style={styles.fAgentTextCol}>
                       <Text style={[styles.fSystemBrand, {color: theme.subTextColor}, theme.shadowStyle]}>ASESOR INMOBILIARIO</Text>
                       <Text style={[styles.fAgentName, {color: theme.textColor}, theme.shadowStyle]}>{asesor?.nombre_completo || "SIN ASIGNAR"}</Text>
                       <Text style={[styles.fAgentPhone, {color: theme.accentText}, theme.shadowStyle]}>{asesor?.celular_1 || "CONTACTO OFICIAL"}</Text>
                    </View>
                  </View>
                )}

                {/* DERECHA: Firma del Sistema */}
                <View style={{alignItems: 'flex-end'}}>
                   <Text style={[styles.fSystemBrand, {color: theme.subTextColor}, theme.shadowStyle]}>INMOTECH ERP</Text>
                   <Text style={[styles.fSystemSub, {color: theme.subTextColor}, theme.shadowStyle]}></Text>
                </View>

              </View>

            </View>

          </View>
        </View>

      </ScrollView>

      {/* BOTÓN FLOTANTE DE DESCARGA */}
      <View style={styles.bottomControl}>
        <TouchableOpacity style={styles.btnDownload} onPress={descargarFlyer} disabled={isExporting}>
          {isExporting ? <ActivityIndicator color="#fff" /> : <Feather name="share" size={20} color="#fff" />}
          <Text style={styles.btnDownloadText}>{isExporting ? "PROCESANDO LONA..." : "DESCARGAR FLYER HD"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#f1f5f9', paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 12, fontWeight: '800', color: '#64748b' },
  
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  btnBack: { width: 40, height: 40, backgroundColor: '#e2e8f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  topBarTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },

  controlPanel: { backgroundColor: '#fff', marginHorizontal: 20, padding: 15, borderRadius: 20, marginBottom: 20 },
  controlLabel: { fontSize: 10, fontWeight: '900', color: '#64748b', marginBottom: 8, marginTop: 5 },
  
  modelBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  modelBtnActive: { backgroundColor: '#0ea5e9', borderColor: '#0284c7' },
  modelBtnText: { fontSize: 10, fontWeight: '800', color: '#475569' },
  modelBtnTextActive: { color: '#fff' },

  togglesRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  toggleBtnActiveSky: { backgroundColor: '#e0f2fe', borderColor: '#38bdf8' },
  toggleBtnActiveDark: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  toggleBtnActiveRose: { backgroundColor: '#fff1f2', borderColor: '#f43f5e' },
  toggleText: { fontSize: 9, fontWeight: '900', color: '#64748b' },
  toggleTextActive: { color: '#0f172a' },

  // --- LONA MAESTRA ---
  canvasWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 100 },
  canvas: { 
    width: 360, height: 360, 
    padding: 12, justifyContent: 'space-between', overflow: 'hidden'
  },
  
  // Fondos
  bgGrid2x2: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  bgImg: { width: '50%', height: '50%', resizeMode: 'cover' },
  bgGrid3x2: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  bgImg3: { width: '33.33%', height: '50%', resizeMode: 'cover' },

  // Header Flyer
  fHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 },
  fHeaderData: { flex: 1, paddingRight: 6 },
  fBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  fBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fBadgeText: { fontSize: 8, fontWeight: '900' },
  fBadgeRef: { fontSize: 8, fontWeight: '800' },
  fTitle: { fontSize: 13, fontWeight: '900', lineHeight: 15, flexShrink: 1, width: '100%' },
  fLocation: { fontSize: 8, fontWeight: '700', marginTop: 3 },
  fLogoWrapper: { alignItems: 'flex-end',width: 60 },
  fLogoMettryc: { width: 60, height: 26, resizeMode: 'contain' },

  // Centro
  fCollageBlock: { height: 160, marginVertical: 8, zIndex: 10 },
  fPriceDarkOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 8 },
  fPricePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  fPriceFloatBox: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, alignItems: 'flex-start' },
  fPriceFloatText: { color: '#fff', fontSize: 14, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  
  fCenterPriceContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  fCenterPriceText: { color: '#fff', fontSize: 20, fontWeight: '900', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset:{width:0, height:4}, shadowOpacity:0.5, shadowRadius:5, elevation:5 },

  // Footer / Matrix
  fFooterBlock: { zIndex: 10, gap: 8 },
  fMatrix: { flexDirection: 'row', padding: 6, borderRadius: 10 },
  fMatrixItem: { flex: 1, alignItems: 'center', borderRightWidth: 1 },
  fMatrixVal: { fontSize: 11, fontWeight: '900', marginTop: 2 },
  fMatrixLab: { fontSize: 7, fontWeight: '800', marginTop: 1 },

  fContactBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 6 },
  fAgentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fAgentPic: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#fff' },
  fAgentPicPh: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  fAgentTextCol: { justifyContent: 'center' },
  fSystemBrand: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  fAgentName: { fontSize: 10, fontWeight: '900' },
  fAgentPhone: { fontSize: 9, fontWeight: '800' },
  fSystemSub: { fontSize: 6, fontWeight: '700', marginTop: 1 },

  // Botón Principal
  bottomControl: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  btnDownload: { backgroundColor: '#0f172a', paddingVertical: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width:0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  btnDownloadText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});