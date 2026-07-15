use std::cell::RefCell;

use ic_cdk::management_canister::{VetKDCurve, VetKDKeyId};
use ic_vetkeys::{encrypted_maps::EncryptedMaps, types::AccessRights};
use shared::types::{
    api_keys::ApiKeys,
    backend_config::{Config, InitArg},
    Stats,
};

use crate::{
    personal_notes::PERSONAL_NOTES_DOMAIN_SEPARATOR,
    state::memory::{
        ACTIVE_USER_TRANSACTIONS_MEMORY_ID, AGREEMENT_HISTORY_MEMORY_ID, API_KEYS_MEMORY_ID,
        BTC_USER_PENDING_TRANSACTIONS_MEMORY_ID, CONFIG_MEMORY_ID, CONTACT_MEMORY_ID,
        EXCHANGE_RATE_MEMORY_ID, MEMORY_MANAGER, PERSONAL_NOTES_ENCRYPTED_MAPS_MEMORY_ID,
        PERSONAL_NOTES_KEY_MANAGER_ACCESS_MEMORY_ID, PERSONAL_NOTES_KEY_MANAGER_CONFIG_MEMORY_ID,
        PERSONAL_NOTES_KEY_MANAGER_SHARED_MEMORY_ID, PERSONAL_NOTE_SHARES_BY_CREATOR_MEMORY_ID,
        PERSONAL_NOTE_SHARES_MEMORY_ID, TOKEN_ACTIVITY_MEMORY_ID, USER_CUSTOM_TOKEN_MEMORY_ID,
        USER_PROFILE_MEMORY_ID, USER_PROFILE_UPDATED_MEMORY_ID, USER_TOKEN_MEMORY_ID,
        USER_TRANSACTIONS_MEMORY_ID,
    },
    types::{
        maps::{
            ActiveUserTransactionsMap, AgreementHistoryMap, ApiKeysCell,
            BtcUserPendingTransactionsMap, ConfigCell, ContactMap, CustomTokenMap, ExchangeRateMap,
            PersonalNoteShareMap, PersonalNoteSharesByCreatorMap, TokenActivityMap, UserProfileMap,
            UserProfileUpdatedMap, UserTokenMap, UserTransactionsMap,
        },
        storable::Candid,
    },
};

pub(crate) mod memory;

pub(crate) struct State {
    pub(crate) config: ConfigCell,
    pub(crate) api_keys: ApiKeysCell,
    /// Initially intended for ERC20 tokens only, this field stores the list of tokens set by the
    /// users.
    pub(crate) user_token: UserTokenMap,
    /// Introduced to support a broader range of user-defined custom tokens, beyond just ERC20.
    /// Future updates may include migrating existing ERC20 tokens to this more flexible structure.
    pub(crate) custom_token: CustomTokenMap,
    pub(crate) user_profile: UserProfileMap,
    pub(crate) user_profile_updated: UserProfileUpdatedMap,
    pub(crate) contact: ContactMap,
    pub(crate) btc_user_pending_transactions: BtcUserPendingTransactionsMap,
    // TODO: limit the map size with an eviction policy
    pub(crate) token_activity: TokenActivityMap,
    pub(crate) exchange_rates: ExchangeRateMap,
    pub(crate) user_transactions: UserTransactionsMap,
    /// Per-user audit trail of agreement consent/rejection events.
    pub(crate) agreement_history: AgreementHistoryMap,
    /// Per-user in-flight high-level operations (swaps, converts, …). Survives
    /// canister upgrades; the FE polls and updates these records.
    pub(crate) active_user_transactions: ActiveUserTransactionsMap,
    /// Per-user end-to-end-encrypted personal notes (vetKeys `EncryptedMaps`).
    ///
    /// `None` until the store is first accessed (see [`with_personal_notes`] /
    /// [`with_personal_notes_mut`]): it needs the vetKD key name from `config`,
    /// available only once the config has been set. Initialising it lazily —
    /// rather than eagerly in `init` / `post_upgrade` — keeps canisters that never
    /// touch notes (the vast majority of tests) from allocating its four
    /// stable-memory regions. The underlying data lives in stable memory
    /// (ids 14–17) and survives upgrades regardless of this field;
    /// [`EncryptedMaps::init`] re-attaches to it on first access.
    pub(crate) personal_notes: Option<EncryptedMaps<AccessRights>>,
    /// Publicly-readable, token-keyed store of personal-note shares. Unlike
    /// `personal_notes` above, this is a plain `StableBTreeMap` (the value is
    /// already client-side ciphertext under a per-share key, so there is no
    /// vetKD derivation and no lazy init needed).
    pub(crate) personal_note_shares: PersonalNoteShareMap,
    /// By-creator index over `personal_note_shares`, used only to enforce the
    /// per-user active-share cap without scanning the primary map.
    pub(crate) personal_note_shares_by_creator: PersonalNoteSharesByCreatorMap,
}

