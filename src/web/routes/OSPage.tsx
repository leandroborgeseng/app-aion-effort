import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { FiFileText, FiChevronLeft, FiChevronRight, FiX, FiChevronDown, FiChevronUp, FiPackage, FiEdit2, FiMessageSquare, FiShoppingCart } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import VirtualizedDataTable from '../components/VirtualizedDataTable';
import SavedFiltersManager from '../components/SavedFiltersManager';
import SkeletonScreen from '../components/SkeletonScreen';
import ErrorMessage from '../components/ErrorMessage';
import { theme } from '../styles/theme';
import { formatBrazilianDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';
import { useIsMobile } from '../hooks/useMediaQuery';
import { mobileStyles } from '../utils/mobileUtils';
import { apiClient } from '../lib/apiClient';
import { usePermissions } from '../hooks/usePermissions';
import type { ListagemAnaliticaOsResumidaDTO } from '../../types/effort';

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string;
  direction: SortDirection;
}


export default function OSPage() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Obter setores permitidos do usuário (incluindo personificação)
  const { allowedSectors, isAdmin } = usePermissions();
  // Ordenar por data de abertura por padrão (descendente - mais novas primeiro)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'Abertura', direction: 'desc' });
  
  // Carregar filtro compartilhado da URL
  useEffect(() => {
    const filterToken = searchParams.get('filter');
    if (filterToken) {
      fetch(`/api/saved-filters/shared/${filterToken}`)
        .then((res) => res.json())
        .then((filter) => {
          try {
            const filters = JSON.parse(filter.filters);
            // Aplicar filtros carregados
            toast.success(`Filtro "${filter.name}" carregado!`);
            // Remover token da URL após carregar
            setSearchParams({}, { replace: true });
          } catch (error) {
            toast.error('Erro ao carregar filtro compartilhado');
          }
        })
        .catch(() => {
          toast.error('Filtro compartilhado não encontrado');
          setSearchParams({}, { replace: true });
        });
    }
  }, [searchParams, setSearchParams]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  
  // Verificar se deve forçar refresh
  const forceRefresh = searchParams.get('forceRefresh') === 'true';
  
  // Estado para controlar quais equipamentos estão expandidos
  const [expandedEquipamentos, setExpandedEquipamentos] = useState<Set<string>>(new Set());
  
  // Estado para modal de comentários e vínculo
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<number | null>(null);
  const [selectedOSData, setSelectedOSData] = useState<ListagemAnaliticaOsResumidaDTO | null>(null);
  const [comentarios, setComentarios] = useState('');
  const [purchaseRequestId, setPurchaseRequestId] = useState<string>('');
  
  // Construir query string para setores se não for admin (para personificação)
  // IMPORTANTE: Quando há personificação, isAdmin verifica o role do usuário personificado
  // Se o usuário personificado não é admin, aplicamos o filtro de setores
  const setoresQuery = !isAdmin && allowedSectors.length > 0
    ? allowedSectors.join(',')
    : undefined;
  
  // Debug: verificar setores permitidos
  useEffect(() => {
    console.log('[OSPage] Personificação ativa:', { isAdmin, allowedSectors, setoresQuery });
  }, [isAdmin, allowedSectors, setoresQuery]);

  // Buscar equipamentos com OS abertas
  const { data: equipamentosData, isLoading, error } = useQuery<{
    equipamentos: Array<{
      equipamentoId: number | null;
      tag: string;
      equipamento: string;
      modelo: string;
      fabricante: string;
      setor: string;
      osAbertas: ListagemAnaliticaOsResumidaDTO[];
      quantidadeOSAbertas: number;
      primeiraOSAbertura: string | null;
      ultimaOSAbertura: string | null;
    }>;
    totalEquipamentos: number;
    totalOSAbertas: number;
    periodo: { inicio: string; fim: string };
  }>({
    queryKey: ['os-equipamentos-com-os-abertas', forceRefresh ? 'refresh' : 'cached', setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/ecm/os/equipamentos-com-os-abertas?setores=${setoresQuery}`
        : '/api/ecm/os/equipamentos-com-os-abertas';
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao buscar equipamentos com OS abertas');
      }
      return res.json();
    },
    staleTime: forceRefresh ? 0 : 30 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: forceRefresh,
  });

  // Buscar dados da OS selecionada (comentários e vínculo)
  const { data: osData, isLoading: isLoadingOSData } = useQuery({
    queryKey: ['os-data', selectedOS],
    queryFn: async () => {
      if (!selectedOS) return null;
      const res = await fetch(`/api/ecm/os/${selectedOS}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!res.ok) throw new Error('Erro ao buscar dados da OS');
      return res.json();
    },
    enabled: !!selectedOS && isOSModalOpen,
  });

  // Buscar lista de solicitações de compra
  const { data: purchaseRequests } = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: async () => {
      const res = await fetch('/api/ecm/purchase-requests');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Mutation para salvar comentários e vínculo
  const saveOSDataMutation = useMutation({
    mutationFn: async (data: { comentarios?: string; purchaseRequestId?: string | null }) => {
      if (!selectedOS) throw new Error('OS não selecionada');
      const res = await fetch(`/api/ecm/os/${selectedOS}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          comentarios: data.comentarios,
          purchaseRequestId: data.purchaseRequestId || null,
          osCodigo: selectedOSData?.OS || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao salvar dados');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Dados salvos com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['os-data', selectedOS] });
      setIsOSModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar dados');
    },
  });

  // Atualizar estado quando os dados da OS são carregados
  useEffect(() => {
    if (osData) {
      setComentarios(osData.comentarios || '');
      setPurchaseRequestId(osData.purchaseRequestId || '');
    }
  }, [osData]);

  // Limpar estado quando modal fecha
  useEffect(() => {
    if (!isOSModalOpen) {
      setSelectedOS(null);
      setSelectedOSData(null);
      setComentarios('');
      setPurchaseRequestId('');
    }
  }, [isOSModalOpen]);

  const equipamentos = equipamentosData?.equipamentos || [];
  const totalEquipamentos = equipamentosData?.totalEquipamentos || 0;
  const totalOSAbertas = equipamentosData?.totalOSAbertas || 0;
  
  // Função para toggle de expansão
  const toggleEquipamento = (chave: string) => {
    setExpandedEquipamentos((prev) => {
      const novo = new Set(prev);
      if (novo.has(chave)) {
        novo.delete(chave);
      } else {
        novo.add(chave);
      }
      return novo;
    });
  };
  
  // Buscar dados de tempo médio de processamento por ano
  const { data: tempoMedioData, isLoading: isLoadingTempoMedio } = useQuery<{
    dados: Array<{ ano: number; tempoMedio: number; quantidade: number }>;
    periodo: { inicio: number; fim: number };
  }>({
    queryKey: ['os-tempo-medio-processamento'],
    queryFn: async () => {
      const res = await fetch('/api/ecm/os/tempo-medio-processamento');
      if (!res.ok) {
        throw new Error('Erro ao buscar tempo médio de processamento');
      }
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // Cache por 1 hora
    refetchOnWindowFocus: false,
  });
  
  // Função para calcular tempo de processamento (dias entre abertura e fechamento)
  const calcularTempoProcessamento = (row: any): number | null => {
    if (!row) return null;
    
    // Tentar múltiplos campos possíveis para data de abertura
    const dataAbertura = row?.Abertura || row?.DataAbertura || row?.dataAbertura || '';
    const dataFechamento = row?.Fechamento || row?.DataFechamento || row?.dataFechamento || '';
    
    // Se não há abertura ou fechamento, retornar null
    if (!dataAbertura || dataAbertura.trim() === '' || dataAbertura === 'Data inválida') {
      return null;
    }
    
    if (!dataFechamento || dataFechamento.trim() === '' || dataFechamento === 'Data inválida') {
      return null; // OS ainda aberta
    }
    
    try {
      let aberturaDate: Date;
      let fechamentoDate: Date;
      
      // Parsear data de abertura (formato brasileiro: DD/MM/YYYY HH:mm)
      if (dataAbertura.includes('/')) {
        const parts = dataAbertura.split(' ');
        const datePart = parts[0]; // "06/03/2018"
        const timePart = parts[1] || '00:00'; // "02:00" ou "00:00"
        const [dia, mes, ano] = datePart.split('/');
        const [hora, minuto] = timePart.split(':');
        aberturaDate = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora || '0'), parseInt(minuto || '0'));
      } else {
        aberturaDate = new Date(dataAbertura);
      }
      
      // Parsear data de fechamento (formato brasileiro: DD/MM/YYYY HH:mm)
      if (dataFechamento.includes('/')) {
        const parts = dataFechamento.split(' ');
        const datePart = parts[0]; // "06/03/2018"
        const timePart = parts[1] || '00:00'; // "10:00" ou "00:00"
        const [dia, mes, ano] = datePart.split('/');
        const [hora, minuto] = timePart.split(':');
        fechamentoDate = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora || '0'), parseInt(minuto || '0'));
      } else {
        fechamentoDate = new Date(dataFechamento);
      }
      
      if (isNaN(aberturaDate.getTime()) || isNaN(fechamentoDate.getTime())) {
        return null;
      }
      
      // Calcular diferença em dias (zerar horas para calcular apenas dias completos)
      aberturaDate.setHours(0, 0, 0, 0);
      fechamentoDate.setHours(0, 0, 0, 0);
      const diffTime = fechamentoDate.getTime() - aberturaDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Se fechamento é antes da abertura, retornar null (dados inconsistentes)
      if (diffDays < 0) {
        return null;
      }
      
      return diffDays;
    } catch {
      return null;
    }
  };
  
  // Debug: verificar dados recebidos
  console.log('[OSPage] 📊 Estado atual:', {
    isLoading,
    error: error?.message,
    totalEquipamentos,
    totalOSAbertas,
  });

  // Função de ordenação
  const sortData = (dataToSort: any[], column: string, direction: SortDirection): any[] => {
    if (!direction) return dataToSort;

    const sorted = [...dataToSort].sort((a, b) => {
      let aValue: any = a[column] || a[`Data${column}`] || '';
      let bValue: any = b[column] || b[`Data${column}`] || '';

      if (column === 'Abertura' || column === 'Fechamento' || column === 'DataDaSolucao') {
        // Função auxiliar para parsear data brasileira (DD/MM/YYYY HH:mm)
        const parseBrazilianDate = (dateString: string): number => {
          if (!dateString || dateString.trim() === '' || dateString === 'Data inválida') {
            return 0;
          }
          try {
            if (dateString.includes('/')) {
              const parts = dateString.split(' ');
              const datePart = parts[0];
              const timePart = parts[1] || '00:00';
              const [dia, mes, ano] = datePart.split('/');
              const [hora, minuto] = timePart.split(':');
              const date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora || '0'), parseInt(minuto || '0'));
              return isNaN(date.getTime()) ? 0 : date.getTime();
            } else {
              const date = new Date(dateString);
              return isNaN(date.getTime()) ? 0 : date.getTime();
            }
          } catch {
            return 0;
          }
        };
        
        // Para data de abertura, usar parseBrazilianDate
        if (column === 'Abertura') {
          aValue = parseBrazilianDate(aValue);
          bValue = parseBrazilianDate(bValue);
        } else if (column === 'Fechamento') {
          // Para data de fechamento, OS sem fechamento (null/empty) devem aparecer por último
          const aHasDate = aValue && aValue.trim() !== '' && aValue !== 'Data inválida';
          const bHasDate = bValue && bValue.trim() !== '' && bValue !== 'Data inválida';
          
          if (!aHasDate && !bHasDate) return 0; // Ambas sem data
          if (!aHasDate) return direction === 'desc' ? 1 : -1; // A sem data vai para o final (desc) ou início (asc)
          if (!bHasDate) return direction === 'desc' ? -1 : 1; // B sem data vai para o final (desc) ou início (asc)
          
          aValue = parseBrazilianDate(aValue);
          bValue = parseBrazilianDate(bValue);
        } else {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
        }
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  // Ordenar equipamentos por quantidade de OS abertas (já vem ordenado do backend, mas podemos reordenar se necessário)

  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        // Alternar direção: asc -> desc -> null -> asc
        if (prev.direction === 'asc') {
          return { column, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          return { column, direction: null };
        } else {
          return { column, direction: 'asc' };
        }
      } else {
        return { column, direction: 'asc' };
      }
    });
  };

  // Colunas para a tabela de OS (usadas quando expandir equipamento)
  const osColumns = useMemo(() => [
    {
      key: 'OS' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'OS',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => (
        <span style={{ fontWeight: 600, color: theme.colors.primary }}>{row?.OS || row?.CodigoSerialOS || '-'}</span>
      ),
    },
    {
      key: 'Abertura' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Abertura',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => {
        if (!row) return <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>Sem data</span>;
        
        // Tentar múltiplos campos possíveis para data de abertura
        const dataAbertura = row?.Abertura || row?.DataAbertura || row?.dataAbertura || '';
        
        // Se não há data, mostrar mensagem amigável
        if (!dataAbertura || dataAbertura.trim() === '' || dataAbertura === 'Data inválida') {
          return <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>Sem data</span>;
        }
        
        // Tentar formatar a data (formato brasileiro: DD/MM/YYYY HH:mm)
        try {
          let date: Date;
          
          // Formato brasileiro: DD/MM/YYYY HH:mm ou DD/MM/YYYY
          if (dataAbertura.includes('/')) {
            const parts = dataAbertura.split(' ');
            const datePart = parts[0]; // "06/03/2018"
            const timePart = parts[1] || '00:00'; // "02:00" ou "00:00"
            const [dia, mes, ano] = datePart.split('/');
            const [hora, minuto] = timePart.split(':');
            date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora || '0'), parseInt(minuto || '0'));
          } else {
            // Formato ISO ou outros
            date = new Date(dataAbertura);
          }
          
          if (isNaN(date.getTime())) {
            console.warn('[OSPage] Data inválida após parse:', dataAbertura);
            return <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>Data inválida</span>;
          }
          
          // Formatar como DD/MM/YYYY HH:mm
          const dia = String(date.getDate()).padStart(2, '0');
          const mes = String(date.getMonth() + 1).padStart(2, '0');
          const ano = date.getFullYear();
          const hora = String(date.getHours()).padStart(2, '0');
          const minuto = String(date.getMinutes()).padStart(2, '0');
          
          return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
        } catch (error) {
          console.warn('[OSPage] Erro ao formatar data de abertura:', dataAbertura, error);
          return <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>Data inválida</span>;
        }
      },
    },
    {
      key: 'TempoProcessamento' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Tempo de Processamento',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => {
        if (!row) return <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>-</span>;
        
        const tempoProcessamento = calcularTempoProcessamento(row);
        
        // Se não há fechamento (OS ainda aberta)
        const dataFechamento = row?.Fechamento || row?.DataFechamento || row?.dataFechamento || '';
        if (!dataFechamento || dataFechamento.trim() === '' || dataFechamento === 'Data inválida') {
          return <span style={{ color: theme.colors.warning, fontWeight: 600, fontStyle: 'italic' }}>Ainda aberta</span>;
        }
        
        // Se não conseguiu calcular (dados inconsistentes)
        if (tempoProcessamento === null) {
          return <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>-</span>;
        }
        
        // Se tempo é 0 (fechada no mesmo dia)
        if (tempoProcessamento === 0) {
          return <span style={{ color: theme.colors.success, fontWeight: 600 }}>Mesmo dia</span>;
        }
        
        // Cores baseadas no tempo de processamento
        let cor = theme.colors.gray[600];
        if (tempoProcessamento > 30) cor = theme.colors.danger; // Mais de 30 dias
        else if (tempoProcessamento > 15) cor = theme.colors.warning; // Mais de 15 dias
        else if (tempoProcessamento > 7) cor = theme.colors.info; // Mais de 7 dias
        else cor = theme.colors.success; // 7 dias ou menos (rápido)
        
        return (
          <span style={{ color: cor, fontWeight: 600 }}>
            {tempoProcessamento} {tempoProcessamento === 1 ? 'dia' : 'dias'}
        </span>
        );
      },
    },
    {
      key: 'Fechamento' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Fechamento',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => {
        if (!row) return <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>-</span>;
        
        const dataFechamento = row?.Fechamento || row?.DataFechamento || row?.dataFechamento || '';
        
        // Se não há data de fechamento, mostrar como "Aberta"
        if (!dataFechamento || dataFechamento.trim() === '' || dataFechamento === 'Data inválida') {
          return <span style={{ color: theme.colors.warning, fontWeight: 600, fontStyle: 'italic' }}>Aberta</span>;
        }
        
        // Tentar formatar a data (formato brasileiro: DD/MM/YYYY HH:mm)
        try {
          let date: Date;
          
          // Formato brasileiro: DD/MM/YYYY HH:mm ou DD/MM/YYYY
          if (dataFechamento.includes('/')) {
            const parts = dataFechamento.split(' ');
            const datePart = parts[0]; // "06/03/2018"
            const timePart = parts[1] || '00:00'; // "10:00" ou "00:00"
            const [dia, mes, ano] = datePart.split('/');
            const [hora, minuto] = timePart.split(':');
            date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora || '0'), parseInt(minuto || '0'));
          } else {
            // Formato ISO ou outros
            date = new Date(dataFechamento);
          }
          
          if (isNaN(date.getTime())) {
            console.warn('[OSPage] Data de fechamento inválida:', dataFechamento);
            return <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>-</span>;
          }
          
          // Formatar como DD/MM/YYYY HH:mm
          const dia = String(date.getDate()).padStart(2, '0');
          const mes = String(date.getMonth() + 1).padStart(2, '0');
          const ano = date.getFullYear();
          const hora = String(date.getHours()).padStart(2, '0');
          const minuto = String(date.getMinutes()).padStart(2, '0');
          
          return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
        } catch (error) {
          console.warn('[OSPage] Erro ao formatar data de fechamento:', dataFechamento, error);
          return <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>-</span>;
        }
      },
    },
    {
      key: 'Equipamento' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Equipamento',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => row?.Equipamento || '-',
    },
    {
      key: 'Setor' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Setor',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => row?.Setor || '-',
    },
    {
      key: 'Oficina' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Oficina',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => row?.Oficina || '-',
    },
    {
      key: 'TipoDeManutencao' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Tipo de Manutenção',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => row?.TipoDeManutencao || '-',
    },
    {
      key: 'Prioridade' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Prioridade',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => row?.Prioridade || '-',
    },
    {
      key: 'Responsavel' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Responsável',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => row?.Responsavel || '-',
    },
    {
      key: 'Acoes' as keyof ListagemAnaliticaOsResumidaDTO,
      label: 'Ações',
      render: (value: any, row: ListagemAnaliticaOsResumidaDTO) => {
        const codigoSerialOS = row?.CodigoSerialOS;
        if (!codigoSerialOS) return '-';
        
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedOS(codigoSerialOS);
              setSelectedOSData(row);
              setIsOSModalOpen(true);
            }}
          style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: '12px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
              e.currentTarget.style.opacity = '1';
            }}
            title="Editar comentários e vínculo"
          >
            <FiEdit2 size={14} />
            Editar
          </button>
        );
      },
    },
  ], []);


  if (isLoading) {
    return (
      <div style={{ padding: isMobile ? mobileStyles.padding.md : theme.spacing.lg }}>
        <SkeletonScreen />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: isMobile ? mobileStyles.padding.md : theme.spacing.lg }}>
        <ErrorMessage
          title="Erro ao carregar ordens de serviço"
          message={error instanceof Error ? error.message : 'Não foi possível carregar as ordens de serviço. Verifique sua conexão e tente novamente.'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['os'] })}
          retryText="Tentar novamente"
        />
      </div>
    );
  }

  // Mensagem quando não há dados
  if (!isLoading && !error && equipamentos.length === 0) {
    return (
      <div style={{ padding: isMobile ? mobileStyles.padding.md : theme.spacing.lg, maxWidth: '1800px', margin: '0 auto' }}>
      <div
        style={{
          padding: theme.spacing.xl,
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
          textAlign: 'center',
          }}
        >
          <FiFileText size={48} color={theme.colors.gray[400]} style={{ marginBottom: theme.spacing.md }} />
          <h2 style={{ color: theme.colors.dark, marginBottom: theme.spacing.sm }}>
            Nenhuma ordem de serviço encontrada
          </h2>
          <p style={{ color: theme.colors.gray[600], marginBottom: theme.spacing.md }}>
            Não há ordens de serviço disponíveis no momento.
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['os'] })}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? mobileStyles.padding.md : theme.spacing.lg, maxWidth: '1800px', margin: '0 auto' }}>
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
              <FiPackage size={28} />
              Equipamentos com OS Abertas
            </h1>
            {totalEquipamentos > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                <p style={{ margin: 0, color: theme.colors.gray[600], fontSize: '14px', fontWeight: 600 }}>
                  {totalEquipamentos.toLocaleString('pt-BR')} equipamento(s)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Tempo Médio de Processamento por Ano */}
      {isLoadingTempoMedio && (
      <div
        style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            padding: theme.spacing.lg,
          marginBottom: theme.spacing.md,
            textAlign: 'center',
            color: theme.colors.gray[600],
        }}
      >
          Carregando dados do gráfico...
        </div>
      )}
      {tempoMedioData && tempoMedioData.dados && tempoMedioData.dados.length > 0 && (
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.md,
          }}
        >
          <h3
            style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: 600,
              color: theme.colors.dark,
              marginBottom: theme.spacing.md,
            }}
          >
            Tempo Médio de Processamento das OS por Ano
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: theme.colors.gray[600],
              marginBottom: theme.spacing.md,
            }}
          >
            Evolução do tempo médio (em dias) que as OS levam para serem processadas ao longo dos anos.
            {tempoMedioData.dados.length > 1 && (
              <span
            style={{
                  fontWeight: 600,
                  color:
                    tempoMedioData.dados[tempoMedioData.dados.length - 1].tempoMedio >
                    tempoMedioData.dados[tempoMedioData.dados.length - 2].tempoMedio
                      ? theme.colors.danger
                      : theme.colors.success,
                  marginLeft: theme.spacing.xs,
                }}
              >
                {tempoMedioData.dados[tempoMedioData.dados.length - 1].tempoMedio >
                tempoMedioData.dados[tempoMedioData.dados.length - 2].tempoMedio
                  ? '↑ Aumentou'
                  : '↓ Diminuiu'}
              </span>
            )}
          </p>
          <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
            <LineChart data={tempoMedioData.dados}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[200]} />
              <XAxis
                dataKey="ano"
                stroke={theme.colors.gray[600]}
                style={{ fontSize: '12px' }}
                label={{ value: 'Ano', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke={theme.colors.gray[600]}
                style={{ fontSize: '12px' }}
                label={{ value: 'Dias', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
            backgroundColor: theme.colors.white,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  borderRadius: theme.borderRadius.sm,
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'tempoMedio') {
                    return [`${value.toFixed(1)} dias`, 'Tempo Médio'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => `Ano ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="tempoMedio"
                name="Tempo Médio (dias)"
                stroke={theme.colors.primary}
                strokeWidth={2}
                dot={{ fill: theme.colors.primary, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
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
            <strong>Período analisado:</strong> {tempoMedioData.periodo.inicio} - {tempoMedioData.periodo.fim} |{' '}
            <strong>Total de OS analisadas:</strong>{' '}
            {tempoMedioData.dados.reduce((sum, item) => sum + item.quantidade, 0).toLocaleString('pt-BR')}
        </div>
        </div>
      )}

      {/* Lista de Equipamentos */}
        <div
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
          overflow: 'hidden',
          marginBottom: theme.spacing.md,
        }}
      >
        {equipamentos.length > 0 ? (
          <div style={{ padding: theme.spacing.md }}>
            {equipamentos.map((eq, index) => {
              const chave = eq.equipamentoId ? `id_${eq.equipamentoId}` : `tag_${eq.tag}`;
              const isExpanded = expandedEquipamentos.has(chave);
              
              return (
                <div
                  key={chave}
            style={{
                    border: `1px solid ${theme.colors.gray[200]}`,
                    borderRadius: theme.borderRadius.md,
                    marginBottom: index < equipamentos.length - 1 ? theme.spacing.md : 0,
                    overflow: 'hidden',
                  }}
                >
                  {/* Cabeçalho do Equipamento */}
                  <div
                    onClick={() => toggleEquipamento(chave)}
            style={{
                      padding: theme.spacing.md,
                      backgroundColor: isExpanded ? theme.colors.primary + '10' : theme.colors.gray[50],
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                      {isExpanded ? (
                        <FiChevronUp size={20} color={theme.colors.primary} />
                      ) : (
                        <FiChevronDown size={20} color={theme.colors.gray[600]} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                          <FiPackage size={20} color={theme.colors.primary} />
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme.colors.dark }}>
                            {eq.equipamento}
          </h3>
                          <span
                            style={{
                              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                              backgroundColor: eq.quantidadeOSAbertas > 5 ? theme.colors.danger : eq.quantidadeOSAbertas > 2 ? theme.colors.warning : theme.colors.info,
                              color: theme.colors.white,
                              borderRadius: theme.borderRadius.sm,
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            {eq.quantidadeOSAbertas} OS {eq.quantidadeOSAbertas === 1 ? 'aberta' : 'abertas'}
                          </span>
        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.md, fontSize: '14px', color: theme.colors.gray[600] }}>
                          <span><strong>Tag:</strong> {eq.tag}</span>
                          <span><strong>Setor:</strong> {eq.setor}</span>
                          <span><strong>Modelo:</strong> {eq.modelo}</span>
                          <span><strong>Fabricante:</strong> {eq.fabricante}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Lista de OS (expandida) */}
                  {isExpanded && eq.osAbertas.length > 0 && (
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.colors.white, borderTop: `1px solid ${theme.colors.gray[200]}` }}>
                      <VirtualizedDataTable
                        data={eq.osAbertas}
                        columns={osColumns}
                        selectable={false}
                        getId={(row) => {
                          if (!row) return 'unknown';
                          return String(row?.CodigoSerialOS || row?.OS || Math.random());
                        }}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        estimatedRowHeight={60}
                        maxHeight="40vh"
                      />
        </div>
      )}

      {/* Modal de Comentários e Vínculo */}
      {isOSModalOpen && selectedOS && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setIsOSModalOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
            }}
          />
          
          {/* Modal */}
          <div
          style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '600px',
            backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              boxShadow: theme.shadows.xl,
              zIndex: 9999,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: theme.spacing.lg,
                borderBottom: `1px solid ${theme.colors.gray[200]}`,
              }}
            >
              <div>
                <h2
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
                  <FiFileText size={24} color={theme.colors.primary} />
                  OS {selectedOSData?.OS || selectedOS}
                </h2>
                {selectedOSData && (
                  <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: '14px', color: theme.colors.gray[600] }}>
                    {selectedOSData.Equipamento} - {selectedOSData.Setor}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsOSModalOpen(false)}
            style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  padding: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FiX size={24} color={theme.colors.gray[600]} />
              </button>
      </div>

            {/* Content */}
            <div style={{ padding: theme.spacing.lg }}>
              {isLoadingOSData ? (
                <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
                  <p style={{ color: theme.colors.gray[600] }}>Carregando dados...</p>
                </div>
              ) : (
                <>
                  {/* Comentários */}
                  <div style={{ marginBottom: theme.spacing.xl }}>
                    <label
          style={{
            display: 'flex',
            alignItems: 'center',
                        gap: theme.spacing.sm,
                        marginBottom: theme.spacing.sm,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: theme.colors.dark,
                      }}
                    >
                      <FiMessageSquare size={18} color={theme.colors.primary} />
                      Comentários
                    </label>
                    <textarea
                      value={comentarios}
                      onChange={(e) => setComentarios(e.target.value)}
                      placeholder="Adicione comentários sobre esta ordem de serviço..."
                      style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: theme.spacing.md,
                        border: `1px solid ${theme.colors.gray[300]}`,
            borderRadius: theme.borderRadius.md,
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Vínculo com Solicitação de Compra */}
                  <div style={{ marginBottom: theme.spacing.xl }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
            gap: theme.spacing.sm,
                        marginBottom: theme.spacing.sm,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: theme.colors.dark,
                      }}
                    >
                      <FiShoppingCart size={18} color={theme.colors.primary} />
                      Solicitação de Compra
                    </label>
            <select
                      value={purchaseRequestId}
                      onChange={(e) => setPurchaseRequestId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: theme.spacing.md,
                        border: `1px solid ${theme.colors.gray[300]}`,
                        borderRadius: theme.borderRadius.md,
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        backgroundColor: theme.colors.white,
                      }}
                    >
                      <option value="">Nenhuma (remover vínculo)</option>
                      {purchaseRequests && Array.isArray(purchaseRequests) && purchaseRequests.map((pr: any) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.description} - {pr.status} (Setor: {pr.sectorId})
                        </option>
                      ))}
                    </select>
                    {osData?.purchaseRequest && (
                      <div
              style={{
                          marginTop: theme.spacing.sm,
                          padding: theme.spacing.sm,
                          backgroundColor: theme.colors.gray[50],
                borderRadius: theme.borderRadius.sm,
                fontSize: '13px',
                          color: theme.colors.gray[700],
                        }}
                      >
                        <strong>Vínculo atual:</strong> {osData.purchaseRequest.description} - {osData.purchaseRequest.status}
          </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: theme.spacing.md,
                      paddingTop: theme.spacing.md,
                      borderTop: `1px solid ${theme.colors.gray[200]}`,
                    }}
                  >
            <button
                      onClick={() => setIsOSModalOpen(false)}
              style={{
                        padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                        backgroundColor: theme.colors.gray[100],
                        color: theme.colors.gray[700],
                border: `1px solid ${theme.colors.gray[300]}`,
                        borderRadius: theme.borderRadius.md,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      Cancelar
            </button>
            <button
                      onClick={() => {
                        saveOSDataMutation.mutate({
                          comentarios: comentarios || undefined,
                          purchaseRequestId: purchaseRequestId || null,
                        });
                      }}
                      disabled={saveOSDataMutation.isPending}
              style={{
                        padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                        backgroundColor: theme.colors.primary,
                        color: theme.colors.white,
                        border: 'none',
                        borderRadius: theme.borderRadius.md,
                        cursor: saveOSDataMutation.isPending ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: saveOSDataMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {saveOSDataMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
                </>
              )}
        </div>
          </div>
        </>
      )}
    </div>
  );
})}
          </div>
        ) : (
          <div style={{ padding: theme.spacing.xl, textAlign: 'center', color: theme.colors.gray[600] }}>
            <FiPackage size={48} color={theme.colors.gray[400]} style={{ marginBottom: theme.spacing.md }} />
            <p>Nenhum equipamento com OS abertas encontrado</p>
          </div>
        )}
      </div>


    </div>
  );
}
