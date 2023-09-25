use candid::types::principal::Principal;

use crate::{
    logic::{add_admin, add_codes, add_manager, init, redeem_code},
    state::{Arg, InitArg, Code},
    utils::read_state,
};



struct TestState {
    principal_admins: Vec<Principal>,
    principal_managers: Vec<Principal>,
    principal_users: Vec<Principal>,
    codes: Vec<String>,
}

impl TestState {
    /// Init variables
    fn new() -> Self {

    // Read codes from codes.txt
    let codes = std::fs::read_to_string("codes.txt").unwrap();
    let codes: Vec<String> = codes.split("\n").map(|s| s.to_string()).collect();

    // Create admins
    let principal_admins = vec![
        "teoen-w34dv-esqk7-5gxen-m57gg-433w3-5obhr-xnkcp-ofeq3-shc75-hae",
        "y5mgz-ye6pv-bg3mu-purwq-cowuz-gkva5-hdsrv-leuqd-53hfi-kyjr4-oae",
        "moadj-5cc4w-zmzpn-pzcbv-h2miy-zimrb-uydgo-spdgq-3oceb-2tllm-rae",
    ];

    let manager_p = vec![
        "uekbi-m7qsr-3zuav-taupw-e53m2-lpxws-qjhld-dorr5-asqve-zuuzd-rqe",
        "wxqbs-yoaxo-zw4of-lvh62-uyn6s-k6a4l-shx5f-vwxss-p7m6h-4gapv-bqe",
        "53sme-q5aha-avmvx-kh36v-fnh4o-2ej5m-dznms-uuhup-cqrqc-obtri-dqe",
        "puasy-f6yc5-ncwnm-prtg6-ixytt-wcc35-v4c3u-qzw7x-ndq33-v7ox7-mqe",
        "dnxkj-ogtnr-lcmeo-mwvle-vjw6b-zip5v-7vyvj-illrs-4brsq-o7lm2-qqe",
        "r3iwv-lb7q2-wh6af-3sz3c-p43y4-gkdz2-q64r4-uhatb-qoem5-qj3wt-hqe",
        "p5omz-y525u-vs3yf-ahky3-nddgz-jekcd-vu7cv-smhvx-32myl-alhlt-yae",
        "5woat-xqk4y-kjmvn-ncfm4-s4mal-ysocc-pzxa5-havyl-gsjrk-zoalc-dqe",
        "pyqcx-pxdyt-nifcp-zw6w6-rlhb2-apqqq-mhwuf-lfry4-jbqyv-osr7h-cae",
        "5g7jb-3m26t-twhpu-72wxd-a3tbi-gqooc-cmgmg-35nb3-vx2kp-hsoum-sae",
        "hbxa6-coxp2-nvbgw-27th3-2ra6t-wybpr-qverx-bilyx-airq2-ausa4-aae",
        "72qim-cizvx-wozk3-vbr74-5xn64-qzdho-3ov3m-rvbzd-hrriz-2znat-jae",
        "nbh24-hwt4i-trxb5-aval3-hwfdl-7jn7d-voidq-yynpl-k654y-zu4xu-aae",
        "bqtxt-vulwt-6i23q-eckrz-bngzd-rtusx-p6bac-asxla-oorai-6przm-qqe",
        "tv3rh-gaqmm-a426g-wtpl2-3wnad-v3vcr-7hmq5-yr3lv-xvm6k-lctlg-5qe",
        "c44p3-dg4uz-wrmox-w23mt-ivrqj-szelc-ow2oj-tycht-jnblo-alqhf-aae",
        "p2qa7-2gf5p-ytm2e-y6kzz-wjrt5-kdqim-jmmsb-6oh53-juvjm-3qc36-wqe",
        "p5nqc-422x6-4oegv-jgk53-mu3tn-atrxz-snmrl-yor4c-oejin-a4dsc-xqe",
        "3y5uj-oyiwp-f5vbw-cxna2-jscer-bcreg-w3q4v-l467g-fs7lc-sou5y-tqe",
        "z7lvn-zff37-ngtmx-6ivd2-dkwgm-7jvzc-5f4au-q6zzv-chfar-xthok-3ae",
        "myzmi-vv6he-vkpx7-kqccd-fu5np-k7d6o-g5gji-ryq3v-r6ogh-ymlby-tqe",
        "6njbb-dcozo-h42ey-omju4-zjpzz-utlqa-pop5b-6boty-cfejh-dbaai-3qe",
        "moadj-5cc4w-zmzpn-pzcbv-h2miy-zimrb-uydgo-spdgq-3oceb-2tllm-rae",
        "6w6xi-olnij-4cavj-q5di3-k4u45-ph4ix-lak3t-mco2m-6y2w7-ugb2n-uqe",
        "uekbi-m7qsr-3zuav-taupw-e53m2-lpxws-qjhld-dorr5-asqve-zuuzd-rqe",
        "r2p3m-ky6ga-o2vxt-cdopl-spoof-nurjr-xf5yj-3t5cp-ogpap-ca3ur-gae",
        "6ojwf-vtptf-nfq3o-keopb-z5kow-sn74y-wdlgl-ulr7s-vnpgs-m2sls-pqe",
    ];


        Self {
            principal_admins: principal_admins
                .iter()
                .map(|p| Principal::from_text(p).unwrap())
                .collect(),
            principal_managers: manager_p
                .iter()
                .map(|p| Principal::from_text(p).unwrap())
                .collect(),
            principal_users: vec![],
            codes,
        }
    }
    /// Init the state with default values
fn set_default_state(&mut self) {
    let arg = Arg::Init(InitArg {
        backend_canister_id: Principal::anonymous(),
        token_per_person: 100,
        maximum_depth: 3,
        numbers_of_children: 2,
        total_tokens: 1000,
    });

    init(arg, self.principal_admins[0]).unwrap();

    // Add codes
    add_codes(self.codes.clone()).unwrap();

    // Add admin
    for p in &self.principal_admins {
        add_admin(p.clone()).unwrap();
    }

   // Add manager
    for p in &self.principal_managers {
        add_manager(p.clone()).unwrap();
    }
}
}


