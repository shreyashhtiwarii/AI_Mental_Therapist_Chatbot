"""
MindCare AI - Single Unified Runner
Usage:
    python run.py          # Runs unified app (Frontend + Backend on http://localhost:5000)
    python run.py --dev    # Runs both Flask and Vite dev servers concurrently
    python run.py --build  # Rebuilds the frontend and starts the unified app
"""

import os
import sys
import subprocess
import webbrowser
import threading
import time

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")

def build_frontend():
    print("[MindCare] Building React frontend for production...")
    # On Windows npm is npm.cmd
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    result = subprocess.run([npm_cmd, "run", "build"], cwd=FRONTEND_DIR)
    if result.returncode != 0:
        print("[MindCare] Error building frontend. Please check npm logs.")
        sys.exit(1)
    print("[MindCare] Frontend build complete!\n")

def run_unified():
    # If frontend/dist doesn't exist, build it first
    if not os.path.exists(DIST_DIR) or "--build" in sys.argv:
        build_frontend()

    sys.path.insert(0, BACKEND_DIR)
    from app import create_app

    print("=" * 60)
    print("  MindCare AI is running in Single Server Mode!")
    print("  Frontend UI & Backend API: http://localhost:5000")
    print("=" * 60)

    def open_browser():
        time.sleep(1.2)
        webbrowser.open("http://localhost:5000")

    threading.Thread(target=open_browser, daemon=True).start()

    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=False)

def run_dev():
    print("=" * 60)
    print("  MindCare AI running in Concurrent Dev Mode")
    print("  - Backend:  http://localhost:5000")
    print("  - Frontend: http://localhost:5173")
    print("=" * 60)

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    # Start Flask backend process
    backend_proc = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=BACKEND_DIR
    )

    # Start Vite frontend process
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR
    )

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n[MindCare] Shutting down servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

if __name__ == "__main__":
    if "--dev" in sys.argv:
        run_dev()
    else:
        run_unified()
