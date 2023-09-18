///! Airdrop backend canister
///! This canister is responsible for generating codes and redeeming them.
///! It also stores the mapping between II and Ethereum address.
///! TODO
///  - add logging
/// - should we not allow the same eth wallet to get added multiple time? For bot preventation
use candid::{types::principal::Principal, CandidType};
use ic_cdk_macros::update;

use ic_cdk_macros::{export_candid, query};
use serde::{Deserialize, Serialize};
use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
};

type Result<T> = ::core::result::Result<T, CanisterError>;

static SEED: u64 = 63641365;
static AUTHORISED_PRINCIPALS: [&str; 5] = [
    "aaaaa-aa",
    "rrkah-fqaaa-aaaaa-aaaaq-cai",
    "ryjl3-tyaaa-aaaaa-aaaba-cai",
    "tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe",
    "2vxsx-fae",
];
static NUMBER_FRIENDS: u64 = 3;
static TOKENS: u64 = 100;
static TOTAL_TOKENS: u64 = 100_000;

thread_local! {
    static PRINCIPAL_STATE: RefCell<HashMap<Principal, PrincipalState>> = RefCell::new(HashMap::new());
    /// Map a Code to it's parent principal, the depth, whether it has been redeemed
    static CODES: RefCell<HashMap<Code, CodeState>> = RefCell::new(HashMap::new());
    // map Principal to (Code, Eth Address)
    static PRINCPAL_ETH: RefCell<HashMap<Principal, (Code, String)>> = RefCell::new(HashMap::new());
    // Eth address mapped to tokens to be sent
    static AIRDROP_REWARD: RefCell<HashMap<String, u64>> = RefCell::new(HashMap::new());
    // children code to parent code mapping
    static CHILD_CODES: RefCell<HashMap<Code, Code>> = RefCell::new(HashMap::new());
    // has the cannister been killed
    static KILLED: RefCell<bool> = RefCell::new(false);
}

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType, Debug)]
pub struct PrincipalState {
    pub seed: u64,
    pub codes_generated: u64,
    pub codes_redeemed: u64,
}

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct Code(String);

/// Returned when front-end is asking for information
#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct Info {
    /// Next three fields should all be unique per user
    code: Code,
    principal: Principal,
    ethereum_address: String,
    /// Maps a Code to whether it has been redeemed
    children: Option<Vec<(Code, bool)>>,
}

