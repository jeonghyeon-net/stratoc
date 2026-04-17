import Foundation
import Testing
@testable import TerminalAttach

@Test
func resizePayloadUsesCliControlShape() throws {
  let data = try JSONEncoder().encode(TerminalControlMessage(type: "resize", columns: 120, rows: 40))
  let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any]
  #expect(payload?["type"] as? String == "resize")
  #expect(payload?["columns"] as? Int == 120)
  #expect(payload?["rows"] as? Int == 40)
}

@Test
func resizeCoordinatorStoresLatestViewport() {
  let coordinator = TerminalResizeCoordinator()
  let viewport = coordinator.update(columns: 120, rows: 40)
  #expect(viewport == TerminalViewport(columns: 120, rows: 40))
  #expect(coordinator.lastViewport == viewport)
}
