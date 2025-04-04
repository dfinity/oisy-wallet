// src/backend/src/contacts/storage.rs

use ic_stable_structures::{storable::Bound, Storable};
use ic_cdk::api::stable;
use super::ContactsList;

impl Storable for ContactsList {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        std::borrow::Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}

pub fn stable_save(data: (ContactsList,)) -> Result<(), String> {
    stable::stable_write(0, &data).map_err(|e| format!("stable_write failed: {:?}", e))
}

pub fn stable_restore() -> Result<ContactsList, String> {
    let mut data = vec![0u8; stable::stable_size() as usize * 65536];
    stable::stable_read(0, &mut data);
    let data = data.as_slice();
    let data = data.strip_suffix(&[0]).unwrap_or(data);
    let data = data.to_vec();
    if data.is_empty() {
        Ok(ContactsList::default())
    } else {
        let (contacts_list, ): (ContactsList,) = candid::decode_one(&data).unwrap();
        Ok(contacts_list)
    }
}