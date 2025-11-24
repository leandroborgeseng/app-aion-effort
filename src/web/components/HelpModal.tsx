// src/web/components/HelpModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiHelpCircle, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { theme } from '../styles/theme';
import { useIsMobile } from '../hooks/useMediaQuery';
import ReactMarkdown from 'react-markdown';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const isMobile = useIsMobile();

  // Extrair índice do markdown
  const extractTableOfContents = React.useCallback((content: string) => {
    const toc: TableOfContentsItem[] = [];
    const lines = content.split('\n');
    const sectionsToExpand = new Set<string>();
    
    lines.forEach((line) => {
      // Match headers (# ## ###)
      const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        
        // Criar ID a partir do título (similar ao GitHub)
        const id = title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
          .replace(/\s+/g, '-') // Espaços viram hífen
          .replace(/-+/g, '-') // Múltiplos hífens viram um
          .replace(/^-|-$/g, ''); // Remove hífens no início/fim
        
        toc.push({ id, title, level });
        
        // Expandir seções principais por padrão
        if (level <= 2) {
          sectionsToExpand.add(id);
        }
      }
    });
    
    setTableOfContents(toc);
    setExpandedSections(sectionsToExpand);
  }, []);

  // Carregar conteúdo do markdown
  useEffect(() => {
    if (isOpen && markdownContent === '') {
      setIsLoading(true);
      fetch('/DOCUMENTACAO_USUARIO.md')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.text();
        })
        .then((text) => {
          setMarkdownContent(text);
          extractTableOfContents(text);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Erro ao carregar documentação:', error);
          setMarkdownContent('# Erro\n\nNão foi possível carregar a documentação.');
          setIsLoading(false);
        });
    }
  }, [isOpen, markdownContent, extractTableOfContents]);

  // Scroll para seção quando clicar no índice
  const scrollToSection = React.useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  }, []);

  // Detectar seção ativa ao scrollar
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      const sections = tableOfContents.map((item) => ({
        id: item.id,
        element: document.getElementById(item.id),
      }));

      // Encontrar seção visível
      for (const section of sections.reverse()) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 100) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    const contentElement = document.getElementById('help-content');
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => {
        contentElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isOpen, tableOfContents]);

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Toggle seção expandida no índice
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Estrutura hierárquica do TOC
  interface TOCNode {
    item: TableOfContentsItem;
    children: TOCNode[];
  }

  // Construir árvore hierárquica do TOC
  const buildTOCTree = useMemo(() => {
    const tree: TOCNode[] = [];
    const stack: TOCNode[] = [];

    tableOfContents.forEach((item) => {
      const node: TOCNode = { item, children: [] };
      
      // Remover nós do stack que são do mesmo nível ou superior
      while (stack.length > 0 && stack[stack.length - 1].item.level >= item.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Item de nível raiz (level 1)
        tree.push(node);
      } else {
        // Item filho do último nó no stack
        stack[stack.length - 1].children.push(node);
      }

      stack.push(node);
    });

    return tree;
  }, [tableOfContents]);

  // Renderizar item do índice recursivamente
  const renderTOCNode = (node: TOCNode): React.ReactNode => {
    const { item, children } = node;
    const isExpanded = expandedSections.has(item.id);
    const isActive = activeSection === item.id;
    const hasChildren = children.length > 0;

    const indent = (item.level - 1) * 16;

    return (
      <div key={item.id} style={{ marginBottom: item.level === 1 ? theme.spacing.xs : 0 }}>
        <button
          onClick={() => {
            scrollToSection(item.id);
            if (hasChildren) {
              toggleSection(item.id);
            }
          }}
          style={{
            width: '100%',
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            paddingLeft: `${parseInt(theme.spacing.sm) + indent}px`,
            textAlign: 'left',
            backgroundColor: isActive ? `${theme.colors.primary}15` : 'transparent',
            border: 'none',
            borderRadius: theme.borderRadius.sm,
            cursor: 'pointer',
            fontSize: item.level === 1 ? '14px' : item.level === 2 ? '13px' : '12px',
            fontWeight: isActive ? 600 : item.level === 1 ? 500 : item.level === 2 ? 400 : 300,
            color: isActive 
              ? theme.colors.primary 
              : item.level === 1 
                ? theme.colors.dark 
                : item.level === 2 
                  ? theme.colors.gray[700] 
                  : theme.colors.gray[600],
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            transition: 'all 0.2s',
            borderLeft: item.level > 1 ? `3px solid ${isActive ? theme.colors.primary : theme.colors.gray[300]}` : 'none',
            marginLeft: item.level > 1 ? '-3px' : '0',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = theme.colors.gray[100];
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {hasChildren && (
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: theme.colors.gray[500] }}>
              {isExpanded ? (
                <FiChevronDown size={12} />
              ) : (
                <FiChevronRight size={12} />
              )}
            </span>
          )}
          {!hasChildren && item.level > 1 && (
            <span style={{ width: '12px', display: 'inline-block' }} />
          )}
          <span 
            style={{ 
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={item.title}
          >
            {item.title}
          </span>
        </button>
        {isExpanded && hasChildren && (
          <div style={{ marginLeft: indent > 0 ? '12px' : '0' }}>
            {children.map((child) => renderTOCNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
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
        zIndex: 10000,
        padding: theme.spacing.md,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.xl,
          width: '95%',
          maxWidth: '1400px',
          height: '90vh',
          maxHeight: '900px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: theme.spacing.lg,
            borderBottom: `1px solid ${theme.colors.gray[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            backgroundColor: theme.colors.gray[50],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <FiHelpCircle size={24} color={theme.colors.primary} />
            <h2
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 600,
                color: theme.colors.dark,
              }}
            >
              Documentação do Sistema
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: theme.spacing.xs,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.gray[600],
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.gray[200];
              e.currentTarget.style.color = theme.colors.dark;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.gray[600];
            }}
            aria-label="Fechar"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Sidebar - Índice (oculto em mobile) */}
          {!isMobile && tableOfContents.length > 0 && (
            <div
              style={{
                width: '280px',
                borderRight: `1px solid ${theme.colors.gray[200]}`,
                overflowY: 'auto',
                backgroundColor: theme.colors.gray[50],
                flexShrink: 0,
              }}
            >
              <div style={{ padding: theme.spacing.md }}>
                <h3
                  style={{
                    margin: `0 0 ${theme.spacing.md} 0`,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: theme.colors.dark,
                  }}
                >
                  Índice
                </h3>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {buildTOCTree.map((node) => renderTOCNode(node))}
                </nav>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div
            id="help-content"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: theme.spacing.xl,
            }}
          >
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
                <p style={{ color: theme.colors.gray[600] }}>Carregando documentação...</p>
              </div>
            ) : (
              <div
                style={{
                  maxWidth: '900px',
                  margin: '0 auto',
                  color: theme.colors.dark,
                  lineHeight: 1.7,
                }}
              >
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1
                        id={children
                          ?.toString()
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9\s-]/g, '')
                          .replace(/\s+/g, '-')
                          .replace(/-+/g, '-')
                          .replace(/^-|-$/g, '')}
                        style={{
                          marginTop: theme.spacing.xl,
                          marginBottom: theme.spacing.lg,
                          fontSize: '32px',
                          fontWeight: 700,
                          color: theme.colors.dark,
                          borderBottom: `3px solid ${theme.colors.primary}`,
                          paddingBottom: theme.spacing.sm,
                        }}
                      >
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2
                        id={children
                          ?.toString()
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9\s-]/g, '')
                          .replace(/\s+/g, '-')
                          .replace(/-+/g, '-')
                          .replace(/^-|-$/g, '')}
                        style={{
                          marginTop: theme.spacing.xl,
                          marginBottom: theme.spacing.md,
                          fontSize: '24px',
                          fontWeight: 600,
                          color: theme.colors.dark,
                          borderBottom: `2px solid ${theme.colors.gray[200]}`,
                          paddingBottom: theme.spacing.xs,
                        }}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3
                        id={children
                          ?.toString()
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9\s-]/g, '')
                          .replace(/\s+/g, '-')
                          .replace(/-+/g, '-')
                          .replace(/^-|-$/g, '')}
                        style={{
                          marginTop: theme.spacing.lg,
                          marginBottom: theme.spacing.sm,
                          fontSize: '20px',
                          fontWeight: 600,
                          color: theme.colors.dark,
                        }}
                      >
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p style={{ marginBottom: theme.spacing.md, fontSize: '15px', color: theme.colors.gray[700] }}>
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul
                        style={{
                          marginBottom: theme.spacing.md,
                          paddingLeft: theme.spacing.xl,
                          fontSize: '15px',
                          color: theme.colors.gray[700],
                        }}
                      >
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol
                        style={{
                          marginBottom: theme.spacing.md,
                          paddingLeft: theme.spacing.xl,
                          fontSize: '15px',
                          color: theme.colors.gray[700],
                        }}
                      >
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li style={{ marginBottom: theme.spacing.xs }}>{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong style={{ fontWeight: 600, color: theme.colors.dark }}>{children}</strong>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return (
                        <code
                          style={{
                            backgroundColor: isInline ? theme.colors.gray[100] : theme.colors.gray[900],
                            color: isInline ? theme.colors.danger : theme.colors.white,
                            padding: isInline ? '2px 6px' : theme.spacing.md,
                            borderRadius: theme.borderRadius.sm,
                            fontSize: isInline ? '14px' : '13px',
                            fontFamily: 'monospace',
                            display: isInline ? 'inline' : 'block',
                            overflowX: 'auto',
                            marginBottom: isInline ? 0 : theme.spacing.md,
                          }}
                        >
                          {children}
                        </code>
                      );
                    },
                    hr: () => (
                      <hr
                        style={{
                          border: 'none',
                          borderTop: `1px solid ${theme.colors.gray[200]}`,
                          margin: `${theme.spacing.xl} 0`,
                        }}
                      />
                    ),
                    blockquote: ({ children }) => (
                      <blockquote
                        style={{
                          borderLeft: `4px solid ${theme.colors.primary}`,
                          paddingLeft: theme.spacing.md,
                          margin: `${theme.spacing.md} 0`,
                          fontStyle: 'italic',
                          color: theme.colors.gray[600],
                        }}
                      >
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => {
                      const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                        // Interceptar links internos
                        if (href?.startsWith('#')) {
                          e.preventDefault();
                          const targetId = href.substring(1);
                          const element = document.getElementById(targetId);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            setActiveSection(targetId);
                          }
                        }
                      };
                      return (
                        <a
                          href={href}
                          onClick={handleLinkClick}
                          style={{
                            color: theme.colors.primary,
                            textDecoration: 'underline',
                          }}
                        >
                          {children}
                        </a>
                      );
                    },
                    table: ({ children }) => (
                      <div style={{ overflowX: 'auto', marginBottom: theme.spacing.md }}>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '14px',
                          }}
                        >
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th
                        style={{
                          padding: theme.spacing.sm,
                          border: `1px solid ${theme.colors.gray[300]}`,
                          backgroundColor: theme.colors.gray[50],
                          fontWeight: 600,
                          textAlign: 'left',
                          color: theme.colors.dark,
                        }}
                      >
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td
                        style={{
                          padding: theme.spacing.sm,
                          border: `1px solid ${theme.colors.gray[200]}`,
                          color: theme.colors.gray[700],
                        }}
                      >
                        {children}
                      </td>
                    ),
                  }}
                >
                  {markdownContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

