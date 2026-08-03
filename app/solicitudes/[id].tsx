import RadarFormMobile from '@/components/RadarFormMobile';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function EditarSolicitudMobile() {
  const { id } = useLocalSearchParams();
  return <RadarFormMobile idSolicitud={id as string} />;
}