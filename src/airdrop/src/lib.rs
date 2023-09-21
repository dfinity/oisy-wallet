use crate::guards::{caller_is_admin, caller_is_manager};
use crate::utils::get_eth_address;
///! Airdrop backend canister
///! This canister is responsible for generating codes and redeeming them.
///! It also stores the mapping between II and Ethereum address.
///
/// we add a type for everything as it is easier to reason with
///! TODO
///  - add logging
/// - should we not allow the same eth wallet to get added multiple time? For bot preventation
use candid::{types::principal::Principal, CandidType};
use ic_cdk::caller;
use ic_cdk_macros::{export_candid, query, init};
use ic_cdk_macros::{update};
use serde::{Deserialize, Serialize};
use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
};

mod guards;
mod utils;

use utils::{
    add_user_to_airdrop_reward, check_if_killed, deduct_tokens, get_pre_codes,
    register_principal_with_eth_address,
};

type CustomResult<T> = Result<T, CanisterError>;

static TOKEN_PER_PERSON: u64 = 400;
static MAXIMUM_DEPTH: u64 = 2;
static NUMBERS_OF_CHILDREN: u64 = 3;
static INITIAL_TOKENS: u64 = 100_000;

thread_local! {
    // Admin principals - the principals that can add new principals that can generate codes and get the list of airdrop to do
    pub static PRINCIPALS_ADMIN: RefCell<HashSet<Principal>> = RefCell::new(HashSet::new());
    /// Manager principals - for principals allowed to generate codes
    static PRINCIPALS_MANAGERS: RefCell<HashMap<Principal, PrincipalState>> = RefCell::new(HashMap::new());
    // User principals - map Principal to (Code, Eth Address)
    static PRINCIPALS_USER_ETH: RefCell<HashMap<Principal, (Code, EthereumAddress)>> = RefCell::new(HashMap::new());

    // pre-generated codes
    static PRE_GENERATED_CODES: RefCell<Vec<Code>> = RefCell::new(Vec::new());

    /// Map a Code to it's parent principal, the depth, whether it has been redeemed
    static CODES: RefCell<HashMap<Code, CodeState>> = RefCell::new(HashMap::new());
   // id (the index) mapped to the (EthAddress, AirdropAmount)
    static AIRDROP_REWARD: RefCell<Vec<(EthereumAddress, AirdropAmount)>> = RefCell::new(Vec::new());
    // has the cannister been killed
    static KILLED: RefCell<bool> = RefCell::new(false);
    // total number of tokens
    static TOTAL_TOKENS: RefCell<u64> = RefCell::new(INITIAL_TOKENS);
    // backend canister id
    static BACKEND_CANISTER: RefCell<Principal> = RefCell::new(Principal::anonymous());
}

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType, Debug)]
pub struct PrincipalState {
    pub name: String,
    pub codes_generated: u64,
    pub codes_redeemed: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct Code(String);

#[derive(Serialize, Deserialize, Debug, Clone, Hash, PartialEq, Eq, CandidType, Default)]
pub struct EthereumAddress(String);

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct AirdropAmount(u64);

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct CodeInfo {
    code: Code,
    codes_generated: u64,
    codes_redeemed: u64,
}

impl CodeInfo {
    fn new(code: Code, codes_generated: u64, codes_redeemed: u64) -> Self {
        Self {
            code,
            codes_generated,
            codes_redeemed,
        }
    }
}

/// Returned when front-end is asking for information
#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct Info {
    /// Next three fields should all be unique per user
    code: Code,
    principal: Principal,
    ethereum_address: EthereumAddress,
    /// Maps a Code to whether it has been redeemed
    children: Option<Vec<(Code, bool)>>,
}

#[derive(Serialize, Deserialize, Clone, CandidType)]
struct CodeState {
    parent_principal: Principal,
    depth: u64,
    redeemed: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, CandidType)]
pub enum CanisterError {
    GeneralError(String),
    CanisterKilled,
    CodeNotFound,
    CodeAlreadyRedeemed,
    CannotRegisterMultipleTimes,
    NoChildrenForCode,
    NoCodeForII,
    MaximumDepthReached,
    NoMoreCodes,
    UnknownOisyWalletAddress,
}

#[derive(Clone, Debug, PartialEq, Default, CandidType, Deserialize)]
pub struct EthAddressAmount {
    pub eth_address: EthereumAddress,
    pub amount: u64,
}

