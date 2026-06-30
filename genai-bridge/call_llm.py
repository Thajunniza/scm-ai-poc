"""
call_llm.py
────────────
Bridge script — called by Node.js via child_process.
Reads messages JSON from stdin, calls litellm (proven SAP provider),
prints result JSON to stdout.

Usage:
    echo '{"messages": [...]}' | python call_llm.py
"""

import sys
import os
import json
import time
from dotenv import load_dotenv
import litellm

load_dotenv()

MODEL_NAME = os.getenv("LITELLM_MODEL", "sap/gpt-4o")

# Suppress litellm's noisy stdout banners — keep stdout clean for JSON parsing
litellm.suppress_debug_info = True


def call_with_retry(messages, temperature, max_tokens, retries=1):
    last_error = None
    for attempt in range(retries + 1):
        try:
            response = litellm.completion(
                model=MODEL_NAME,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response
        except Exception as e:
            last_error = e
            # Retry on transient 503 / service unavailable errors
            is_transient = "503" in str(e) or "unavailable" in str(e).lower()
            if attempt < retries and is_transient:
                time.sleep(1.5)
                continue
            raise last_error


def main():
    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input)
        messages = payload["messages"]

        response = call_with_retry(
            messages,
            payload.get("temperature", 0.3),
            payload.get("max_tokens", 800),
            retries=1
        )

        usage = response.get("usage", {})

        result = {
            "success": True,
            "content": response["choices"][0]["message"]["content"],
            "model": MODEL_NAME,
            "input_tokens": usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0)
        }

    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }

    # Print ONLY the JSON result — this must be the last line of stdout
    print(json.dumps(result))


if __name__ == "__main__":
    main()