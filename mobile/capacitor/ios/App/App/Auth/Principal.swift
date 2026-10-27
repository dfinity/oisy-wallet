import CommonCrypto
import Foundation

enum Principal {
  static func selfAuthenticating(publicKey: Data) -> String {
    var digest = [UInt8](repeating: 0, count: Int(CC_SHA224_DIGEST_LENGTH))
    publicKey.withUnsafeBytes { bytes in
      _ = CC_SHA224(bytes.baseAddress, CC_LONG(bytes.count), &digest)
    }
    let principal = digest + [0x02]
    var crc: UInt32 = 0xffff_ffff
    for byte in principal {
      crc ^= UInt32(byte)
      for _ in 0..<8 {
        crc = (crc >> 1) ^ (crc & 1 == 1 ? 0xedb8_8320 : 0)
      }
    }
    crc = ~crc
    let checksum = (0..<4).map { UInt8(truncatingIfNeeded: crc >> (24 - $0 * 8)) }
    let alphabet = Array("abcdefghijklmnopqrstuvwxyz234567")
    var buffer: UInt32 = 0
    var bits = 0
    var encoded = ""
    for byte in checksum + principal {
      buffer = (buffer << 8) | UInt32(byte)
      bits += 8
      while bits >= 5 {
        bits -= 5
        encoded.append(alphabet[Int((buffer >> bits) & 31)])
      }
    }
    if bits > 0 { encoded.append(alphabet[Int((buffer << (5 - bits)) & 31)]) }
    return stride(from: 0, to: encoded.count, by: 5).map { offset in
      String(encoded.dropFirst(offset).prefix(5))
    }.joined(separator: "-")
  }
}
