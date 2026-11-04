pub(crate) mod api;
pub(crate) mod pending_tx_model;
#[cfg_attr(
    not(any(test, feature = "canbench-rs")),
    expect(
        dead_code,
        reason = "called by btc_broadcast_transaction, not added yet"
    )
)]
pub(crate) mod tx_validator;