#[derive(Serialize, Deserialize, Clone, CandidType)]
struct CodeState {
    parent_principal: Principal,
    depth: u64,
    redeemed: bool,
}
#[derive(Serialize, Deserialize, Clone, CandidType)]
pub enum CanisterError {
    Unauthorized(String),
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

#[ic_cdk_macros::init]
fn init() {
    let mut seeds = HashSet::new();

    ic_cdk::println!("test");

    // Init authorized principals data structure and seed
    for authorized_principal in AUTHORISED_PRINCIPALS {
        PRINCIPAL_STATE.with(|principal_state| {
            let mut state = principal_state.borrow_mut();

            // TODO maybe just call the `raw_rand` function?
            let seed: u64 = authorized_principal
                .chars()
                .filter(|&c| c != '-')
                .map(|c| c as u64)
                .sum();

            // check that no principal has the same seed by accident
            let seed = loop {
                if !seeds.insert(seed) {
                    let _ = seed.wrapping_add(1);
                } else {
                    break seed;
                }
            };

            let seed = seed.wrapping_mul(SEED);

            ic_cdk::println!("{authorized_principal}");
            let principal = Principal::from_text(authorized_principal.to_string()).unwrap();
            let principal_state = PrincipalState {
                seed,
                codes_generated: 0,
                codes_redeemed: 0,
            };

            // log the created datastracture
            ic_cdk::println!("{principal:?} - {principal_state:?}");

            state.insert(principal, principal_state);
        });
    }

    let mut tmp: Vec<_> = seeds.into_iter().collect();

    // Sort the Vec
    tmp.sort();

    ic_cdk::println!("sorted {:?}", tmp);
}

/// Returns one code if the given principal is authorized to generate codes
#[ic_cdk_macros::update]
pub fn generate_code() -> Result<Code> {
    check_if_killed()?;

    let caller_principal = ic_cdk::api::caller();

    // check if principal is authorised to perform action
    PRINCIPAL_STATE.with(|authorized| {
        let mut authorized = authorized.borrow_mut();

        let principal_state = match authorized.get_mut(&caller_principal) {
            Some(principal_state) => principal_state,
            None => return Err(CanisterError::Unauthorized(caller_principal.to_string())),
        };

        let code = principal_state.seed;

        principal_state.codes_generated += 1;
        principal_state.seed += 1;

        // Do we need the `CODE-` prefix?
        let code_str = format!("CODE-{code}");
        let code = Code(code_str);

        CODES.with(|saved_codes| {
            let mut state = saved_codes.borrow_mut();
            state.insert(
                code.clone(),
                CodeState {
                    parent_principal: caller_principal,
                    depth: 0,
                    redeemed: false,
                },
            );
        });

        ic_cdk::println!("generate - {:?}", &CODES);

        Ok(code)
    })
}

/// Function to be called when the user has a code
/// The code the user wants to redeem
/// The ETH address of the user
#[update]
pub fn redeem_code(code: Code, eth_address: String) -> Result<Info> {
    check_if_killed()?;

    // check if we have enough token left

    let caller_principal = ic_cdk::api::caller();

    // Check if the given principal has redeemed any code yet
    let multliple_registration = PRINCIPAL_STATE.with(|principal_state| {
        let principal_state = principal_state.borrow_mut();
        if principal_state.contains_key(&caller_principal) {
            true
        } else {
            false
        }
    });

    if multliple_registration {
        return Err(CanisterError::CannotRegisterMultipleTimes);
    }

    CODES.with(|codes| {
        let mut codes = codes.borrow_mut();

        // Check if code exists
        if let Some(code_state) = codes.get_mut(&code) {
            // Check if code is already redeemed
            if code_state.redeemed {
                return Err(CanisterError::CodeAlreadyRedeemed);
            } else {
                // Mark code as redeemed
                code_state.redeemed = true;
            }

            // check the parent is not part of the original authorised principals
            if !AUTHORISED_PRINCIPALS.contains(&code_state.parent_principal.to_text().as_str()) {
                // Add parent eth address to the list of eth addresses to send tokens to
                PRINCPAL_ETH.with(|principal_eth| {
                    let principal_eth = principal_eth.borrow_mut();
                    if let Some((_, parent_eth_address)) =
                        principal_eth.get(&code_state.parent_principal)
                    {
                        AIRDROP_REWARD.with(|airdrop_reward| {
                            let mut airdrop_reward = airdrop_reward.borrow_mut();
                            airdrop_reward.insert(parent_eth_address.clone(), 100);
                        });
                    }
                });
            } else {
                PRINCIPAL_STATE.with(|principal_state| {
                    let mut principal_state = principal_state.borrow_mut();
                    let parent_principal_state = principal_state
                        .get_mut(&code_state.parent_principal)
                        .unwrap();

                    parent_principal_state.codes_redeemed += 1;
                });
            }

            // Associate code with principal and Ethereum address
            PRINCPAL_ETH.with(|principal_eth| {
                let mut principal_eth = principal_eth.borrow_mut();

                principal_eth.insert(
                    caller_principal.clone(),
                    (code.clone(), eth_address.clone()),
                );
            });

            // generate children codes
            let seed: u64 = caller_principal
                .to_text()
                .chars()
                .filter(|&c| c != '-')
                .map(|c| c as u64)
                .sum();

            // TODO remove the magic constant 3
            let children_code: Vec<u64> = (seed..seed + NUMBER_FRIENDS).collect();

            for child_code in children_code {
                let child_code = Code(format!("CODE-{child_code}"));
                CHILD_CODES.with(|child_codes| {
                    let mut child_codes = child_codes.borrow_mut();
                    child_codes.insert(child_code.clone(), code.clone());
                });
                CODES.with(|saved_codes| {
                    let mut saved_codes_mut = saved_codes.borrow_mut();
                    saved_codes_mut.insert(
                        child_code.clone(),
                        CodeState {
                            parent_principal: caller_principal.clone(),
                            // TODO
                            depth: code_state.depth + 1,
                            redeemed: false,
                        },
                    );
                });
            }
        } else {
            return Err(CanisterError::CodeNotFound);
        }

        // Store Ethereum address for sending tokens
        // TODO remove magic constant 100
        AIRDROP_REWARD.with(|airdrop_reward| {
            let mut airdrop_reward = airdrop_reward.borrow_mut();
            airdrop_reward.insert(eth_address.clone(), TOKENS);
        });

        // return Info
        Ok(Info {
            code: code.clone(),
            principal: caller_principal,
            ethereum_address: eth_address,
            children: CHILD_CODES.with(|child_codes| {
                let child_codes = child_codes.borrow();
                let children = child_codes
                    .iter()
                    .filter(|(_, parent_code)| parent_code == &&code)
                    .map(|(child_code, _)| {
                        let redeemed = codes.get(child_code).unwrap().redeemed;
                        (child_code.clone(), redeemed)
                    })
                    .collect();
                Some(children)
            }),
        })
    })
}

/// Return all the information about a given Principal's code
#[query]
pub fn get_code() -> Result<Info> {
    check_if_killed()?;
    CODES.with(|saved_codes| {
        let saved_codes_ref = saved_codes.borrow();
        let caller_principal = ic_cdk::api::caller();
        let code = saved_codes_ref
            .iter()
            .find(|(_, code_state)| code_state.parent_principal == caller_principal)
            .map(|(code, _)| code.clone())
            .ok_or(CanisterError::CodeNotFound)?;

        let eth_address = PRINCPAL_ETH.with(|principal_eth| {
            let principal_eth = principal_eth.borrow();
            principal_eth
                .get(&caller_principal)
                .map(|(_, eth_address)| eth_address.clone())
                .ok_or(CanisterError::GeneralError(
                    "No ETH address associated with principal".to_string(),
                ))
        })?;

        Ok(Info {
            code: code.clone(),
            principal: caller_principal,
            ethereum_address: eth_address,
            children: CHILD_CODES.with(|child_codes| {
                let child_codes = child_codes.borrow();
                let children = child_codes
                    .iter()
                    .filter(|(_, parent_code)| parent_code == &&code)
                    .map(|(child_code, _)| {
                        let redeemed = saved_codes_ref.get(child_code).unwrap().redeemed;
                        (child_code.clone(), redeemed)
                    })
                    .collect();
                Some(children)
            }),
        })
    })
}

/// TODO have this in guard
#[update]
fn kill_canister() -> Result<()> {
    let caller_principal = ic_cdk::api::caller();

    // TODO hard code the principal
    if caller_principal
        != Principal::from_text("x4vfd-jmrw4-tmcei-ufucn-lhhtk-gfoei-724ky-fz6b7-tefuy-4sewq-sae")
            .unwrap()
    {
        return Err(CanisterError::GeneralError("Unauthorized".to_string()));
    }

    KILLED.with(|killed| {
        let mut killed = killed.borrow_mut();
        *killed = true;
    });

    Ok(())
}

#[update]
fn bring_caninster_back_to_life() -> Result<()> {
    let caller_principal = ic_cdk::api::caller();

    // TODO hard code the principal
    if caller_principal
        != Principal::from_text("x4vfd-jmrw4-tmcei-ufucn-lhhtk-gfoei-724ky-fz6b7-tefuy-4sewq-sae")
            .unwrap()
    {
        return Err(CanisterError::GeneralError("Unauthorized".to_string()));
    }

    KILLED.with(|killed| {
        let mut killed = killed.borrow_mut();
        *killed = false;
    });

    Ok(())
}

/// Helper function to check if the cannister is still alive
fn check_if_killed() -> Result<()> {
    KILLED.with(|killed| {
        let killed = killed.borrow();
        if *killed {
            Err(CanisterError::CanisterKilled)
        } else {
            Ok(())
        }
    })
}

// automatically generates the candid file
export_candid!();
