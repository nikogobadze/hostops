"""
Local dev server for Casa Marea / HostOps.

Python's stock http.server sends only Last-Modified with no Cache-Control,
which lets Chrome apply heuristic caching and serve a stale .js without
revalidating — the cause of "X is not a function" after an edit. This one
sends no-store, so a plain refresh always picks up the latest files.

    python serve.py            # http://localhost:8080
    python serve.py 3000
"""

import sys
import http.server
import socketserver

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # keep the console readable — only report anything that is not a 200/304
        status = str(args[1]) if len(args) > 1 else ""
        if not status.startswith(("2", "3")):
            super().log_message(fmt, *args)


class Server(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), NoCacheHandler) as httpd:
        print(f"Casa Marea  ->  http://localhost:{PORT}/site.html")
        print(f"HostOps     ->  http://localhost:{PORT}/index.html")
        print("no-store headers enabled; Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")
