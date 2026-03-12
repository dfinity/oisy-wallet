use std::{borrow::Cow, ops::Deref};

use candid::{decode_one, encode_one, CandidType, Deserialize, Principal};
use ic_stable_structures::storable::{Blob, Bound, Storable};
use shared::types::{custom_token::CustomTokenId, token_id::TokenId};

#[derive(Default)]
pub struct Candid<T>(pub T)
where
    T: CandidType + for<'de> Deserialize<'de>;

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

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct StoredPrincipal(pub Principal);

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

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct StoredTokenId(pub TokenId);

impl From<&CustomTokenId> for StoredTokenId {
    fn from(id: &CustomTokenId) -> Self {
        match id {
            CustomTokenId::Icrc(ledger) => Self(TokenId::Icrc(*ledger)),
            CustomTokenId::Ethereum(addr, chain_id) => {
                Self(TokenId::Erc20(addr.clone(), *chain_id))
            }
            CustomTokenId::SolMainnet(addr) => Self(TokenId::SplMainnet(addr.clone())),
            CustomTokenId::SolDevnet(addr) => Self(TokenId::SplDevnet(addr.clone())),
            CustomTokenId::ExtV2(id) => Self(TokenId::ExtV2(*id)),
            CustomTokenId::Dip721(id) => Self(TokenId::Dip721(*id)),
            CustomTokenId::IcPunks(id) => Self(TokenId::IcPunks(*id)),
        }
    }
}

impl Storable for StoredTokenId {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(encode_one(&self.0).expect("failed to candid-encode TokenId"))
    }

    fn into_bytes(self) -> Vec<u8> {
        encode_one(&self.0).expect("failed to candid-encode TokenId")
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(decode_one(bytes.as_ref()).expect("failed to candid-decode TokenId"))
    }
}
