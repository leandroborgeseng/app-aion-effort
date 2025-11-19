import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiCalendar, FiClock, FiFilter, FiRefreshCw } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import { formatBrazilianDate } from '../utils/dateUtils';
import type { CronogramaDTO } from '../../types/effort';

export default function CronogramaPage() {
  const { isAdmin, allowedSectors, filterBySector } = usePermissions();
  
  // Período padrão: ano atual
  const currentYear = new Date().getFullYear();
  const [dataInicio, setDataInicio] = useState(`${currentYear}-01-01`);
  const [dataFim, setDataFim] = useState(`${currentYear}-12-31`);
  
  // Filtros
  const [setorFiltro, setSetorFiltro] = useState<string>('Todos');

  // Usar as datas selecionadas para buscar os dados
  const { data: allData, isLoading, error, dataUpdatedAt, refetch } = useQuery<CronogramaDTO[]>({
    queryKey: ['cronograma', dataInicio, dataFim, allowedSectors],
    queryFn: async () => {
      const params = new URLSearchParams({
        dataInicio: dataInicio,
        dataFim: dataFim,
      });
      
      // Adicionar filtro de setores se não for admin
      if (!isAdmin && allowedSectors.length > 0) {
        params.append('setores', allowedSectors.join(','));
      }
      
      console.log('[CronogramaPage] Buscando dados com período:', { dataInicio, dataFim, allowedSectors });
      const res = await fetch(`/api/ecm/lifecycle/cronograma?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log('[CronogramaPage] Dados recebidos:', data.length);
      return data;
    },
  });

  // Usar todos os dados sem filtrar por período - mostrar todos os registros
  // Filtrar por setor se necessário (fallback caso a API não filtre)
  const data = useMemo(() => {
    if (!allData) return [];
    console.log('[CronogramaPage] allData recebido:', allData.length);
    // Se for admin, retornar todos os dados
    if (isAdmin) {
      return allData;
    }
    // Filtrar por setores permitidos
    const filtered = filterBySector(allData);
    console.log('[CronogramaPage] data filtrado por setor:', filtered.length);
    return filtered;
  }, [allData, isAdmin, filterBySector]);

  // Extrair setores únicos dos dados do cronograma
  const setoresDisponiveis = useMemo(() => {
    if (!allData) return [];
    const setoresUnicos = Array.from(new Set(allData.map(item => item.Setor).filter(Boolean)));
    return setoresUnicos.sort();
  }, [allData]);

  // Extrair tipos de manutenção únicos dos dados do cronograma
  const tiposManutencaoDisponiveis = useMemo(() => {
    if (!allData) return [];
    const tiposUnicos = Array.from(new Set(allData.map(item => item.TipoDeManutencao).filter(Boolean)));
    return tiposUnicos.sort();
  }, [allData]);

  // Contar quantas manutenções de cada tipo existem
  const tiposManutencaoComContagem = useMemo(() => {
    if (!allData) return [];
    const contagem: Record<string, number> = {};
    allData.forEach((item) => {
      const tipo = item.TipoDeManutencao || 'Sem tipo';
      contagem[tipo] = (contagem[tipo] || 0) + 1;
    });
    return Object.entries(contagem)
      .map(([tipo, quantidade]) => ({ tipo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [allData]);

  // Filtrar dados apenas por setor (sem filtrar por tipo de manutenção - mostrar todas)
  const dataFiltrada = useMemo(() => {
    if (!data) {
      console.log('[CronogramaPage] dataFiltrada: data está vazio');
      return [];
    }
    
    console.log('[CronogramaPage] dataFiltrada - data inicial:', data.length);
    console.log('[CronogramaPage] dataFiltrada - setorFiltro:', setorFiltro);
    
    let filtered = [...data];
    
    // Filtrar apenas por setor selecionado (se não for "Todos")
    if (setorFiltro !== 'Todos') {
      const antes = filtered.length;
      filtered = filtered.filter(item => item.Setor === setorFiltro);
      console.log('[CronogramaPage] dataFiltrada - após filtrar por setor:', antes, '->', filtered.length);
    }
    
    console.log('[CronogramaPage] dataFiltrada - resultado final (TODOS os tipos):', filtered.length);
    return filtered;
  }, [data, setorFiltro]);

  // Criar matriz Setor x Mês mostrando quais tipos de manutenção serão executados
  const matrizSetorMes = useMemo(() => {
    if (!dataFiltrada) {
      console.log('[CronogramaPage] matrizSetorMes: dataFiltrada está vazio');
      return { setores: [], meses: [], matriz: {} };
    }

    console.log('[CronogramaPage] matrizSetorMes - dataFiltrada recebido:', dataFiltrada.length);
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const setoresUnicos = Array.from(new Set(dataFiltrada.map(item => item.Setor).filter(Boolean))).sort();
    console.log('[CronogramaPage] matrizSetorMes - setores únicos encontrados:', setoresUnicos.length);
    
    // Estrutura: { setor: { mes: Set<tipos> } }
    const matriz: Record<string, Record<number, Set<string>>> = {};
    
    setoresUnicos.forEach(setor => {
      matriz[setor] = {};
      for (let i = 1; i <= 12; i++) {
        matriz[setor][i] = new Set<string>();
      }
    });

    // Processar cada registro
    let registrosProcessados = 0;
    let registrosSemSetor = 0;
    let registrosComProximaRealizacao = 0;
    let registrosComDataDaUltima = 0;
    
    dataFiltrada.forEach((item) => {
      registrosProcessados++;
      const setor = item.Setor;
      if (!setor) {
        registrosSemSetor++;
        return;
      }

      // Processar ProximaRealizacao - SEM restrição de período
      if (item.ProximaRealizacao) {
        registrosComProximaRealizacao++;
        try {
          const dataProxima = new Date(item.ProximaRealizacao);
          if (!isNaN(dataProxima.getTime())) {
            const mes = dataProxima.getMonth() + 1;
            // Adicionar à matriz SEM verificar período - incluir TODOS os registros
            if (matriz[setor] && matriz[setor][mes]) {
              if (item.TipoDeManutencao) {
                matriz[setor][mes].add(item.TipoDeManutencao);
              }
            }
          }
        } catch (e) {
          console.warn('[CronogramaPage] Erro ao processar ProximaRealizacao:', item.ProximaRealizacao, e);
        }
      }

      // Processar DataDaUltima (manutenções já executadas) - SEM restrição de período
      if (item.DataDaUltima) {
        registrosComDataDaUltima++;
        try {
          const dataUltima = new Date(item.DataDaUltima);
          if (!isNaN(dataUltima.getTime())) {
            const mes = dataUltima.getMonth() + 1;
            // Adicionar à matriz SEM verificar período - incluir TODOS os registros
            if (matriz[setor] && matriz[setor][mes]) {
              if (item.TipoDeManutencao) {
                matriz[setor][mes].add(item.TipoDeManutencao);
              }
            }
          }
        } catch (e) {
          console.warn('[CronogramaPage] Erro ao processar DataDaUltima:', item.DataDaUltima, e);
        }
      }
    });
    
    console.log('[CronogramaPage] matrizSetorMes - Estatísticas:');
    console.log('  Registros processados:', registrosProcessados);
    console.log('  Registros sem setor:', registrosSemSetor);
    console.log('  Registros com ProximaRealizacao:', registrosComProximaRealizacao);
    console.log('  Registros com DataDaUltima:', registrosComDataDaUltima);

    return {
      setores: setoresUnicos,
      meses: mesesNomes.map((nome, index) => ({ nome, numero: index + 1 })),
      matriz,
    };
  }, [dataFiltrada]);

  if (isLoading) {
    return (
      <div style={{ padding: theme.spacing.md, textAlign: 'center' }}>
        <p style={{ color: theme.colors.gray[600] }}>Carregando cronograma...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: theme.spacing.md,
          backgroundColor: `${theme.colors.danger}15`,
          borderRadius: theme.borderRadius.md,
          color: theme.colors.danger,
        }}
      >
        Erro ao carregar dados: {String(error)}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          padding: theme.spacing.md,
          maxWidth: '1600px',
          margin: '0 auto',
        }}
      >
      {/* Header */}
      <div style={{ marginBottom: theme.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                marginBottom: theme.spacing.xs,
                color: theme.colors.dark,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                fontSize: 'clamp(20px, 5vw, 28px)',
              }}
            >
              <FiCalendar size={28} color={theme.colors.primary} />
              Cronograma de Manutenção
            </h1>
            <p
              style={{
                color: theme.colors.gray[600],
                margin: 0,
                fontSize: '14px',
              }}
            >
              Cronograma de manutenções preventivas
            </p>
          </div>
          {dataUpdatedAt && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                backgroundColor: theme.colors.gray[50],
                borderRadius: theme.borderRadius.sm,
                fontSize: '12px',
                color: theme.colors.gray[700],
                whiteSpace: 'nowrap',
              }}
            >
              <FiClock size={14} color={theme.colors.gray[600]} />
              <span>
                Última sincronização:{' '}
                <strong>
                  {formatBrazilianDate(dataUpdatedAt)}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Painel de Filtros */}
      <div
        style={{
          marginBottom: theme.spacing.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.shadows.sm,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
            <FiFilter size={16} color={theme.colors.primary} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme.colors.dark }}>Filtros</h3>
          </div>
          <button
            onClick={() => {
              console.log('[CronogramaPage] Botão atualizar clicado');
              refetch();
            }}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              backgroundColor: isLoading ? theme.colors.gray[300] : theme.colors.primary,
              color: theme.colors.white,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            title="Atualizar dados do cronograma"
          >
            <FiRefreshCw 
              size={16} 
              style={{ 
                animation: isLoading ? 'spin 1s linear infinite' : 'none',
              }} 
            />
            {isLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}
        >
          {/* Período - Data Início */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '13px', fontWeight: 500, color: theme.colors.gray[700] }}>
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={{
                width: '100%',
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
              }}
            />
          </div>
          
          {/* Período - Data Fim */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '13px', fontWeight: 500, color: theme.colors.gray[700] }}>
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={{
                width: '100%',
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
              }}
            />
          </div>
          
          {/* Filtro por Setor */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '13px', fontWeight: 500, color: theme.colors.gray[700] }}>
              Setor
            </label>
            <select
              value={setorFiltro}
              onChange={(e) => setSetorFiltro(e.target.value)}
              style={{
                width: '100%',
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                border: `1px solid ${theme.colors.gray[300]}`,
                fontSize: '14px',
                backgroundColor: theme.colors.white,
              }}
            >
              <option value="Todos">Todos os setores</option>
              {setoresDisponiveis.map((setor) => (
                <option key={setor} value={setor}>
                  {setor}
                </option>
              ))}
            </select>
          </div>
          
        </div>
        
        {/* Resumo dos filtros */}
        <div
          style={{
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.gray[50],
            borderRadius: theme.borderRadius.sm,
            fontSize: '13px',
            color: theme.colors.gray[700],
          }}
        >
          <div style={{ marginBottom: theme.spacing.xs }}>
            <strong>Debug:</strong> Total de registros: <strong>{allData?.length || 0}</strong> | 
            Registros após filtros: <strong>{dataFiltrada.length}</strong> | 
            Setores encontrados: <strong>{matrizSetorMes.setores.length}</strong>
          </div>
          <div>
            Mostrando <strong>{matrizSetorMes.setores.length}</strong> setores com manutenções (TODOS os tipos)
            {setorFiltro !== 'Todos' && ` (filtrado por setor: "${setorFiltro}")`}
          </div>
        </div>
      </div>

      {/* Seção: Tipos de Manutenção */}
      {tiposManutencaoComContagem.length > 0 && (
        <div
          style={{
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            marginBottom: theme.spacing.lg,
          }}
        >
          <h2
            style={{
              margin: `0 0 ${theme.spacing.lg} 0`,
              fontSize: '18px',
              fontWeight: 600,
              color: theme.colors.dark,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <FiFilter size={20} />
            Tipos de Manutenção no Cronograma
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: theme.spacing.md,
            }}
          >
            {tiposManutencaoComContagem.map(({ tipo, quantidade }) => (
              <div
                key={tipo}
                style={{
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.gray[50],
                  borderRadius: theme.borderRadius.sm,
                  border: `1px solid ${theme.colors.gray[200]}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'default',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  // Removido - não filtra mais por tipo, apenas mostra informações
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: theme.colors.dark,
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    {tipo || 'Sem tipo'}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: theme.colors.gray[600],
                    }}
                  >
                    {quantidade} {quantidade === 1 ? 'manutenção' : 'manutenções'}
                  </div>
                </div>
                <div
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: theme.colors.gray[300],
                    color: theme.colors.gray[700],
                    borderRadius: theme.borderRadius.sm,
                    fontSize: '12px',
                    fontWeight: 600,
                    minWidth: '50px',
                    textAlign: 'center',
                  }}
                >
                  {quantidade}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.sm,
              backgroundColor: theme.colors.gray[50],
              borderRadius: theme.borderRadius.sm,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            <p style={{ margin: 0 }}>
              <strong>Total:</strong> {tiposManutencaoComContagem.length} tipos diferentes •{' '}
              <strong>{tiposManutencaoComContagem.reduce((sum, item) => sum + item.quantidade, 0)}</strong> manutenções no total
            </p>
          </div>
        </div>
      )}

      {/* Matriz Setor x Mês */}
      {matrizSetorMes.setores.length > 0 ? (
        <div
          style={{
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            overflowX: 'auto',
          }}
        >
          <h2
            style={{
              margin: `0 0 ${theme.spacing.lg} 0`,
              fontSize: '18px',
              fontWeight: 600,
              color: theme.colors.dark,
            }}
          >
            Distribuição por Setor e Mês
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
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
                        minWidth: '80px',
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
                                flexDirection: 'column',
                                gap: '2px',
                                alignItems: 'center',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: theme.colors.info,
                                  fontWeight: 600,
                                }}
                              >
                                ●
                              </span>
                              {tiposArray.length > 1 && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    color: theme.colors.gray[500],
                                  }}
                                >
                                  +{tiposArray.length - 1}
                                </span>
                              )}
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
          <div
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.sm,
              backgroundColor: theme.colors.gray[50],
              borderRadius: theme.borderRadius.sm,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            <p style={{ margin: 0 }}>
              <strong>Legenda:</strong> ● indica presença de manutenção no mês. Passe o mouse sobre a célula para ver os tipos de manutenção.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: theme.spacing.xl,
            textAlign: 'center',
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
          }}
        >
          <p style={{ color: theme.colors.gray[600] }}>Nenhum item encontrado no período selecionado.</p>
        </div>
      )}
      </div>
    </>
  );
}

