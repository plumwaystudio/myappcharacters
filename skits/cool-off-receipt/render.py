import threading, http.server, socketserver, functools, os, base64, subprocess, sys
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=socketserver.TCPServer(('127.0.0.1',0),functools.partial(Q,directory=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..')))); P=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
here=os.path.dirname(__file__); os.makedirs(os.path.join(here,'out'),exist_ok=True); out=os.path.join(here,'out/video_tmp.mp4')
ff=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-r','30',out],stdin=subprocess.PIPE)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1080,'height':1920}); pg.goto(f'http://127.0.0.1:{P}/skits/glow-tax-trip/scene.html'); pg.wait_for_function('window.ready===true',timeout=120000)
    dur=pg.evaluate('window.DUR'); n=int(dur*30)
    for i in range(n):
        d=pg.evaluate(f'frame({i/30})'); ff.stdin.write(base64.b64decode(d.split(',')[1]))
        if i%60==0: print(i,'/',n,flush=True)
    b.close()
ff.stdin.close(); r=ff.wait()
if r==0: os.replace(out,os.path.join(here,'out/video.mp4')); print('done')