impl From<&State> for Stats {
    fn from(state: &State) -> Self {
        Stats {
            user_profile_count: state.user_profile.len(),
            user_timestamps_count: state.user_profile_updated.len(),
            user_token_count: state.user_token.len(),
            custom_token_count: state.custom_token.len(),
            token_activity_count: state.token_activity.len(),
            exchange_rates_count: state.exchange_rates.len(),
            user_transactions_count: state.user_transactions.len(),
            agreement_history_count: state.agreement_history.len(),
            active_user_transactions_count: state.active_user_transactions.len(),
            personal_notes_count: state
                .personal_notes
                .as_ref()
                .map_or(0, |em| em.mapkey_vals.len()),
            personal_note_shares_count: state.personal_note_shares.len(),
        }
    }
}

thread_local! {
    pub static STATE: RefCell<State> = RefCell::new(
        MEMORY_MANAGER.with(|mm| State {
            config: ConfigCell::init(mm.borrow().get(CONFIG_MEMORY_ID), None),
            api_keys: ApiKeysCell::init(mm.borrow().get(API_KEYS_MEMORY_ID), None),
            user_token: UserTokenMap::init(mm.borrow().get(USER_TOKEN_MEMORY_ID)),
            custom_token: CustomTokenMap::init(mm.borrow().get(USER_CUSTOM_TOKEN_MEMORY_ID)),
            // Use `UserProfileModel` to access and manage access to these states
            user_profile: UserProfileMap::init(mm.borrow().get(USER_PROFILE_MEMORY_ID)),
            user_profile_updated: UserProfileUpdatedMap::init(mm.borrow().get(USER_PROFILE_UPDATED_MEMORY_ID)),
            contact: ContactMap::init(mm.borrow().get(CONTACT_MEMORY_ID)),
            btc_user_pending_transactions: BtcUserPendingTransactionsMap::init(
                mm.borrow().get(BTC_USER_PENDING_TRANSACTIONS_MEMORY_ID),
            ),
            token_activity: TokenActivityMap::init(mm.borrow().get(TOKEN_ACTIVITY_MEMORY_ID)),
            exchange_rates: ExchangeRateMap::init(mm.borrow().get(EXCHANGE_RATE_MEMORY_ID)),
            user_transactions: UserTransactionsMap::init(mm.borrow().get(USER_TRANSACTIONS_MEMORY_ID)),
            agreement_history: AgreementHistoryMap::init(mm.borrow().get(AGREEMENT_HISTORY_MEMORY_ID)),
            active_user_transactions: ActiveUserTransactionsMap::init(mm.borrow().get(ACTIVE_USER_TRANSACTIONS_MEMORY_ID)),
            // Initialised lazily on first access (see `ensure_personal_notes`).
            personal_notes: None,
            personal_note_shares: PersonalNoteShareMap::init(mm.borrow().get(PERSONAL_NOTE_SHARES_MEMORY_ID)),
            personal_note_shares_by_creator: PersonalNoteSharesByCreatorMap::init(
                mm.borrow().get(PERSONAL_NOTE_SHARES_BY_CREATOR_MEMORY_ID),
            ),
        })
    );
}

/// Initialises the personal-notes [`EncryptedMaps`] store.
///
/// Called lazily on first access via [`ensure_personal_notes`], once the config
/// (and therefore the vetKD key name) is available. The vetKD key name reuses
/// `config.ecdsa_key_name` — across every OISY environment the threshold-key
/// names line up (`dfx_test_key` locally, `test_key_1` on staging, `key_1` on
/// mainnet), so no separate config field or deployment change is needed.
/// `EncryptedMaps::init` re-attaches to the existing stable memory, so notes
/// written before an upgrade are seen on the next access.
fn init_personal_notes() {
    let key_id = VetKDKeyId {
        curve: VetKDCurve::Bls12_381_G2,
        name: read_config(|c| c.ecdsa_key_name.clone()),
    };

    let encrypted_maps = MEMORY_MANAGER.with(|mm| {
        let mm = mm.borrow();
        EncryptedMaps::init(
            PERSONAL_NOTES_DOMAIN_SEPARATOR,
            key_id,
            mm.get(PERSONAL_NOTES_KEY_MANAGER_CONFIG_MEMORY_ID),
            mm.get(PERSONAL_NOTES_KEY_MANAGER_ACCESS_MEMORY_ID),
            mm.get(PERSONAL_NOTES_KEY_MANAGER_SHARED_MEMORY_ID),
            mm.get(PERSONAL_NOTES_ENCRYPTED_MAPS_MEMORY_ID),
        )
    });

    mutate_state(|s| s.personal_notes = Some(encrypted_maps));
}

