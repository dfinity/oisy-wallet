///! Airdrop backend canister
///! This canister is responsible for generating codes and redeeming them.
///! It also stores the mapping between II and Ethereum address.
///
/// we add a type for everything as it is easier to reason with
///! TODO
///  - add logging
/// - should we not allow the same eth wallet to get added multiple time? For bot preventation
use candid::{types::principal::Principal, CandidType};
use ic_cdk::api::call;
use ic_cdk_macros::{init, update};

use ic_cdk_macros::{export_candid, query};
use serde::{Deserialize, Serialize};
use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
};

type Result<T> = ::core::result::Result<T, CanisterError>;

static TOKEN_PER_PERSON: u64 = 400;
static MAXIMUM_DEPTH: u64 = 2;
static NUMBERS_OF_CHILDREN: u64 = 3;
static INITIAL_TOKENS: u64 = 100_000;

thread_local! {
    // Admin principals - the principals that can add new principals that can generate codes and get the list of airdrop to do
    static PRINCIPALS_ADMIN: RefCell<HashSet<Principal>> = RefCell::new(HashSet::new());
    /// Manager principals - for principals allowed to generate codes
    static PRINCIPALS_MANAGERS: RefCell<HashMap<Principal, PrincipalState>> = RefCell::new(HashMap::new());
    // User principals - map Principal to (Code, Eth Address)
    static PRINCIPALS_USER_ETH: RefCell<HashMap<Principal, (Code, EthereumAddress)>> = RefCell::new(HashMap::new());

    // pre-generated codes
    static PRE_GENERATED_CODES: RefCell<PreGeneratedCodes> = RefCell::new(PreGeneratedCodes {
        codes: Vec::new(),
        counter: 0,
    });

    /// Map a Code to it's parent principal, the depth, whether it has been redeemed
    static CODES: RefCell<HashMap<Code, CodeState>> = RefCell::new(HashMap::new());
   // id (the index) mapped to the (EthAddress, AirdropAmount)
    static AIRDROP_REWARD: RefCell<Vec<(EthereumAddress, AirdropAmount)>> = RefCell::new(Vec::new());
    // has the cannister been killed
    static KILLED: RefCell<bool> = RefCell::new(false);
    // total number of tokens
    static TOTAL_TOKENS: RefCell<u64> = RefCell::new(INITIAL_TOKENS);
}

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType, Debug)]
pub struct PreGeneratedCodes {
    pub codes: Vec<Code>,
    pub counter: u64,
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
    MaximumDepthReached,
}

#[derive(Clone, Debug, PartialEq, Default, CandidType, Deserialize)]
pub struct EthAddressAmount {
    pub eth_address: EthereumAddress,
    pub amount: u64,
}

#[init]
fn init(principals: Vec<String>) {
    // add principals to admin principals
    PRINCIPALS_ADMIN.with(|admin_principals| {
        let mut admin_principals = admin_principals.borrow_mut();
        for principal in principals {
            admin_principals.insert(
                Principal::from_text(principal)
                    .expect("Invalid principal - should be a text representation of a principal"),
            );
        }
    });
}

/// Add codes generated offline
#[update]
pub fn add_codes(codes: Vec<String>) -> Result<()> {
    // check caller is part of the admin principals
    let caller_principal = ic_cdk::api::caller();

    PRINCIPALS_ADMIN.with(|admin_principals| {
        let admin_principals = admin_principals.borrow();
        if !admin_principals.contains(&ic_cdk::api::caller()) {
            return Err(CanisterError::Unauthorized(caller_principal.to_string()));
        } else {
            Ok(())
        }
    })?;

    // genarate non activated codes
    PRE_GENERATED_CODES.with(|saved_codes| {
        let mut state = saved_codes.borrow_mut();
        for code in codes {
            let code = Code(code);
            state.codes.push(code.clone());
        }
    });

    Ok(())
}

