///! Airdrop backend canister
///! This canister is responsible for generating codes and redeeming them.
///! It also stores the mapping between II and Ethereum address.
///! TODO
///  - add logging
/// - should we not allow the same eth wallet to get added multiple time? For bot preventation
use candid::{types::principal::Principal, CandidType};
use ic_cdk_macros::update;

use ic_cdk_macros::{query, export_candid};
use serde::{Deserialize, Serialize};
use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
};

thread_local! {
    static CANISTER_ID: Principal = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
    // all the codes are generated from this seed
    static SEED: u64 = 0;
    static CODES: RefCell<CodesState> = RefCell::new(CodesState::default());
}

type Result<T> = ::core::result::Result<T, CanisterError>;

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct Code(String);

#[derive(Default, Serialize, Deserialize, Clone, CandidType)]
struct CodesState {
    parent_codes: HashSet<Code>,
    redeemed_codes: HashSet<Code>,
    last_used_seed: u64,
    ii_eth_mapping: HashMap<Code, (String, String)>, // Code mapped to II and Ethereum address
    child_codes: HashMap<Code, Vec<Code>>,           // Mapping from parent code to its children
    code_levels: HashMap<Code, u64>,                 // Track depth of each code in the tree
    eth_addresses: HashMap<String, u64>,             // Eth address mapped to tokens to be sent
    killed: bool,
}

#[derive(Serialize, Deserialize, Clone, CandidType)]
pub struct RedeemInput {
    pub code: Code,
    pub ii: String,
    pub eth_address: String,
}

#[derive(Serialize, Deserialize, Clone, CandidType)]
pub enum CanisterError {
    Unauthorized,
    GeneralError(String),
    CanisterKilled,
    CodeNotFound,
    CodeAlreadyRedeemed,
    CannotRegisterMultipleTimes,
    NoChildrenForCode,
    NoCodeForII,
}

#[derive(Clone, Debug, PartialEq, Default, CandidType, Deserialize)]
pub struct EthAddressAmount {
    pub eth_address: String,
    pub amount: u64,
}

/// Returns the list of codes that have been generated - only callabel by a specific principal
#[ic_cdk_macros::update]
pub fn generate_code() -> Result<Vec<Code>> {
    // seed: u64, number_of_codes: u64
    // derive seed from principal
    // number of codes == 0
    check_if_killed()?;
    ic_cdk::println!("This is a log message.");

    let mut codes: Vec<Code> = Vec::new();
    let mut rng = seed;

    // Get the last used seed value from state
    // so we can call it multiple times and get different codes
    CODES.with(|saved_codes| {
        rng = saved_codes.borrow().last_used_seed;
    });

    for _ in 0..number_of_codes {
        rng = rng.wrapping_mul(6364136223846793005).wrapping_add(1);
        let code_str = format!("CODE-{}", rng);
        let code = Code(code_str);

        CODES.with(|saved_codes| {
            let mut saved_codes_mut = saved_codes.borrow_mut();
            saved_codes_mut.parent_codes.insert(code.clone());
            // Set the default depth for the code to 0
            saved_codes_mut.code_levels.insert(code.clone(), 0);
            // Update the last used seed value
            saved_codes_mut.last_used_seed = rng;
        });

        codes.push(code);
    }

    ic_cdk::println!("test - {:?}", &CODES);

    Ok(codes)
}

#[update]
pub fn redeem_code(input: RedeemInput) -> Result<()> {
    check_if_killed()?;

    // TODO get Principal
    ic_cdk::api::caller();

    CODES.with(|saved_codes| {
        let mut saved_codes_mut = saved_codes.borrow_mut();

        // Check if the given ii has redeemed any code yet
        if saved_codes_mut
            .ii_eth_mapping
            .values()
            .any(|(ii, _)| ii == &input.ii)
        {
            return Err(CanisterError::CannotRegisterMultipleTimes); // Modify this to an appropriate error if desired
        }

        // Check if code exists in parent_codes
        if !saved_codes_mut.parent_codes.contains(&input.code) {
            return Err(CanisterError::CodeNotFound);
        }

        // Check if code is already redeemed
        if saved_codes_mut.redeemed_codes.contains(&input.code) {
            return Err(CanisterError::CodeAlreadyRedeemed);
        }

        // Mark code as redeemed
        saved_codes_mut.redeemed_codes.insert(input.code.clone());

        // Associate code with II and Ethereum address
        saved_codes_mut.ii_eth_mapping.insert(
            input.code.clone(),
            (input.ii.clone(), input.eth_address.clone()),
        );

        // Temporarily store the parent's Ethereum address outside the if-let block
        let mut parent_eth_address_to_add = None;

        // Check if code had a parent
        let parent_opt = saved_codes_mut.parent_codes.get(&input.code);
        if let Some(parent_code) = parent_opt {
            if let Some((_, parent_eth_address)) = saved_codes_mut.ii_eth_mapping.get(parent_code) {
                parent_eth_address_to_add = Some(parent_eth_address.clone());
            }
        }

        // Now, if we have an Ethereum address to add, we can insert it into eth_addresses without
        // violating Rust's borrowing rules.
        if let Some(eth_address) = parent_eth_address_to_add {
            saved_codes_mut.eth_addresses.insert(eth_address, 100); // Add parent's Ethereum address
        }

        // Generate children codes and store them
        let children = generate_children_codes(&input.code, &mut saved_codes_mut.last_used_seed);
        let parent_level = *saved_codes_mut.code_levels.get(&input.code).unwrap_or(&0);
        for child in &children {
            saved_codes_mut
                .child_codes
                .entry(input.code.clone())
                .or_insert_with(Vec::new)
                .push(child.clone());
            saved_codes_mut
                .code_levels
                .insert(child.clone(), parent_level + 1);
        }

        // Store Ethereum address for sending tokens
        // TODO remove magic constant 100
        saved_codes_mut.eth_addresses.insert(input.eth_address, 100); // Assuming 100 tokens to be sent.

        return Ok(());
    })
}