#[derive(CandidType, Deserialize)]
pub struct InitArg {
    /// The backend canister id
    pub backend_canister_id: Principal,
    /// The mode in which this canister runs.
    pub admin_principals: Vec<Principal>,
}

#[init]
fn init(init: InitArg) {
    // set backend canister id
    BACKEND_CANISTER.with(|backend_canister| {
        let mut backend_canister = backend_canister.borrow_mut();
        *backend_canister = init.backend_canister_id;
    });

    // add principals to admin principals
    PRINCIPALS_ADMIN.with(|admin_principals| {
        let mut admin_principals = admin_principals.borrow_mut();
        for principal in init.admin_principals {
            admin_principals.insert(principal);
        }
    });
}

/// Add codes generated offline
#[update(guard = "caller_is_admin")]
pub fn add_codes(codes: Vec<String>) -> CustomResult<()> {
    // generate non activated codes
    PRE_GENERATED_CODES.with(|saved_codes| {
        let mut state = saved_codes.borrow_mut();
        for code in codes {
            let code = Code(code);
            state.push(code.clone());
        }
    });

    Ok(())
}

#[update(guard = "caller_is_admin")]
pub fn add_admin(principal: Principal) -> CustomResult<()> {
    PRINCIPALS_ADMIN.with(|principal_state| {
        let mut state = principal_state.borrow_mut();
        state.insert(principal);
    });

    Ok(())
}

/// Add a given principal to the list of authorised principals - i.e. the list of principals that can generate codes
#[update(guard = "caller_is_admin")]
pub fn add_manager(principal: Principal, name: String) -> CustomResult<()> {
    PRINCIPALS_MANAGERS.with(|principal_state| {
        let mut state = principal_state.borrow_mut();
        let principal_state = PrincipalState {
            name,
            codes_generated: 0,
            codes_redeemed: 0,
        };
        state.insert(principal, principal_state);
    });

    Ok(())
}

/// check whether a given principal is authorised to generate codes
#[query]
pub fn is_manager() -> bool {
    let caller_principal = caller();

    PRINCIPALS_MANAGERS.with(|managers| managers.borrow().contains_key(&caller_principal))
}

/// Returns one code if the given principal is authorized to generate codes
#[update(guard = "caller_is_manager")]
pub fn generate_code() -> CustomResult<CodeInfo> {
    check_if_killed()?;

    let caller_principal = caller();

    // check if principal is authorised to perform action
    PRINCIPALS_MANAGERS.with(|authorized| {
        let mut authorized = authorized.borrow_mut();

        // check the caller is allowed to generate codes
        // the caller_is_manager guard makes it safe to unwrap
        let principal_state = authorized.get_mut(&caller_principal).unwrap();

        // generate a new code
        let code = utils::get_pre_codes()?;
        principal_state.codes_generated += 1;

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

        Ok(CodeInfo::new(
            code,
            principal_state.codes_generated,
            principal_state.codes_redeemed,
        ))
    })
}

