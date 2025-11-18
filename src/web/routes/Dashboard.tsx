import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiCalendar, FiFileText, FiUser, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getResponsivePadding } from '../utils/responsive';
import { apiClient } from '../lib/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import AvailabilityPieChart from '../components/AvailabilityPieChart';
import EquipmentInMaintenanceList from '../components/EquipmentInMaintenanceList';
import MaintenanceSchedule from '../components/MaintenanceSchedule';
import InvestmentsList from '../components/InvestmentsList';
import { getSectorNamesFromIds } from '../utils/sectorMapping';
import { formatBrazilianDate, formatBrazilianDateTime } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import type { CronogramaDTO } from '../../types/effort';

export default function Dashboard() {
  const { allowedSectors, isAdmin, filterBySector } = usePermissions();
  const isMobile = useIsMobile();
  const padding = getResponsivePadding(isMobile, false);

  // Debug: verificar setores permitidos
  useEffect(() => {
    logger.debug('Dashboard carregado', { isAdmin, allowedSectors });
  }, [isAdmin, allowedSectors]);

  // Construir query string para setores se não for admin
  const setoresQuery = !isAdmin && allowedSectors.length > 0
    ? allowedSectors.join(',')
    : undefined;

  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: ['dashboard', 'availability', setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/dashboard/availability?setores=${setoresQuery}`
        : '/api/dashboard/availability';
      return apiClient.get(url);
    },
  });

  const { data: equipmentInMaintenanceData, isLoading: equipmentInMaintenanceLoading } = useQuery({
    queryKey: ['dashboard', 'equipment-in-maintenance', setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/dashboard/equipment-in-maintenance?setores=${setoresQuery}&limit=10`
        : '/api/dashboard/equipment-in-maintenance?limit=10';
      return apiClient.get(url);
    },
  });

  // Buscar alertas de equipamentos críticos/monitorados com OS
  const { data: criticalMonitoredAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['dashboard', 'critical-monitored-alerts', setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/dashboard/critical-monitored-alerts?setores=${setoresQuery}`
        : '/api/dashboard/critical-monitored-alerts';
      return apiClient.get(url);
    },
  });

  // Buscar últimas rondas (mesma lógica da página de rondas)
  const { data: roundsData, isLoading: roundsLoading } = useQuery({
    queryKey: ['rounds'],
    queryFn: async () => {
      const allRounds = await apiClient.get('/api/ecm/rounds');
      
      // Filtrar por setores permitidos se não for admin
      let filteredRounds = allRounds;
      if (!isAdmin && allowedSectors && allowedSectors.length > 0) {
        filteredRounds = allRounds.filter((round: any) => {
          return allowedSectors.includes(round.sectorId);
        });
      }
      
      // Ordenar por data (mais recentes primeiro) e pegar as últimas 5
      return filteredRounds
        .sort((a: any, b: any) => {
          const dateA = new Date(a.weekStart || a.createdAt || 0).getTime();
          const dateB = new Date(b.weekStart || b.createdAt || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);
    },
  });

  // Buscar cronograma
  const currentYear = new Date().getFullYear();
  const { data: cronogramaData, isLoading: cronogramaLoading } = useQuery<CronogramaDTO[]>({
    queryKey: ['dashboard', 'cronograma', setoresQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        dataInicio: `${currentYear}-01-01`,
        dataFim: `${currentYear}-12-31`,
      });
      
      if (!isAdmin && allowedSectors.length > 0) {
        params.append('setores', allowedSectors.join(','));
      }
      
      return apiClient.get(`/api/ecm/lifecycle/cronograma?${params.toString()}`);
    },
  });

  // Buscar investimentos
  const { data: investmentsData, isLoading: investmentsLoading } = useQuery({
    queryKey: ['dashboard', 'investments', setoresQuery, allowedSectors.join(',')],
    queryFn: async () => {
      console.log('[Dashboard] Buscando investimentos - isAdmin:', isAdmin, 'allowedSectors:', allowedSectors);
      
      // Se não for admin, buscar investimentos de cada setor permitido
      if (!isAdmin && allowedSectors.length > 0) {
        const allInvestments: any[] = [];
        
        // Buscar investimentos para cada setor permitido
        const fetchPromises = allowedSectors.map(async (sectorId) => {
          try {
            console.log(`[Dashboard] Buscando investimentos para setor ${sectorId}`);
            const res = await fetch(`/api/ecm/investments?sectorId=${sectorId}`);
            if (res.ok) {
              const investments = await res.json();
              console.log(`[Dashboard] Investimentos encontrados para setor ${sectorId}:`, investments.length);
              return investments || [];
            }
            console.warn(`[Dashboard] Erro ao buscar investimentos para setor ${sectorId}:`, res.status);
            return [];
          } catch (error) {
            console.error(`[Dashboard] Erro ao buscar investimentos para setor ${sectorId}:`, error);
            return [];
          }
        });
        
        const results = await Promise.all(fetchPromises);
        results.forEach((investments) => {
          allInvestments.push(...investments);
        });
        
        console.log('[Dashboard] Total de investimentos coletados:', allInvestments.length);
        
        // Remover duplicatas (caso um investimento tenha múltiplos setores)
        const uniqueInvestments = Array.from(
          new Map(allInvestments.map((inv) => [inv.id, inv])).values()
        );
        
        console.log('[Dashboard] Investimentos únicos após remoção de duplicatas:', uniqueInvestments.length);
        
        // Ordenar por data de criação (mais recentes primeiro)
        return uniqueInvestments.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      } else {
        // Admin vê todos os investimentos
        console.log('[Dashboard] Buscando todos os investimentos (admin)');
        const res = await fetch('/api/ecm/investments');
        if (!res.ok) throw new Error('Erro ao buscar investimentos');
        const investments = await res.json();
        console.log('[Dashboard] Total de investimentos (admin):', investments.length);
        // Ordenar por data de criação (mais recentes primeiro)
        return investments.sort(
          (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      }
    },
  });

  return (
    <div style={{ padding: padding, maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: theme.spacing.xl }}>
        <h1
          style={{
            margin: 0,
            marginBottom: theme.spacing.sm,
            color: theme.colors.dark,
            fontSize: '32px',
          }}
        >
          Aion View
        </h1>
        <p style={{ color: theme.colors.gray[600], margin: 0, fontSize: '16px' }}>
          Sistema de visualização e gestão de equipamentos médicos
        </p>
      </div>

      {/* Gráfico de Disponibilidade */}
      <div style={{ marginBottom: theme.spacing.xl }}>
        <AvailabilityPieChart 
          data={availabilityData || {
            totalEquipamentos: 0,
            disponiveis: 0,
            emManutencao: 0,
            percentualDisponivel: 0,
            percentualEmManutencao: 0,
            setoresFiltrados: setoresQuery ? allowedSectors : null,
            setoresFiltradosNomes: setoresQuery && allowedSectors.length > 0 
              ? getSectorNamesFromIds(allowedSectors) 
              : null,
          }} 
          isLoading={availabilityLoading} 
        />
      </div>

      {/* Alertas de Equipamentos Críticos/Monitorados com OS */}
      {criticalMonitoredAlerts && criticalMonitoredAlerts.length > 0 && (
        <div style={{ marginBottom: theme.spacing.xl }}>
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              boxShadow: theme.shadows.md,
              borderLeft: `4px solid ${theme.colors.danger}`,
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
              <FiAlertTriangle size={24} color={theme.colors.danger} />
              Alertas de Equipamentos Críticos e Monitorados
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              {criticalMonitoredAlerts.map((alert: any, idx: number) => (
                <div
                  key={`${alert.equipamentoId}-${alert.os.codigoSerial || idx}`}
                  style={{
                    border: `1px solid ${alert.isCritical ? theme.colors.danger : theme.colors.warning}`,
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                    backgroundColor: alert.isCritical ? `${theme.colors.danger}05` : `${theme.colors.warning}05`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing.md }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                        {alert.isCritical ? (
                          <FiAlertTriangle size={20} color={theme.colors.danger} />
                        ) : (
                          <FiAlertCircle size={20} color={theme.colors.warning} />
                        )}
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '16px',
                            fontWeight: 600,
                            color: theme.colors.dark,
                          }}
                        >
                          {alert.nome} {alert.tag !== 'N/A' && `(${alert.tag})`}
                        </h4>
                        <span
                          style={{
                            padding: `${theme.spacing.xs / 2}px ${theme.spacing.xs}px`,
                            borderRadius: theme.borderRadius.sm,
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: alert.isCritical ? theme.colors.danger : theme.colors.warning,
                            color: theme.colors.white,
                          }}
                        >
                          {alert.isCritical ? 'CRÍTICO' : 'MONITORADO'}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: theme.colors.gray[600], marginBottom: theme.spacing.xs }}>
                        Setor: {alert.setor}
                      </div>
                      <div
                        style={{
                          marginTop: theme.spacing.sm,
                          padding: theme.spacing.sm,
                          backgroundColor: theme.colors.white,
                          borderRadius: theme.borderRadius.sm,
                          border: `1px solid ${theme.colors.gray[200]}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs }}>
                          <FiFileText size={16} color={theme.colors.primary} />
                          <span style={{ fontWeight: 600, color: theme.colors.dark }}>
                            OS {alert.os.codigo} - {alert.os.tipoManutencao}
                          </span>
                        </div>
                        {alert.os.abertura && (
                          <div style={{ fontSize: '13px', color: theme.colors.gray[600], marginBottom: theme.spacing.xs }}>
                            Abertura: {formatBrazilianDate(alert.os.abertura)}
                          </div>
                        )}
                        {alert.os.prioridade && alert.os.prioridade !== 'Não informado' && (
                          <div style={{ fontSize: '13px', color: theme.colors.gray[600], marginBottom: theme.spacing.xs }}>
                            Prioridade: {alert.os.prioridade}
                          </div>
                        )}
                        {alert.os.ocorrencia && (
                          <div
                            style={{
                              marginTop: theme.spacing.xs,
                              padding: theme.spacing.sm,
                              backgroundColor: theme.colors.gray[50],
                              borderRadius: theme.borderRadius.xs,
                              fontSize: '13px',
                              color: theme.colors.gray[700],
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            <strong>Ocorrência:</strong> {alert.os.ocorrencia}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Equipamentos em Manutenção */}
      <div style={{ marginBottom: theme.spacing.xl }}>
        <EquipmentInMaintenanceList
          data={equipmentInMaintenanceData?.equipamentos || []}
          isLoading={equipmentInMaintenanceLoading}
          total={availabilityData?.emManutencao}
        />
      </div>

      {/* Últimas Rondas Executadas */}
      {roundsLoading ? (
        <div style={{ marginBottom: theme.spacing.xl }}>
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
              }}
            >
              Últimas Rondas Executadas
            </h3>
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
              Carregando rondas...
            </div>
          </div>
        </div>
      ) : roundsData && roundsData.length > 0 ? (
        <div style={{ marginBottom: theme.spacing.xl }}>
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              boxShadow: theme.shadows.md,
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
                }}
              >
                Últimas Rondas Executadas
              </h3>
              <Link
                to="/rondas"
                style={{
                  color: theme.colors.primary,
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Ver todas →
              </Link>
            </div>
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {roundsData.slice(0, 5).map((round: any, idx: number) => {
                const weekStartDate = round.weekStart ? new Date(round.weekStart) : null;
                const createdAtDate = round.createdAt ? new Date(round.createdAt) : null;

                return (
                  <div
                    key={round.id || idx}
                    style={{
                      border: `1px solid ${theme.colors.gray[200]}`,
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                      transition: 'all 0.2s',
                      backgroundColor: idx === 0 ? `${theme.colors.secondary}05` : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.secondary;
                      e.currentTarget.style.boxShadow = theme.shadows.sm;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.gray[200];
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: theme.spacing.md,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm,
                            marginBottom: theme.spacing.xs,
                          }}
                        >
                          <h4
                            style={{
                              margin: 0,
                              fontSize: '16px',
                              fontWeight: 600,
                              color: theme.colors.dark,
                            }}
                          >
                            {round.sectorName}
                          </h4>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.md,
                            flexWrap: 'wrap',
                            fontSize: '13px',
                            color: theme.colors.gray[600],
                            marginBottom: theme.spacing.xs,
                          }}
                        >
                          {weekStartDate && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                              <FiCalendar size={14} />
                              Semana de {formatBrazilianDate(weekStartDate.toISOString())}
                            </span>
                          )}
                          {createdAtDate && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                              <FiFileText size={14} />
                              Executada em {formatBrazilianDateTime(createdAtDate.toISOString())}
                            </span>
                          )}
                          {round.responsibleName && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                              <FiUser size={14} />
                              {round.responsibleName}
                            </span>
                          )}
                        </div>
                        {round.notes && (
                          <div
                            style={{
                              marginTop: theme.spacing.xs,
                              padding: theme.spacing.sm,
                              backgroundColor: theme.colors.gray[50],
                              borderRadius: theme.borderRadius.sm,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: '13px',
                                color: theme.colors.gray[700],
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {round.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: theme.spacing.xl }}>
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
              }}
            >
              Últimas Rondas Executadas
            </h3>
            <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
              Nenhuma ronda encontrada.
            </div>
          </div>
        </div>
      )}

      {/* Cronograma de Manutenção */}
      <div style={{ marginBottom: theme.spacing.xl }}>
        <MaintenanceSchedule
          data={cronogramaData || []}
          isLoading={cronogramaLoading}
          allowedSectors={allowedSectors}
          filterBySector={filterBySector}
          isAdmin={isAdmin}
        />
      </div>

      {/* Lista de Investimentos */}
      <div style={{ marginBottom: theme.spacing.xl }}>
        <InvestmentsList
          data={investmentsData || []}
          isLoading={investmentsLoading}
          allowedSectors={allowedSectors}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
