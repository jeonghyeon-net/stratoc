import Foundation

public final class TerminalEventEmitter {
  public private(set) var lastName: String?
  public private(set) var lastBody: [String: Any]?

  public init() {}

  public func send(name: String, body: [String: Any]) {
    lastName = name
    lastBody = body
  }
}