/// Add a given principal to the list of authorised principals - i.e. the list of principals that can generate codes
#[update]
pub fn add_admin(principal: String, name: String) -> Result<()> {
    let caller_principal = ic_cdk::api::caller();

    // check caller is part of the admin principals
    PRINCIPALS_ADMIN.with(|admin_principals| {
        let admin_principals = admin_principals.borrow();
        if !admin_principals.contains(&ic_cdk::api::caller()) {
            return Err(CanisterError::Unauthorized(caller_principal.to_string()));
        } else {
            Ok(())
        }
    })?;

    PRINCIPALS_MANAGERS.with(|principal_state| {
        let mut state = principal_state.borrow_mut();
        let principal = Principal::from_text(principal).unwrap();
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
pub fn is_admin() -> bool {
    let caller_principal = ic_cdk::api::caller();

    PRINCIPALS_ADMIN.with(|admin_principals| {
        let admin_principals = admin_principals.borrow();
        admin_principals.contains(&caller_principal)
    })
}

/// Returns one code if the given principal is authorized to generate codes
#[ic_cdk_macros::update]
pub fn generate_code() -> Result<CodeInfo> {
    check_if_killed()?;

    let caller_principal = ic_cdk::api::caller();

    // check if principal is authorised to perform action
    PRINCIPALS_MANAGERS.with(|authorized| {
        let mut authorized = authorized.borrow_mut();

        // check the caller is allowed to generate codes
        let principal_state = match authorized.get_mut(&caller_principal) {
            Some(principal_state) => principal_state,
            None => return Err(CanisterError::Unauthorized(caller_principal.to_string())),
        };

        // generate a new code
        let code = get_pre_codes();
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
#[update]
pub fn redeem_code(code: Code, eth_address: EthereumAddress) -> Result<Info> {
    check_if_killed()?;

    let caller_principal = ic_cdk::api::caller();

    // Check if the given principal has redeemed any code yet
    PRINCIPALS_USER_ETH.with(|principal_state| {
        let principal_eth = principal_state.borrow_mut();
        if principal_eth.contains_key(&caller_principal) {
            Err(CanisterError::CannotRegisterMultipleTimes)
        } else {
            Ok(())
        }
    })?;

    let (depth, code) = CODES.with(|codes| {
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
            let children_code: Vec<Code> = (0..NUMBERS_OF_CHILDREN).map(|_x| get_pre_codes()).collect();
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

        let eth_address = PRINCIPALS_USER_ETH.with(|principal_eth| {
            let principal_eth = principal_eth.borrow();
            principal_eth
                .get(&caller_principal)
                .map(|(_, eth_address)| eth_address.clone())
                .ok_or(CanisterError::GeneralError(
                    "No ETH address associated with principal".to_string(),
                ))
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
pub fn get_total_code_issued() -> Result<u64> {
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
pub fn get_total_code_redeemed() -> Result<u64> {
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

/// Deduct token
fn deduct_tokens(amount: u64) -> Result<()> {
    TOTAL_TOKENS.with(|total_tokens| {
        let mut total_tokens = total_tokens.borrow_mut();
        if *total_tokens < amount {
            Err(CanisterError::GeneralError(
                "Not enough tokens left".to_string(),
            ))
        } else {
            *total_tokens -= amount;
            Ok(())
        }
    })
}

/// Register a principal with an ethereum address
fn register_principal_with_eth_address(
    principal: Principal,
    code: Code,
    eth_address: EthereumAddress,
) {
    PRINCIPALS_USER_ETH.with(|principal_eth| {
        let mut principal_eth = principal_eth.borrow_mut();
        principal_eth.insert(principal, (code, eth_address));
    });
}

/// Add user to the list of users to send tokens to
fn add_user_to_airdrop_reward(eth_address: EthereumAddress, amount: AirdropAmount) {
    AIRDROP_REWARD.with(|airdrop_reward| {
        let mut airdrop_reward = airdrop_reward.borrow_mut();
        airdrop_reward.push((eth_address, amount));
    });
}

// "generate" codes
fn get_pre_codes() -> Code {
    PRE_GENERATED_CODES.with(|pre_generated_codes| {
        let mut pre_generated_codes = pre_generated_codes.borrow_mut();
        let codes = pre_generated_codes.codes.clone();
        let counter = pre_generated_codes.counter;
        pre_generated_codes.counter += 1;
        codes.get(counter as usize).unwrap().clone()
    })
}

// automatically generates the candid file
export_candid!();
