//! Methods for validating data.
#[cfg(test)]
mod tests;

pub trait Validate {
    /// Verifies that an object is semantically valid.
    ///
    /// # Errors
    /// - If the object is invalid.
    fn validate(&self) -> Result<(), candid::Error>;
    /// Returns the object if it is semantically valid.
    ///
    /// # Errors
    /// - If the object is invalid.
    fn validated(self) -> Result<Self, candid::Error>
    where
        Self: Sized,
    {
        self.validate().map(|()| self)
    }
}

macro_rules! validate_on_deserialize {
    ($type:ty) => {
        impl<'de> Deserialize<'de> for $type {
            fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
            where
                D: Deserializer<'de>,
            {
                let unchecked = <$type>::deserialize(deserializer)?;
                unchecked.validated().map_err(de::Error::custom)
            }
        }
    };
}
pub(crate) use validate_on_deserialize;

/// To test validation when deserializing, create:
/// - A `TestVector` struct with an `input` field of the type being tested, a `valid` field and a
///   description.
/// - A `test_vectors` function that returns a `Vec<TestVector>`.
/// - Run `test_validate_on_deserialize!($type)` to test the validation.
#[cfg(test)]
macro_rules! test_validate_on_deserialize {
    ($type:ty, $test_vectors:expr) => {
        paste::paste! {
            #[test]
            fn [<$type:snake _validates_on_deserialize>]() {
            for TestVector {
                input,
                valid,
                description,
            } in $test_vectors
            {
                let result = input.validate();
                assert_eq!(
                    valid,
                    result.is_ok(),
                    "Validation does not match for: {} yielding: {:?}",
                    description,
                    result
                );
                let candid = Encode!(&input).unwrap();
                let result: Result<$type, _> = Decode!(&candid, $type);
                assert_eq!(
                    valid,
                    result.is_ok(),
                    "Candid deserialization did not match for: {}",
                    description
                );
                if valid {
                    assert_eq!(input, result.unwrap());
                }
            }
        }
        }
    };
}
#[cfg(test)]
pub(crate) use test_validate_on_deserialize;

#[cfg(test)]
pub struct TestVector<T>
where
    T: candid::CandidType + Validate,
{
    pub description: &'static str,
    pub input: T,
    pub valid: bool,
}
