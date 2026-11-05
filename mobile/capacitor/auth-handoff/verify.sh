#!/usr/bin/env bash
# Offline auth-handoff checks. Pass a disposable, clean, pinned SDK checkout.
set -euo pipefail
source_dir=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$source_dir/../../.." && pwd)
sdk=$(cd "${1:?usage: bash verify.sh SDK_CHECKOUT [--ios]}" && pwd)
revision=cc22ba56b6cbab384fcef02c8e3c8624341cc30a
[ "$(git -C "$sdk" rev-parse HEAD)" = "$revision" ] || { echo 'Wrong SDK revision' >&2; exit 1; }
git -C "$sdk" diff --quiet
git -C "$sdk" diff --cached --quiet
git -C "$sdk" apply --check "$source_dir/patches/local-session-delegation.patch"
git -C "$sdk" apply "$source_dir/patches/local-session-delegation.patch"
cache=$(mktemp -d "${TMPDIR:-/tmp}/oisy-auth-handoff.XXXXXX")
echo "Logs and generated fixtures: $cache"
export DEVELOPER_DIR=${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}

logged() {
  local name=$1
  shift
  if "$@" >"$cache/$name.log" 2>&1; then
    echo "PASS $name"
  else
    tail -30 "$cache/$name.log" >&2
    return 1
  fi
}

cd "$sdk"
logged native-tests bash scripts/test-swift.sh
common=( -I out/swift -L out/swift -L target/debug
  -I languages/swift/Sources/icp_coreFFI
  -Xcc "-fmodule-map-file=$sdk/languages/swift/Sources/icp_coreFFI/module.modulemap"
  -Xlinker -rpath -Xlinker "$sdk/out/swift"
  -Xlinker -rpath -Xlinker "$sdk/target/debug" )
logged swift6-consumer xcrun swiftc -swift-version 6 -strict-concurrency=complete \
  -parse-as-library "${common[@]}" -lIcpSdkCore \
  "$source_dir/native/DelegationJSON.swift" "$source_dir/native/HandoffVector.swift" -o "$cache/handoff-vector"
xcrun install_name_tool -change out/swift/libIcpSdkCore.dylib \
  @rpath/libIcpSdkCore.dylib "$cache/handoff-vector"

if [ "${2:-}" = '--ios' ]; then
  export DEVICE=${DEVICE:-iPhone 17}
  logged ios-tests bash scripts/test-swift-ios.sh
  simulator_sdk=$(xcrun --sdk iphonesimulator --show-sdk-path)
  common=( -target "$(uname -m)-apple-ios17.4-simulator" -sdk "$simulator_sdk"
    -Xcc -isysroot -Xcc "$simulator_sdk"
    -Xclang-linker -isysroot -Xclang-linker "$simulator_sdk"
    -I out/swift-ios -L out/swift-ios -L out/swift-ios/lib
    -I languages/swift/Sources/icp_coreFFI
    -Xcc "-fmodule-map-file=$sdk/languages/swift/Sources/icp_coreFFI/module.modulemap" )
  # The upstream iOS runner omits AuthClientSuite; include the patched cases.
  logged ios-handoff-build xcrun swiftc -swift-version 5 -parse-as-library \
    "${common[@]}" -lIcpSdkCore -lIcpSdkSigner \
    languages/swift/Sources/IcpSdkAuth/*.swift \
    languages/swift/Suites/AuthClient/AuthClientSuite.swift -o out/swift-ios/authclient-handoff
  logged ios-handoff xcrun simctl spawn "$DEVICE" "$sdk/out/swift-ios/authclient-handoff"
fi

# Isolated test dependencies: the app's root lockfile and installed SDK stay intact.
cp "$source_dir"/web-dependencies/package*.json "$cache/"
cp "$source_dir"/web/*.ts "$cache/"
cd "$cache"
logged web-dependencies npm ci --ignore-scripts --no-audit --no-fund
logged web-types node "$repo/node_modules/typescript/bin/tsc" \
  --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext \
  --types node --typeRoots "$repo/node_modules/@types" --outDir "$cache/dist" \
  "$cache/session.ts" "$cache/session.test.ts" "$cache/handoff.ts"
logged web-handoff env OISY_HANDOFF_VECTOR="$cache/handoff-vector" \
  node --test "$cache/dist/session.test.js"
echo 'Offline checks passed. Real II sign-in, website integration and device acceptance are still required.'
