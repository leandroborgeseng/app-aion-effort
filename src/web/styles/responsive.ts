// Estilos responsivos e breakpoints
export const breakpoints = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1280px',
};

export const media = {
  mobile: `@media (max-width: ${breakpoints.mobile})`,
  tablet: `@media (max-width: ${breakpoints.tablet})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`,
};

// Helper para aplicar estilos responsivos inline
export const responsive = {
  mobile: (styles: React.CSSProperties) => ({
    [`@media (max-width: ${breakpoints.mobile})`]: styles,
  }),
};

