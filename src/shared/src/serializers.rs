/// Provides a default deserialization value for boolean fields, defaulting to `true`.
///
/// This function is a workaround for handling default values when deserializing with Serde,
/// particularly useful in scenarios where boolean fields need to default to `true` instead
/// of the usual `false` when not explicitly provided in the input.
///
/// # Returns
/// Returns `Some(true)`, indicating the default value to use.
pub fn deserialize_default_as_true() -> Option<bool> {
    // https://github.com/serde-rs/serde/issues/1030#issuecomment-522278006

    Some(true)
}
