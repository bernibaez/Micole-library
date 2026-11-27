// Declaración ambiental para que el servidor TypeScript del IDE reconozca
// el runtime global de Deno y los imports HTTP de Supabase Edge Functions.
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.49.0' {
  export * from '@supabase/supabase-js';
}
