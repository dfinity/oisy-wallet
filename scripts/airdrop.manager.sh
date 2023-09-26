#!/usr/bin/env bash

USERS=(
    "uekbi-m7qsr-3zuav-taupw-e53m2-lpxws-qjhld-dorr5-asqve-zuuzd-rqe"
    "wxqbs-yoaxo-zw4of-lvh62-uyn6s-k6a4l-shx5f-vwxss-p7m6h-4gapv-bqe"
    "53sme-q5aha-avmvx-kh36v-fnh4o-2ej5m-dznms-uuhup-cqrqc-obtri-dqe"
    "puasy-f6yc5-ncwnm-prtg6-ixytt-wcc35-v4c3u-qzw7x-ndq33-v7ox7-mqe"
    "dnxkj-ogtnr-lcmeo-mwvle-vjw6b-zip5v-7vyvj-illrs-4brsq-o7lm2-qqe"
    "r3iwv-lb7q2-wh6af-3sz3c-p43y4-gkdz2-q64r4-uhatb-qoem5-qj3wt-hqe"
    "p5omz-y525u-vs3yf-ahky3-nddgz-jekcd-vu7cv-smhvx-32myl-alhlt-yae"
    "5woat-xqk4y-kjmvn-ncfm4-s4mal-ysocc-pzxa5-havyl-gsjrk-zoalc-dqe"
    "pyqcx-pxdyt-nifcp-zw6w6-rlhb2-apqqq-mhwuf-lfry4-jbqyv-osr7h-cae"
    "5g7jb-3m26t-twhpu-72wxd-a3tbi-gqooc-cmgmg-35nb3-vx2kp-hsoum-sae"
    "hbxa6-coxp2-nvbgw-27th3-2ra6t-wybpr-qverx-bilyx-airq2-ausa4-aae"
    "72qim-cizvx-wozk3-vbr74-5xn64-qzdho-3ov3m-rvbzd-hrriz-2znat-jae"
    "nbh24-hwt4i-trxb5-aval3-hwfdl-7jn7d-voidq-yynpl-k654y-zu4xu-aae"
    "bqtxt-vulwt-6i23q-eckrz-bngzd-rtusx-p6bac-asxla-oorai-6przm-qqe"
    "tv3rh-gaqmm-a426g-wtpl2-3wnad-v3vcr-7hmq5-yr3lv-xvm6k-lctlg-5qe"
    "c44p3-dg4uz-wrmox-w23mt-ivrqj-szelc-ow2oj-tycht-jnblo-alqhf-aae"
    "p2qa7-2gf5p-ytm2e-y6kzz-wjrt5-kdqim-jmmsb-6oh53-juvjm-3qc36-wqe"
    "p5nqc-422x6-4oegv-jgk53-mu3tn-atrxz-snmrl-yor4c-oejin-a4dsc-xqe"
    "3y5uj-oyiwp-f5vbw-cxna2-jscer-bcreg-w3q4v-l467g-fs7lc-sou5y-tqe"
    "z7lvn-zff37-ngtmx-6ivd2-dkwgm-7jvzc-5f4au-q6zzv-chfar-xthok-3ae"
    "myzmi-vv6he-vkpx7-kqccd-fu5np-k7d6o-g5gji-ryq3v-r6ogh-ymlby-tqe"
    "6njbb-dcozo-h42ey-omju4-zjpzz-utlqa-pop5b-6boty-cfejh-dbaai-3qe"
    "moadj-5cc4w-zmzpn-pzcbv-h2miy-zimrb-uydgo-spdgq-3oceb-2tllm-rae"
    "6w6xi-olnij-4cavj-q5di3-k4u45-ph4ix-lak3t-mco2m-6y2w7-ugb2n-uqe"
    "uekbi-m7qsr-3zuav-taupw-e53m2-lpxws-qjhld-dorr5-asqve-zuuzd-rqe"
    "r2p3m-ky6ga-o2vxt-cdopl-spoof-nurjr-xf5yj-3t5cp-ogpap-ca3ur-gae"
    "6ojwf-vtptf-nfq3o-keopb-z5kow-sn74y-wdlgl-ulr7s-vnpgs-m2sls-pqe"
    "5rw7j-sdrkn-tnihn-3sbec-ry3rg-ctupb-idlle-wvmix-lilyd-cw34i-qqe"
    "ywsjp-vv2sv-x2c56-aiz3h-n32yq-4xieg-kcrsc-fkvnk-tfnyd-uisfy-hae"
    "mxc4i-5e5bk-ixse6-2ps76-guy27-3t5tn-oa66r-tyval-pgw5m-krgn2-3ae"
    "p2qa7-2gf5p-ytm2e-y6kzz-wjrt5-kdqim-jmmsb-6oh53-juvjm-3qc36-wqe"
    "qx7h4-rswaz-hr5h5-ghuwq-ymili-nfzat-5kdpq-h5xsf-m7j7i-eap2a-mqe"
    "c44p3-dg4uz-wrmox-w23mt-ivrqj-szelc-ow2oj-tycht-jnblo-alqhf-aae"
)

case $ENV in
  "staging")
    WALLET="cvthj-wyaaa-aaaad-aaaaq-cai"
    ;;
  "ic")
    WALLET="yit3i-lyaaa-aaaan-qeavq-cai"
    ;;
  *)
    ;;
esac

for USER in "${USERS[@]}"; do
    if [ -n "${ENV+1}" ]; then
        dfx canister call airdrop add_manager '(principal"'$USER'")' --network "$ENV" --wallet "$WALLET"
    else
        dfx canister call airdrop add_manager '(principal"'$USER'")'
    fi
done
