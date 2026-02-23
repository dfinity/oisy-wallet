//
// use sol_rpc_client::SolRpcClient;
// use sol_rpc_types::{
//     CommitmentLevel, ConsensusStrategy, GetSlotParams, RpcConfig, RpcSources, SolanaCluster,
// };
//
// let client = SolRpcClient::builder_for_ic()
//     .with_rpc_sources(RpcSources::Default(SolanaCluster::Mainnet))
//     .with_rpc_config(RpcConfig {
//         response_consensus: Some(ConsensusStrategy::Equality),
//         ..Default::default()
//     })
//     .build();
//
// let slot = client
//     .get_slot()
//     .with_params(GetSlotParams {
//         commitment: Some(CommitmentLevel::Finalized),
//         ..Default::default()
//     })
//     .send()
//     .await;
