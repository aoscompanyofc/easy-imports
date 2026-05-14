import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Vendas } from '../pages/Vendas';
import { Estoque } from '../pages/Estoque';
import { Clientes } from '../pages/Clientes';
import { Leads } from '../pages/Leads';
import { Financeiro } from '../pages/Financeiro';
import { Fornecedores } from '../pages/Fornecedores';
import { Marketing } from '../pages/Marketing';
import { Relatorios } from '../pages/Relatorios';
import { Documentacao } from '../pages/Documentacao';
import { Configuracoes } from '../pages/Configuracoes';
import { Assinar } from '../pages/Assinar';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Public signing page — no auth required */}
      <Route path="/assinar/:token" element={<Assinar />} />
      
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/fornecedores" element={<Fornecedores />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/documentacao" element={<Documentacao />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        
        {/* Default route redirect to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
