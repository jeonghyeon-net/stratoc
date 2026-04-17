import Foundation

public struct TerminalViewport: Equatable {
  public let columns: Int
  public let rows: Int

  public init(columns: Int, rows: Int) {
    self.columns = columns
    self.rows = rows
  }
}

public final class TerminalResizeCoordinator {
  public private(set) var lastViewport: TerminalViewport?

  public init() {}

  public func update(columns: Int, rows: Int) -> TerminalViewport {
    let viewport = TerminalViewport(columns: columns, rows: rows)
    lastViewport = viewport
    return viewport
  }
}
