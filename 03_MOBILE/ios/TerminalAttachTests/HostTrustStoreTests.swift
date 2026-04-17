import Foundation
import Testing
@testable import TerminalAttach

@Test
func hostTrustStorePersistsFingerprintByAbsoluteURL() {
  let defaults = UserDefaults(suiteName: #function)!
  defaults.removePersistentDomain(forName: #function)
  let hostURL = URL(string: "https://10.0.0.2:8443")!

  let writer = HostTrustStore(defaults: defaults)
  writer.saveFingerprint("abc", for: hostURL)

  let reader = HostTrustStore(defaults: defaults)
  #expect(reader.fingerprint(for: hostURL) == "abc")
}
