import threading, http.server, socketserver, functools, os, sys
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=socketserver.TCPServer(('127.0.0.1',0),functools.partial(Q,directory=os.getcwd())); P=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(); e=[]; pg.on('pageerror',lambda x:e.append('ERR '+str(x))); pg.on('console',lambda m:e.append(m.type+': '+m.text)); pg.on('requestfailed',lambda r:e.append('FAIL '+r.url))
    pg.on('response',lambda r: r.status>=400 and e.append(f'{r.status} {r.url}'))
    pg.goto(f'http://127.0.0.1:{P}/{sys.argv[1]}'); pg.wait_for_timeout(15000); print('\n'.join(e[:10])); b.close()
