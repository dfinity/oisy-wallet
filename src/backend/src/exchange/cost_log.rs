//! Per-call telemetry for outgoing exchange-rate HTTP outcalls.
//!
//! The exchange refresh path issues several HTTP outcalls per tick (one
//! batched `CoinGecko` `/simple/price` call for native coins, one
//! `/simple/token_price/{platform}` per platform-chunk, and one
//! `/info/token/{ledger}` per ICRC token via `ICPSwap`). On the IC every
//! outcall is charged a non-trivial cycle fee that scales with
//! `request_size + max_response_bytes`, so understanding the cost
//! breakdown matters for capacity planning.
//!
//! This module keeps a thread-local ring buffer of the last
//! [`BUFFER_CAPACITY`] records and a small set of running per-provider
//! counters. Both are scoped to the canister instance: a controller can
//! call `exchange_rate_cost_log()` / `exchange_rate_cost_summary()` to
//! pull the report, and the data evaporates on upgrade — that is fine,
//! this is monitoring scaffolding, not a system of record.
//!
//! The actual measurement (`balance_before - balance_after` around
//! `http_request().await`) happens in
//! [`crate::utils::http_outcall`]; this module only stores and reports.

use std::collections::BTreeMap;

use ic_cdk::api::time;
use shared::{
    metrics::MetricsEncoder,
    types::exchange_cost::{
        ExchangeCostSummary, ExchangeCostWindow, ExchangeOutcallRecord,
        ExchangeProviderWindowStats, ExchangeRefreshTickStats,
    },
};

/// Maximum number of records the ring buffer holds. Older entries are
/// overwritten in FIFO order once this is reached.
pub(crate) const BUFFER_CAPACITY: usize = 1_000;

/// Window lengths, in seconds, that the summary endpoint reports over.
const SUMMARY_WINDOWS_SEC: [u64; 4] = [60, 5 * 60, 60 * 60, 24 * 60 * 60];

/// Running per-provider tallies maintained separately from the ring
/// buffer so the `/metrics` endpoint can serve cheap counters without
/// scanning the buffer.
#[derive(Clone, Default, Debug)]
pub(crate) struct ProviderCounters {
    pub call_count: u64,
    pub error_count: u64,
    pub cycles_total: u128,
    pub bytes_total: u64,
}

thread_local! {
    static OUTCALL_LOG: std::cell::RefCell<Vec<ExchangeOutcallRecord>> =
        const { std::cell::RefCell::new(Vec::new()) };

    /// Index of the next slot to write in [`OUTCALL_LOG`]. Only used
    /// once the buffer has grown to [`BUFFER_CAPACITY`] entries.
    static NEXT_SLOT: std::cell::Cell<usize> = const { std::cell::Cell::new(0) };

    static COUNTERS: std::cell::RefCell<BTreeMap<&'static str, ProviderCounters>> =
        const { std::cell::RefCell::new(BTreeMap::new()) };

    /// Aggregate canister-balance deltas observed around each call to
    /// [`crate::exchange::refresh_exchange_rates`]. Updated from
    /// [`record_refresh_tick`]. Acts as ground-truth cycles burnt by
    /// the refresh path, to validate the per-call formula.
    static REFRESH_TICK: std::cell::RefCell<ExchangeRefreshTickStats> =
        const { std::cell::RefCell::new(ExchangeRefreshTickStats {
            tick_count: 0,
            balance_delta_total: 0,
            outcall_count_total: 0,
        }) };
}

