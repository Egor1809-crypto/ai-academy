from __future__ import annotations

import json
import os
import time


def main() -> None:
    broker = os.getenv("EVENT_BUS_BROKER_URL", "redis://redis:6379/0")
    print(json.dumps({"service": "worker", "broker": broker, "status": "started"}), flush=True)
    while True:
        time.sleep(30)
        print(json.dumps({"service": "worker", "status": "heartbeat"}), flush=True)


if __name__ == "__main__":
    main()