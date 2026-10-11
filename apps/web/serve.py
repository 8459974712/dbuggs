import http.server
import os
import socketserver

PORT = 3001
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        path = self.path.split('?')[0].split('#')[0]
        if path != '/' and not path.endswith('/'):
            fs_path = os.path.join(DIRECTORY, path.lstrip('/'))
            if not os.path.exists(fs_path) and os.path.exists(fs_path + '.html'):
                self.path = path + '.html'
        return super().do_GET()

class ReusableTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    with ReusableTCPServer(('127.0.0.1', PORT), Handler) as httpd:
        print(f'Serving {DIRECTORY} on http://localhost:{PORT}')
        httpd.serve_forever()