/// Records one outcall outcome.
///
/// Called from [`crate::utils::http_outcall::get_tagged`]; provider
/// call sites should not call this directly.
pub(crate) fn record(record: ExchangeOutcallRecord) {
    COUNTERS.with(|c| {
        let mut counters = c.borrow_mut();
        // The provider tag is always a `&'static str` at the call
        // site; we round-trip via `String` so the public type stays
        // candid-friendly. Lookup by `&str` avoids re-allocating to
        // grow the map on the hot path.
        let key: &'static str = static_provider_tag(&record.provider);
        let entry = counters.entry(key).or_default();
        entry.call_count = entry.call_count.saturating_add(1);
        if record.status == 0 || !(200..300).contains(&record.status) {
            entry.error_count = entry.error_count.saturating_add(1);
        }
        entry.cycles_total = entry.cycles_total.saturating_add(record.cycles_charged);
        entry.bytes_total = entry.bytes_total.saturating_add(record.response_bytes);
    });

    OUTCALL_LOG.with(|log| {
        let mut buf = log.borrow_mut();
        if buf.len() < BUFFER_CAPACITY {
            buf.push(record);
            return;
        }
        NEXT_SLOT.with(|slot| {
            let idx = slot.get();
            buf[idx] = record;
            slot.set((idx + 1) % BUFFER_CAPACITY);
        });
    });
}

/// Returns the static-string interning of a known provider tag. Falls
/// back to `"other"` for unrecognised inputs — defensive; every call
/// site in this crate passes one of the known tags.
fn static_provider_tag(tag: &str) -> &'static str {
    match tag {
        "coingecko_simple" => "coingecko_simple",
        "coingecko_token" => "coingecko_token",
        "icpswap" => "icpswap",
        _ => "other",
    }
}

/// Returns a clone of the ring buffer, ordered oldest → newest.
///
/// Used by `exchange_rate_cost_log()`. Buffer is small (≤
/// [`BUFFER_CAPACITY`] entries), so a `clone` is fine.
pub(crate) fn snapshot() -> Vec<ExchangeOutcallRecord> {
    OUTCALL_LOG.with(|log| {
        let buf = log.borrow();
        if buf.len() < BUFFER_CAPACITY {
            return buf.clone();
        }
        let split = NEXT_SLOT.with(std::cell::Cell::get) % BUFFER_CAPACITY;
        let mut out = Vec::with_capacity(buf.len());
        out.extend_from_slice(&buf[split..]);
        out.extend_from_slice(&buf[..split]);
        out
    })
}

/// Returns the running per-provider counters used by `/metrics`.
pub(crate) fn counters_snapshot() -> BTreeMap<&'static str, ProviderCounters> {
    COUNTERS.with(|c| c.borrow().clone())
}

/// Records one refresh-tick balance delta.
///
/// `balance_delta_cycles` should be `balance_before - balance_after`
/// measured around `refresh_exchange_rates`. `outcall_count` is the
/// number of outcalls issued during that tick (so we can divide later
/// for an "average per-call burn" cross-check).
///
/// This is the ground-truth alternative to summing per-call formula
/// values. The two should converge if the IC pricing constants in
/// `outcall_cost_cycles` are right.
pub(crate) fn record_refresh_tick(balance_delta_cycles: u128, outcall_count: u64) {
    REFRESH_TICK.with(|t| {
        let mut t = t.borrow_mut();
        t.tick_count = t.tick_count.saturating_add(1);
        t.balance_delta_total = t.balance_delta_total.saturating_add(balance_delta_cycles);
        t.outcall_count_total = t.outcall_count_total.saturating_add(outcall_count);
    });
}

/// Returns the per-refresh-tick balance-delta aggregate.
pub(crate) fn refresh_tick_snapshot() -> ExchangeRefreshTickStats {
    REFRESH_TICK.with(|t| t.borrow().clone())
}

/// Builds the summary returned by `exchange_rate_cost_summary()`.
pub(crate) fn summarize() -> ExchangeCostSummary {
    let now = time();
    let records = snapshot();
    let cycles_total_buffered = records.iter().map(|r| r.cycles_charged).sum();

    let windows = SUMMARY_WINDOWS_SEC
        .iter()
        .map(|&w| build_window(w, &records, now))
        .collect();

    ExchangeCostSummary {
        now_ns: now,
        buffer_capacity: BUFFER_CAPACITY as u64,
        buffer_len: records.len() as u64,
        cycles_total_buffered,
        windows,
        refresh_tick: refresh_tick_snapshot(),
    }
}

