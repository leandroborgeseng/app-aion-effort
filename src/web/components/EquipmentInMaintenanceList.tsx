// src/web/components/EquipmentInMaintenanceList.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiClock, FiMapPin, FiExternalLink, FiX } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { parseBrazilianDate, formatBrazilianDate, formatBrazilianDateTime } from '../utils/dateUtils';

interface OS {
  codigo: string;
  abertura: string | null;
  tipoManutencao: string;
  prioridade: string;
  dadosCompletos?: any; // Todos os dados da OS retornados da API
}

interface EquipmentInMaintenance {
  id: number;
  tag: string;
  nome: string;
  setor: string;
  setorId: number | null;
  os: OS & {
    codigoSerial?: number;
    ocorrencia?: string | null;
  };
}

interface EquipmentInMaintenanceListProps {
  data: EquipmentInMaintenance[];
  isLoading: boolean;
  total?: number;
}

export default function EquipmentInMaintenanceList({ 
  data, 
  isLoading,
  total 
}: EquipmentInMaintenanceListProps) {
  const [selectedOS, setSelectedOS] = useState<any | null>(null);
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Data não informada';
    return formatBrazilianDate(dateString);
  };

  const getPriorityColor = (prioridade: string): string => {
    const p = prioridade.toLowerCase();
    if (p.includes('crítica') || p.includes('critica')) return theme.colors.danger;
    if (p.includes('alta')) return theme.colors.warning;
    if (p.includes('média') || p.includes('media')) return theme.colors.info;
    return theme.colors.gray[600];
  };

  const getDaysInMaintenance = (dateString: string | null): number => {
    if (!dateString) return 0;
    const date = parseBrazilianDate(dateString);
    if (!date) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
          <FiAlertTriangle size={24} color={theme.colors.warning} />
          Ordens de Serviço em Aberto (Corretivas)
        </h3>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
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
          <FiAlertTriangle size={24} color={theme.colors.warning} />
          Ordens de Serviço em Aberto (Corretivas)
        </h3>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.colors.gray[600] }}>
          Nenhuma ordem de serviço corretiva aberta no momento.
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
          <FiAlertTriangle size={24} color={theme.colors.warning} />
          Ordens de Serviço em Aberto
        </h3>
        {total !== undefined && (
          <span
            style={{
              fontSize: '14px',
              color: theme.colors.gray[600],
              backgroundColor: theme.colors.gray[100],
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.sm,
            }}
          >
            {total} OS
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
        {data.map((equipment, index) => {
          const daysInMaintenance = getDaysInMaintenance(equipment.os.abertura);
          const priorityColor = getPriorityColor(equipment.os.prioridade);

          return (
            <div
              key={`${equipment.id}-${equipment.os.codigo}-${index}`}
              style={{
                border: `1px solid ${theme.colors.gray[200]}`,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                transition: 'all 0.2s',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.colors.warning;
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
                      {equipment.nome}
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
                    <span>
                      <strong>Tag:</strong> {equipment.tag}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                      <FiMapPin size={14} />
                      {equipment.setor}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      flexWrap: 'wrap',
                      fontSize: '13px',
                      color: theme.colors.gray[600],
                    }}
                  >
                    <span>
                      <strong>OS:</strong> {equipment.os.codigo}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs / 2 }}>
                      <FiClock size={14} />
                      Aberta em {formatDate(equipment.os.abertura)}
                      {daysInMaintenance > 0 && (
                        <span style={{ color: daysInMaintenance > 30 ? theme.colors.danger : theme.colors.gray[600] }}>
                          ({daysInMaintenance} dia{daysInMaintenance !== 1 ? 's' : ''})
                        </span>
                      )}
                    </span>
                    <span>
                      <strong>Tipo:</strong> {equipment.os.tipoManutencao}
                    </span>
                    <span style={{ color: priorityColor, fontWeight: 600 }}>
                      <strong>Prioridade:</strong> {equipment.os.prioridade}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const osData = equipment.os.dadosCompletos || equipment.os;
                    console.log('[EquipmentInMaintenanceList] Dados da OS:', osData);
                    console.log('[EquipmentInMaintenanceList] Campo Ocorrencia:', osData.Ocorrencia || osData.Ocorrência || osData.Descricao || osData.Descrição || osData.Problema || osData.Relato || equipment.os.ocorrencia || 'NÃO ENCONTRADO');
                    setSelectedOS(osData);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    color: theme.colors.primary,
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.sm,
                    border: `1px solid ${theme.colors.primary}`,
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.primary;
                    e.currentTarget.style.color = theme.colors.white;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.colors.primary;
                  }}
                >
                  Ver OS
                  <FiExternalLink size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {total !== undefined && total > data.length && (
        <div style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
          <Link
            to="/os?apenasAbertas=true"
            style={{
              color: theme.colors.primary,
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Ver todas as {total} OS em manutenção →
          </Link>
        </div>
      )}

      {/* Modal de Detalhes da OS */}
      {selectedOS && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: theme.spacing.md,
          }}
          onClick={() => setSelectedOS(null)}
        >
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: theme.shadows.lg,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
                borderBottom: `1px solid ${theme.colors.gray[200]}`,
                paddingBottom: theme.spacing.md,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 600,
                  color: theme.colors.dark,
                }}
              >
                Detalhes da OS: {selectedOS.OS || selectedOS.codigo || 'N/A'}
              </h2>
              <button
                onClick={() => setSelectedOS(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.borderRadius.sm,
                  color: theme.colors.gray[600],
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                  e.currentTarget.style.color = theme.colors.dark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.colors.gray[600];
                }}
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Campo Ocorrência destacado no topo - sempre exibir */}
            <div
              style={{
                marginBottom: theme.spacing.lg,
                padding: theme.spacing.md,
                backgroundColor: `${theme.colors.primary}05`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.primary}20`,
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: theme.colors.primary,
                  marginBottom: theme.spacing.sm,
                  textTransform: 'uppercase',
                }}
              >
                Descritivo do Problema / Ocorrência
              </div>
              <div
                style={{
                  fontSize: '15px',
                  color: theme.colors.dark,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontStyle: !(selectedOS.Ocorrencia || selectedOS.Ocorrência || selectedOS.Descricao || selectedOS.Descrição || selectedOS.Problema || selectedOS.Relato) ? 'italic' : 'normal',
                }}
              >
                {selectedOS.Ocorrencia || selectedOS.Ocorrência || selectedOS.Descricao || selectedOS.Descrição || selectedOS.Problema || selectedOS.Relato || 'Não informado'}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: theme.spacing.md,
              }}
            >
              {Object.entries(selectedOS)
                .filter(([key]) => {
                  // Excluir campos já exibidos no topo
                  const camposExibidos = ['Ocorrencia', 'Ocorrência', 'Descricao', 'Descrição', 'Problema', 'Relato'];
                  return !camposExibidos.includes(key);
                })
                .map(([key, value]) => {
                  // Ignorar campos vazios ou nulos
                  if (value === null || value === undefined || value === '') {
                    return null;
                  }

                  // Formatar chaves para exibição
                  const formatKey = (k: string): string => {
                    return k
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str) => str.toUpperCase())
                      .trim();
                  };

                  // Formatar valores
                  const formatValue = (val: any): string => {
                    if (typeof val === 'boolean') {
                      return val ? 'Sim' : 'Não';
                    }
                    if (val instanceof Date) {
                      return formatBrazilianDateTime(val);
                    }
                    // Verificar se é uma string de data (vários formatos possíveis)
                    if (typeof val === 'string') {
                      const parsedDate = parseBrazilianDate(val);
                      if (parsedDate) {
                        // Se tem hora na string original, mostrar com hora, senão só data
                        if (val.includes(':') || val.includes('T')) {
                          return formatBrazilianDateTime(parsedDate);
                        }
                        return formatBrazilianDate(parsedDate);
                      }
                    }
                    return String(val);
                  };

                  return (
                    <div
                      key={key}
                      style={{
                        padding: theme.spacing.sm,
                        backgroundColor: theme.colors.gray[50],
                        borderRadius: theme.borderRadius.md,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: theme.colors.gray[600],
                          marginBottom: theme.spacing.xs / 2,
                          textTransform: 'uppercase',
                        }}
                      >
                        {formatKey(key)}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          color: theme.colors.dark,
                          wordBreak: 'break-word',
                        }}
                      >
                        {formatValue(value)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