#[update]
fn kill_canister(caller: Principal) -> Result<()> {
    check_if_killed()?;
    if caller != Principal::from_text("x4vfd-jmrw4-tmcei-ufucn-lhhtk-gfoei-724ky-fz6b7-tefuy-4sewq-sae").unwrap() {
        return Err(CanisterError::GeneralError("Unauthorized".to_string()));
    }

    CODES.with(|saved_codes| {
        let mut saved_codes_mut = saved_codes.borrow_mut();
        saved_codes_mut.killed = true;
    });
    Ok(())
}

/// Return the X children codes associated with this Principal
#[query]
pub fn get_children_codes(ii: String) -> Result<Vec<Code>> {
    check_if_killed()?;
    CODES.with(|saved_codes| {
        let saved_codes_ref = saved_codes.borrow();

        // Find the code associated with the given principal
        let code_opt = saved_codes_ref
            .ii_eth_mapping
            .iter()
            .find(|&(_, (ii_stored, _))| ii_stored == &ii)
            .map(|(code, _)| code.clone());

        let res = match code_opt {
            Some(code) => saved_codes_ref
                .child_codes
                .get(&code)
                .cloned()
                .unwrap_or_default(),
            // TODO should we return different error if code not found instead of empty vec
            None => Vec::new(),
        };

        Ok(res)
    })
}

/// Returns the list of Ethereum addresses and associated amounts - only callable by a specific principal
#[query]
pub fn get_eth_addresses_and_amounts() -> Result<Vec<EthAddressAmount>> {
    check_if_killed()?;
    CODES.with(|saved_codes| {
        let saved_codes_ref = saved_codes.borrow();

        // TODO check which principal called this

        Ok(saved_codes_ref
            .eth_addresses
            .iter()
            .map(|(address, amount)| EthAddressAmount {
                eth_address: address.clone(),
                amount: *amount,
            })
            .collect())
    })
}

/// Checks if a user with the given `ii` has redeemed any code.
#[query]
pub fn has_redeemed(ii: String) -> Result<bool> {
    // TODO no need for ii - use caller function instead

    // URL<code> => redeem
    // URL => has_redeemed

    check_if_killed()?;
    // TODO should we have better errors or just return false?
    Ok(CODES.with(|saved_codes| {
        let saved_codes_ref = saved_codes.borrow();

        // Search the ii_eth_mapping for the given ii
        saved_codes_ref
            .ii_eth_mapping
            .values()
            .any(|(stored_ii, _)| stored_ii == &ii)
    }))
}

/// Helper function to generate child codes.
/// It also updates the `last_used_seed` in the process.
fn generate_children_codes(_parent: &Code, last_seed: &mut u64) -> Vec<Code> {
    let mut codes: Vec<Code> = Vec::new();
    let mut rng = *last_seed;

    for _ in 0..3 {
        // Generate 3 children codes
        rng = rng.wrapping_mul(6364136223846793005).wrapping_add(1);
        let code_str = format!("CODE-{}", rng);
        let code = Code(code_str);
        codes.push(code);
    }

    *last_seed = rng; // Update the last seed value

    codes
}

/// Helper function to check if the cannister is still alive
fn check_if_killed() -> Result<()> {
    // TODO - rust guard
    CODES.with(|saved_codes| {
        let saved_codes_ref = saved_codes.borrow();
        if saved_codes_ref.killed {
            Err(CanisterError::CanisterKilled) // You might want to add a new variant like `CanisterKilled` to `RedeemResult` enum to handle this case more descriptively.
        } else {
            Ok(())
        }
    })
}

export_candid!();
