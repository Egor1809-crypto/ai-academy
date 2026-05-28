from __future__ import annotations

import os
import subprocess
import time


def main() -> None:
    while True:
        source = os.getenv("FBX_SOURCE_PATH")
        target = os.getenv("GLB_TARGET_PATH")
        if source and target and os.path.exists(source):
            subprocess.run(["/bin/sh", "-lc", f"echo converting {source} to {target}"], check=False)
        time.sleep(60)


if __name__ == "__main__":
    main()