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
