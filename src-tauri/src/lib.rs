use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Serialize)]
struct HttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
    duration_ms: u128,
}

#[derive(Deserialize)]
struct HttpRequestPayload {
    method: String,
    url: String,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
}

// User-Agent de navegador real — WAF bloqueia UA de biblioteca (reqwest/x.y.z)
const BROWSER_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

#[command]
async fn make_request(payload: HttpRequestPayload) -> Result<HttpResponse, String> {
    let client = reqwest::Client::builder()
        .user_agent(BROWSER_UA)
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Erro ao criar client HTTP: {e}"))?;

    let method = reqwest::Method::from_bytes(payload.method.as_bytes())
        .map_err(|e| format!("Método inválido: {e}"))?;

    let mut request = client.request(method, &payload.url);

    // Headers de navegador — WAFs verificam esses
    request = request
        .header("Accept", "application/json, text/plain, */*")
        .header("Accept-Language", "pt-BR,pt;q=0.9,en;q=0.8")
        .header("Origin", "https://enois.ia.br")
        .header("Referer", "https://enois.ia.br/")
        .header("Sec-Fetch-Site", "same-origin")
        .header("Sec-Fetch-Mode", "cors")
        .header("Sec-Fetch-Dest", "empty");

    if let Some(hdrs) = payload.headers {
        for (k, v) in hdrs {
            request = request.header(&k, &v);
        }
    }

    if let Some(b) = payload.body {
        request = request.body(b);
    }

    let start = std::time::Instant::now();
    let response = request.send().await.map_err(|e| format!("Erro de rede: {e}"))?;
    let duration_ms = start.elapsed().as_millis();

    let status = response.status().as_u16();
    let mut headers_map = HashMap::new();
    for (k, v) in response.headers() {
        headers_map.insert(k.to_string(), v.to_str().unwrap_or("").to_string());
    }

    let body = response.text().await.map_err(|e| format!("Erro ao ler resposta: {e}"))?;

    Ok(HttpResponse { status, headers: headers_map, body, duration_ms })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![make_request])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o app");
}