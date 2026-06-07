import { useState, useEffect } from "react";
import { getTipoCambioUSD, type TipoCambio } from "../services/bcuApi";

export function useTipoCambio() {
  const [tipoCambio, setTipoCambio] = useState<TipoCambio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTipoCambioUSD()
      .then(setTipoCambio)
      .finally(() => setLoading(false));
  }, []);

  return { tipoCambio, loading };
}




