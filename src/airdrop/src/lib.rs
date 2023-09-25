#![deny(clippy::all, clippy::pedantic, clippy::nursery)]
#![deny(rust_2018_idioms)]
// lint suggested by the clippy::restriction wich we cannot enable for all, as some of the lints are unidiomatic
#![allow(clippy::implicit_return)]
#![allow(clippy::missing_docs_in_private_items)]
#![allow(clippy::print_stderr)]
#![allow(clippy::std_instead_of_alloc)]
#![allow(clippy::expect_used)]
#![allow(clippy::std_instead_of_core)]
#![allow(clippy::arithmetic_side_effects)]
// we should break down the functions, but that's for future me
#![allow(clippy::cognitive_complexity)]
// we like our mod.rs file the way they are
#![allow(clippy::mod_module_files)]
#![allow(clippy::missing_docs_in_private_items)]

//! Airdrop backend canister
//! This canister is responsible for generating codes and redeeming them.
//! Linting:
//! ```bash
//! cargo clippy -p airdrop  -- -W clippy::all -W clippy::pedantic -W clippy::restriction -W clippy::nursery -W rust_2018_idioms
//! ```

use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
};

use candid::types::principal::Principal;
use ic_cdk::{
    storage::{stable_restore, stable_save},
    trap, caller,
};
use ic_cdk_macros::{export_candid, init, post_upgrade, pre_upgrade, query, update};
use state::{AirdropAmountERC20, EthereumTransaction};

mod error;
mod guards;
mod logic;
mod state;
mod utils;

#[cfg(test)]
mod tests;

use crate::{
    error::CustomResult,
    guards::{caller_is_admin, caller_is_manager},
    state::{
        AirdropAmount, Arg, Code, CodeInfo, EthereumAddress, Index, Info, PrincipalState,
        State,
    },
    utils::read_state,
};

thread_local! {
    pub static STATE: RefCell<Option<State>> = RefCell::default();
}

#[init]
fn init(arg: Arg) {
    let caller_principal = caller();

    match logic::init(arg, caller_principal) {
        Ok(()) => {}
        Err(e) => trap(&e.to_string()),
    }
}

#[pre_upgrade]
fn pre_upgrade() {
    read_state(|s| stable_save((s,))).expect("failed to encode the state");
}

#[post_upgrade]
fn post_upgrade() {
    STATE.with(|cell| {
        let (s,) = stable_restore().expect("failed to decode state");
        *cell.borrow_mut() = s;
    });
}

/// Add codes generated offline
#[update(guard = "caller_is_admin")]
fn add_codes(codes: Vec<String>) -> CustomResult<()> {
    logic::add_codes(codes)
}

#[update(guard = "caller_is_admin")]
fn add_admin(principal: Principal) -> CustomResult<()> {
    logic::add_admin(principal)
}

/// Add a given principal to the list of authorised principals - i.e. the list of principals that can generate codes
#[update(guard = "caller_is_admin")]
fn add_manager(principal: Principal) -> CustomResult<()> {
    logic::add_manager(principal)
}

/// Remove a given principal from the airdrop
#[update(guard = "caller_is_admin")]
fn remove_principal_airdrop(principal: Principal) -> CustomResult<()> {
    logic::remove_principal_airdrop(principal)
}

/// check whether a given principal is authorised to generate codes
#[query]
fn is_manager() -> bool {
    let caller_principal = caller();
    logic::is_manager(caller_principal)
}

/// Returns one code if the given principal is authorized to generate codes
#[update(guard = "caller_is_manager")]
fn generate_code() -> CustomResult<CodeInfo> {
    let caller_principal = caller();
    logic::generate_code(caller_principal)
}

/// Function to be called when the user has a code
#[update]
async fn redeem_code(code: Code) -> CustomResult<Info> {
    let caller_principal = caller();
    logic::redeem_code(code, caller_principal).await
}

/// Return all the information about a given Principal's code
#[query]
fn get_code() -> CustomResult<Info> {
    let caller_principal = caller();
    logic::get_code(caller_principal)
}

#[update(guard = "caller_is_admin")]
fn kill_canister() -> CustomResult<()> {
    logic::kill_canister()
}

#[update(guard = "caller_is_admin")]
fn bring_caninster_back_to_life() -> CustomResult<()> {
    logic::bring_caninster_back_to_life()
}

/// Returns all the eth addresses with how much is meant to be sent to each one of them
#[update(guard = "caller_is_admin")]
fn get_airdrop(index: Index) -> CustomResult<Vec<(Index, EthereumAddress, AirdropAmountERC20)>> {
    logic::get_airdrop(index)
}

/// Pushes the new state of who was transferred money
#[update(guard = "caller_is_admin")]
fn put_airdrop(indexes: Vec<Index>) -> CustomResult<()> {
    logic::put_airdrop(indexes)
}

/// Removes duplicates codes and managers
#[update(guard = "caller_is_admin")]
fn clean_up() -> CustomResult<()> {
    logic::clean_up()
}

/// Removes managers from the list of managers
#[update(guard = "caller_is_admin")]
fn remove_managers(principals: Vec<Principal>) -> CustomResult<()> {
    logic::remove_managers(principals)
}

/// Remove admins from the list of admins
#[update(guard = "caller_is_admin")]
fn remove_admins(principals: Vec<Principal>) -> CustomResult<()> {
    logic::remove_admins(principals)
}

/// Get the aidrop status - the actual state and whether tokens have been transferred
#[query(guard = "caller_is_admin")]
fn get_state_rewards() -> CustomResult<Vec<EthereumTransaction>> {
    logic::get_state_rewards()
}

/// Get the parameters of the airdrop
#[query(guard = "caller_is_admin")]
fn get_state_parameters() -> CustomResult<(u64, u64, u64, u64)> {
    logic::get_state_parameters()
}

/// Get the state of the admins list
#[query(guard = "caller_is_admin")]
fn get_state_admins() -> CustomResult<HashSet<Principal>> {
    logic::get_state_admins()
}

/// Get the state of the managers list
#[query(guard = "caller_is_admin")]
fn get_state_managers() -> CustomResult<HashMap<Principal, PrincipalState>> {
    logic::get_state_managers()
}

// automatically generates the candid file
export_candid!();
