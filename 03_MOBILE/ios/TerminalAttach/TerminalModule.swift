import Foundation

@objc(TerminalModule)
final class TerminalModule: NSObject {
  @objc
  func openTerminalSession(
    _ request: NSDictionary,
    resolver: @escaping (Any?) -> Void,
    rejecter: @escaping (String?, String?, Error?) -> Void
  ) {
    _ = request
    resolver(nil)
  }
}
