"""
call_llm.py
────────────
Bridge script — called by Node.js via child_process.
Reads messages JSON from an input file, calls litellm (proven SAP provider),
writes result JSON to an output file.

Usage:
    python call_llm.py input.json output.json
"""

import sys
import os
import json
import time
from dotenv import load_dotenv
import litellm

load_dotenv()

MODEL_NAME = os.getenv("LITELLM_MODEL", "sap/gpt-4o")
litellm.suppress_debug_info = True


def call_with_retry(messages, temperature, max_tokens, retries=2):
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
            is_transient = "503" in str(e) or "unavailable" in str(e).lower()
            if attempt < retries and is_transient:
                time.sleep(2 * (attempt + 1))
                continue
            raise last_error


def main():
    input_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        with open(input_path, "r", encoding="utf-8") as f:
            payload = json.load(f)

        messages = payload["messages"]

        response = call_with_retry(
            messages,
            payload.get("temperature", 0.3),
            payload.get("max_tokens", 800),
            retries=2
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

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f)


if __name__ == "__main__":
    main()