mod types;

use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, TransformContext,
    TransformFunc,
};
use shared::types::eth_transaction::StoredEthTransaction;

use self::types::{
    EtherscanApiResponse, EtherscanResult, JsonErc1155Tx, JsonErc20Tx, JsonErc721Tx,
    JsonInternalTx, JsonNormalTx,
};

const ETHERSCAN_V2_BASE: &str = "https://api.etherscan.io/v2/api";
const MAX_RESPONSE_BYTES: u64 = 2_000_000;

/// Cycles attached to each HTTP outcall (~400M cycles, generous to avoid failures).
const HTTP_OUTCALL_CYCLES: u128 = 400_000_000;

struct EtherscanUrlParams<'a> {
    chain_id: u64,
    action: &'a str,
    address: &'a str,
    start_block: u64,
    api_key: &'a str,
}

fn build_etherscan_url(p: &EtherscanUrlParams<'_>) -> String {
    format!(
        "{ETHERSCAN_V2_BASE}?chainid={}&module=account&action={}\
         &address={}&startblock={}&sort=asc&apikey={}",
        p.chain_id, p.action, p.address, p.start_block, p.api_key,
    )
}

async fn fetch_etherscan_json(url: &str) -> Result<Vec<u8>, String> {
    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(MAX_RESPONSE_BYTES),
        transform: Some(TransformContext {
            function: TransformFunc(candid::Func {
                principal: ic_cdk::id(),
                method: "transform_etherscan_response".to_string(),
            }),
            context: vec![],
        }),
        headers: vec![HttpHeader {
            name: "Accept".to_string(),
            value: "application/json".to_string(),
        }],
    };

    let (response,) = http_request(request, HTTP_OUTCALL_CYCLES)
        .await
        .map_err(|(code, msg)| format!("HTTP outcall failed ({code:?}): {msg}"))?;

    if response.status != 200u64 {
        return Err(format!("Etherscan returned HTTP {}", response.status));
    }

    Ok(response.body)
}

macro_rules! fetch_etherscan {
    ($fn_name:ident, $action:literal, $json_ty:ty, $variant:ident) => {
        pub(crate) async fn $fn_name(
            address: &str,
            chain_id: u64,
            start_block: u64,
            api_key: &str,
        ) -> Result<Vec<StoredEthTransaction>, String> {
            let url = build_etherscan_url(&EtherscanUrlParams {
                chain_id,
                action: $action,
                address,
                start_block,
                api_key,
            });
            let body = fetch_etherscan_json(&url).await?;
            let resp: EtherscanApiResponse<$json_ty> =
                serde_json::from_slice(&body).map_err(|e| format!("JSON parse error: {e}"))?;

            match resp.result {
                EtherscanResult::Ok(txs) => Ok(txs
                    .into_iter()
                    .map(|tx| StoredEthTransaction::$variant(tx.into()))
                    .collect()),
                EtherscanResult::Err(msg) if msg == "No transactions found" => Ok(vec![]),
                EtherscanResult::Err(msg) => Err(format!("Etherscan error: {msg}")),
            }
        }
    };
}

fetch_etherscan!(fetch_normal_transactions, "txlist", JsonNormalTx, Normal);
fetch_etherscan!(
    fetch_internal_transactions,
    "txlistinternal",
    JsonInternalTx,
    Internal
);
fetch_etherscan!(fetch_erc20_transactions, "tokentx", JsonErc20Tx, Erc20);
fetch_etherscan!(
    fetch_erc721_transactions,
    "tokennfttx",
    JsonErc721Tx,
    Erc721
);
fetch_etherscan!(
    fetch_erc1155_transactions,
    "token1155tx",
    JsonErc1155Tx,
    Erc1155
);

/// Fetches all transaction types for a given address/chain, starting from `start_block`.
pub(crate) async fn fetch_all_transactions(
    address: &str,
    chain_id: u64,
    start_block: u64,
    api_key: &str,
) -> Result<Vec<StoredEthTransaction>, String> {
    let mut all = Vec::new();

    all.extend(fetch_normal_transactions(address, chain_id, start_block, api_key).await?);
    all.extend(fetch_internal_transactions(address, chain_id, start_block, api_key).await?);
    all.extend(fetch_erc20_transactions(address, chain_id, start_block, api_key).await?);
    all.extend(fetch_erc721_transactions(address, chain_id, start_block, api_key).await?);
    all.extend(fetch_erc1155_transactions(address, chain_id, start_block, api_key).await?);

    Ok(all)
}