// Test init of the canister
#[test]
fn test_init() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // Assert that every argument has correctly been set
    read_state(|state| {
        assert_eq!(state.backend_canister_id, Principal::anonymous());
        assert_eq!(state.token_per_person, 100);
        assert_eq!(state.maximum_depth, 3);
        assert_eq!(state.numbers_of_children, 2);
        assert_eq!(state.total_tokens, 1000);
        assert_eq!(state.principals_admins.len(), 1);
        assert_eq!(state.principals_managers.len(), 0);
        assert_eq!(state.codes.len(), 0);
        assert_eq!(state.pre_generated_codes.len(), 0);
        assert_eq!(state.principals_users.len(), 0);
        assert_eq!(state.airdrop_reward.len(), 0);
        assert_eq!(state.killed, false);
    });
}

// Test add codes
#[test]
fn test_add_codes() {
    let mut test_state = TestState::new();
    test_state.set_default_state();


    // add codes
    let codes = vec!["code1".to_string(), "code2".to_string()];
    add_codes(codes).unwrap();

    // check that the codes have been added
    read_state(|state| {
        assert_eq!(state.pre_generated_codes.len(), 2);
        assert_eq!(state.pre_generated_codes[0].0, "code1");
        assert_eq!(state.pre_generated_codes[1].0, "code2");
    });
}

// Test add admin
#[test]
fn test_add_admin() {
    let mut test_state = TestState::new();
    test_state.set_default_state();


    // add admin
    let principal =
        Principal::from_text("sg2rc-l6k33-ziksx-4d2gp-bvovt-6sxwk-qvejg-kpgmj-ulsce-nt67o-oqe")
            .unwrap();
    add_admin(principal).unwrap();

    // check that the admin has been added
    read_state(|state| {
        assert_eq!(state.principals_admins.len(), 2);
        assert!(state.principals_admins.contains(&principal));
    });
}

// Test add manager
#[test]
fn test_add_manager() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // add manager
    let principal =
        Principal::from_text("sg2rc-l6k33-ziksx-4d2gp-bvovt-6sxwk-qvejg-kpgmj-ulsce-nt67o-oqe")
            .unwrap();
    add_manager(principal).unwrap();

    // check that the manager has been added
    read_state(|state| {
        assert_eq!(state.principals_managers.len(), 1);
        assert!(state.principals_managers.contains_key(&principal));
    })
}


// Test redeeming a code with a new principal
#[test]
fn test_redeem_code_with_new_principal() {


    let mut test_state = TestState::new();
    test_state.set_default_state();

    let principal =
        Principal::from_text("sg2rc-l6k33-ziksx-4d2gp-bvovt-6sxwk-qvejg-kpgmj-ulsce-nt67o-oqe")
            .unwrap();

    // redeem code
    let principal =
        Principal::from_text("sg2rc-l6k33-ziksx-4d2gp-bvovt-6sxwk-qvejg-kpgmj-ulsce-nt67o-oqe")
            .unwrap();
    let code = "code1".to_string();
    redeem_code(code, principal).unwrap();

    // check that the code has been redeemed
    read_state(|state| {
        assert_eq!(state.principals_users.len(), 1);
        assert_eq!(state.principals_users[&principal].0.0, "code1");
    });
}