/// Function to be called when the user has a code
/// The code the user wants to redeem
/// The ETH address of the user
/// TODO: to be reviewed
#[update]
pub async fn redeem_code(code: Code) -> CustomResult<Info> {
    check_if_killed()?;

    let caller_principal = caller();

    // Check if the given principal has redeemed any code yet
    PRINCIPALS_USER_ETH.with(|principal_state| {
        let principal_eth = principal_state.borrow_mut();
        if principal_eth.contains_key(&caller_principal) {
            Err(CanisterError::CannotRegisterMultipleTimes)
        } else {
            Ok(())
        }
    })?;

    let eth_address = get_eth_address().await?;

    let (depth, code) = CODES.with(|codes| {
        let mut codes = codes.borrow_mut();

        // Check if code exists
        if let Some(code_state) = codes.get_mut(&code) {
            // Check if code is already redeemed
            if code_state.redeemed {
                return Err(CanisterError::CodeAlreadyRedeemed);
            }

            if code_state.depth < MAXIMUM_DEPTH {
                // When you have redeemed your code and you are not at the last
                // layer you should be able to get the full amount.  We do not
                // want a case where the amount of token is not enough while you
                // are waiting on friends to redeem their code
                deduct_tokens(TOKEN_PER_PERSON)?;
            } else {
                // We will redeem 1/4 of the amount as if the code depth == MAXIMUM_DEPTH
                deduct_tokens(TOKEN_PER_PERSON / 4)?;
            }

            // check the parent is not part of the original authorised principals
            if !PRINCIPALS_MANAGERS.with(|x| x.borrow().contains_key(&code_state.parent_principal))
            {
                // Add parent eth address to the list of eth addresses to send tokens to
                PRINCIPALS_USER_ETH.with(|principal_eth| {
                    let principal_eth = principal_eth.borrow_mut();
                    if let Some((_, parent_eth_address)) =
                        principal_eth.get(&code_state.parent_principal)
                    {
                        add_user_to_airdrop_reward(
                            parent_eth_address.clone(),
                            AirdropAmount(TOKEN_PER_PERSON / 4),
                        )
                    }
                });
            } else {
                // Increment the number of codes redeemed for the original authorised principal
                PRINCIPALS_MANAGERS.with(|principal_state| {
                    let mut principal_state = principal_state.borrow_mut();
                    let parent_principal_state = principal_state
                        .get_mut(&code_state.parent_principal)
                        .unwrap();

                    parent_principal_state.codes_redeemed += 1;
                });
            }

            // Associate code with principal and Ethereum address
            register_principal_with_eth_address(
                caller_principal.clone(),
                code.clone(),
                eth_address.clone(),
            );

            // Mark code as redeemed
            code_state.redeemed = true;

            Ok((code_state.depth, code.clone()))
        } else {
            Err(CanisterError::CodeNotFound)
        }
    })?;

    // Generate children codes only if we are below the maximum depth
    let children_codes: Option<Vec<(Code, bool)>> = if depth < MAXIMUM_DEPTH {
        CODES.with(|codes| {
            let mut codes = codes.borrow_mut();

            // generate children codes only if we haven't reached the maximum allowed depth
            let children_code: Vec<Code> = (0..NUMBERS_OF_CHILDREN)
                .map(|_x| get_pre_codes().unwrap())
                .collect();
            let mut children = Vec::default();

            for child_code in children_code {
                children.push((child_code.clone(), false));

                // Associate child code with parent principal/depth/redeemed
                codes.insert(
                    child_code.clone(),
                    CodeState {
                        parent_principal: caller_principal.clone(),
                        depth: depth + 1,
                        redeemed: false,
                    },
                );
            }

            // children code and whether they have been redeemed
            Some(children)
        })
    } else {
        None
    };
    // return Info
    Ok(Info {
        code: code.clone(),
        principal: caller_principal,
        ethereum_address: eth_address,
        children: children_codes,
    })
}

/// Return all the information about a given Principal's code
#[query]
pub fn get_code() -> CustomResult<Info> {
    check_if_killed()?;
    CODES.with(|saved_codes| {
        let saved_codes_ref = saved_codes.borrow();
        let caller_principal = caller();
        let (code, eth_address) = PRINCIPALS_USER_ETH.with(|principal_eth| {
            let principal_eth = principal_eth.borrow();
            principal_eth
                .get(&caller_principal)
                .map(|x| x.clone())
                .ok_or(CanisterError::CodeNotFound)
        })?;

        let children: Vec<(Code, bool)> = saved_codes_ref
            .iter()
            .filter(|(_, code_state)| code_state.parent_principal == caller_principal)
            .map(|(code, code_state)| {
                let redeemed = code_state.redeemed;
                (code.clone(), redeemed)
            })
            .collect();

        let children = if children.is_empty() {
            None
        } else {
            Some(children)
        };

        Ok(Info {
            code: code.clone(),
            principal: caller_principal,
            ethereum_address: eth_address,
            children,
        })
    })
}

/// Get the total number of code issued
#[query]
pub fn get_total_code_issued() -> CustomResult<u64> {
    check_if_killed()?;
    PRINCIPALS_MANAGERS.with(|principal_state| {
        let principal_state = principal_state.borrow();
        let total_code_issued = principal_state
            .iter()
            .map(|(_, principal_state)| principal_state.codes_generated)
            .sum();
        Ok(total_code_issued)
    })
}

/// Get the total number of code redeemed
#[query]
pub fn get_total_code_redeemed() -> CustomResult<u64> {
    check_if_killed()?;
    PRINCIPALS_MANAGERS.with(|principal_state| {
        let principal_state = principal_state.borrow();
        let total_code_redeemed = principal_state
            .iter()
            .map(|(_, principal_state)| principal_state.codes_redeemed)
            .sum();
        Ok(total_code_redeemed)
    })
}

/// TODO have this in guard
#[update]
fn kill_canister() -> CustomResult<()> {
    let caller_principal = caller();

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
fn bring_caninster_back_to_life() -> CustomResult<()> {
    let caller_principal = caller();

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

// automatically generates the candid file
export_candid!();
