#!/usr/bin/env python3
"""Validate repository CSV files and generate a static GitHub Pages site."""
from pathlib import Path
import csv, json, math, shutil, datetime, re, os
ROOT=Path(__file__).resolve().parent
SERIES={'guiliao':'吨','guipian':'MW','zujian':'MW','dianchi':'MW','boli':'㎡'}
def read_csv(name):
    with (ROOT/name).open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))
def num(value):
    if value is None or value.strip()=='': return None
    x=float(value)
    if not math.isfinite(x) or x<0: raise ValueError('数值必须是非负有限数: '+value)
    return x
def month(m):
    if not re.fullmatch(r'\d{4}(0[1-9]|1[0-2])',m): raise ValueError('非法月份: '+m)
    return m
def build():
    meta=json.loads((ROOT/'config.json').read_text())
    month(meta['report_month'])
    env_repo=os.environ.get('GITHUB_REPOSITORY','')
    if env_repo: meta['repository']='https://github.com/'+env_repo
    data={'meta':meta,'series':{k:[] for k in SERIES},'countries':{k:[] for k in SERIES},'regions':[],'suppliers':[]}
    seen=set()
    for rowno,r in enumerate(read_csv('monthly.csv'),2):
        k=r['series'];m=month(r['month'])
        if k not in SERIES or r['unit']!=SERIES[k]: raise ValueError('月度系列或单位不匹配')
        if (k,m) in seen: raise ValueError('月度数据重复: '+k+m)
        seen.add((k,m))
        data['series'][k].append({'m':m,'vol':num(r['volume']),'amt':num(r['amount_usd_mn']),'price':num(r['price']),'pcs':num(r['million_pieces']),'kg':num(r['weight_kg']),'source_row':rowno})
    for k,rows in data['series'].items():
        rows.sort(key=lambda r:r['m'])
        if not rows: raise ValueError('月度数据为空: '+k)
    seen=set()
    for rowno,r in enumerate(read_csv('countries.csv'),2):
        k=r['series'];m=month(r['month']);country=r['country'].strip()
        if k not in SERIES or r['unit']!=SERIES[k] or not country: raise ValueError('国家数据错误')
        if (k,m,country) in seen: raise ValueError('国家数据重复')
        seen.add((k,m,country))
        data['countries'][k].append({'m':m,'name':country,'vol':num(r['volume']),'type':r['record_type'],'source_row':rowno})
    seen=set()
    for rowno,r in enumerate(read_csv('regions.csv'),2):
        m=month(r['month']);reg=r['region']
        if (m,reg) in seen: raise ValueError('区域数据重复')
        seen.add((m,reg))
        data['regions'].append({'m':m,'name':reg,'vol':num(r['volume_mw']),'source_row':rowno})
    for rowno,r in enumerate(read_csv('silicon_suppliers.csv'),2):
        data['suppliers'].append({'start':month(r['period_start']),'end':month(r['period_end']),'name':r['country'],'amt':num(r['amount_usd_mn']),'vol':num(r['volume_tonnes']),'price':num(r['price_usd_kg']),'source_row':rowno})
    modules={r['m']:r for r in data['series']['zujian']}
    data['region_gaps']=[]
    for m in sorted({r['m'] for r in data['regions']}):
        rows=[r for r in data['regions'] if r['m']==m]
        if len(rows)!=6 or any(r['vol'] is None for r in rows): raise ValueError('区域缺项: '+m)
        if m not in modules: raise ValueError('区域月份没有组件总量: '+m)
        gap=modules[m]['vol']-sum(r['vol'] for r in rows)
        if gap < -0.1 or gap > modules[m]['vol']*0.01: raise ValueError('区域与组件总量差异超过允许范围: '+m)
        if gap>0.1: data['region_gaps'].append({'m':m,'vol':gap})
    latest=max(r['m'] for rows in data['series'].values() for r in rows)
    if latest!=meta['report_month']: raise ValueError('config.json report_month须与最新月一致')
    for k,rows in data['countries'].items():
        totals={r['m']:r['vol'] for r in data['series'][k]}
        for m in {r['m'] for r in rows}:
            values=[r['vol'] for r in rows if r['m']==m and r['vol'] is not None]
            if totals.get(m) is not None and sum(values)>totals[m]*1.001: raise ValueError('分市场之和超过行业总量: '+k+m)
    data['meta']['generated_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    data['meta']['record_count']=sum(len(v) for v in data['series'].values())+sum(len(v) for v in data['countries'].values())+len(data['regions'])+len(data['suppliers'])
    public=ROOT/'public'
    public.mkdir(exist_ok=True)
    for folder,names in {'assets':['style.css','app.js','echarts.min.js'],'data':['monthly.csv','countries.csv','regions.csv','silicon_suppliers.csv','config.json']}.items():
        (public/folder).mkdir(exist_ok=True)
        for name in names: shutil.copy2(ROOT/name,public/folder/name)
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    (public/'data/dashboard.json').write_text(payload,encoding='utf-8')
    html=(ROOT/'index.html').read_text()
    (public/'index.html').write_text(html)
    (public/'.nojekyll').write_text('')
    # A true offline copy: the same data, layout and functions, without network dependencies.
    offline=html.replace('<link rel="stylesheet" href="./assets/style.css">','<style>'+(ROOT/'style.css').read_text()+'</style>')
    offline=offline.replace('<script src="./assets/echarts.min.js"></script>','<script>'+(ROOT/'echarts.min.js').read_text()+'</script>')
    offline=offline.replace('<script src="./assets/app.js"></script>','<script id="inline-data" type="application/json">'+payload.replace('<','\\u003c')+'</script><script>'+(ROOT/'app.js').read_text()+'</script>')
    (ROOT.parent/'光伏出口研究看板.html').write_text(offline,encoding='utf-8')
    print(json.dumps({'records':data['meta']['record_count'],'latest':latest,'region_gaps':data['region_gaps'],'site':str(public)},ensure_ascii=False))
if __name__=='__main__': build()