fn build_window(
    window_seconds: u64,
    records: &[ExchangeOutcallRecord],
    now_ns: u64,
) -> ExchangeCostWindow {
    let floor_ns = now_ns.saturating_sub(window_seconds.saturating_mul(1_000_000_000));

    let mut by_provider: BTreeMap<String, Vec<&ExchangeOutcallRecord>> = BTreeMap::new();
    for r in records.iter().filter(|r| r.timestamp_ns >= floor_ns) {
        by_provider.entry(r.provider.clone()).or_default().push(r);
    }

    let providers = by_provider
        .into_iter()
        .map(|(provider, rows)| {
            let call_count = rows.len() as u64;
            let error_count = rows
                .iter()
                .filter(|r| r.status == 0 || !(200..300).contains(&r.status))
                .count() as u64;
            let cycles_total: u128 = rows.iter().map(|r| r.cycles_charged).sum();
            let bytes_total: u64 = rows.iter().map(|r| r.response_bytes).sum();

            let cycles_avg = cycles_total
                .checked_div(u128::from(call_count))
                .unwrap_or(0);
            let duration_total: u64 = rows.iter().map(|r| r.duration_ns).sum();
            let duration_ns_avg = duration_total.checked_div(call_count).unwrap_or(0);

            ExchangeProviderWindowStats {
                provider,
                call_count,
                error_count,
                cycles_total,
                bytes_total,
                cycles_avg,
                cycles_p95: percentile(rows.iter().map(|r| r.cycles_charged), 95),
                duration_ns_avg,
                duration_ns_p95: percentile(rows.iter().map(|r| u128::from(r.duration_ns)), 95)
                    .try_into()
                    .unwrap_or(u64::MAX),
            }
        })
        .collect();

    ExchangeCostWindow {
        window_seconds,
        providers,
    }
}

/// Appends per-provider Prometheus counters for the exchange-rate
/// outcall instrumentation to the shared `/metrics` response.
///
/// Wired in from [`crate::api::admin::http_request`] via
/// [`shared::metrics::get_metrics`].
pub(crate) fn encode_metrics(w: &mut MetricsEncoder<Vec<u8>>) -> std::io::Result<()> {
    let counters = counters_snapshot();

    let mut cycles = w.counter_vec(
        "oisy_exchange_outcall_cycles_total",
        "Total cycles burned by exchange-rate HTTP outcalls, by provider.",
    )?;
    for (provider, c) in &counters {
        // Counters are emitted as f64; u128 → f64 loses precision once
        // we exceed 2^53, which corresponds to ~9 quadrillion cycles
        // (~9 PT). That is well above any realistic per-canister
        // exchange-rate spend over the buffer's lifetime, so the loss
        // is acceptable here.
        #[expect(clippy::cast_precision_loss)]
        let value = c.cycles_total as f64;
        cycles = cycles.value(&[("provider", provider)], value)?;
    }

    let mut calls = w.counter_vec(
        "oisy_exchange_outcall_count_total",
        "Total exchange-rate HTTP outcalls issued, by provider.",
    )?;
    for (provider, c) in &counters {
        #[expect(clippy::cast_precision_loss)]
        let value = c.call_count as f64;
        calls = calls.value(&[("provider", provider)], value)?;
    }

    let mut errors = w.counter_vec(
        "oisy_exchange_outcall_errors_total",
        "Total exchange-rate HTTP outcalls that returned non-2xx or transport errors, by provider.",
    )?;
    for (provider, c) in &counters {
        #[expect(clippy::cast_precision_loss)]
        let value = c.error_count as f64;
        errors = errors.value(&[("provider", provider)], value)?;
    }

    let mut bytes = w.counter_vec(
        "oisy_exchange_outcall_response_bytes_total",
        "Total response bytes received from exchange-rate HTTP outcalls, by provider.",
    )?;
    for (provider, c) in &counters {
        #[expect(clippy::cast_precision_loss)]
        let value = c.bytes_total as f64;
        bytes = bytes.value(&[("provider", provider)], value)?;
    }
    let _ = bytes;

    Ok(())
}

