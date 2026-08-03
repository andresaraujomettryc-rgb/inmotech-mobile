import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase'; // Ajusta la ruta a tu cliente supabase

export default function MiPerfilMobileScreen() {
  
  // 🛡️ ESTADO DE AUTENTICACIÓN REAL
  const [authPerfil, setAuthPerfil] = useState<any>(null);

  // 💾 Estados del Formulario y Carga
  const [loadingData, setLoadingData] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre_completo: "", email: "", celular_1: "", acepta_whatsapp: false,
    foto: "", biografia: "", url_ig: "", url_face: "", url_tiktok: "",
    linkedin: "", link_calendario: ""
  });

  // 🔐 Estados para Cambio de Contraseña
  const [passwordData, setPasswordData] = useState({ nueva: "", confirmar: "" });
  const [passMensaje, setPassMensaje] = useState({ texto: "", tipo: "" });

  // =====================================================================
  // 🧠 1. MOTOR DE ARRANQUE: Extraer Usuario Logeado y sus Datos
  // =====================================================================
  useEffect(() => {
    const cargarPerfilDesdeBD = async () => {
      try {
        setLoadingData(true);
        
        // A. ¿Quién está usando el teléfono?
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authData?.user) {
          throw new Error("No hay sesión activa");
        }

        const userId = authData.user.id;
        const userEmail = authData.user.email;

        // B. Extraemos la Ficha Técnica cruzando con Oficinas
        const { data, error } = await supabase
          .from("usuarios")
          .select(`
            id_usuario, nombre_completo, email, celular_1, acepta_whatsapp, 
            foto, biografia, url_ig, url_face, url_tiktok, linkedin, link_calendario,
            id_oficina,
            oficinas ( nombre_oficina )
          `)
          .eq("id_usuario", userId)
          .single();

        if (error) throw error;

        if (data) {
          // Guardamos los datos de contexto (IDs y Oficina)
          setAuthPerfil({
            id_usuario: data.id_usuario,
            oficinas: data.oficinas
          });

          // Inyectamos la data en el Formulario Visual
          setFormData({
            nombre_completo: data.nombre_completo || "", 
            email: data.email || userEmail || "", 
            celular_1: data.celular_1 || "",
            acepta_whatsapp: data.acepta_whatsapp || false, 
            foto: data.foto || "", 
            biografia: data.biografia || "",
            url_ig: data.url_ig || "", 
            url_face: data.url_face || "", 
            url_tiktok: data.url_tiktok || "",
            linkedin: data.linkedin || "", 
            link_calendario: data.link_calendario || ""
          });
        }
      } catch (err) {
        console.error("🚨 Error conectando al perfil:", err);
        Alert.alert("Error de Conexión", "No pudimos sincronizar tu perfil con la base de datos.");
      } finally {
        setLoadingData(false);
      }
    };

    cargarPerfilDesdeBD();
  }, []);

  // Handlers genéricos
  const handleChange = (campo: string, valor: any) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };

  // =====================================================================
  // 📸 2. MOTOR NATIVO: Cámara / Galería -> Supabase Storage
  // =====================================================================
  const seleccionarYSubirFoto = async () => {
    if (!authPerfil?.id_usuario) return;

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería para cambiar la foto.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSubiendoFoto(true);

      try {
        const fileExt = uri.split('.').pop() || 'jpg';
        // Usamos el ID del usuario real para nombrar la foto
        const fileName = `${authPerfil.id_usuario}-${Date.now()}.${fileExt}`;
        
        // Creamos FormData compatible con React Native
        const fileData = new FormData();
        fileData.append('file', { uri, name: fileName, type: `image/${fileExt}` } as any);

        const { error: uploadError } = await supabase.storage
          .from('usuarios_fotos')
          .upload(fileName, fileData);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('usuarios_fotos').getPublicUrl(fileName);
        
        // Actualizamos el estado visual
        setFormData(prev => ({ ...prev, foto: publicUrl }));
        Alert.alert("Éxito", "Fotografía actualizada correctamente. Recuerda presionar GUARDAR.");
      } catch (error) {
        console.error("Error subiendo foto:", error);
        Alert.alert("Error", "Hubo un problema al subir la fotografía a la nube.");
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  // =====================================================================
  // 💾 3. SINCRONIZACIÓN DE CAMBIOS A LA BASE DE DATOS
  // =====================================================================
  const handleGuardarPerfil = async () => {
    if (!authPerfil?.id_usuario) return;
    
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre_completo: formData.nombre_completo, 
          celular_1: formData.celular_1, 
          acepta_whatsapp: formData.acepta_whatsapp,
          foto: formData.foto, 
          biografia: formData.biografia, 
          url_ig: formData.url_ig, 
          url_face: formData.url_face,
          url_tiktok: formData.url_tiktok, 
          linkedin: formData.linkedin, 
          link_calendario: formData.link_calendario
        })
        .eq('id_usuario', authPerfil.id_usuario);

      if (error) throw error;
      Alert.alert("✅ Perfil Sincronizado", "Tus datos han sido actualizados con éxito en InmoTech.");
    } catch (error) {
      console.error("Error guardando perfil:", error);
      Alert.alert("Fallo Core", "No se pudieron actualizar los campos en la base de datos.");
    } finally {
      setGuardando(false);
    }
  };

  // =====================================================================
  // 🔐 4. CAMBIO DE CLAVE (SUPABASE AUTH)
  // =====================================================================
  const handleCambiarClave = async () => {
    if (passwordData.nueva.length < 6) {
      setPassMensaje({ texto: "Mínimo 6 caracteres", tipo: "error" });
      return;
    }
    if (passwordData.nueva !== passwordData.confirmar) {
      setPassMensaje({ texto: "Las contraseñas no coinciden", tipo: "error" });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.nueva });
      if (error) throw error;
      setPassMensaje({ texto: "¡Clave blindada!", tipo: "exito" });
      setPasswordData({ nueva: "", confirmar: "" });
      setTimeout(() => setPassMensaje({ texto: "", tipo: "" }), 3000);
    } catch (error: any) {
      setPassMensaje({ texto: error.message || "Error al cambiar", tipo: "error" });
    }
  };

  if (loadingData) return <View style={styles.center}><ActivityIndicator size="large" color="#0ea5e9"/><Text style={styles.loadingText}>Sincronizando Identidad...</Text></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* 👑 ENCABEZADO DE MÓDULO */}
        <View style={styles.headerGlass}>
          <View style={styles.headerInfo}>
            <View style={styles.iconWrapTop}>
              <Feather name="user" size={24} color="#0ea5e9" />
            </View>
            <View>
              <Text style={styles.mainTitle}>Mi Perfil Operativo</Text>
              <Text style={styles.subTitle}>CORE ENTERPRISE PERSONAL</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.btnSaveTop} onPress={handleGuardarPerfil} disabled={guardando || subiendoFoto}>
            {guardando ? <ActivityIndicator size="small" color="#fff"/> : <><Feather name="save" size={14} color="#fff" /><Text style={styles.btnSaveTextTop}>GUARDAR</Text></>}
          </TouchableOpacity>
        </View>

        {/* TARJETA 1: IDENTIDAD VISUAL */}
        <View style={styles.card}>
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={seleccionarYSubirFoto} disabled={subiendoFoto} style={styles.avatarWrap}>
              {subiendoFoto ? (
                <View style={[styles.avatarImg, styles.center]}><ActivityIndicator size="large" color="#0ea5e9"/></View>
              ) : formData.foto ? (
                <Image source={{ uri: formData.foto }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarImg, styles.avatarPlaceholder]}><Feather name="user" size={40} color="#cbd5e1" /></View>
              )}
              <View style={styles.avatarOverlay}><Feather name="camera" size={16} color="#fff" /></View>
            </TouchableOpacity>
            
            <Text style={styles.agentName}>{formData.nombre_completo || "Asesor InmoTech"}</Text>
            
            {/* INYECTANDO EL NOMBRE DE LA OFICINA REAL DESDE EL JOIN */}
            <View style={styles.officeBadge}>
              <Text style={styles.officeText}>
                {authPerfil?.oficinas?.nombre_oficina || "Sede Master"}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}><Feather name="file-text" size={12} color="#0ea5e9"/> BIO CORPORATIVA</Text>
          <TextInput
            style={[styles.inputBox, { height: 90, paddingTop: 12 }]}
            multiline
            placeholder="Escribe tu trayectoria para las fichas técnicas..."
            placeholderTextColor="#94a3b8"
            value={formData.biografia}
            onChangeText={(t) => handleChange('biografia', t)}
          />
        </View>

        {/* TARJETA 2: LÍNEAS DE COMUNICACIÓN */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}><Feather name="phone" size={12} color="#0ea5e9"/> COMUNICACIÓN</Text>
          
          <Text style={styles.inputLabel}>Nombre Público</Text>
          <TextInput style={styles.inputBox} value={formData.nombre_completo} onChangeText={(t) => handleChange('nombre_completo', t)} />

          <Text style={styles.inputLabel}>Core Email (No Editable)</Text>
          <TextInput style={[styles.inputBox, styles.inputDisabled]} value={formData.email} editable={false} />

          <Text style={styles.inputLabel}>Teléfono Principal</Text>
          <TextInput style={styles.inputBox} value={formData.celular_1} onChangeText={(t) => handleChange('celular_1', t)} keyboardType="phone-pad" placeholder="+58 414 1234567" />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}><FontAwesome5 name="whatsapp" size={12} color="#10b981" /> Recibir Leads por WhatsApp</Text>
              <Text style={styles.switchDesc}>Activa el botón de chat en tus fichas públicas.</Text>
            </View>
            <Switch value={formData.acepta_whatsapp} onValueChange={(v) => handleChange('acepta_whatsapp', v)} trackColor={{ true: '#10b981', false: '#e2e8f0' }} />
          </View>
        </View>

        {/* TARJETA 3: REDES SOCIALES */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}><Feather name="globe" size={12} color="#4f46e5"/> PRESENCIA DIGITAL</Text>
          
          <Text style={styles.inputLabel}><Feather name="instagram" size={10} color="#ec4899"/> INSTAGRAM URL</Text>
          <TextInput style={styles.inputBox} value={formData.url_ig} onChangeText={(t) => handleChange('url_ig', t)} placeholder="instagram.com/usuario" autoCapitalize="none" />

          <Text style={styles.inputLabel}><Feather name="facebook" size={10} color="#3b82f6"/> FACEBOOK URL</Text>
          <TextInput style={styles.inputBox} value={formData.url_face} onChangeText={(t) => handleChange('url_face', t)} placeholder="facebook.com/usuario" autoCapitalize="none" />

          <Text style={styles.inputLabel}><Feather name="tv" size={10} color="#0f172a"/> TIKTOK URL</Text>
          <TextInput style={styles.inputBox} value={formData.url_tiktok} onChangeText={(t) => handleChange('url_tiktok', t)} placeholder="tiktok.com/@usuario" autoCapitalize="none" />

          <Text style={styles.inputLabel}><Feather name="briefcase" size={10} color="#0284c7"/> LINKEDIN URL</Text>
          <TextInput style={styles.inputBox} value={formData.linkedin} onChangeText={(t) => handleChange('linkedin', t)} placeholder="linkedin.com/in/usuario" autoCapitalize="none" />

          <Text style={styles.inputLabel}><Feather name="calendar" size={10} color="#0ea5e9"/> AGENDA CALENDLY</Text>
          <TextInput style={styles.inputBox} value={formData.link_calendario} onChangeText={(t) => handleChange('link_calendario', t)} placeholder="https://calendly.com/..." autoCapitalize="none" />
        </View>

        {/* TARJETA 4: BÓVEDA DE SEGURIDAD */}
        <View style={[styles.card, styles.cardSecurity]}>
          <View style={styles.securityHeader}>
            <Text style={styles.sectionLabelSecurity}><Feather name="lock" size={12} color="#f43f5e"/> SEGURIDAD</Text>
            {passMensaje.texto ? <Text style={[styles.msgSecurity, passMensaje.tipo==='error' ? {color: '#f43f5e'} : {color: '#10b981'}]}>{passMensaje.texto}</Text> : null}
          </View>

          <Text style={styles.inputLabel}>Nueva Clave</Text>
          <TextInput style={[styles.inputBox, styles.inputSecurity]} value={passwordData.nueva} onChangeText={(t) => setPasswordData({...passwordData, nueva: t})} secureTextEntry placeholder="••••••••" />

          <Text style={styles.inputLabel}>Repetir Clave</Text>
          <TextInput style={[styles.inputBox, styles.inputSecurity]} value={passwordData.confirmar} onChangeText={(t) => setPasswordData({...passwordData, confirmar: t})} secureTextEntry placeholder="••••••••" />

          <TouchableOpacity style={styles.btnSecurity} onPress={handleCambiarClave}>
            <Text style={styles.btnSecurityText}>ACTUALIZAR CONTRASEÑA</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 50, paddingTop: Platform.OS === 'ios' ? 60 : 35 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 11, fontWeight: '900', color: '#64748b', marginTop: 10, letterSpacing: 1, textTransform: 'uppercase' },
  
  // Header
  headerGlass: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 24, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapTop: { width: 42, height: 42, backgroundColor: '#f0f9ff', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e0f2fe' },
  mainTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subTitle: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginTop: 2 },
  btnSaveTop: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  btnSaveTextTop: { color: '#ffffff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // Cards
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 15, elevation: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 1, marginBottom: 15 },
  
  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrap: { position: 'relative', width: 110, height: 110, borderRadius: 30, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 30, resizeMode: 'cover', borderWidth: 2, borderColor: '#fff' },
  avatarPlaceholder: { backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  avatarOverlay: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#0f172a', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  agentName: { fontSize: 16, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  officeBadge: { backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#e0f2fe', marginTop: 6 },
  officeText: { fontSize: 9, fontWeight: '900', color: '#0369a1', letterSpacing: 1, textTransform: 'uppercase' },

  // Forms
  inputLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginLeft: 4, marginTop: 10 },
  inputBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  
  // Switches
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14, marginTop: 15 },
  switchTitle: { fontSize: 11, fontWeight: '800', color: '#1e293b' },
  switchDesc: { fontSize: 9, color: '#64748b', marginTop: 2 },

  // Security
  cardSecurity: { borderLeftWidth: 4, borderLeftColor: '#f43f5e', backgroundColor: '#fff5f5' },
  securityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionLabelSecurity: { fontSize: 10, fontWeight: '900', color: '#e11d48', letterSpacing: 1 },
  msgSecurity: { fontSize: 9, fontWeight: '800' },
  inputSecurity: { backgroundColor: '#ffffff', borderColor: '#fecdd3' },
  btnSecurity: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecdd3', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  btnSecurityText: { color: '#e11d48', fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});