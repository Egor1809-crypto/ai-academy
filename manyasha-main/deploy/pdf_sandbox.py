from __future__ import annotations

import os
import subprocess
import time


def main() -> None:
    while True:
        pdf_path = os.getenv("PDF_INPUT_PATH")
        if pdf_path and os.path.exists(pdf_path):
            subprocess.run(["/bin/sh", "-lc", f"echo sandbox scan {pdf_path}"], check=False)
        time.sleep(60)


if __name__ == "__main__":
    main()