fn percentile<I>(values: I, pct: u8) -> u128
where
    I: IntoIterator<Item = u128>,
{
    let mut v: Vec<u128> = values.into_iter().collect();
    if v.is_empty() {
        return 0;
    }
    v.sort_unstable();
    // nearest-rank percentile
    let rank = (u128::from(pct) * v.len() as u128).div_ceil(100);
    let idx = rank.saturating_sub(1).min((v.len() - 1) as u128) as usize;
    v[idx]
}

#[cfg(test)]
pub(crate) fn reset_for_tests() {
    OUTCALL_LOG.with(|log| log.borrow_mut().clear());
    NEXT_SLOT.with(|s| s.set(0));
    COUNTERS.with(|c| c.borrow_mut().clear());
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;

    fn rec(
        provider: &str,
        ts: u64,
        cycles: u128,
        bytes: u64,
        status: u32,
        duration: u64,
    ) -> ExchangeOutcallRecord {
        ExchangeOutcallRecord {
            timestamp_ns: ts,
            provider: provider.to_string(),
            url_path: format!("/x/{provider}"),
            requested_tokens: vec!["a".into()],
            cycles_charged: cycles,
            response_bytes: bytes,
            max_response_bytes: bytes.max(1024),
            status,
            duration_ns: duration,
        }
    }

    #[test]
    fn snapshot_preserves_insertion_order_below_capacity() {
        reset_for_tests();
        record(rec("coingecko_simple", 1, 100, 10, 200, 5));
        record(rec("icpswap", 2, 200, 20, 200, 6));

        let snap = snapshot();
        assert_eq!(snap.len(), 2);
        assert_eq!(snap[0].timestamp_ns, 1);
        assert_eq!(snap[1].timestamp_ns, 2);
    }

    #[test]
    fn snapshot_wraps_oldest_first_at_capacity() {
        reset_for_tests();
        for i in 0..(BUFFER_CAPACITY + 5) {
            record(rec("icpswap", i as u64, 1, 1, 200, 1));
        }
        let snap = snapshot();
        assert_eq!(snap.len(), BUFFER_CAPACITY);
        // After overflow, the oldest surviving entry should be #5 (we wrote 0..1005,
        // and the buffer holds the last 1000 → timestamps 5..1005).
        assert_eq!(snap[0].timestamp_ns, 5);
        assert_eq!(
            snap[BUFFER_CAPACITY - 1].timestamp_ns,
            (BUFFER_CAPACITY + 4) as u64
        );
    }

    #[test]
    fn counters_track_calls_errors_and_totals() {
        reset_for_tests();
        record(rec("coingecko_simple", 1, 100, 10, 200, 5));
        record(rec("coingecko_simple", 2, 50, 5, 500, 9));
        record(rec("icpswap", 3, 200, 20, 0, 1));

        let counters = counters_snapshot();
        let cg = counters.get("coingecko_simple").unwrap();
        assert_eq!(cg.call_count, 2);
        assert_eq!(cg.error_count, 1);
        assert_eq!(cg.cycles_total, 150);
        assert_eq!(cg.bytes_total, 15);

        let ic = counters.get("icpswap").unwrap();
        assert_eq!(ic.call_count, 1);
        assert_eq!(ic.error_count, 1);
        assert_eq!(ic.cycles_total, 200);
    }

    #[test]
    fn percentile_nearest_rank() {
        assert_eq!(percentile([10u128, 20, 30, 40, 50].into_iter(), 95), 50);
        assert_eq!(percentile([10u128, 20, 30, 40, 50].into_iter(), 50), 30);
        assert_eq!(percentile(std::iter::empty(), 95), 0);
        assert_eq!(percentile([42u128].into_iter(), 95), 42);
    }
}
