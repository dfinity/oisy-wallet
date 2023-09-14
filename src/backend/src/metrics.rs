//! Canister health metrics.

use crate::http::HttpResponse;
#[cfg(target_arch = "wasm32")]
use core::arch::wasm32::memory_size as wasm_memory_size;
#[cfg(target_arch = "wasm32")]
use ic_cdk::api::stable::stable64_size;
use ic_metrics_encoder::MetricsEncoder;
use serde_bytes::ByteBuf;
#[cfg(target_arch = "wasm32")]
const WASM_PAGE_SIZE: u64 = 65536;
const GIBIBYTE: u64 = 1 << 30;

/// Returns the metrics in the Prometheus format.
pub fn get_metrics() -> HttpResponse {
    let now = ic_cdk::api::time();
    let mut writer = MetricsEncoder::new(vec![], (now / 1_000_000) as i64);
    match encode_metrics(&mut writer) {
        Ok(()) => {
            let body = writer.into_inner();
            HttpResponse {
                status_code: 200,
                headers: vec![
                    (
                        "Content-Type".to_string(),
                        "text/plain; version=0.0.4".to_string(),
                    ),
                    ("Content-Length".to_string(), body.len().to_string()),
                ],
                body: ByteBuf::from(body),
            }
        }
        Err(err) => HttpResponse {
            status_code: 500,
            headers: vec![],
            body: ByteBuf::from(format!("Failed to encode metrics: {}", err)),
        },
    }
}

/// Encodes the metrics in the Prometheus format.
fn encode_metrics(w: &mut MetricsEncoder<Vec<u8>>) -> std::io::Result<()> {
    w.encode_gauge(
        "ic_eth_wallet_stable_memory_size_gib",
        gibibytes(stable_memory_size_bytes()),
        "Amount of stable memory used by this canister, in GiB",
    )?;
    w.encode_gauge(
        "ic_eth_wallet_wasm_memory_size_gib",
        gibibytes(wasm_memory_size_bytes()),
        "Amount of wasm memory used by this canister, in GiB",
    )?;
    Ok(())
}

/// The stable memory size in bytes
fn stable_memory_size_bytes() -> u64 {
    #[cfg(target_arch = "wasm32")]
    {
        stable64_size() * WASM_PAGE_SIZE
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        0
    }
}

/// The WASM memory size in bytes
fn wasm_memory_size_bytes() -> u64 {
    #[cfg(target_arch = "wasm32")]
    {
        (wasm_memory_size(0) as u64) * WASM_PAGE_SIZE
    }
    // This can happen only for test builds.  When compiled for a canister, the target is
    // always wasm32.
    #[cfg(not(target_arch = "wasm32"))]
    {
        0
    }
}

/// Convert bytes to binary gigabytes
fn gibibytes(bytes: u64) -> f64 {
    (bytes as f64) / (GIBIBYTE as f64)
}
