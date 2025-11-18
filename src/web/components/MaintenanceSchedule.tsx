// src/web/components/MaintenanceSchedule.tsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar } from 'react-icons/fi';
import { theme } from '../styles/theme';
import type { CronogramaDTO } from '../../types/effort';

interface MaintenanceScheduleProps {
  data: CronogramaDTO[];
  isLoading: boolean;
  allowedSectors?: number[];
  filterBySector?: (data: CronogramaDTO[]) => CronogramaDTO[];
  isAdmin?: boolean;
}

export default function MaintenanceSchedule({ 
  data, 
  isLoading, 
  allowedSectors,
  filterBySector,
  isAdmin = false 
}: MaintenanceScheduleProps) {
  // Filtrar dados por setor se necessário
  const dataFiltrada = useMemo(() => {
    if (!data) return [];
    if (isAdmin) return data;
    if (filterBySector) return filterBySector(data);
    return data;
  }, [data, isAdmin, filterBySector]);

  // Criar matriz Setor x Mês
  const matrizSetorMes = useMemo(() => {
    if (!dataFiltrada || dataFiltrada.length === 0) {
      return { setores: [], meses: [], matriz: {} };
    }

    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const setoresUnicos = Array.from(new Set(dataFiltrada.map(item => item.Setor).filter(Boolean))).sort();
    
    // Estrutura: { setor: { mes: Set<tipos> } }
    const matriz: Record<string, Record<number, Set<string>>> = {};
    
    setoresUnicos.forEach(setor => {
      matriz[setor] = {};
      for (let i = 1; i <= 12; i++) {
        matriz[setor][i] = new Set<string>();
      }
    });

    // Processar cada registro
    dataFiltrada.forEach((item) => {
      const setor = item.Setor;
      if (!setor) return;

      // Processar ProximaRealizacao
      if (item.ProximaRealizacao) {
        try {
          const dataProxima = new Date(item.ProximaRealizacao);
          if (!isNaN(dataProxima.getTime())) {
            const mes = dataProxima.getMonth() + 1;
            if (matriz[setor] && matriz[setor][mes]) {
              if (item.TipoDeManutencao) {
                matriz[setor][mes].add(item.TipoDeManutencao);
              }
            }
          }
        } catch (e) {
          // Ignorar erros de parsing
        }
      }

      // Processar DataDaUltima
      if (item.DataDaUltima) {
        try {
          const dataUltima = new Date(item.DataDaUltima);
          if (!isNaN(dataUltima.getTime())) {
            const mes = dataUltima.getMonth() + 1;
            if (matriz[setor] && matriz[setor][mes]) {
              if (item.TipoDeManutencao) {
                matriz[setor][mes].add(item.TipoDeManutencao);
              }
            }
          }
        } catch (e) {
          // Ignorar erros de parsing
        }
      }
    });

    return {
      setores: setoresUnicos,
      meses: mesesNomes.map((nome, index) => ({ nome, numero: index + 1 })),
      matriz,
    };
  }, [dataFiltrada]);

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
        }}
      >
        <h3
          style={{
            margin: `0 0 ${theme.spacing.md} 0`,
            fontSize: '20px',
            fontWeight: 600,
            color: theme.colors.dark,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <FiCalendar size={24} color={theme.colors.primary} />
          Cronograma de Manutenção
        </h3>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (!dataFiltrada || dataFiltrada.length === 0 || matrizSetorMes.setores.length === 0) {
    return (
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          boxShadow: theme.shadows.md,
        }}
      >
        <h3
          style={{
            margin: `0 0 ${theme.spacing.md} 0`,
            fontSize: '20px',
            fontWeight: 600,
            color: theme.colors.dark,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <FiCalendar size={24} color={theme.colors.primary} />
          Cronograma de Manutenção
        </h3>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
          Nenhum cronograma encontrado.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        boxShadow: theme.shadows.md,
        overflowX: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: theme.colors.dark,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <FiCalendar size={24} color={theme.colors.primary} />
          Cronograma de Manutenção
        </h3>
        <Link
          to="/cronograma"
          style={{
            color: theme.colors.primary,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          Ver completo →
        </Link>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
          <thead>
            <tr style={{ backgroundColor: theme.colors.gray[50], borderBottom: `2px solid ${theme.colors.gray[300]}` }}>
              <th
                style={{
                  padding: theme.spacing.sm,
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: theme.colors.gray[700],
                  position: 'sticky',
                  left: 0,
                  backgroundColor: theme.colors.gray[50],
                  zIndex: 10,
                  minWidth: '150px',
                }}
              >
                Setor
              </th>
              {matrizSetorMes.meses.map((mes) => (
                <th
                  key={mes.numero}
                  style={{
                    padding: theme.spacing.sm,
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: theme.colors.gray[700],
                    minWidth: '60px',
                  }}
                >
                  {mes.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrizSetorMes.setores.map((setor) => (
              <tr
                key={setor}
                style={{
                  borderBottom: `1px solid ${theme.colors.gray[100]}`,
                }}
              >
                <td
                  style={{
                    padding: theme.spacing.sm,
                    fontSize: '13px',
                    fontWeight: 600,
                    position: 'sticky',
                    left: 0,
                    backgroundColor: theme.colors.white,
                    zIndex: 5,
                  }}
                >
                  {setor}
                </td>
                {matrizSetorMes.meses.map((mes) => {
                  const tipos = matrizSetorMes.matriz[setor]?.[mes.numero] || new Set<string>();
                  const temManutencao = tipos.size > 0;
                  const tiposArray = Array.from(tipos);
                  
                  return (
                    <td
                      key={mes.numero}
                      style={{
                        padding: theme.spacing.xs,
                        textAlign: 'center',
                        backgroundColor: temManutencao ? `${theme.colors.info}15` : 'transparent',
                        border: temManutencao ? `1px solid ${theme.colors.info}30` : 'none',
                      }}
                      title={temManutencao ? `Tipos: ${tiposArray.join(', ')}` : 'Sem manutenções'}
                    >
                      {temManutencao && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: theme.colors.info,
                            }}
                          />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

