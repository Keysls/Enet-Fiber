import React from 'react';
import { CuentasDeSede } from './Secretarios';

// Supervisores de técnicos de la sede (los crea y gestiona el administrador)
export default function SupervisoresPage() {
  return <CuentasDeSede tipo="supervisor" />;
}
