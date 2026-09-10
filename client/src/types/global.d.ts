// =============================================================================
// KAYA KALPA — Lo que el HTML prerenderizado deja en `window`
// =============================================================================

import type { DehydratedState } from '@tanstack/react-query';

declare global {
  interface Window {
    /**
     * Los datos que el render de servidor ya pidió, para que el navegador no los
     * vuelva a pedir al hidratar.
     *
     * Lo escribe el script de prerenderizado dentro de un `<script>` en el HTML.
     * Es `undefined` en desarrollo y en cualquier ruta que no se haya
     * prerenderizado, que es el caso normal: el árbol arranca vacío y cada
     * consulta se pide desde el navegador como siempre.
     */
    __KK_STATE__?: DehydratedState;
  }
}

export {};
