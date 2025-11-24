import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { FiPackage, FiAlertCircle, FiCheckCircle, FiStar, FiEye, FiX, FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import VirtualizedDataTable from '../components/VirtualizedDataTable';
import ExportButton from '../components/ExportButton';
import SavedFiltersManager from '../components/SavedFiltersManager';
import SkeletonScreen from '../components/SkeletonScreen';
import ErrorMessage from '../components/ErrorMessage';
import { theme } from '../styles/theme';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useDebounce } from '../hooks/useDebounce';
import { getResponsivePadding } from '../utils/responsive';
import { apiClient } from '../lib/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatBrazilianDate, parseBrazilianDate, formatBrazilianDateTime } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import { getInputA11yProps, handleKeyboardNavigation } from '../utils/accessibility';
import type { EquipamentoDTO } from '../../types/effort';

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string;
  direction: SortDirection;
}

export default function InvPage() {
  const { isAdmin, allowedSectors } = usePermissions();
  const isMobile = useIsMobile();
  const padding = getResponsivePadding(isMobile, false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedEquipment, setSelectedEquipment] = useState<EquipamentoDTO | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [filters, setFilters] = useState({
    anvisaVencida: false,
    eolProximo: false,
    eosProximo: false,
    idade: null as string | null, // '0-2', '2-5', '5-10', '10+', null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isTableMinimized, setIsTableMinimized] = useState(true); // Começar colapsado
  const [tableFilters, setTableFilters] = useState({
    tipo: '' as string, // Criticidade ou Prioridade
    setor: '' as string,
    idade: '' as string, // '0-2', '2-5', '5-10', '10+'
  });
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();

  // Carregar filtro compartilhado da URL
  useEffect(() => {
    const filterToken = searchParams.get('filter');
    if (filterToken) {
      fetch(`/api/saved-filters/shared/${filterToken}`)
        .then((res) => res.json())
        .then((filter) => {
          try {
            const loadedFilters = JSON.parse(filter.filters);
            // Aplicar filtros carregados
            if (loadedFilters.tableFilters) {
              setTableFilters(loadedFilters.tableFilters);
            }
            if (loadedFilters.filters) {
              setFilters(loadedFilters.filters);
            }
            if (loadedFilters.searchTerm) {
              setSearchTerm(loadedFilters.searchTerm);
            }
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

  // Construir query string para setores se não for admin
  const setoresQuery = !isAdmin && allowedSectors.length > 0
    ? allowedSectors.join(',')
    : undefined;

  // Sempre buscar todos os resultados (sem paginação)
  const { data: responseData, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['inv', setoresQuery],
    queryFn: async () => {
      const url = setoresQuery
        ? `/api/ecm/lifecycle/inventario?page=1&pageSize=50000&setores=${setoresQuery}`
        : `/api/ecm/lifecycle/inventario?page=1&pageSize=50000`;
      const response = await apiClient.get<{
        data: (EquipamentoDTO & { IsCritical?: boolean; IsMonitored?: boolean })[];
        statistics: {
          total: number;
          ativos: number;
          inativos: number;
          anvisaVencida: number;
          eolProximo: number;
          eosProximo: number;
          valorTotalSubstituicao: number;
          quantidadeTotalOS: number;
        };
      }>(url);
      
      // Garantir que a resposta tenha a estrutura esperada
      if (response && Array.isArray(response.data)) {
        return response;
      }
      
      // Se a resposta vier em formato diferente, tentar adaptar
      if (response && Array.isArray(response)) {
        return { data: response, statistics: {} };
      }
      
      return { data: [], statistics: {} };
    },
  });

  // Debug: verificar estrutura da resposta
  useEffect(() => {
    if (responseData) {
      logger.debug('Response data structure:', { 
        hasData: !!responseData.data, 
        dataLength: responseData.data?.length,
        keys: Object.keys(responseData)
      });
    }
  }, [responseData]);

  const data = responseData?.data || [];
  const statistics = responseData?.statistics;

  const toggleCriticalMutation = useMutation({
    mutationFn: async ({ effortId, criticalFlag }: { effortId: number; criticalFlag: boolean }) => {
      return apiClient.patch(`/api/ecm/critical/${effortId}/critical`, { criticalFlag });
    },
    onSuccess: (_, variables) => {
      toast.success(variables.criticalFlag ? 'Equipamento marcado como crítico' : 'Equipamento removido dos críticos');
      queryClient.invalidateQueries({ queryKey: ['inv'] });
      queryClient.invalidateQueries({ queryKey: ['critical-equipamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'critical-monitored-alerts'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar flag crítico');
      logger.error('Erro ao atualizar flag crítico', error);
    },
  });

  const toggleMonitoredMutation = useMutation({
    mutationFn: async ({
      effortId,
      monitoredFlag,
    }: {
      effortId: number;
      monitoredFlag: boolean;
    }) => {
      return apiClient.patch(`/api/ecm/critical/${effortId}/monitored`, { monitoredFlag });
    },
    onSuccess: (_, variables) => {
      toast.success(variables.monitoredFlag ? 'Equipamento marcado como monitorado' : 'Equipamento removido dos monitorados');
      queryClient.invalidateQueries({ queryKey: ['inv'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'critical-monitored-alerts'] });
      // Processar OS para criar alertas
      apiClient.post('/api/ecm/alerts/process', {}).catch(() => {});
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar flag monitorado');
      logger.error('Erro ao atualizar flag monitorado', error);
    },
  });



  // Funções auxiliares para verificar EoL e EoS próximos
  const isEolProximo = (eol: string) => {
    if (!eol || eol.trim() === '') return false;
    try {
      const eolDate = new Date(eol);
      if (isNaN(eolDate.getTime())) return false;
      const hoje = new Date();
      const diffMonths = (eolDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30);
      // Inclui qualquer data vencida (independente de quando) OU datas futuras até 12 meses
      return diffMonths <= 12;
    } catch {
      return false;
    }
  };

  const isEosProximo = (eos: string) => {
    if (!eos || eos.trim() === '') return false;
    try {
      const eosDate = new Date(eos);
      if (isNaN(eosDate.getTime())) return false;
      const hoje = new Date();
      const diffMonths = (eosDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30);
      // Inclui qualquer data vencida (independente de quando) OU datas futuras até 12 meses
      return diffMonths <= 12;
    } catch {
      return false;
    }
  };

  const isAnvisaVencida = (validade: string) => {
    if (!validade || validade.trim() === '') return false;
    try {
      const date = new Date(validade);
      if (isNaN(date.getTime())) return false;
      return date < new Date();
    } catch {
      return false;
    }
  };

  /**
   * Converte valor monetário brasileiro (ex: "4.500,00") para número
   * Remove pontos (separador de milhar) e substitui vírgula por ponto (separador decimal)
   */
  const parseBrazilianCurrency = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Remove espaços e caracteres não numéricos exceto vírgula e ponto
    let cleaned = value.trim().replace(/[^\d,.-]/g, '');
    // Se não tem vírgula, trata como número simples
    if (!cleaned.includes(',')) {
      return parseFloat(cleaned) || 0;
    }
    // Remove pontos (separador de milhar) e substitui vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Função de ordenação
  const sortData = (dataToSort: any[], column: string, direction: SortDirection): any[] => {
    if (!direction) return dataToSort;

    const sorted = [...dataToSort].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      // Tratamento especial para diferentes tipos de dados
      if (column === 'IsCritical' || column === 'IsMonitored') {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      } else if (column === 'ValorDeSubstituicao') {
        aValue = parseBrazilianCurrency(aValue || '0');
        bValue = parseBrazilianCurrency(bValue || '0');
      } else if (column === 'DataDeCadastro' || column === 'DataDeAquisicao') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (column === 'ValidadeDoRegistroAnvisa' || column === 'EndOfLife' || column === 'EndOfService') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
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

  // Função para buscar em todos os campos do equipamento (memoizada para melhor performance)
  const searchInAllFields = useCallback((equipment: EquipamentoDTO, term: string): boolean => {
    if (!term || term.trim() === '') return true;
    
    const searchLower = term.toLowerCase().trim();
    
    // Lista de todos os campos para buscar
    const fieldsToSearch = [
      equipment.Tag,
      equipment.NSerie,
      equipment.Patrimonio,
      equipment.Equipamento,
      equipment.Modelo,
      equipment.Fabricante,
      equipment.Criticidade,
      equipment.Prioridade,
      equipment.RazaoSocial,
      equipment.CodigoCliente,
      equipment.Cliente,
      equipment.Setor,
      equipment.GrupoDeSetores,
      equipment.Endereco,
      equipment.UF,
      equipment.Bairro,
      equipment.Cidade,
      equipment.Cep,
      equipment.CentroDeCusto,
      equipment.NotaFiscal,
      equipment.ComponenteDe,
      equipment.RegistroAnvisa,
      equipment.Situacao,
      equipment.Status,
      equipment.Fornecedor,
      equipment.Observacao,
      equipment.GarantiaExterna,
      // Valores formatados
      equipment.ValorDeAquisicao,
      equipment.ValorDeSubstituicao,
      // Datas (buscar também no formato brasileiro)
      equipment.DataDeCadastro ? formatBrazilianDate(equipment.DataDeCadastro) : '',
      equipment.DataDeAquisicao ? formatBrazilianDate(equipment.DataDeAquisicao) : '',
      equipment.DataDeFabricacao ? formatBrazilianDate(equipment.DataDeFabricacao) : '',
      equipment.DataDeInstalação ? formatBrazilianDate(equipment.DataDeInstalação) : '',
      equipment.DataDeInativação ? formatBrazilianDate(equipment.DataDeInativação) : '',
      equipment.DataDeGarantia ? formatBrazilianDate(equipment.DataDeGarantia) : '',
      equipment.DataDeGarantiaEstendida ? formatBrazilianDate(equipment.DataDeGarantiaEstendida) : '',
      equipment.ValidadeDoRegistroAnvisa ? formatBrazilianDate(equipment.ValidadeDoRegistroAnvisa) : '',
      equipment.EndOfLife ? formatBrazilianDate(equipment.EndOfLife) : '',
      equipment.EndOfService ? formatBrazilianDate(equipment.EndOfService) : '',
    ];

    // Buscar em todos os campos (case-insensitive)
    return fieldsToSearch.some(field => {
      if (!field) return false;
      return field.toString().toLowerCase().includes(searchLower);
    });
  }, []);

  const filteredData = useMemo(() => {
    if (!data) return [];
    let filtered = [...data]; // Criar cópia para não modificar o original

    // Aplicar busca em todos os campos (usando debouncedSearchTerm para melhor performance)
    if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
      filtered = filtered.filter((e) => searchInAllFields(e, debouncedSearchTerm));
    }

    // Aplicar apenas filtros dos cards (anvisaVencida, eolProximo, eosProximo)
    // Filtro ANVISA vencida
    if (filters.anvisaVencida) {
      filtered = filtered.filter((e) => {
        if (!e.ValidadeDoRegistroAnvisa || e.ValidadeDoRegistroAnvisa.trim() === '') return false;
        try {
          const date = new Date(e.ValidadeDoRegistroAnvisa);
          if (isNaN(date.getTime())) return false;
          return date < new Date();
        } catch {
          return false;
        }
      });
    }

    // Filtro EoL próximo (1 ano)
    if (filters.eolProximo) {
      filtered = filtered.filter((e) => {
        return isEolProximo(e.EndOfLife || '');
      });
    }

    // Filtro EoS próximo (1 ano)
    if (filters.eosProximo) {
      filtered = filtered.filter((e) => {
        return isEosProximo(e.EndOfService || '');
      });
    }

    // Filtro de idade (usa APENAS DataDeCadastro)
    if (filters.idade) {
      const hoje = new Date();
      filtered = filtered.filter((e) => {
        // Usa APENAS DataDeCadastro
        if (!e.DataDeCadastro || e.DataDeCadastro.trim() === '') {
          return filters.idade === 'sem-data';
        }

        try {
          const dataCadastro = new Date(e.DataDeCadastro);
          if (isNaN(dataCadastro.getTime())) {
            return filters.idade === 'sem-data';
          }

          const diffTime = hoje.getTime() - dataCadastro.getTime();
          const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

          if (diffYears < 0) {
            return filters.idade === '0-2';
          } else if (diffYears < 2) {
            return filters.idade === '0-2';
          } else if (diffYears < 5) {
            return filters.idade === '2-5';
          } else if (diffYears < 10) {
            return filters.idade === '5-10';
          } else {
            return filters.idade === '10+';
          }
        } catch {
          return filters.idade === 'sem-data';
        }
      });
    }

    // Aplicar filtros da tabela (tipo, setor, idade)
    if (tableFilters.tipo) {
      filtered = filtered.filter((e) => e.Equipamento === tableFilters.tipo);
    }
    if (tableFilters.setor) {
      filtered = filtered.filter((e) => e.Setor === tableFilters.setor);
    }
    if (tableFilters.idade) {
      const hoje = new Date();
      filtered = filtered.filter((e) => {
        // Usa APENAS DataDeCadastro
        if (!e.DataDeCadastro || e.DataDeCadastro.trim() === '') {
          return tableFilters.idade === 'sem-data';
        }

        try {
          const dataCadastro = new Date(e.DataDeCadastro);
          if (isNaN(dataCadastro.getTime())) {
            return tableFilters.idade === 'sem-data';
          }

          const diffTime = hoje.getTime() - dataCadastro.getTime();
          const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

          if (diffYears < 0) {
            return tableFilters.idade === '0-2';
          } else if (diffYears < 2) {
            return tableFilters.idade === '0-2';
          } else if (diffYears < 5) {
            return tableFilters.idade === '2-5';
          } else if (diffYears < 10) {
            return tableFilters.idade === '5-10';
          } else {
            return tableFilters.idade === '10+';
          }
        } catch {
          return tableFilters.idade === 'sem-data';
        }
      });
    }

    // Aplicar ordenação
    if (sortConfig.direction) {
      filtered = sortData(filtered, sortConfig.column, sortConfig.direction);
    }

    return filtered;
  }, [data, debouncedSearchTerm, filters.anvisaVencida, filters.eolProximo, filters.eosProximo, filters.idade, tableFilters, sortConfig, isEolProximo, isEosProximo, searchInAllFields]);

  const handleSelectRow = (id: number, selected: boolean) => {
    const newSelected = new Set(selectedRows);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(filteredData.map((e) => e.Id)));
    } else {
      setSelectedRows(new Set());
    }
  };


  // Calcular estatísticas baseadas nos dados FILTRADOS (não do backend)
  // IMPORTANTE: Este useMemo DEVE estar antes dos retornos condicionais
  const statisticsFromFiltered = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        total: 0,
        valorTotalSubstituicao: 0,
        anvisaVencida: 0,
        eolProximo: 0,
        eosProximo: 0,
      };
    }

    let valorTotalSubstituicao = 0;
    let anvisaVencida = 0;
    let eolProximo = 0;
    let eosProximo = 0;

    filteredData.forEach((e) => {
      // Calcular valor total de substituição
      if (e.ValorDeSubstituicao) {
        const valor = parseBrazilianCurrency(e.ValorDeSubstituicao);
        if (!isNaN(valor) && valor > 0) {
          valorTotalSubstituicao += valor;
        }
      }

      // Contar ANVISA vencida
      if (isAnvisaVencida(e.ValidadeDoRegistroAnvisa || '')) {
        anvisaVencida++;
      }

      // Contar EoL próximo
      if (isEolProximo(e.EndOfLife || '')) {
        eolProximo++;
      }

      // Contar EoS próximo
      if (isEosProximo(e.EndOfService || '')) {
        eosProximo++;
      }
    });

    return {
      total: filteredData.length,
      valorTotalSubstituicao,
      anvisaVencida,
      eolProximo,
      eosProximo,
    };
  }, [filteredData]);

  // Calcular valores de substituição por categoria para o gráfico
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    let valorOk = 0;
    let valorAnvisaVencida = 0;
    let valorEolProximo = 0;
    let valorEosProximo = 0;

    data.forEach((e) => {
      const valor = e.ValorDeSubstituicao ? parseBrazilianCurrency(e.ValorDeSubstituicao) : 0;
      if (valor <= 0) return;

      const temAnvisaVencida = isAnvisaVencida(e.ValidadeDoRegistroAnvisa || '');
      const temEolProximo = isEolProximo(e.EndOfLife || '');
      const temEosProximo = isEosProximo(e.EndOfService || '');

      // Prioridade: ANVISA vencida > EoL > EoS > OK
      if (temAnvisaVencida) {
        valorAnvisaVencida += valor;
      } else if (temEolProximo) {
        valorEolProximo += valor;
      } else if (temEosProximo) {
        valorEosProximo += valor;
      } else {
        valorOk += valor;
      }
    });

    // Criar array com cada categoria como um item separado para melhor visualização
    // O Treemap precisa de name e value como propriedades principais
    return [
      {
        name: 'Equipamentos OK',
        categoria: 'Equipamentos OK',
        value: valorOk,
        valor: valorOk,
        cor: '#28A745', // theme.colors.success
      },
      {
        name: 'ANVISA Vencida',
        categoria: 'ANVISA Vencida',
        value: valorAnvisaVencida,
        valor: valorAnvisaVencida,
        cor: '#DC3545', // theme.colors.danger
      },
      {
        name: 'EoL Próximo',
        categoria: 'EoL Próximo',
        value: valorEolProximo,
        valor: valorEolProximo,
        cor: '#FFC107', // theme.colors.warning
      },
      {
        name: 'EoS Próximo',
        categoria: 'EoS Próximo',
        value: valorEosProximo,
        valor: valorEosProximo,
        cor: '#17A2B8', // theme.colors.info
      },
    ].filter((item) => item.value > 0); // Filtrar categorias sem valor
  }, [data, isAnvisaVencida, isEolProximo, isEosProximo]);

  // Calcular custo de substituição por setor (Top 10)
  const custoPorSetorData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    const setorMap = new Map<string, number>();

    data.forEach((e) => {
      const setor = e.Setor?.trim() || 'Sem Setor';
      if (e.ValorDeSubstituicao) {
        const valor = parseBrazilianCurrency(e.ValorDeSubstituicao);
        if (!isNaN(valor) && valor > 0) {
          const atual = setorMap.get(setor) || 0;
          setorMap.set(setor, atual + valor);
        }
      }
    });

    // Converter para array, ordenar por valor e pegar top 10
    return Array.from(setorMap.entries())
      .map(([setor, valor]) => ({
        setor,
        valor,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [data]);

  // Calcular idade dos equipamentos para o gráfico de pizza
  // Usa APENAS DataDeCadastro (todos os equipamentos devem ter esta data)
  const idadeChartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    const hoje = new Date();
    let idade0a2 = 0;
    let idade2a5 = 0;
    let idade5a10 = 0;
    let idade10mais = 0;
    let semData = 0;

    data.forEach((e) => {
      // Usa APENAS DataDeCadastro
      if (!e.DataDeCadastro || e.DataDeCadastro.trim() === '') {
        semData++;
        return;
      }

      try {
        const dataCadastro = new Date(e.DataDeCadastro);
        if (isNaN(dataCadastro.getTime())) {
          semData++;
          return;
        }

        const diffTime = hoje.getTime() - dataCadastro.getTime();
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

        if (diffYears < 0) {
          // Data futura, considerar como 0 anos
          idade0a2++;
        } else if (diffYears < 2) {
          idade0a2++;
        } else if (diffYears < 5) {
          idade2a5++;
        } else if (diffYears < 10) {
          idade5a10++;
        } else {
          idade10mais++;
        }
      } catch {
        semData++;
      }
    });

    return [
      {
        name: '0 a 2 anos',
        value: idade0a2,
        cor: '#28A745', // Verde - novo
      },
      {
        name: '2 a 5 anos',
        value: idade2a5,
        cor: '#17A2B8', // Azul claro - relativamente novo
      },
      {
        name: '5 a 10 anos',
        value: idade5a10,
        cor: '#FFC107', // Amarelo - atenção
      },
      {
        name: '10+ anos',
        value: idade10mais,
        cor: '#DC3545', // Vermelho - antigo
      },
      ...(semData > 0 ? [{
        name: 'Sem data',
        value: semData,
        cor: '#6B7280', // Cinza - sem informação
      }] : []),
    ].filter((item) => item.value > 0);
  }, [data]);

  // Usar estatísticas calculadas dos dados filtrados
  const totalEquipamentos = statisticsFromFiltered.total;
  const valorTotalSubstituicao = statisticsFromFiltered.valorTotalSubstituicao;
  const quantidadeTotalOS = statistics?.quantidadeTotalOS || 0; // Este vem do backend (não filtrado)
  const anvisaVencida = statisticsFromFiltered.anvisaVencida;
  const eolProximo = statisticsFromFiltered.eolProximo;
  const eosProximo = statisticsFromFiltered.eosProximo;

  // Funções para aplicar filtros ao clicar nos cards
  const handleFilterClick = (filterType: string) => {
    switch (filterType) {
      case 'anvisaVencida':
        setFilters((prev) => ({ 
          ...prev, 
          anvisaVencida: true, // Sempre ativar o filtro ao clicar
          eolProximo: false,
          eosProximo: false,
        }));
        break;
      case 'eolProximo':
        setFilters((prev) => ({ 
          ...prev, 
          eolProximo: true, // Sempre ativar o filtro ao clicar
          anvisaVencida: false,
          eosProximo: false,
        }));
        break;
      case 'eosProximo':
        setFilters((prev) => ({ 
          ...prev, 
          eosProximo: true, // Sempre ativar o filtro ao clicar
          anvisaVencida: false,
          eolProximo: false,
        }));
        break;
      case 'total':
        setFilters({ 
          anvisaVencida: false, 
          eolProximo: false, 
          eosProximo: false 
        });
        break;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '') return '-';
    return formatBrazilianDate(dateStr);
  };

  const formatCurrency = (value: string) => {
    if (!value) return '-';
    const numValue = parseBrazilianCurrency(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  const getCriticidadeColor = (criticidade: string) => {
    switch (criticidade?.toLowerCase()) {
      case 'alta':
        return theme.colors.danger;
      case 'média':
        return theme.colors.warning;
      case 'baixa':
        return theme.colors.success;
      default:
        return theme.colors.gray[500];
    }
  };

  const handleSort = (column: string, direction: SortDirection) => {
    setSortConfig({ column, direction });
  };

  // Calcular tipos de equipamentos com contagem (deve estar antes de qualquer return)
  const tiposComContagem = useMemo(() => {
    if (!data || data.length === 0) return [];
    const tipoCount = new Map<string, number>();
    data.forEach((e) => {
      if (e.Equipamento) {
        const count = tipoCount.get(e.Equipamento) || 0;
        tipoCount.set(e.Equipamento, count + 1);
      }
    });
    
    return Array.from(tipoCount.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tipo, quantidade]) => ({
        tipo,
        quantidade,
        label: `${tipo} - ${quantidade}`,
      }));
  }, [data]);

  // Definir colunas ANTES dos early returns para evitar erro de hooks
  const columns = useMemo(() => [
    {
      key: '_index' as any,
      label: '#',
      width: '60px',
      sortable: false,
      render: (_value: any, _row: any, index: number) => {
        return (
          <span style={{ fontSize: '13px', color: theme.colors.gray[600], fontWeight: 500 }}>
            {index + 1}
          </span>
        );
      },
    },
    {
      key: 'IsCritical' as any,
      label: 'Crítico',
      width: '80px',
      sortable: true,
      render: (value: boolean, row: any) => {
        const isCritical = value || false;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevenir clique na linha
              toggleCriticalMutation.mutate({
                effortId: row.Id,
                criticalFlag: !isCritical,
              });
            }}
            aria-label={isCritical ? 'Remover dos críticos' : 'Marcar como crítico'}
            aria-pressed={isCritical}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              padding: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onKeyDown={(e) => handleKeyboardNavigation(() => {
              toggleCriticalMutation.mutate({
                effortId: row.Id,
                criticalFlag: !isCritical,
              });
            }, e)}
            title={isCritical ? 'Remover dos críticos' : 'Marcar como crítico'}
          >
            <FiStar
              size={20}
              color={isCritical ? theme.colors.warning : theme.colors.gray[400]}
              fill={isCritical ? theme.colors.warning : 'none'}
            />
          </button>
        );
      },
    },
    {
      key: 'IsMonitored' as any,
      label: 'Monitorado',
      width: '100px',
      sortable: true,
      render: (value: boolean, row: any) => {
        const isMonitored = value || false;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevenir clique na linha
              toggleMonitoredMutation.mutate({
                effortId: row.Id,
                monitoredFlag: !isMonitored,
              });
            }}
            aria-label={isMonitored ? 'Remover dos monitorados' : 'Marcar como monitorado'}
            aria-pressed={isMonitored}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              padding: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onKeyDown={(e) => handleKeyboardNavigation(() => {
              toggleMonitoredMutation.mutate({
                effortId: row.Id,
                monitoredFlag: !isMonitored,
              });
            }, e)}
            title={isMonitored ? 'Remover dos monitorados' : 'Marcar como monitorado'}
          >
            <FiEye
              size={20}
              color={isMonitored ? theme.colors.info : theme.colors.gray[400]}
              fill={isMonitored ? theme.colors.info : 'none'}
            />
          </button>
        );
      },
    },
    {
      key: 'actions' as any,
      label: 'Ações',
      width: '100px',
      sortable: false,
      render: (value: any, row: any) => {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevenir clique na linha
              setSelectedEquipment(row);
            }}
            aria-label={`Visualizar detalhes do equipamento ${row.Tag || row.Equipamento || ''}`}
            style={{
              border: `1px solid ${theme.colors.primary}`,
              backgroundColor: theme.colors.white,
              color: theme.colors.primary,
              cursor: 'pointer',
              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
              borderRadius: theme.borderRadius.sm,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primary;
              e.currentTarget.style.color = theme.colors.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.white;
              e.currentTarget.style.color = theme.colors.primary;
            }}
            onKeyDown={(e) => handleKeyboardNavigation(() => setSelectedEquipment(row), e)}
            title="Visualizar detalhes do equipamento"
          >
            <FiEye size={16} />
            Ver
          </button>
        );
      },
    },
    {
      key: 'Tag' as keyof EquipamentoDTO,
      label: 'Tag',
      width: '120px',
      sortable: true,
      render: (value: string) => (
        <span style={{ fontWeight: 600, color: theme.colors.primary }}>{value}</span>
      ),
    },
    {
      key: 'Equipamento' as keyof EquipamentoDTO,
      label: 'Equipamento',
      width: '200px',
      sortable: true,
    },
    {
      key: 'Fabricante' as keyof EquipamentoDTO,
      label: 'Fabricante',
      width: '120px',
      sortable: true,
    },
    {
      key: 'Modelo' as keyof EquipamentoDTO,
      label: 'Modelo',
      width: '150px',
      sortable: true,
    },
    {
      key: 'Setor' as keyof EquipamentoDTO,
      label: 'Setor',
      width: '120px',
      sortable: true,
    },
    {
      key: 'RegistroAnvisa' as keyof EquipamentoDTO,
      label: 'Registro ANVISA',
      width: '140px',
      sortable: true,
      render: (value: string, row: EquipamentoDTO) => (
        <div>
          <div style={{ fontWeight: 500 }}>{value || '-'}</div>
          {row.ValidadeDoRegistroAnvisa && (
            <div
              style={{
                fontSize: '11px',
                color: isAnvisaVencida(row.ValidadeDoRegistroAnvisa)
                  ? theme.colors.danger
                  : theme.colors.gray[600],
                marginTop: '2px',
              }}
            >
              Válido até: {formatDate(row.ValidadeDoRegistroAnvisa)}
              {isAnvisaVencida(row.ValidadeDoRegistroAnvisa) && (
                <span style={{ marginLeft: '4px', fontWeight: 600 }}>⚠️</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'DataDeCadastro' as keyof EquipamentoDTO,
      label: 'Ano',
      width: '80px',
      sortable: true,
      render: (value: string, row: EquipamentoDTO) => {
        // Usa DataDeCadastro para mostrar o ano
        const dataCadastro = row.DataDeCadastro || value;
        if (!dataCadastro || dataCadastro.trim() === '') {
          return '-';
        }
        try {
          const date = new Date(dataCadastro);
          if (isNaN(date.getTime())) {
            return '-';
          }
          return date.getFullYear();
        } catch {
          return '-';
        }
      },
    },
    {
      key: 'Criticidade' as keyof EquipamentoDTO,
      label: 'Criticidade',
      width: '100px',
      sortable: true,
      render: (value: string) => (
        <span
          style={{
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.sm,
            backgroundColor: `${getCriticidadeColor(value)}20`,
            color: getCriticidadeColor(value),
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'ValorDeSubstituicao' as keyof EquipamentoDTO,
      label: 'Valor Substituição',
      width: '130px',
      sortable: true,
      render: (value: string) => (
        <span style={{ fontWeight: 600, fontSize: '13px' }}>{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'EndOfLife' as keyof EquipamentoDTO,
      label: 'EoL',
      width: '100px',
      sortable: true,
      render: (value: string, row: EquipamentoDTO) => {
        if (!value) return '-';
        const eolDate = formatDate(value);
        const isProximo = isEolProximo(value);
        return (
          <span
            style={{
              color: isProximo ? theme.colors.warning : theme.colors.gray[700],
              fontWeight: isProximo ? 600 : 400,
              fontSize: '13px',
            }}
          >
            {eolDate}
            {isProximo && <span style={{ marginLeft: '4px' }}>⚠️</span>}
          </span>
        );
      },
    },
    {
      key: 'EndOfService' as keyof EquipamentoDTO,
      label: 'EoS',
      width: '100px',
      sortable: true,
      render: (value: string, row: EquipamentoDTO) => {
        if (!value) return '-';
        const eosDate = formatDate(value);
        const isProximo = isEosProximo(value);
        return (
          <span
            style={{
              color: isProximo ? theme.colors.warning : theme.colors.gray[700],
              fontWeight: isProximo ? 600 : 400,
              fontSize: '13px',
            }}
          >
            {eosDate}
            {isProximo && <span style={{ marginLeft: '4px' }}>⚠️</span>}
          </span>
        );
      },
    },
  ], [toggleCriticalMutation, toggleMonitoredMutation, setSelectedEquipment, isAnvisaVencida, isEolProximo, isEosProximo, formatDate, formatCurrency, getCriticidadeColor]);

  // Colunas para exportação (sem render functions e sem colunas de ação)
  // IMPORTANTE: Este useMemo deve estar ANTES dos early returns
  const exportColumns = useMemo(() => {
    // Se columns ainda não foi definido (durante loading), retornar array vazio
    if (!columns || columns.length === 0) return [];
    return columns
      .filter((col) => {
        const key = String(col.key);
        // Excluir colunas de índice, ações e botões interativos
        return (
          key !== '_index' &&
          key !== 'IsCritical' &&
          key !== 'IsMonitored' &&
          key !== 'actions'
        );
      })
      .map((col) => ({
        key: String(col.key),
        label: col.label,
      }));
  }, [columns]);

  if (isLoading) {
    return (
      <div style={{ padding: padding, minHeight: '100vh', overflowY: 'auto' }}>
        <SkeletonScreen type="table" rows={10} columns={15} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: padding }}>
        <ErrorMessage
          title="Erro ao carregar inventário"
          message={error instanceof Error ? error.message : 'Não foi possível carregar o inventário. Verifique sua conexão e tente novamente.'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['inv'] })}
          retryText="Tentar novamente"
        />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: theme.spacing.md }}>
        <p>Nenhum equipamento encontrado</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: padding,
        maxWidth: '1600px',
        margin: '0 auto',
        minHeight: '100vh',
        overflowY: 'auto',
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
              <FiPackage size={28} color={theme.colors.primary} />
              Inventário
            </h1>
            <p
              style={{
                color: theme.colors.gray[600],
                margin: 0,
                fontSize: '14px',
              }}
            >
              Gestão do ciclo de vida dos equipamentos médicos
            </p>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
            <SavedFiltersManager
              page="inventario"
              currentFilters={{
                filters,
                tableFilters,
                searchTerm,
              }}
              onLoadFilter={(loadedFilters) => {
                if (loadedFilters.tableFilters) {
                  setTableFilters(loadedFilters.tableFilters);
                }
                if (loadedFilters.filters) {
                  setFilters(loadedFilters.filters);
                }
                if (loadedFilters.searchTerm) {
                  setSearchTerm(loadedFilters.searchTerm);
                }
              }}
            />
            {filteredData && filteredData.length > 0 && (
              <ExportButton
                data={filteredData}
                filename={`inventario-${new Date().toISOString().split('T')[0]}`}
                columns={exportColumns}
                variant="both"
                label="Exportar"
              />
            )}
        </div>
      </div>

      {/* Campo de Busca */}
      <div
        style={{
          marginBottom: theme.spacing.lg,
        }}
      >
        <label
          htmlFor="search-input"
          style={{
            display: 'block',
            marginBottom: theme.spacing.xs,
            fontSize: '14px',
            fontWeight: 500,
            color: theme.colors.dark,
          }}
        >
          Buscar Equipamentos
        </label>
        <div
          style={{
            display: 'flex',
            gap: theme.spacing.sm,
            alignItems: 'center',
          }}
        >
          <input
            id="search-input"
            type="text"
            placeholder="Buscar por qualquer campo (Tag, Nome, Fabricante, Modelo, Setor, etc.)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: `${theme.spacing.md}px`,
              border: `1px solid ${theme.colors.gray[300]}`,
              borderRadius: theme.borderRadius.md,
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
              backgroundColor: theme.colors.white,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = theme.colors.primary;
              e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary}20`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = theme.colors.gray[300];
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
                backgroundColor: theme.colors.gray[200],
                border: 'none',
                borderRadius: theme.borderRadius.md,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                fontSize: '14px',
                color: theme.colors.gray[700],
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.gray[300];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.gray[200];
              }}
            >
              <FiX size={16} />
              Limpar
            </button>
          )}
        </div>
      </div>


      {/* Cards de estatísticas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.md,
        }}
      >
        <div
          onClick={() => handleFilterClick('total')}
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = theme.shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = theme.shadows.sm;
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            Total
          </p>
          <h3
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            {totalEquipamentos}
          </h3>
          {valorTotalSubstituicao > 0 && (
            <p
              style={{
                margin: `${theme.spacing.xs} 0 0 0`,
                fontSize: '11px',
                color: theme.colors.gray[500],
              }}
            >
              Substituição: {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
              }).format(valorTotalSubstituicao)}
            </p>
          )}
        </div>
        {anvisaVencida > 0 && (
          <div
            onClick={() => handleFilterClick('anvisaVencida')}
            style={{
              backgroundColor: theme.colors.white,
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              boxShadow: theme.shadows.sm,
              borderLeft: `3px solid ${theme.colors.danger}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = theme.shadows.md;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = theme.shadows.sm;
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: theme.colors.gray[600],
              }}
            >
              ANVISA Vencida
            </p>
            <h3
              style={{
                margin: `${theme.spacing.xs} 0 0 0`,
                fontSize: '20px',
                fontWeight: 700,
                color: theme.colors.danger,
              }}
            >
              {anvisaVencida}
            </h3>
          </div>
        )}
        {valorTotalSubstituicao > 0 && (
          <div
            style={{
              backgroundColor: theme.colors.white,
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              boxShadow: theme.shadows.sm,
              borderLeft: `3px solid ${theme.colors.success}`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: theme.colors.gray[600],
              }}
            >
              Valor Substituição
            </p>
            <h3
              style={{
                margin: `${theme.spacing.xs} 0 0 0`,
                fontSize: '18px',
                fontWeight: 700,
                color: theme.colors.success,
              }}
            >
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
              }).format(valorTotalSubstituicao)}
            </h3>
          </div>
        )}
        <div
          onClick={() => handleFilterClick('eolProximo')}
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            borderLeft: `3px solid ${theme.colors.warning}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: eolProximo > 0 ? 1 : 0.6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = theme.shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = theme.shadows.sm;
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            EoL Próximo
          </p>
          <h3
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.warning,
            }}
          >
            {eolProximo}
          </h3>
        </div>
        <div
          onClick={() => handleFilterClick('eosProximo')}
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            borderLeft: `3px solid ${theme.colors.warning}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: eosProximo > 0 ? 1 : 0.6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = theme.shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = theme.shadows.sm;
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            EoS Próximo
          </p>
          <h3
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.warning,
            }}
          >
            {eosProximo}
          </h3>
        </div>
        <div
          style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            borderLeft: `3px solid ${theme.colors.primary}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: theme.colors.gray[600],
            }}
          >
            Total de OS
          </p>
          <h3
            style={{
              margin: `${theme.spacing.xs} 0 0 0`,
              fontSize: '20px',
              fontWeight: 700,
              color: theme.colors.primary,
            }}
          >
            {quantidadeTotalOS.toLocaleString('pt-BR')}
          </h3>
        </div>
      </div>

      {/* Informação de total de equipamentos */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.shadows.sm,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: theme.colors.gray[600] }}>
            Mostrando todos os {filteredData.length} equipamentos
          </span>
          {(filters.anvisaVencida || filters.eolProximo || filters.eosProximo || filters.idade) && (
            <>
              <span style={{ fontSize: '13px', color: theme.colors.gray[400] }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
                <FiFilter size={14} color={theme.colors.primary} />
                <span style={{ fontSize: '13px', color: theme.colors.gray[600], fontWeight: 500 }}>
                  Filtros ativos:
                </span>
                {filters.anvisaVencida && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: `2px ${theme.spacing.xs}`,
                      backgroundColor: `${theme.colors.danger}15`,
                      color: theme.colors.danger,
                      borderRadius: theme.borderRadius.sm,
                      fontWeight: 500,
                    }}
                  >
                    ANVISA Vencida
                  </span>
                )}
                {filters.eolProximo && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: `2px ${theme.spacing.xs}`,
                      backgroundColor: `${theme.colors.warning}15`,
                      color: theme.colors.warning,
                      borderRadius: theme.borderRadius.sm,
                      fontWeight: 500,
                    }}
                  >
                    EoL Próximo
                  </span>
                )}
                {filters.eosProximo && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: `2px ${theme.spacing.xs}`,
                      backgroundColor: `${theme.colors.warning}15`,
                      color: theme.colors.warning,
                      borderRadius: theme.borderRadius.sm,
                      fontWeight: 500,
                    }}
                  >
                    EoS Próximo
                  </span>
                )}
                {filters.idade && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: `2px ${theme.spacing.xs}`,
                      backgroundColor: `${theme.colors.info}15`,
                      color: theme.colors.info,
                      borderRadius: theme.borderRadius.sm,
                      fontWeight: 500,
                    }}
                  >
                    Idade: {filters.idade === '0-2' ? '0 a 2 anos' :
                            filters.idade === '2-5' ? '2 a 5 anos' :
                            filters.idade === '5-10' ? '5 a 10 anos' :
                            filters.idade === '10+' ? '10+ anos' :
                            filters.idade === 'sem-data' ? 'Sem data' : filters.idade}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        {(filters.anvisaVencida || filters.eolProximo || filters.eosProximo || filters.idade) && (
          <button
            onClick={() => {
              setFilters({
                anvisaVencida: false,
                eolProximo: false,
                eosProximo: false,
                idade: null,
              });
            }}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.sm,
              border: `1px solid ${theme.colors.gray[300]}`,
              backgroundColor: theme.colors.white,
              color: theme.colors.gray[700],
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.gray[50];
              e.currentTarget.style.borderColor = theme.colors.gray[400];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.white;
              e.currentTarget.style.borderColor = theme.colors.gray[300];
            }}
          >
            <FiX size={14} />
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Gráfico de Barras - Top 10 Setores por Custo de Substituição */}
      {custoPorSetorData.length > 0 && (
        <div
          style={{
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.shadows.sm,
            marginBottom: theme.spacing.lg,
          }}
        >
          <h3
            style={{
              margin: `0 0 ${theme.spacing.md} 0`,
              fontSize: '18px',
              fontWeight: 600,
              color: theme.colors.dark,
            }}
          >
            Top 10 Setores por Custo de Substituição
          </h3>
          <div style={{ width: '100%', height: '500px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={custoPorSetorData}
                layout="vertical"
                margin={{ top: 20, right: 100, left: 150, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[200]} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => {
                    if (value >= 1000000) {
                      return `R$ ${(value / 1000000).toFixed(1)}M`;
                    }
                    if (value >= 1000) {
                      return `R$ ${(value / 1000).toFixed(0)}k`;
                    }
                    return `R$ ${value}`;
                  }}
                  stroke={theme.colors.gray[600]}
                />
                <YAxis
                  type="category"
                  dataKey="setor"
                  width={140}
                  tick={{ fontSize: 12 }}
                  stroke={theme.colors.gray[600]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.colors.white,
                    border: `1px solid ${theme.colors.gray[200]}`,
                    borderRadius: theme.borderRadius.md,
                    boxShadow: theme.shadows.md,
                  }}
                  formatter={(value: number) => {
                    return new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 0,
                    }).format(value);
                  }}
                />
                <Bar
                  dataKey="valor"
                  fill={theme.colors.primary}
                  radius={[0, 4, 4, 0]}
                >
                  {custoPorSetorData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0
                          ? theme.colors.danger
                          : index === 1
                          ? theme.colors.warning
                          : index === 2
                          ? theme.colors.info
                          : theme.colors.primary
                      }
                    />
                  ))}
                  <LabelList
                    dataKey="valor"
                    position="right"
                    formatter={(value: number) => {
                      if (value >= 1000000) {
                        return `R$ ${(value / 1000000).toFixed(1)}M`;
                      }
                      if (value >= 1000) {
                        return `R$ ${(value / 1000).toFixed(0)}k`;
                      }
                      return new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      }).format(value);
                    }}
                    style={{
                      fill: theme.colors.gray[700],
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráficos de Pizza - Lado a Lado */}
      {(chartData.length > 0 || idadeChartData.length > 0) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
          }}
        >
          {/* Gráfico de Pizza - Valor de Substituição por Categoria */}
          {chartData.length > 0 && (
            <div
              style={{
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.white,
                borderRadius: theme.borderRadius.md,
                boxShadow: theme.shadows.sm,
              }}
            >
              <h3
                style={{
                  margin: `0 0 ${theme.spacing.md} 0`,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: theme.colors.dark,
                }}
              >
                Valor de Substituição por Categoria
              </h3>
              <div style={{ width: '100%', height: '500px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data: any, index: number) => {
                        if (!data || !data.name) return;
                        
                        const categoria = data.name;
                        setFilters({
                          anvisaVencida: categoria === 'ANVISA Vencida',
                          eolProximo: categoria === 'EoL Próximo',
                          eosProximo: categoria === 'EoS Próximo',
                          idade: null,
                        });
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.cor}
                          style={{ 
                            cursor: 'pointer',
                            opacity: filters.anvisaVencida && entry.name !== 'ANVISA Vencida' ? 0.5 :
                                    filters.eolProximo && entry.name !== 'EoL Próximo' ? 0.5 :
                                    filters.eosProximo && entry.name !== 'EoS Próximo' ? 0.5 :
                                    filters.anvisaVencida || filters.eolProximo || filters.eosProximo ? 
                                      (entry.name === 'Equipamentos OK' ? 0.5 : 1) : 1
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.colors.white,
                        border: `1px solid ${theme.colors.gray[200]}`,
                        borderRadius: theme.borderRadius.md,
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        if (!props || !props.payload) return '';
                        const percent = props.payload.percent ? (props.payload.percent * 100).toFixed(2) : '0';
                        const formattedValue = new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(value);
                        return [
                          `${formattedValue} (${percent}%)`,
                          props.payload.name || props.payload.categoria || name
                        ];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '13px' }}
                      iconType="circle"
                      formatter={(value, entry: any) => {
                        const percent = entry.payload?.percent ? (entry.payload.percent * 100).toFixed(1) : '0';
                        return `${value} (${percent}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Gráfico de Pizza - Idade dos Equipamentos */}
          {idadeChartData.length > 0 && (
            <div
              style={{
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.white,
                borderRadius: theme.borderRadius.md,
                boxShadow: theme.shadows.sm,
              }}
            >
              <h3
                style={{
                  margin: `0 0 ${theme.spacing.md} 0`,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: theme.colors.dark,
                }}
              >
                Idade dos Equipamentos
              </h3>
              <div style={{ width: '100%', height: '500px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={idadeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data: any, index: number) => {
                        if (!data || !data.name) return;
                        
                        const idade = data.name;
                        let idadeFilter: string | null = null;
                        
                        if (idade === '0 a 2 anos') {
                          idadeFilter = '0-2';
                        } else if (idade === '2 a 5 anos') {
                          idadeFilter = '2-5';
                        } else if (idade === '5 a 10 anos') {
                          idadeFilter = '5-10';
                        } else if (idade === '10+ anos') {
                          idadeFilter = '10+';
                        } else if (idade === 'Sem data') {
                          idadeFilter = 'sem-data';
                        }
                        
                        setFilters((prev) => ({
                          ...prev,
                          idade: prev.idade === idadeFilter ? null : idadeFilter,
                        }));
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {idadeChartData.map((entry, index) => {
                        const idadeKey = entry.name === '0 a 2 anos' ? '0-2' :
                                        entry.name === '2 a 5 anos' ? '2-5' :
                                        entry.name === '5 a 10 anos' ? '5-10' :
                                        entry.name === '10+ anos' ? '10+' :
                                        entry.name === 'Sem data' ? 'sem-data' : null;
                        
                        return (
                          <Cell 
                            key={`cell-idade-${index}`} 
                            fill={entry.cor}
                            style={{ 
                              cursor: 'pointer',
                              opacity: filters.idade && filters.idade !== idadeKey ? 0.5 : 1
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.colors.white,
                        border: `1px solid ${theme.colors.gray[200]}`,
                        borderRadius: theme.borderRadius.md,
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        if (!props || !props.payload) return '';
                        const percent = props.payload.percent ? (props.payload.percent * 100).toFixed(2) : '0';
                        return [
                          `${value} equipamentos (${percent}%)`,
                          props.payload.name || name
                        ];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '13px' }}
                      iconType="circle"
                      formatter={(value, entry: any) => {
                        const percent = entry.payload?.percent ? (entry.payload.percent * 100).toFixed(1) : '0';
                        return `${value} (${percent}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela */}
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.shadows.sm,
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho da Tabela com Filtros e Botão de Minimizar */}
        <div
          style={{
            padding: theme.spacing.md,
            borderBottom: `1px solid ${theme.colors.gray[200]}`,
            backgroundColor: theme.colors.gray[50],
          }}
        >
          {/* Linha 1: Título e Botão */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: theme.colors.dark,
              }}
            >
              Lista de Equipamentos ({filteredData.length})
            </h3>
            <button
              onClick={() => setIsTableMinimized(!isTableMinimized)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                border: `1px solid ${theme.colors.gray[300]}`,
                backgroundColor: theme.colors.white,
                color: theme.colors.gray[700],
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                e.currentTarget.style.borderColor = theme.colors.gray[400];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.white;
                e.currentTarget.style.borderColor = theme.colors.gray[300];
              }}
            >
              {isTableMinimized ? (
                <>
                  <FiChevronDown size={16} />
                  Expandir
                </>
              ) : (
                <>
                  <FiChevronUp size={16} />
                  Minimizar
                </>
              )}
            </button>
          </div>
          {/* Linha 2: Filtros */}
          <div
            style={{
              display: 'flex',
              gap: theme.spacing.sm,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {/* Filtro por Tipo de Equipamento */}
            <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: theme.colors.gray[700],
                  marginBottom: theme.spacing.xs,
                }}
              >
                Tipo de Equipamento
              </label>
              <select
                value={tableFilters.tipo}
                onChange={(e) => setTableFilters({ ...tableFilters, tipo: e.target.value })}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="">Todos</option>
                {tiposComContagem.map((item) => (
                  <option key={item.tipo} value={item.tipo}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Filtro por Setor */}
            <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: theme.colors.gray[700],
                  marginBottom: theme.spacing.xs,
                }}
              >
                Setor
              </label>
              <select
                value={tableFilters.setor}
                onChange={(e) => setTableFilters({ ...tableFilters, setor: e.target.value })}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="">Todos</option>
                {Array.from(new Set(data.map((e) => e.Setor).filter(Boolean))).sort().map((setor) => (
                  <option key={setor} value={setor}>
                    {setor}
                  </option>
                ))}
              </select>
            </div>
            {/* Filtro por Idade */}
            <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: theme.colors.gray[700],
                  marginBottom: theme.spacing.xs,
                }}
              >
                Idade
              </label>
              <select
                value={tableFilters.idade}
                onChange={(e) => setTableFilters({ ...tableFilters, idade: e.target.value })}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  border: `1px solid ${theme.colors.gray[300]}`,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.dark,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="">Todas</option>
                <option value="0-2">0 a 2 anos</option>
                <option value="2-5">2 a 5 anos</option>
                <option value="5-10">5 a 10 anos</option>
                <option value="10+">10+ anos</option>
                <option value="sem-data">Sem data</option>
              </select>
            </div>
            {/* Botão Limpar Filtros */}
            {(tableFilters.tipo || tableFilters.setor || tableFilters.idade) && (
              <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
                <button
                  onClick={() => setTableFilters({ tipo: '', setor: '', idade: '' })}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    border: `1px solid ${theme.colors.gray[300]}`,
                    backgroundColor: theme.colors.white,
                    color: theme.colors.gray[700],
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                    e.currentTarget.style.borderColor = theme.colors.gray[400];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.white;
                    e.currentTarget.style.borderColor = theme.colors.gray[300];
                  }}
                >
                  <FiX size={14} />
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            maxHeight: isTableMinimized ? '300px' : 'none',
            overflowY: isTableMinimized ? 'auto' : 'visible',
            overflowX: 'auto',
          }}
        >
          {/* Usar VirtualizedDataTable para melhor performance com muitas linhas */}
          {filteredData.length > 200 ? (
            <VirtualizedDataTable
              data={filteredData}
              columns={columns}
              selectable={true}
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              getId={(row) => row.Id}
              sortConfig={sortConfig}
              onSort={(column, direction) => {
                setSortConfig({ column, direction });
              }}
              estimatedRowHeight={55}
              maxHeight={isTableMinimized ? '300px' : '600px'}
            />
          ) : (
            <DataTable
              data={filteredData}
              columns={columns}
              selectable={true}
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              getId={(row) => row.Id}
              sortConfig={sortConfig}
              onSort={(column, direction) => {
                setSortConfig({ column, direction });
              }}
            />
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Equipamento */}
      {selectedEquipment && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedEquipment(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.lg,
              boxShadow: theme.shadows.lg,
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: theme.spacing.lg,
              position: 'relative',
            }}
          >
            {/* Header do Modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: theme.spacing.lg,
                borderBottom: `2px solid ${theme.colors.gray[200]}`,
                paddingBottom: theme.spacing.md,
              }}
            >
              <div>
                <h2
                  id="equipment-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: 700,
                    color: theme.colors.dark,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                  }}
                >
                  <FiPackage size={24} color={theme.colors.primary} />
                  {selectedEquipment.Equipamento || 'Equipamento'}
                </h2>
                <p
                  style={{
                    margin: `${theme.spacing.xs} 0 0 0`,
                    fontSize: '14px',
                    color: theme.colors.gray[600],
                  }}
                >
                  Tag: <strong>{selectedEquipment.Tag}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedEquipment(null)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  padding: theme.spacing.xs,
                  borderRadius: theme.borderRadius.sm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.gray[100];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FiX size={24} color={theme.colors.gray[600]} />
              </button>
            </div>

            {/* Conteúdo do Modal - Todos os dados do equipamento */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: theme.spacing.md,
              }}
            >
              {Object.entries(selectedEquipment).map(([key, value]) => {
                // Formatar a chave para exibição
                const formattedKey = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase())
                  .trim();

                // Formatar o valor baseado no tipo
                let formattedValue: React.ReactNode = value;

                if (value === null || value === undefined || value === '') {
                  formattedValue = <span style={{ color: theme.colors.gray[400], fontStyle: 'italic' }}>Não informado</span>;
                } else if (typeof value === 'boolean') {
                  formattedValue = value ? 'Sim' : 'Não';
                } else if (typeof value === 'string' && (key.includes('Data') || key.includes('Date'))) {
                  // Tentar formatar como data
                  const dateValue = formatBrazilianDate(value);
                  formattedValue = dateValue !== 'Data inválida' ? dateValue : value;
                } else if (typeof value === 'string' && (key.includes('Valor') || key.includes('Custo') || key.includes('Preco'))) {
                  // Tentar formatar como moeda
                  const numValue = parseBrazilianCurrency(value);
                  if (!isNaN(numValue) && numValue > 0) {
                    formattedValue = new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(numValue);
                  }
                } else if (typeof value === 'object' && value !== null) {
                  formattedValue = <pre style={{ fontSize: '12px', margin: 0 }}>{JSON.stringify(value, null, 2)}</pre>;
                }

                return (
                  <div
                    key={key}
                    style={{
                      padding: theme.spacing.sm,
                      backgroundColor: theme.colors.gray[50],
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.gray[200]}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: theme.colors.gray[600],
                        marginBottom: theme.spacing.xs,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {formattedKey}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: theme.colors.dark,
                        wordBreak: 'break-word',
                      }}
                    >
                      {formattedValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
