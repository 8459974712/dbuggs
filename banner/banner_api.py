import json
import os
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 3999
DATA_DIR = '/root/dbugg/banner'
CONFIG_PATH = os.path.join(DATA_DIR, 'banner-config.json')
WEB_CONTAINER = 'dbugg-web'
WEB_TARGET = '/usr/share/nginx/html/banner-config.json'
SOURCE_COPY = '/root/dbugg/apps/web/banner-config.json'
AUTH_URL = 'http://127.0.0.1:4000/users/me'
ALLOWED_ORIGINS = {'http://200.234.39.146:5000'}
ADMIN_ROLES = {'admin', 'super_admin'}
MAX_BODY = 16 * 1024 * 1024


def is_admin(auth_header):
    if not auth_header or not auth_header.startswith('Bearer '):
        return False
    req = urllib.request.Request(AUTH_URL, headers={'Authorization': auth_header})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            body = json.loads(r.read().decode('utf-8'))
    except (urllib.error.URLError, ValueError):
        return False
    user = body.get('data', body) if isinstance(body, dict) else {}
    return isinstance(user, dict) and user.get('role') in ADMIN_ROLES


def publish(cfg):
    os.makedirs(DATA_DIR, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix='.json')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, ensure_ascii=False)
    os.chmod(tmp, 0o644)
    os.replace(tmp, CONFIG_PATH)
    shutil.copyfile(CONFIG_PATH, SOURCE_COPY)
    subprocess.run(['docker', 'cp', CONFIG_PATH, f'{WEB_CONTAINER}:{WEB_TARGET}'], check=True, timeout=30)


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get('Origin')
        if origin in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def _json(self, code, obj):
        data = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.split('?')[0] != '/api/banner':
            return self._json(404, {'error': 'not found'})
        try:
            with open(CONFIG_PATH, encoding='utf-8') as f:
                return self._json(200, json.load(f))
        except FileNotFoundError:
            return self._json(200, {})

    def do_POST(self):
        if self.path.split('?')[0] != '/api/banner':
            return self._json(404, {'error': 'not found'})
        if not is_admin(self.headers.get('Authorization')):
            return self._json(401, {'error': 'admin login required'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self._json(400, {'error': 'bad length'})
        if length <= 0 or length > MAX_BODY:
            return self._json(413, {'error': 'payload too large (max 16MB)'})
        try:
            cfg = json.loads(self.rfile.read(length).decode('utf-8'))
        except ValueError:
            return self._json(400, {'error': 'invalid json'})
        if not isinstance(cfg, dict) or not isinstance(cfg.get('slides'), list):
            return self._json(400, {'error': 'slides list required'})
        try:
            publish(cfg)
        except (OSError, subprocess.SubprocessError) as e:
            return self._json(500, {'error': f'publish failed: {e}'})
        return self._json(200, {'ok': True})


if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
