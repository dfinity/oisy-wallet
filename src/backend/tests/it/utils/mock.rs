pub const CALLER: &str = "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae";

/// An admin user.  Typically, controls the backend canister.
pub const CONTROLLER: &str = "l3lfs-gak7g-xrbil-j4v4h-aztjn-4jyki-wprso-m27h3-ibcl3-2cwuz-oqe";
/// A normal user, without any special permissions.
pub const USER_1: &str = "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";

pub const SEPOLIA_CHAIN_ID: u64 = 11155111;

pub const WEENUS_CONTRACT_ADDRESS: &str = "0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9";
pub const WEENUS_DECIMALS: u8 = 18;
pub const WEENUS_SYMBOL: &str = "Weenus";

// TODO: Use a VP from DECIDE AI. We can't yet, because they don't create valid credentials yet.
// This is a VP of ProofOfUniqueness from the dummy issuer
pub const VP_JWT: &str = "eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJpc3MiOiJkaWQ6aWNwOnFkaWlmLTJpYWFhLWFhYWFwLWFoamFxLWNhaSIsInZwIjp7IkBjb250ZXh0IjoiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiLCJ0eXBlIjoiVmVyaWZpYWJsZVByZXNlbnRhdGlvbiIsInZlcmlmaWFibGVDcmVkZW50aWFsIjpbImV5SnFkMnNpT25zaWEzUjVJam9pYjJOMElpd2lZV3huSWpvaVNXTkRjeUlzSW1zaU9pSk5SSGQzUkVGWlMwdDNXVUpDUVVkRWRVVk5Ra0ZuVFhOQlFXOUJRVUZCUVVGQlFVRkNkMFZDUkhWZmVVMUhlWFJLZVZCWlEybFRNalZDTURSMloxbzRabWR5VkZOT2NUVmlWRlp3UzNCMVExTktOQ0o5TENKcmFXUWlPaUprYVdRNmFXTndPbkprYlhnMkxXcGhZV0ZoTFdGaFlXRmhMV0ZoWVdSeExXTmhhU0lzSW1Gc1p5STZJa2xqUTNNaWZRLmV5SmxlSEFpT2pFM01qRXpOelV5TlRNc0ltbHpjeUk2SW1oMGRIQnpPaTh2YVdSbGJuUnBkSGt1YVdNd0xtRndjQzhpTENKdVltWWlPakUzTWpFek56UXpOVE1zSW1wMGFTSTZJbVJoZEdFNmRHVjRkQzl3YkdGcGJqdGphR0Z5YzJWMFBWVlVSaTA0TEhScGJXVnpkR0Z0Y0Y5dWN6b3hOekl4TXpjME16VXpPVFE0TmpFMU56RTVMR0ZzYVdGelgyaGhjMmc2WVdKbU5HWXpOREExTXpKalkyWmpZV0UwTUROa05tTm1PVGsyTW1GbVlUaGhaVGc0WmpVMU0yRXdPREkyTWpSaE1EQmhZV0U0TlRjM01qSm1NV05tTkNJc0luTjFZaUk2SW1ScFpEcHBZM0E2ZFdacVpHd3RhMlYzY0RVdFltZG1ZWEV0WkRkck16UXRaVFYzTmpJdGJubGhaRFF0TjNJemN6VXRiVEp3ZERJdGIzZHhaMkV0YTJOeU5Yb3RhbUZsSWl3aWRtTWlPbnNpUUdOdmJuUmxlSFFpT2lKb2RIUndjem92TDNkM2R5NTNNeTV2Y21jdk1qQXhPQzlqY21Wa1pXNTBhV0ZzY3k5Mk1TSXNJblI1Y0dVaU9sc2lWbVZ5YVdacFlXSnNaVU55WldSbGJuUnBZV3dpTENKSmJuUmxjbTVsZEVsa1pXNTBhWFI1U1dSQmJHbGhjeUpkTENKamNtVmtaVzUwYVdGc1UzVmlhbVZqZENJNmV5SkpiblJsY201bGRFbGtaVzUwYVhSNVNXUkJiR2xoY3lJNmV5Sm9ZWE5KWkVGc2FXRnpJam9pWm5oblltWXRkMlExZHpNdFlYUmljakl0Wlc1a2NUTXRhSGhpTjNRdFkzTTBiMjR0YzJwbFpXTXROak52ZW13dFltMTZNbm90ZERNemFHTXRjWEZsSW4xOWZYMC4yZG4zb210alpYSjBhV1pwWTJGMFpWa0VyOW5aOTZOa2RISmxaWU1CZ3dHREFZSUVXQ0NtV3ZvNDRpUWlpR09vbnJ0enotVmMtY0MxNXNqNGRXdzVpTTE0T1haZWk0TUNTR05oYm1semRHVnlnd0dEQVlNQmd3SktBQUFBQUFBQUFBY0JBWU1CZ3dHREFrNWpaWEowYVdacFpXUmZaR0YwWVlJRFdDQ2wwam9HSjJGZWNLS0w1YWc1Q2FraHhwc3B0cS0tdWVfTmJHWTk4aHBtY1lJRVdDRFk5azk2X0thbFhVN20zdG13SUF1c1psSEs5TWVoa2dJU3RhQThtX0hmTm9JRVdDQVg0WFZsQS1FRFlyQWtMNmtRYkFzQUtvU0c2THNQbE5vaEhVVzdGamFqZ29JRVdDQ0N3cHQ5aEFuaG1HNlZWMTRIajVuMWFkaTFhSGQ0SjZDblRQVFdYRWhpX1lJRVdDQ0hRb2dic3FYZXFaNUw3MlU0TmIyUDNrM0l3by00TWNfRGdCME5tZ2pCdFlJRVdDQ1ZkMFV4c0RPZHpZY0pWM09tRk5iVndXVHdxaFpSVjhaTlh4YXMyUEZ5TjRJRVdDQURBWVp5bnl2clVSeDRhV0VMWEpwc0Z3QThzQWxDQjR1Si1GU3N3R3R2eDRNQmdnUllJTUN6UWlOak1DdkFEQjhEbWNrQUpEUno5UGt2NVBTZWJ0RGRVbUtOcEN3RGd3SkVkR2x0WllJRFNhZkl6T1NzbS1QeEYybHphV2R1WVhSMWNtVllNTFpSRUQxeVlaLWthSXYzU2tHVDJ5NzlaenNyeWtHcHljanROTnlPOF9rSVdSaGU5NHJOQWp6Yl9JQUNWUW91Z1dwa1pXeGxaMkYwYVc5dW9tbHpkV0p1WlhSZmFXUllIVVBjcnhHQTI0TDlwd2pPT3NlZ09tQmdxOTRUNlZSc1lPak01bDBDYTJObGNuUnBabWxqWVhSbFdRS1UyZG4zb21SMGNtVmxnd0dDQkZnZ1RFbUhjZC01dEhja0pxQ2pOV0JVUFJ0MWRCc2J5MkNnTEt0emFES0JfWnFEQVlNQmdnUllJTVBBLU1ZcGRMYV9RZjVkUTJ2Z0dJbmhuTEhxaWR3eTdpYnIzVE80UGhjWGd3SkdjM1ZpYm1WMGd3R0RBWU1CZ2dSWUlMZ3pGSjV6UmJLV25kNzFxRnBld3Jrcm1xUVNGVTZNYi1xX2JtOVdUNlRzZ3dHQ0JGZ2dSbXB3S0d6NXJPbUFIS1UtSXE5dTRGbWdsUDFnU1lZRzFJUzJoVUJZTUgyREFZTUJnZ1JZSUlzdmJCVUhpdVRUdVRSd2tWeWxQamN6Sl9OLXAwdWh1QmQ5bUd1M216R3Vnd0pZSFVQY3J4R0EyNEw5cHdqT09zZWdPbUJncTk0VDZWUnNZT2pNNWwwQ2d3R0RBazlqWVc1cGMzUmxjbDl5WVc1blpYT0NBMWd5MmRuM2dvSktBQUFBQUFBQUFBY0JBVW9BQUFBQUFBQUFCd0VCZ2tvQUFBQUFBaEFBQUFFQlNnQUFBQUFDSF9fX0FRR0RBa3B3ZFdKc2FXTmZhMlY1Z2dOWWhUQ0JnakFkQmcwckJnRUVBWUxjZkFVREFRSUJCZ3dyQmdFRUFZTGNmQVVEQWdFRFlRQ2tZdk5vX19wMHU1ajMyZlJvQzFnRkFKNHBHdndDajloLTBzZnRPeXNzSWFOOHR1Q09FQ2ltMHdpcDZ1WjA4MXNOYzF2VFBGdGlmaGdwYmVQRlFJUTdpdWI0QzNETGNjTnp5bjFIZjZvN2xhek5qdDJMbVVSYXRXeGpZVVpxaDlTQ0JGZ2dMRkhiZTFaUXQ2UGJ1NFV3cDBTY3h2a0JSSGVMWXZJUFBDYlhMcFhsQnBpQ0JGZ2d0NDRhQUFFYUd3VERVRTBVZEZQdzdhdXhhd052WVFmTXQ0TXdORko3QzRPQ0JGZ2dZZHFWNXk5NUJ3ZVdqaUtxRUJfU0UzQ0gtdmk4VG0xVl9mRHlNQlZvVDdxREFrUjBhVzFsZ2dOSmktV1ZqX0dvcV9FWGFYTnBaMjVoZEhWeVpWZ3dzc1V6NHBpTTNOdFVib29xaXo4eUJiSnhrSGpLZFRTN05UNURYMVl3dEdBQ29BODZSbnAtQUJDWUN5WlN0ZENCWkhSeVpXV0RBWUlFV0NEYU50ZGFZUXlmWW0tZjczUFpJWTR2QWN5eUl3Sm1xdlc0WWI0X2lUMUpoWU1DUTNOcFo0TUJnZ1JZSUtlMkFhem8taTVGUFowMUpjVTQ3aHlqd2VzWl9rMUhRaFRETXkzTHgyS0tnd0dDQkZnZ2VYQjJhZFlhYW9feVlHWHJ0YjZrMFVzTDdvdGFRd2F6V3dFYXhHRHE2dmFEQVlNQmdnUllJUDZfUEEySmxKVUVDUGFqS3ZJRFpfQ3BuUF9CeGlENmFDVWZaVUpsUjRnNWd3R0NCRmdnUlljU1haNU1sODUtYkQtRy14WUZ5eW51cjFYbGxjbnlPQUVQS25VdkF4V0RBbGdndUlwR2dCSHI4cV9sOWlBOVg1Sm1nbmhlOVVpTE9VY0xsckxXYU1QbG1zdURBWUlFV0NEd3ZKVlIwS1Q2LTdrRU0xWjhRcXBVdlVVRkp0THNFNnI5Y2lzSHV2WWozb01DV0NDclBCeVZqZzJGRHdOVDhlcnRtYUVMdUFHTy1jMjg0eXFNbXY0RHExR0Z6b0lEUUlJRVdDREZUTy1RMjI4LXk4UXZSeWJGYVpVVXVEYmxmMHR3c0o0d0FkNkxNM2ozMHciLCJleUpxZDJzaU9uc2lhM1I1SWpvaWIyTjBJaXdpWVd4bklqb2lTV05EY3lJc0ltc2lPaUpOUkhkM1JFRlpTMHQzV1VKQ1FVZEVkVVZOUWtGblRYTkJRVzlCUVVGQlFVRmxRVFpSVVVWQ2JtOXZWVEo1TW1nNU9HUnRMWEZCY25Kc1gxQlZVWFJFUldKcE1VUkNPVlJOVUhOc2NHbGZaMlZzWnlKOUxDSnJhV1FpT2lKa2FXUTZhV053T25Ga2FXbG1MVEpwWVdGaExXRmhZV0Z3TFdGb2FtRnhMV05oYVNJc0ltRnNaeUk2SWtsalEzTWlmUS5leUpsZUhBaU9qRTNNakV6TnpVeU5qQXNJbWx6Y3lJNkltaDBkSEJ6T2k4dlpIVnRiWGt0YVhOemRXVnlMblpqTHlJc0ltNWlaaUk2TVRjeU1UTTNORE0yTUN3aWFuUnBJam9pWkdGMFlUcDBaWGgwTDNCc1lXbHVPMk5vWVhKelpYUTlWVlJHTFRnc2FYTnpkV1Z5T21oMGRIQnpPaTh2WkhWdGJYa3RhWE56ZFdWeUxuWmpMSFJwYldWemRHRnRjRjl1Y3pveE56SXhNemMwTXpZd05qZzRNVFV6TkRNNExITjFZbXBsWTNRNlpuaG5ZbVl0ZDJRMWR6TXRZWFJpY2pJdFpXNWtjVE10YUhoaU4zUXRZM00wYjI0dGMycGxaV010TmpOdmVtd3RZbTE2TW5vdGRETXphR010Y1hGbElpd2ljM1ZpSWpvaVpHbGtPbWxqY0RwbWVHZGlaaTEzWkRWM015MWhkR0p5TWkxbGJtUnhNeTFvZUdJM2RDMWpjelJ2YmkxemFtVmxZeTAyTTI5NmJDMWliWG95ZWkxME16Tm9ZeTF4Y1dVaUxDSjJZeUk2ZXlKQVkyOXVkR1Y0ZENJNkltaDBkSEJ6T2k4dmQzZDNMbmN6TG05eVp5OHlNREU0TDJOeVpXUmxiblJwWVd4ekwzWXhJaXdpZEhsd1pTSTZXeUpXWlhKcFptbGhZbXhsUTNKbFpHVnVkR2xoYkNJc0lsQnliMjltVDJaVmJtbHhkV1Z1WlhOeklsMHNJbU55WldSbGJuUnBZV3hUZFdKcVpXTjBJanA3SWxCeWIyOW1UMlpWYm1seGRXVnVaWE56SWpwN2ZYMTlmUS4yZG4zb210alpYSjBhV1pwWTJGMFpWa0dGTm5aOTZOa2RISmxaWU1CZ3dHREFZSUVXQ0NtV3ZvNDRpUWlpR09vbnJ0enotVmMtY0MxNXNqNGRXdzVpTTE0T1haZWk0TUNTR05oYm1semRHVnlnd0dDQkZnZ21Vam4ydG5Bblk5bWlZUHIzeFphZXBVUEM5MS1XY3hNSVp4MFhneVl6VUtEQVlJRVdDRHRIRWJoTnZzdjVJSTVuSjN6VkZJNmZaR3lsQzk0WTlaOHZuNjU4OWdvem9NQmdnUllJTGo0WEV1MzA4WmZfWjBaMjZPUHVDcGc4OXFMQWNNYmdEbWJsWVlNdGJsTmd3R0RBWUlFV0NEOWVDaXNtY2JSbmswUDhtVTVwbnVrd0FyZ1Vzb3AzM2tZNjZ2dldOVEFSWU1CZ2dSWUlLdjdGMGpOcHYtSnhfMHJVMDB0QXhHaWduME1kVTNzbU9PRmRPMTB3ZFJYZ3dHREFZSUVXQ0N4SnBTeDBCa0Vxc08tSjdsMnZTXy1kTTJhdXJsRF9sNlpSbTNyX0lHNXQ0TUJnZ1JZSUFQMVcwZEFYdzVIREFYMER5YlZiNWpQOUlGd1hvaXNOdlI3T05NSnRpR3Rnd0dDQkZnZ01ObHVndnZMLVhPV1FZYkZmcWpTQUlqcGJDbTB1b2JrT1pkLTBTSVBKTjJEQVlNQmd3R0RBa29BQUFBQUFlQTZRUUVCZ3dHREFZTUNUbU5sY25ScFptbGxaRjlrWVhSaGdnTllJTF9VNFlVMWhCbnpEMlhCYW5oYnZKeFhBU0ZPaTVHbTNXX1ZpTzBJMWtxc2dnUllJSzVMT1dpRlNOclIydjQ3bWEzZE5YVk5EMFZaY3VWWWhSbXF4QVE2QVY4UmdnUllJQWx1cFNpSU0xTFNhZk11RHJ6eUpMUHpmTkZnN2dGdXF6N3pXWEU0UmQzX2dnUllJUDZKc2dfTkhRZDVlRG5kdFpsTnA2XzVUa21MMXJhN0dMSGU3RDRNNVNodWdnUllJRG1FeGlONW91elFqN016ZC11dzZfcERTYjhfS012Tk1lOXlCU0hjZTd1ZWdnUllJTTNoYURpdlpmM0Z1enREckE1djNlN0lrMGtwaG82SHZpeEFBeUFEaEk2UWdnUllJR1VLWlFkS194d3c5TFFCOTBJZ0N0NjBmcThKdm5MOGJwLVpidHlXc2FyX2dnUllJRTIyX0pJdFd2X3MyY2F6c2lNS0laeHdXeXlfNldrb25TXzlLb25fRlJjZGdnUllJSWI4YUxZeVI0NEtqUE9pMXI3M3pvWDFvaFk2RXBxVGxJOVdiRnRETXdSZGd3R0NCRmdnNmNPc0gyZlgySTFxWGxTTDlVY2VtOVFYX2NMeEtpdy1WdjcySlh5bkZzNkRBa1IwYVcxbGdnTkp2dkN5eWNpYjRfRVhhWE5wWjI1aGRIVnlaVmd3aDE0S0VKZjkwN2xLc01kQUtNa1lJS25UMGlxV2lyZlplMURJdVgyVjR6RjNwSzR6YXhid25OSTFTc0QwZE9SM2FtUmxiR1ZuWVhScGIyNmlhWE4xWW01bGRGOXBaRmdkazJXb3lmSl9RVEJnaFFnMTBZV2FRVnhuVjF6VERBU2hnXzBKWXdKclkyVnlkR2xtYVdOaGRHVlpBbjNaMmZlaVpIUnlaV1dEQVlJRVdDREoyOHZnaE8wM1JybmVXaEctNVdOS1ZVUUsxNlhQaEoyREh4WWZGdVNRS0lNQmd3R0NCRmdnR0RxemNZOVRFQmprNS1HZmRYMm5Rc2htTUdHM3BxMm82MTNaREVvV195dURBa1p6ZFdKdVpYU0RBWU1CZ2dSWUlMa2hra0dfTFoyWnRFYmVEMWUzQXRyQkI3YUlvN3NLMXotZWhYTkx4T0UyZ3dHREFZSUVXQ0JsVHlJcURYZUZ5VUJyVE1NSmNPcmtyRTZaSVpHcUlKY0FXakZaU0t6cDI0TUJnZ1JZSU1nSm92Y2NTRFo1NmdnX3lqMmxnMzNpa0czZ2N4V2NkbXREbGo2ZTd1cG9nd0dDQkZnZ2x1amJmSm9vTW03ckI3WUYtN2hnaEZpMkRxWUZhbzRYNHhmR0JmU0E3Q21EQWxnZGsyV295ZkpfUVRCZ2hRZzEwWVdhUVZ4blYxelREQVNoZ18wSll3S0RBWU1DVDJOaGJtbHpkR1Z5WDNKaGJtZGxjNElEV0J2WjJmZUJna29BQUFBQUFlQUFBQUVCU2dBQUFBQUI3X19fQVFHREFrcHdkV0pzYVdOZmEyVjVnZ05ZaFRDQmdqQWRCZzByQmdFRUFZTGNmQVVEQVFJQkJnd3JCZ0VFQVlMY2ZBVURBZ0VEWVFDS2tiSTdDWXJyZmRYbEpYRl9EQ25UbG54ZlRtSFF0Y2ZHbHhjdWIxYUNxbDVDUFVJSGRwWEZGNnVuNDdZMjJwUUpPTmZWeXU3aWJEeHh6R2lJOVVMRmxtNWc2azJSM2JsYTBKbENneGNRbC1NbEFtdnZBREVvdEVaQkJXeUcwRXFDQkZnZ2U5RjR0NzdoQVFTSXIyMlN6NkdZWDhfY1hYUWVWMHMtVy1NN2VsMFd6SFdDQkZnZ01LSkoxUEZfYUFkUTM3RGxkWDNnNGZpVXhFM2lXYW13MWhZNXFmQUtPdGlEQWtSMGFXMWxnZ05KX3RMTnNhMmcxUEVYYVhOcFoyNWhkSFZ5WlZnd3VPekRkQnRDaEtfSjhwakZaVElLSnZUaWpEYnlxUkVvTnFhY0tGMzhZbTFGclVJSDI0cjNpdFdQdDc2QmUxcEFaSFJ5WldXREFrTnphV2VEQWxnZ2E1cEJxSnZYWnFEa3VqbUFId1VvdGdDMkVUbnJ1TkpYc19OWXNTOGdDdzJEQWxnZ2FYUFFpMGlUZE1Ja2JZX3MxTVRYbk5CT0NLMTNNVzBDRGVuR1I0bEc3RGlDQTBBIl19fQ.";
pub const VC_HOLDER: &str = "ufjdl-kewp5-bgfaq-d7k34-e5w62-nyad4-7r3s5-m2pt2-owqga-kcr5z-jae";
pub const ISSUER_CANISTER_ID: &str = "qdiif-2iaaa-aaaap-ahjaq-cai";
pub const ISSUER_ORIGIN: &str = "https://dummy-issuer.vc/";
pub const II_CANISTER_ID: &str = "rdmx6-jaaaa-aaaaa-aaadq-cai";
pub const SIGNER_CANISTER_ID: &str = "grghe-syaaa-aaaar-qabyq-cai";
pub const II_ORIGIN: &str = "https://identity.ic0.app/";
