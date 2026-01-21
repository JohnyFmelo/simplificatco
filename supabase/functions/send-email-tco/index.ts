import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, htmlBody, attachments, api_key } = await req.json();

    // Validação básica
    if (!to || !subject || !htmlBody) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando (to, subject, htmlBody)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // A URL do seu Google Apps Script (Web App)
    // Recomendo mover para variável de ambiente: Deno.env.get("GAS_WEBAPP_URL")
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwLN_mMLX0Od6I8AMEunw1svXWisq29-J7O88pxX8pk08k3KMrCEdvC_qdA4Qiyvsrv/exec";

    // Payload para o GAS
    const payload = {
      api_key: api_key || "STCO_PRO_SECURE_KEY_BPM25_V2", // Fallback ou use env var
      to,
      subject,
      htmlBody,
      attachments
    };

    console.log("Enviando requisição para Google Apps Script...");

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // Importante para o GAS aceitar sem preflight complexo
      },
      body: JSON.stringify(payload),
    });

    // O GAS geralmente retorna um redirecionamento ou JSON. 
    // Como estamos no server-side (Deno), podemos seguir redirecionamentos ou ler a resposta.
    // O fetch do Deno segue redirects por padrão.
    
    let result;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    console.log("Resposta do GAS:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
