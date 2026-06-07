import { EventName, EventPayloadMap } from "./types";

type Handler<T> = (payload: T) => Promise<void>;

interface HandlerEntry<T> {
  handler:  Handler<T>;
  modulo:   string;
  once:     boolean;
}

interface EmitResult {
  modulo:  string;
  ok:      boolean;
  error?:  string;
  ms:      number;
}

class EventBus {
  private handlers: Map<string, HandlerEntry<any>[]> = new Map();
  private logEnabled = true;

  // ── Registrar handler ─────────────────────────────────────────────────────
  on<E extends EventName>(
    event:   E,
    handler: Handler<EventPayloadMap[E]>,
    modulo:  string = "desconocido",
    once = false
  ): void {
    const list = this.handlers.get(event) || [];
    this.handlers.set(event, [...list, { handler, modulo, once }]);
    if (this.logEnabled)
      console.debug(`[EventBus] ${modulo} registrado en "${event}"`);
  }

  // ── Registrar handler de una sola ejecución ────────────────────────────────
  once<E extends EventName>(
    event:   E,
    handler: Handler<EventPayloadMap[E]>,
    modulo:  string = "desconocido"
  ): void {
    this.on(event, handler, modulo, true);
  }

  // ── Desregistrar handler ──────────────────────────────────────────────────
  off<E extends EventName>(event: E, modulo: string): void {
    const list = this.handlers.get(event) || [];
    this.handlers.set(event, list.filter(e => e.modulo !== modulo));
  }

  // ── Emitir evento — todos los handlers en paralelo ────────────────────────
  async emit<E extends EventName>(
    event:   E,
    payload: EventPayloadMap[E]
  ): Promise<EmitResult[]> {
    const entries = this.handlers.get(event) || [];
    if (!entries.length) {
      if (this.logEnabled)
        console.debug(`[EventBus] "${event}" emitido sin handlers registrados`);
      return [];
    }

    if (this.logEnabled)
      console.info(`[EventBus] emit "${event}"`, payload);

    const results = await Promise.allSettled(
      entries.map(async (entry) => {
        const t0 = performance.now();
        try {
          await entry.handler(payload);
          const ms = Math.round(performance.now() - t0);
          if (this.logEnabled)
            console.info(`[EventBus] ✓ ${entry.modulo} completó "${event}" en ${ms}ms`);
          return { modulo: entry.modulo, ok: true, ms };
        } catch (e: any) {
          const ms = Math.round(performance.now() - t0);
          console.error(`[EventBus] ✗ ${entry.modulo} falló en "${event}":`, e.message);
          return { modulo: entry.modulo, ok: false, error: e.message, ms };
        }
      })
    );

    // Limpiar handlers "once" que ya corrieron
    const onceMods = new Set(entries.filter(e => e.once).map(e => e.modulo));
    if (onceMods.size > 0) {
      this.handlers.set(event, entries.filter(e => !e.once || !onceMods.has(e.modulo)));
    }

    return results.map(r => r.status === "fulfilled" ? r.value : { modulo:"?", ok:false, error:"rejected", ms:0 });
  }

  // ── Utilidades ────────────────────────────────────────────────────────────
  handlers_for(event: string): string[] {
    return (this.handlers.get(event) || []).map(e => e.modulo);
  }

  describe(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [event, entries] of this.handlers.entries()) {
      out[event] = entries.map(e => e.modulo);
    }
    return out;
  }

  setLog(enabled: boolean): void { this.logEnabled = enabled; }
}

export const eventBus = new EventBus();



