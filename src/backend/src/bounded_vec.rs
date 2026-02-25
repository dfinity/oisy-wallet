use std::marker::PhantomData;

use candid::CandidType;
use serde::de::{self, Deserializer, SeqAccess, Visitor};
use serde::Deserialize;

/// A `Vec<T>` wrapper that rejects sequences longer than `MAX_LEN` during
/// Candid/serde deserialization, preventing large allocations from untrusted input.
///
/// On the wire this is identical to `vec T` — only the decoding path enforces the bound.
#[derive(Debug)]
pub struct BoundedVec<const MAX_LEN: usize, T>(Vec<T>);

impl<const MAX_LEN: usize, T> BoundedVec<MAX_LEN, T> {
    pub fn into_inner(self) -> Vec<T> {
        self.0
    }
}

impl<const MAX_LEN: usize, T> std::ops::Deref for BoundedVec<MAX_LEN, T> {
    type Target = [T];
    fn deref(&self) -> &[T] {
        &self.0
    }
}

impl<const MAX_LEN: usize, T> IntoIterator for BoundedVec<MAX_LEN, T> {
    type Item = T;
    type IntoIter = std::vec::IntoIter<T>;
    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

// --- Candid compatibility -------------------------------------------------

impl<const MAX_LEN: usize, T: CandidType> CandidType for BoundedVec<MAX_LEN, T> {
    fn _ty() -> candid::types::Type {
        candid::types::TypeInner::Vec(T::_ty()).into()
    }

    fn idl_serialize<S>(&self, serializer: S) -> Result<(), S::Error>
    where
        S: candid::types::Serializer,
    {
        self.0.idl_serialize(serializer)
    }
}

// --- Serde deserialization with length bound ------------------------------

impl<'de, const MAX_LEN: usize, T: Deserialize<'de>> Deserialize<'de> for BoundedVec<MAX_LEN, T> {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        deserializer.deserialize_seq(BoundedVecVisitor::<MAX_LEN, T>(PhantomData))
    }
}

struct BoundedVecVisitor<const MAX_LEN: usize, T>(PhantomData<T>);

impl<'de, const MAX_LEN: usize, T: Deserialize<'de>> Visitor<'de>
    for BoundedVecVisitor<MAX_LEN, T>
{
    type Value = BoundedVec<MAX_LEN, T>;

    fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "a sequence with at most {MAX_LEN} elements")
    }

    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
        if let Some(len) = seq.size_hint() {
            if len > MAX_LEN {
                return Err(de::Error::custom(format!(
                    "sequence length {len} exceeds maximum of {MAX_LEN}"
                )));
            }
        }

        let cap = seq.size_hint().unwrap_or(0).min(MAX_LEN);
        let mut vec = Vec::with_capacity(cap);

        while let Some(elem) = seq.next_element()? {
            if vec.len() >= MAX_LEN {
                return Err(de::Error::custom(format!(
                    "sequence length exceeds maximum of {MAX_LEN}"
                )));
            }
            vec.push(elem);
        }

        Ok(BoundedVec(vec))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::{Decode, Encode};

    #[test]
    fn accepts_vec_within_limit() {
        let original: Vec<u64> = vec![1, 2, 3];
        let bytes = Encode!(&original).unwrap();
        let decoded = Decode!(&bytes, BoundedVec::<5, u64>).unwrap();
        assert_eq!(decoded.into_inner(), original);
    }

    #[test]
    fn accepts_vec_at_exact_limit() {
        let original: Vec<u64> = vec![1, 2, 3, 4, 5];
        let bytes = Encode!(&original).unwrap();
        let decoded = Decode!(&bytes, BoundedVec::<5, u64>).unwrap();
        assert_eq!(decoded.into_inner(), original);
    }

    #[test]
    fn rejects_vec_exceeding_limit() {
        let original: Vec<u64> = vec![1, 2, 3, 4, 5, 6];
        let bytes = Encode!(&original).unwrap();
        let result = Decode!(&bytes, BoundedVec::<5, u64>);
        assert!(result.is_err());
        let err = format!("{:?}", result.unwrap_err());
        assert!(err.contains("exceeds maximum of 5"), "got: {err}");
    }

    #[test]
    fn accepts_empty_vec() {
        let original: Vec<u64> = vec![];
        let bytes = Encode!(&original).unwrap();
        let decoded = Decode!(&bytes, BoundedVec::<5, u64>).unwrap();
        assert!(decoded.is_empty());
    }

    #[test]
    fn candid_type_is_vec() {
        use candid::types::TypeInner;
        let ty = BoundedVec::<10, u64>::_ty();
        assert!(matches!(&*ty, TypeInner::Vec(_)));
    }
}
