use std::{convert::TryInto, mem::size_of};

/// Generates a cryptographically secure random `u64` number using the Internet Computer's
/// Management Canister API `raw_rand()`.
///
/// # Returns
/// - `Ok(u64)` containing the generated random number.
///
/// # Errors
/// - Returns error string when `raw_rand()` call fails, with the error details.
/// - Returns error string "Failed to convert bytes to u64" if the byte conversion to u64 fails.
///
/// # Panics
/// - Panics if the random bytes returned from `raw_rand()` are fewer than 8 bytes (the size needed
///   for a u64), with a descriptive error message.
pub async fn generate_random_u64() -> Result<u64, String> {
    // Call raw_rand() and await the result
    let random_bytes = ic_cdk::management_canister::raw_rand()
        .await
        .map_err(|e| format!("raw_rand failed: {e:?}"))?;

    // Check if we have at least 8 bytes that is required for u64
    assert!(
        (random_bytes.len() >= 8),
        "Not enough random bytes returned: Need at least 8, the IC spec promises 32, got {}. See: https://internetcomputer.org/docs/references/ic-interface-spec#ic-raw_rand",
        random_bytes.len()
    );

    // We only extract 8 bytes which is required for a u64
    let (int_bytes, _rest) = random_bytes.split_at(size_of::<u64>());

    // Convert bytes to u64
    let random_id = u64::from_le_bytes(int_bytes.try_into().unwrap_or_else(|_| {
        unreachable!("We checked we have 8 bytes above, so this cannot fail.")
    }));

    Ok(random_id)
}
