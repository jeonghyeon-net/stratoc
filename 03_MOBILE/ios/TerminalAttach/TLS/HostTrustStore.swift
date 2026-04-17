import Foundation

public final class HostTrustStore {
  private var values: [String: String] = [:]

  public init() {}

  public func fingerprint(for hostURL: URL) -> String? {
    values[hostURL.absoluteString]
  }

  public func saveFingerprint(_ value: String, for hostURL: URL) {
    values[hostURL.absoluteString] = value
  }
}
