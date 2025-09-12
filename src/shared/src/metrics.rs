//! Canister health metrics.

#[cfg(target_arch = "wasm32")]
use core::arch::wasm32::memory_size as wasm_memory_size;

#[cfg(target_arch = "wasm32")]
use ic_cdk::api::stable_size;
use ic_metrics_encoder::MetricsEncoder;
use serde_bytes::ByteBuf;

use crate::http::HttpResponse;
/// The Wasm page size as defined in [the Wasm Spec](https://webassembly.github.io/spec/core/exec/runtime.html#memory-instances).
#[cfg(target_arch = "wasm32")]
const WASM_PAGE_SIZE: u64 = 65536;
const GIBIBYTE: u32 = 1 << 30;

/// Returns the metrics in the Prometheus format.
#[must_use]
pub fn get_metrics() -> HttpResponse {
    let now = ic_cdk::api::time();
    let mut writer = MetricsEncoder::new(
        vec![],
        i64::try_from(now / 1_000_000)
            .unwrap_or_else(|_| unreachable!("u64::MAX / 1_000_000 is smaller than i64::MAX")),
    );
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
            body: ByteBuf::from(format!("Failed to encode metrics: {err}")),
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
        stable_size() * WASM_PAGE_SIZE
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
#[allow(clippy::cast_precision_loss)]
fn gibibytes(bytes: u64) -> f64 {
    (bytes as f64) / f64::from(GIBIBYTE)
}
