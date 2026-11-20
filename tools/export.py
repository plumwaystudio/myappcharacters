# Build a MakeHuman character (CC0 base mesh + targets) into a JSON the three.js page skins itself.
import numpy as np, sys, json
Z=np.load('base/targets.npz',allow_pickle=True)
V=[];VT=[];F=[];grp=None
for ln in open('base/base.obj'):
    if ln.startswith('v '): V.append([float(x) for x in ln.split()[1:4]])
    elif ln.startswith('vt '): VT.append([float(x) for x in ln.split()[1:3]])
    elif ln.startswith('g '): grp=ln.split()[1]
    elif ln.startswith('f '): F.append((grp,[tuple(int(a) for a in p.split('/')[:2]) for p in ln.split()[1:]]))
V0=np.array(V); VT=np.array(VT)
spec=json.load(open(sys.argv[1]))
def tgt(name):
    d=np.zeros_like(V0); i=Z[f'targets/{name}.index']; d[i]=Z[f'targets/{name}.vector'].astype(np.float64)*1e-3; return d
V=V0.copy()
for n,w in spec['targets'].items(): V+=tgt(n)*w
eth=spec.get('ethnic',{'caucasian':1})
def unit(u): return sum(tgt(f'expression/units/{e}/{u}')*w for e,w in eth.items())
morphs={'blink':unit('eye-left-closure')+unit('eye-right-closure'),'mouth':unit('mouth-open'),'browUp':unit('eyebrows-left-up')+unit('eyebrows-right-up'),
        'browDown':unit('eyebrows-left-down')+unit('eyebrows-right-down'),'smile':unit('mouth-corner-puller'),'slit':unit('eye-left-slit')+unit('eye-right-slit'),'eyeOpen':unit('eye-left-opened-up')+unit('eye-right-opened-up'),'browL':unit('eyebrows-left-up'),'browR':unit('eyebrows-right-up'),'browIn':unit('eyebrows-left-inner-up')+unit('eyebrows-right-inner-up'),'smirkL':unit('mouth-corner-puller')*0}
keep=spec['groups']
# skeleton
body_ids=sorted({v-1 for g,p in F if g=='body' for v,_ in p}); V[:,1]-=V[body_ids,1].min()
sk=json.load(open('base/default.mhskel')); J={k:V[v].mean(0) for k,v in sk['joints'].items()}
bones=[];bi={}
def addb(n):
    if n in bi: return
    b=sk['bones'][n]
    if b['parent']: addb(b['parent'])
    bi[n]=len(bones); bones.append({'n':n,'p':bi[b['parent']] if b['parent'] else -1,'h':(J[b['head']]*.1).round(4).tolist(),'t':(J[b['tail']]*.1).round(4).tolist()})
for n in sk['bones']: addb(n)
W=json.load(open('base/default_weights.mhw'))['weights']; per=[[] for _ in V]
for bn,lst in W.items():
    for vi,w in lst: per[vi].append((w,bi[bn]))
# unweld by (v,vt), per group
out={'bones':bones,'groups':{},'eyeC':{s:(V[sorted({v-1 for g,p in F if g==f'helper-{s}-eye' for v,_ in p})].mean(0)*.1).round(4).tolist() for s in 'lr'}}
vmap={};P=[];UV=[];SI=[];SW=[];SRC=[]
for g,p in F:
    if g not in keep: continue
    ids=[]
    for v,t in p:
        k=(v,t)
        if k not in vmap:
            vmap[k]=len(SRC); SRC.append(v-1); UV.append(VT[t-1])
        ids.append(vmap[k])
    tri=[(ids[0],ids[i],ids[i+1]) for i in range(1,len(ids)-1)]
    out['groups'].setdefault(g,[]).extend([x for t in tri for x in t])
SRC=np.array(SRC)
for v in SRC:
    l=sorted(per[v],reverse=True)[:4]; s=sum(w for w,_ in l) or 1; l+= [(0,0)]*(4-len(l))
    SI.extend([b for _,b in l]); SW.extend([round(w/s,4) for w,_ in l])
r=lambda a,n=4: np.round(np.asarray(a,dtype=float).ravel(),n).tolist()
out['pos']=r(V[SRC]*.1); out['uv']=r(UV); out['si']=SI; out['sw']=SW; out['src']=SRC.tolist()
out['morph']={k:r(m[SRC]*.1,5) for k,m in morphs.items()}
# lip / lid masks from face bone weights
def mask(pref):
    m=np.zeros(len(V))
    for bn,lst in W.items():
        if any(bn.startswith(x) for x in pref):
            for vi,w in lst: m[vi]+=w
    return r(m[SRC],3)
out['mask']={'lips':mask(['oris']),'lids':mask(['orbicularis']),'brow':mask(['oculi']),'jaw':mask(['jaw'])}
json.dump(out,open(spec['out'],'w'),separators=(',',':'))
print('verts',len(SRC),'bones',len(bones),{g:len(i)//3 for g,i in out['groups'].items()})
