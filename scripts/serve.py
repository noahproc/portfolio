"""Local preview that behaves like GitHub Pages:
- /product serves /product/ (folder index, with the trailing-slash redirect)
- a missing address gets 404.html (with a 404 status), so old-link forwarding works locally too.
Run from the repo root:  python3 scripts/serve.py   (or: npm run serve)   then open http://localhost:8765"""
import http.server, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        if code == 404 and os.path.exists('404.html'):
            body = open('404.html', 'rb').read()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def log_message(self, *args):   # quiet
        pass

class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    print(f'serving the portfolio at http://localhost:{PORT}  (ctrl+c to stop)')
    Server(('', PORT), Handler).serve_forever()
