import Foundation

public final class TerminalInputMapper {
  public init() {}

  public func bytes(for text: String) -> Data {
    Data(text.utf8)
  }
}
