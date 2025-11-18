# Guia de Responsividade Mobile

Este documento descreve as melhorias implementadas para tornar a aplicação amigável para dispositivos móveis.

## ✅ Melhorias Implementadas

### 1. **Menu Mobile (Hamburger)**
- Menu lateral deslizante em telas pequenas (< 768px)
- Overlay escuro quando aberto
- Fecha ao clicar fora ou em um item
- Previne scroll do body quando aberto

### 2. **Hooks de Media Query**
- `useIsMobile()`: Detecta telas < 768px
- `useIsTablet()`: Detecta telas entre 768px e 1024px
- `useIsDesktop()`: Detecta telas > 1024px
- `useMediaQuery(query)`: Hook genérico para qualquer media query

### 3. **Padding Responsivo**
- Função `getResponsivePadding()` ajusta padding automaticamente
- Mobile: `theme.spacing.md` (16px)
- Tablet: `theme.spacing.lg` (24px)
- Desktop: `theme.spacing.xl` (32px)

### 4. **Navegação Adaptativa**
- Em mobile: Menu hamburger + logo
- Em desktop: Menu completo com ícones e textos
- Logo menor em mobile (35px vs 45px)

### 5. **Tabelas Responsivas**
- O componente `DataTable` já converte tabelas em cards em mobile
- Cards otimizados para touch
- Informações importantes sempre visíveis

### 6. **Meta Tags Mobile**
- Viewport configurado corretamente
- Theme color para navegadores mobile
- Suporte para PWA (Apple mobile web app)

### 7. **Componentes Responsivos**
- `ResponsiveContainer`: Container com padding automático
- `ResponsiveGrid`: Grid que ajusta colunas automaticamente

## 📱 Breakpoints

```typescript
mobile: 768px   // < 768px = mobile
tablet: 1024px  // 768px - 1024px = tablet
desktop: 1280px // > 1024px = desktop
```

## 🎨 Uso dos Hooks

```typescript
import { useIsMobile, useIsTablet } from '../hooks/useMediaQuery';
import { getResponsivePadding } from '../utils/responsive';

function MyComponent() {
  const isMobile = useIsMobile();
  const padding = getResponsivePadding(isMobile, false);

  return (
    <div style={{ padding }}>
      {/* Conteúdo */}
    </div>
  );
}
```

## 🔧 Componentes Disponíveis

### ResponsiveContainer
```typescript
import ResponsiveContainer from '../components/ResponsiveContainer';

<ResponsiveContainer>
  <h1>Título</h1>
  <p>Conteúdo com padding automático</p>
</ResponsiveContainer>
```

### ResponsiveGrid
```typescript
import { ResponsiveGrid } from '../components/ResponsiveContainer';

<ResponsiveGrid minColumnWidth="250px" gap="16px">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</ResponsiveGrid>
```

## 📋 Checklist de Responsividade

Ao criar novos componentes, verifique:

- [ ] Usa `useIsMobile()` para ajustar layout
- [ ] Padding responsivo aplicado
- [ ] Botões têm tamanho mínimo de 44x44px (touch-friendly)
- [ ] Texto legível sem zoom (mínimo 14px)
- [ ] Formulários são fáceis de preencher em mobile
- [ ] Tabelas grandes viram cards em mobile
- [ ] Imagens são responsivas (max-width: 100%)
- [ ] Gráficos são legíveis em mobile

## 🚀 Próximas Melhorias

1. **Swipe Gestures**: Navegação por gestos
2. **Pull to Refresh**: Atualizar dados puxando para baixo
3. **Bottom Navigation**: Barra de navegação inferior em mobile
4. **Touch Optimizations**: Melhorar área de toque em todos os elementos
5. **Mobile-First Forms**: Formulários otimizados para mobile
6. **Offline Support**: Funcionalidade offline com Service Workers

## 📱 Testes Recomendados

Teste a aplicação em:
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)
- Tablets Android
- Diferentes orientações (portrait/landscape)

## 🐛 Problemas Conhecidos

- Alguns gráficos podem precisar de ajustes adicionais em telas muito pequenas
- Formulários longos podem precisar de melhorias de UX em mobile

## 💡 Dicas

1. Use `useIsMobile()` em vez de verificar `window.innerWidth` diretamente
2. Sempre teste em dispositivos reais, não apenas no DevTools
3. Considere performance: menos elementos visíveis em mobile = mais rápido
4. Priorize conteúdo importante em mobile (menos é mais)

