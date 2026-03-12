use ic_cdk::api::time;
use ic_stable_structures::StableBTreeMap;
use shared::types::{token_id::TokenId, Timestamp};

use crate::{
    state::mutate_state,
    types::{StoredTokenId, VMem},
};

fn add_to_token_activity(
    token_id: StoredTokenId,
    token_activity: &mut StableBTreeMap<StoredTokenId, Timestamp, VMem>,
    timestamp: Timestamp,
) {
    token_activity.insert(token_id, timestamp);
}

pub fn mark_token_active(token_id: &TokenId) {
    mutate_state(|s| {
        add_to_token_activity(
            StoredTokenId(token_id.clone()),
            &mut s.token_activity,
            time(),
        );
    });
}

pub fn mark_tokens_active(token_ids: &[TokenId]) {
    let now = time();

    mutate_state(|s| {
        for token_id in token_ids {
            add_to_token_activity(StoredTokenId(token_id.clone()), &mut s.token_activity, now);
        }
    });
}