/// Ensures the personal-notes store is initialised, creating it on first use.
pub(crate) fn ensure_personal_notes() {
    if read_state(|s| s.personal_notes.is_none()) {
        init_personal_notes();
    }
}

/// Runs `f` against the personal-notes store, initialising it on first access.
pub(crate) fn with_personal_notes<R>(f: impl FnOnce(&EncryptedMaps<AccessRights>) -> R) -> R {
    ensure_personal_notes();
    read_state(|s| {
        f(s.personal_notes
            .as_ref()
            .expect("personal notes store initialised by ensure_personal_notes"))
    })
}

/// Runs `f` against the mutable personal-notes store, initialising it on first
/// access.
pub(crate) fn with_personal_notes_mut<R>(
    f: impl FnOnce(&mut EncryptedMaps<AccessRights>) -> R,
) -> R {
    ensure_personal_notes();
    mutate_state(|s| {
        f(s.personal_notes
            .as_mut()
            .expect("personal notes store initialised by ensure_personal_notes"))
    })
}

pub(crate) fn read_state<R>(f: impl FnOnce(&State) -> R) -> R {
    STATE.with(|cell| f(&cell.borrow()))
}

pub(crate) fn mutate_state<R>(f: impl FnOnce(&mut State) -> R) -> R {
    STATE.with(|cell| f(&mut cell.borrow_mut()))
}

/// Reads the internal canister configuration, normally set at canister install or upgrade.
///
/// # Panics
/// - If the `STATE.config` is not initialized.
pub(crate) fn read_config<R>(f: impl FnOnce(&Config) -> R) -> R {
    read_state(|state| {
        f(state
            .config
            .get()
            .as_ref()
            .expect("config is not initialized"))
    })
}

pub(crate) fn set_config(arg: InitArg) {
    let config = Config::from(arg);
    mutate_state(|state| {
        state.config.set(Some(Candid(config)));
    });
}

/// Returns whether sign-ups of new users are currently allowed.
///
/// An unset (`None`) flag is treated as "allowed" to preserve the behaviour of canisters whose
/// config was persisted before this field existed.
///
/// # Panics
/// - If the `STATE.config` is not initialized.
pub(crate) fn read_new_user_signups_allowed() -> bool {
    read_config(|c| c.new_user_signups_allowed.unwrap_or(true))
}

/// Sets the "new user sign-ups allowed" flag, preserving all other `Config` fields.
///
/// # Panics
/// - If the `STATE.config` is not initialized.
pub(crate) fn set_new_user_signups_allowed(allowed: bool) {
    mutate_state(|state| {
        let mut config = state
            .config
            .get()
            .as_ref()
            .map(|Candid(c)| c.clone())
            .expect("config is not initialized");
        config.new_user_signups_allowed = Some(allowed);
        state.config.set(Some(Candid(config)));
    });
}

pub(crate) fn with_api_keys<R>(f: impl FnOnce(&ApiKeys) -> R) -> R {
    read_state(|state| {
        let default = ApiKeys::default();
        let api_keys = state
            .api_keys
            .get()
            .as_ref()
            .map_or(&default, |candid| &candid.0);
        f(api_keys)
    })
}

pub(crate) fn write_api_keys(api_keys: ApiKeys) {
    mutate_state(|state| {
        state.api_keys.set(Some(Candid(api_keys)));
    });
}

/// Mutates the stored API keys in place, preserving any field the closure leaves untouched.
///
/// Use this instead of [`write_api_keys`] when a single field needs to change without
/// overwriting the others (e.g. toggling `exchange_rate_enabled` without re-supplying keys).
pub(crate) fn mutate_api_keys(f: impl FnOnce(&mut ApiKeys)) {
    let mut api_keys = with_api_keys(Clone::clone);
    f(&mut api_keys);
    write_api_keys(api_keys);
}
