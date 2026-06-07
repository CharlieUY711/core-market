import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Alias para módulos de Charlie
      '@modulos': path.resolve(__dirname, '../../Charlie/Modulos'),
      // Alias para Constructor
      '@constructor': path.resolve(__dirname, '../Constructor/src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Configuración para producción
  build: {
    cssCodeSplit: false, // Emitir un solo archivo CSS para evitar problemas de carga
    sourcemap: false,
    minify: 'esbuild', // Minificación consistente
    cssMinify: true, // Minificar CSS en producción
    // Asegurar que los assets se copien correctamente
    assetsDir: 'assets',
    // Asegurar que el build sea determinístico
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: undefined, // Un solo bundle para mejor compatibilidad
        // Nombres determinísticos para builds consistentes
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  // Asegurar que las rutas base funcionen correctamente
  base: '/',
  
  // Configuración del servidor de desarrollo
  server: {
    port: 5173,
    strictPort: true,
    // Asegurar que el HMR no inyecte código extra
    hmr: {
      overlay: true,
    },
    // Limpiar caché en cada inicio
    force: true,
  },
  
  // Optimizaciones CSS para consistencia
  css: {
    devSourcemap: false, // Desactivar sourcemaps en desarrollo para consistencia
    postcss: undefined, // Usar configuración por defecto de PostCSS
  },
  
  // Asegurar que el modo de desarrollo sea consistente
  define: {
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV !== 'production'),
    'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
  },
})




