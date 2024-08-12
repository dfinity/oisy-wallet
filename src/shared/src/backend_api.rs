use crate::types::*;
use candid::{self, Principal};
use ic_cdk::api::call::CallResult as Result;
use user_profile::Stats;

pub struct Service(pub Principal);
impl Service {
    pub async fn bulk_up(&self, arg0: Vec<u8>) -> Result<()> {
        ic_cdk::call(self.0, "bulk_up", (arg0,)).await
    }
    pub async fn set_guards(&self, arg0: Guards) -> Result<()> {
        ic_cdk::call(self.0, "set_guards", (arg0,)).await
    }
    pub async fn stats(&self) -> Result<(Stats,)> {
        ic_cdk::call(self.0, "stats", ()).await
    }
}
