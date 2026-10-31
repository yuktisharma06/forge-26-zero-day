// Entry point: supabase/functions/crop-advisory
// All logic lives in handler.ts so it can be tested without starting a server.
import { handleRequest } from './handler.ts';

Deno.serve((req: Request) => handleRequest(req));
