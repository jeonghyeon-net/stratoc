import json
import os
import re
import sys
from pathlib import Path

BYPASS_MARKERS = (
    "--no-verify",
    "LEFTHOOK=0",
    "SKIP=",
    "-c core.hooksPath=",
    "--config core.hooksPath=",
    "core.hooksPath=/dev/null",
)


def deny(reason: str) -> None:
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )


payload = json.load(sys.stdin)
command = payload.get("tool_input", {}).get("command", "")
git_subcommands = set(re.findall(r"\bgit\b[^\n;&|]*\b(commit|push)\b", command))
if not git_subcommands:
    sys.exit(0)

for bypass_marker in BYPASS_MARKERS:
    if bypass_marker in command:
        deny(f"lefthook bypass forbidden: {bypass_marker}")
        sys.exit(0)

project_root = Path(os.environ.get("CLAUDE_PROJECT_DIR", payload.get("cwd", ".")))
lefthook_config_path = project_root / "lefthook.yml"
pre_commit_hook_path = project_root / ".git" / "hooks" / "pre-commit"
pre_push_hook_path = project_root / ".git" / "hooks" / "pre-push"

if not lefthook_config_path.is_file():
    deny("lefthook.yml missing. Run lefthook install after restoring config.")
    sys.exit(0)

if "commit" in git_subcommands and not pre_commit_hook_path.is_file():
    deny("pre-commit hook missing. Run lefthook install before git commit.")
    sys.exit(0)

if "push" in git_subcommands and not pre_push_hook_path.is_file():
    deny("pre-push hook missing. Run lefthook install before git push.")
    sys.exit(0)
