use core::ops::Deref;
use std::borrow::Cow;

use candid::{decode_one, encode_one, CandidType, Deserialize, Principal};
use ic_stable_structures::storable::{Blob, Bound, Storable};
use shared::types::Stats;

use crate::{
    types::{Candid, StoredPrincipal, StoredTokenId},
    State,
};

impl<T> Storable for Candid<T>
where
    T: CandidType + for<'de> Deserialize<'de>,
{
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(candid::encode_one(&self.0).expect("encoding should always succeed"))
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(candid::decode_one(bytes.as_ref()).expect("decoding should succeed"))
    }
}

impl<T> Deref for Candid<T>
where
    T: CandidType + for<'de> Deserialize<'de>,
{
    type Target = T;

    fn deref(&self) -> &T {
        &self.0
    }
}

impl From<&State> for Stats {
    fn from(state: &State) -> Self {
        Stats {
            user_profile_count: state.user_profile.len(),
            user_timestamps_count: state.user_profile_updated.len(),
            user_token_count: state.user_token.len(),
            custom_token_count: state.custom_token.len(),
            token_activity_count: state.token_activity.len(),
        }
    }
}

impl Storable for StoredPrincipal {
    const BOUND: Bound = Blob::<29>::BOUND;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(
            Blob::<29>::try_from(self.0.as_slice())
                .expect("principal length should not exceed 29 bytes")
                .to_bytes()
                .into_owned(),
        )
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(Principal::from_slice(
            Blob::<29>::from_bytes(bytes).as_slice(),
        ))
    }
}

impl Storable for StoredTokenId {
    // CustomTokenId includes String, so treat it as unbounded.
    // The bounding is applied when a user saves a custom token.
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(encode_one(&self.0).expect("failed to candid-encode CustomTokenId"))
    }

    fn into_bytes(self) -> Vec<u8> {
        encode_one(&self.0).expect("failed to candid-encode CustomTokenId")
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(decode_one(bytes.as_ref()).expect("failed to candid-decode CustomTokenId"))
    }
}
