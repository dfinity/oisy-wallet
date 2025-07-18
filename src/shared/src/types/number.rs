use std::ops::Add;

use candid::{CandidType, Deserialize};
use serde::Serialize;

#[derive(CandidType, Serialize, Default, Deserialize, Copy, Clone, Debug)]
pub struct ComparableFloat(pub f64);
impl PartialEq for ComparableFloat {
    fn eq(&self, other: &Self) -> bool {
        let diff = (self.0 - other.0).abs();
        let sum = self.0 + other.0;
        diff <= sum * 0.0001
    }
}
impl Eq for ComparableFloat {}
impl ComparableFloat {
    #[must_use]
    pub fn value(&self) -> f64 {
        self.0
    }
}
impl Add<ComparableFloat> for ComparableFloat {
    type Output = ComparableFloat;

    fn add(self, rhs: ComparableFloat) -> Self::Output {
        ComparableFloat(self.0 + rhs.0)
    }
}
