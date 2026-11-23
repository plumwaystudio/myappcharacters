import os,json,subprocess,requests,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parent
O=R/'out';O.mkdir(exist_ok=True)
W,H=1080,1920
B='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def run(*args):subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*map(str,args)],check=True)
def duration(p):
 return float(subprocess.check_output(['ffprobe','-v','quiet','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True))
def font(size,bold=True):return ImageFont.truetype(B if bold else F,size)
def text(d,x,y,t,size=42,color='#281D28',anchor=None):
 d.text((x,y),t,font=font(size),fill=color,anchor=anchor)
def download(url,path):
 res=requests.get(url,timeout=100);res.raise_for_status();path.write_bytes(res.content)
 assert path.stat().st_size>10000,(path,res.status_code)
def receipt():
 im=Image.new('RGB',(W,H),'#FBF5ED');d=ImageDraw.Draw(im)
 d.rectangle((0,0,1080,18),fill='#5B1155')
 text(d,82,105,'COOL OFF    /    CART AUDIT',34,'#5B1155')
 text(d,80,220,'THE RECEIPT',104)
 d.line((80,395,1000,395),fill='#D3C3D0',width=4)
 for i,(label,price) in enumerate([('ORIGINAL SHIPPING','$7.00'),('EXTRA ITEMS ADDED','+$68.00'),('SHIPPING AVOIDED','-$7.00')]):
  y=515+i*200;text(d,85,y,label,34,'#5B5360');text(d,990,y+60,price,74,anchor='ra')
  d.line((80,y+150,1000,y+150),fill='#D3C3D0',width=3)
 d.rounded_rectangle((70,1200,1010,1570),radius=25,fill='#5B1155')
 text(d,110,1270,'NET EXTRA SPENT',45,'#FBF5ED')
 text(d,110,1370,'$61.00',145,'#F7CEEA')
 text(d,83,1670,'Not free. Just free shipping.',45)
 text(d,82,1785,'EXAMPLE NUMBERS',28,'#6B5B69')
 return im
def endcard():
 im=Image.new('RGB',(W,H),'#5B1155');d=ImageDraw.Draw(im)
 d.ellipse((-400,1200,650,2270),fill='#6F2669');d.ellipse((800,-440,1650,440),fill='#42103D')
 text(d,75,300,'COOL',166,'#FBF5ED');text(d,75,490,'OFF.',195,'#F4C5DF')
 d.line((78,800,1000,800),fill='#D7A6C8',width=5)
 text(d,83,880,'THINK BEFORE',67,'#FBF5ED')
 text(d,83,975,'CHECKOUT.',67,'#FBF5ED')
 d.rounded_rectangle((75,1325,1005,1490),radius=25,fill='#FBF5ED')
 text(d,540,1405,'LINK IN MY STORY',57,'#5B1155',anchor='mm')
 return im
def overlay_caption(line,key):
 im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
 words=line.split();rows=[];cur=''
 for word in words:
  nxt=(cur+' '+word).strip()
  if len(nxt)>31:rows.append(cur);cur=word
  else:cur=nxt
 if cur:rows.append(cur)
 rows=rows[:2];y=1440
 d.rounded_rectangle((70,y-24,1010,y+100*len(rows)+60),radius=24,fill=(19,8,23,180))
 for i,st in enumerate(rows):
  d.text((540,y+45+i*100),st,font=font(56),anchor='mm',fill='white',stroke_width=3,stroke_fill='#1B101B')
 path=O/f'cap_{key}.png';im.save(path);return path
items=json.loads((R/'sources.json').read_text())
segments={}
for x in items:
 key=x['key'];inp=O/f'{key}.mp4';download(x['url'],inp)
 dur=min(float(x.get('duration',999)),max(0.1,duration(inp)-0.05))
 if key.startswith('c0') and key!='c08' and x.get('caption'):
  cap=overlay_caption(x['caption'],key)
  filt='[0:v]scale=1080:1920,setsar=1[b];[b][1:v]overlay=0:0:shortest=1[o]'
  out=O/f'{key}_seg.mp4'
  run('-i',inp,'-loop','1','-i',cap,'-t',dur,'-filter_complex',filt,'-map','[o]','-an','-r','30','-c:v','libx264','-crf','22','-preset','veryfast','-pix_fmt','yuv420p',out)
 else:
  out=O/f'{key}_seg.mp4'
  run('-i',inp,'-t',dur,'-vf','scale=1080:1920,setsar=1','-an','-r','30','-c:v','libx264','-crf','22','-preset','veryfast','-pix_fmt','yuv420p',out)
 segments[key]=(out,dur)
for kind,dur,im in [('receipt',2.30,receipt()),('end',2.45,endcard())]:
 png=O/f'{kind}.png';im.save(png)
 out=O/f'{kind}_seg.mp4'
 run('-loop','1','-framerate','30','-i',png,'-t',dur,'-an','-r','30','-c:v','libx264','-crf','21','-preset','veryfast','-pix_fmt','yuv420p',out)
 segments[kind]=(out,dur)
order=['c01','c02','c03','c04','c05','c06','receipt','c08','end']
conf=O/'concat.txt'
conf.write_text(''.join("file '"+str(segments[k][0])+"'\n" for k in order))
joined=O/'joined.mp4'
run('-f','concat','-safe','0','-i',conf,'-c','copy',joined)
times={};t=0
for key in order:
 times[key]=round(t*1000);t+=segments[key][1]
# The lip-synced video output includes audio, but fallback to the exact TTS line if a model returns no audio.
for x in items:
 if x['key'] not in ['c01','c02','c03','c04','c05','c06']:continue
 k=x['key'];a=O/f'{k}.wav'
 try:run('-i',O/f'{k}.mp4','-vn','-ar','44100','-ac','2','-c:a','pcm_s16le',a)
 except subprocess.CalledProcessError:
  p=O/f'{k}.mp3';download(x['voice_url'],p)
  run('-i',p,'-ar','44100','-ac','2','-c:a','pcm_s16le',a)
# Original bass-impact SFX, short and quiet
sfx=O/'impact.wav'
run('-f','lavfi','-i','sine=frequency=68:sample_rate=44100:duration=0.4','-af','volume=0.38,afade=t=out:st=0.08:d=0.30',sfx)
ins=['-i',joined]+sum((['-i',O/f'{k}.wav'] for k in order[:6]),[])+['-i',sfx]
parts=[f'[{i+1}:a]adelay={times[k]}|{times[k]},volume=0.92[a{i}]' for i,k in enumerate(order[:6])]
start=times['receipt']+350
parts.append(f'[7:a]adelay={start}|{start},volume=0.80[fx]')
parts.append(''.join(f'[a{i}]' for i in range(6))+'[fx]amix=inputs=7:duration=longest:dropout_transition=0,alimiter=limit=0.94,apad[outa]')
dest=O/'COOL_OFF_THE_RECEIPT.mp4'
run(*ins,'-filter_complex',';'.join(parts),'-map','0:v:0','-map','[outa]','-c:v','copy','-c:a','aac','-b:a','192k','-t',round(t,3),'-movflags','+faststart',dest)
print('DONE',dest,'duration',duration(dest),'bytes',dest.stat().st_size,flush=True)
