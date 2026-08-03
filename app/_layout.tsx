import { Stack } from 'expo-router';
import React from 'react';


export default function RootLayout() {
  return (
    // El Stack es el controlador maestro que apila las pantallas
    <Stack screenOptions={{ headerShown: false }}>
      
      {/* 1. LA PUERTA DE ENTRADA (Nuestra pantalla app/index.tsx) */}
      <Stack.Screen name="index" />
      
      {/* 2. LA BÓVEDA INTERNA (Nuestra carpeta app/(tabs)) */}
      <Stack.Screen name="(tabs)" />

    </Stack>
  );
}