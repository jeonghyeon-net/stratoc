// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "StratocMobileIOS",
  platforms: [.macOS(.v14)],
  products: [
    .library(name: "TerminalAttach", targets: ["TerminalAttach"]),
  ],
  targets: [
    .target(
      name: "TerminalAttach",
      path: "TerminalAttach"
    ),
    .testTarget(
      name: "TerminalAttachTests",
      dependencies: ["TerminalAttach"],
      path: "TerminalAttachTests"
    ),
  ]
)
