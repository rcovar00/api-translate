/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  AI: Ai;
}

// Interfaz para la solicitud de traducción
interface TranslationRequest {
  text: string;
  source_lang?: string;
  target_lang: string;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// Obtener la URL de la solicitud
		const url = new URL(request.url);
		const path = url.pathname;

		// Función para configurar los headers CORS
		const setCorsHeaders = (response: Response): Response => {
			const newHeaders = new Headers(response.headers);
			newHeaders.set('Access-Control-Allow-Origin', '*');
			newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
			newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
			
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders
			});
		};

		// Manejar solicitudes preflight OPTIONS
		if (request.method === 'OPTIONS') {
			return setCorsHeaders(new Response(null, {
				status: 204,
			}));
		}

		// Verificar si es una solicitud POST a /translate
		if (path === "/translate" && request.method === "POST") {
			try {
				// Obtener el cuerpo de la solicitud como JSON
				const requestData: TranslationRequest = await request.json();
				
				// Verificar que se proporcionaron los campos necesarios
				if (!requestData.text || !requestData.target_lang) {
					return setCorsHeaders(new Response(JSON.stringify({ error: "Se requieren los campos 'text' y 'target_lang'" }), {
						status: 400,
						headers: { "Content-Type": "application/json" }
					}));
				}

				// Realizar la traducción con el modelo m2m100
				const response = await env.AI.run(
					"@cf/meta/m2m100-1.2b",
					{
						text: requestData.text,
						source_lang: requestData.source_lang || "spanish", // Si no se especifica, se usa detección automática
						target_lang: requestData.target_lang,
					}
				);

				// Devolver la respuesta de traducción con headers CORS
				return setCorsHeaders(new Response(JSON.stringify(response), {
					headers: { "Content-Type": "application/json" }
				}));
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
				return setCorsHeaders(new Response(JSON.stringify({ error: "Error al procesar la solicitud: " + errorMessage }), {
					status: 500,
					headers: { "Content-Type": "application/json" }
				}));
			}
		}

		// Default response for other routes/methods with CORS headers
		return setCorsHeaders(new Response("Not found", { status: 404 }));
	},
} satisfies ExportedHandler<Env>;
