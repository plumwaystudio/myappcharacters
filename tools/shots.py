import threading, http.server, socketserver, functools, os, base64, sys, json
from playwright.sync_api import sync_playwright
from PIL import Image
page=sys.argv[1]; calls=sys.argv[2:]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=socketserver.TCPServer(('127.0.0.1',0),functools.partial(Q,directory=os.getcwd())); P=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':720,'height':1280}); e=[]; pg.on('pageerror',lambda x:e.append(str(x)))
    pg.goto(f'http://127.0.0.1:{P}/{page}'); pg.wait_for_function('window.ready===true',timeout=90000)
    ims=[]
    for i,c in enumerate(calls):
        d=pg.evaluate(c); f=f'/tmp/shot{i}.jpg'; open(f,'wb').write(base64.b64decode(d.split(',')[1])); ims.append(Image.open(f))
    print('errors',e[:5]); b.close()
w=330;h=int(w*ims[0].height/ims[0].width); s=Image.new('RGB',(w*len(ims)+8*(len(ims)-1),h),'white')
for i,im in enumerate(ims): s.paste(im.resize((w,h)),(i*(w+8),0))
s.save('/tmp/shots.png')
