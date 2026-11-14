'use strict';
const SERIES={
zujian:{name:'组件',label:'组件出口',unit:'GW',scale:1/1000,raw:'MW',color:'#1b5ea8',priceUnit:'美元/W'},
dianchi:{name:'电池',label:'电池出口',unit:'GW',scale:1/1000,raw:'MW',color:'#2e7dd1',priceUnit:'美元/W'},
guipian:{name:'硅片',label:'硅片出口',unit:'GW',scale:1/1000,raw:'MW',color:'#91b6dc'},
guiliao:{name:'硅料',label:'硅料进口',unit:'吨',scale:1,raw:'吨',color:'#567791',priceUnit:'美元/kg'},
boli:{name:'玻璃',label:'玻璃出口',unit:'万㎡',scale:1/10000,raw:'㎡',color:'#809daf'}
};
function shiftMonth(m,n){const d=new Date(Date.UTC(+m.slice(0,4),+m.slice(4)-1+n,1));return String(d.getUTCFullYear())+String(d.getUTCMonth()+1).padStart(2,'0')}
function ratio(a,b){return a==null||b==null||b===0?null:a/b-1}
function ytdMonths(m){return Array.from({length:+m.slice(4)},(_,i)=>m.slice(0,4)+String(i+1).padStart(2,'0'))}
function exactSum(rows,months,field){const map=new Map(rows.map(r=>[r.m,r]));const vals=months.map(m=>map.get(m)?.[field]);return vals.every(v=>v!=null)?vals.reduce((a,b)=>a+b,0):null}
function createModel(data){
 const selected=(k,m,mode)=>{const rows=data.series[k];if(mode==='month')return rows.find(r=>r.m===m)||{m,vol:null,amt:null,price:null};
 const ms=ytdMonths(m),vol=exactSum(rows,ms,'vol'),amt=exactSum(rows,ms,'amt');
 const price=vol&&amt!=null?(k==='guiliao'?amt*1000/vol:['zujian','dianchi'].includes(k)?amt/vol:null):null;
 return {m,vol,amt,price};};
 const countries=(k,m,mode)=>{const raw=data.countries[k]||[],names=[...new Set(raw.map(r=>r.name))];const total=selected(k,m,mode).vol;
 const get=(name,at)=>{const rs=raw.filter(r=>r.name===name);return mode==='month'?rs.find(r=>r.m===at)?.vol??null:exactSum(rs,ytdMonths(at),'vol')};
 return names.map(name=>{const v=get(name,m);const hit=raw.find(r=>r.name===name&&r.m===m);return {name,vol:v,share:v!=null&&total? v/total:null,yoy:ratio(v,get(name,shiftMonth(m,-12))),mom:mode==='month'?ratio(v,get(name,shiftMonth(m,-1))):null,supplement:hit?.type==='report_supplement',row:hit?.source_row};}).filter(r=>r.vol!=null).sort((a,b)=>b.vol-a.vol);};
 return {selected,countries,change:(k,m,mode,field,step)=>ratio(selected(k,m,mode)[field],selected(k,shiftMonth(m,step),mode)[field])};
}
if(typeof module!=='undefined'&&module.exports)module.exports={SERIES,createModel,shiftMonth,ratio,exactSum};
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id),charts=new Map(),state={view:'overview',month:'',mode:'month',range:'24',sector:'zujian',region:'volume',search:''};
 let D,M,tableRows=[];
 const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const fmt=(v,n=2)=>v==null||!Number.isFinite(v)?'—':v.toLocaleString('zh-CN',{minimumFractionDigits:n,maximumFractionDigits:n});
 const pct=v=>v==null?'—':(v>0?'+':'')+fmt(v*100,1)+'%';
 const cls=v=>v==null?'neutral':v>0?'up':v<0?'dn':'neutral';
 const ml=m=>m.slice(0,4)+'-'+m.slice(4),full=m=>m.slice(0,4)+'年'+(+m.slice(4))+'月';
 const period=()=>state.mode==='month'?full(state.month):state.month.slice(0,4)+'年1—'+(+state.month.slice(4))+'月';
 const base={animationDuration:250,textStyle:{fontFamily:'-apple-system, PingFang SC, Microsoft YaHei, sans-serif'},tooltip:{trigger:'axis',backgroundColor:'#fff',borderColor:'#dae3ed',textStyle:{color:'#344b62',fontSize:11},valueFormatter:v=>fmt(v,2)},legend:{top:10,left:20,itemWidth:12,itemHeight:6,textStyle:{fontSize:10,color:'#738195'}},grid:{top:47,left:52,right:22,bottom:30},xAxis:{type:'category',axisLine:{lineStyle:{color:'#dbe3ec'}},axisTick:{show:false},axisLabel:{color:'#8795a7',fontSize:10}},yAxis:{type:'value',axisLabel:{color:'#8795a7',fontSize:10},splitLine:{lineStyle:{color:'#edf1f6',type:'dashed'}},nameTextStyle:{color:'#8795a7',fontSize:10}}};
 const chart=(id,opt)=>{let c=charts.get(id);if(!c){c=echarts.init($(id),null,{renderer:'svg'});charts.set(id,c)}c.setOption(opt,true);return c};
 const emptyChart=(id,msg)=>chart(id,{animation:false,title:{text:msg,left:'center',top:'middle',textStyle:{fontSize:12,fontWeight:'normal',color:'#8c9bad'}}});
 function monthsFor(rows){const all=[...new Set(rows.map(r=>r.m))].filter(m=>m<=state.month).sort();const start=state.range==='all'?null:shiftMonth(state.month,1-+state.range);return all.filter(m=>!start||m>=start)}
 function seriesLine(name,data,color,extra={}){return {name,type:'line',data,symbol:'circle',showSymbol:false,symbolSize:4,lineStyle:{width:2},itemStyle:{color},connectNulls:false,...extra}}
 function activateView(view){state.view=view;document.querySelectorAll('.view').forEach(x=>x.hidden=x.id!==view);document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));$('viewLabel').textContent={overview:'行业总览',markets:'环节与市场',sources:'数据与口径'}[view];render();requestAnimationFrame(()=>charts.forEach(c=>c.resize()))}
 function spark(id,values,color){chart(id,{animation:false,grid:{top:4,bottom:2,left:0,right:0},xAxis:{type:'category',show:false,data:values.map(r=>r.m)},yAxis:{type:'value',show:false,scale:true},series:[{type:'line',data:values.map(r=>r.vol),showSymbol:false,connectNulls:false,lineStyle:{width:1.4,color},areaStyle:{color,opacity:.06},silent:true}]})}
 function renderKpis(){
 charts.forEach((c,id)=>{if(id.startsWith('spark-')){c.dispose();charts.delete(id)}});
 const keys=['zujian','dianchi','guipian','guiliao','boli'];
 $('kpis').innerHTML=keys.map(k=>{const s=SERIES[k],v=M.selected(k,state.month,state.mode),y=M.change(k,state.month,state.mode,'vol',-12),mom=state.mode==='month'?M.change(k,state.month,'month','vol',-1):null;
 const sub=s.priceUnit?'均价 '+fmt(v.price,k==='guiliao'?2:3)+' '+s.priceUnit:'金额 '+fmt(v.amt,1)+' 百万美元';
 return '<article class="kpi" tabindex="0" role="button" aria-label="查看'+s.label+'详情" data-kpi="'+k+'"><div class="kpi-label">'+s.label+'<b>↗</b></div><div class="kpi-value">'+fmt(v.vol==null?null:v.vol*s.scale,k==='guiliao'||k==='boli'?0:2)+'<span class="kpi-unit">'+s.unit+'</span></div><div class="kpi-change"><span>同比 <b class="'+cls(y)+'">'+pct(y)+'</b></span>'+(state.mode==='month'?'<span>环比 <b class="'+cls(mom)+'">'+pct(mom)+'</b></span>':'<span>同区间比较</span>')+'</div><div class="kpi-sub">'+sub+'</div><div id="spark-'+k+'" class="spark"></div></article>'}).join('');
 keys.forEach(k=>{const rs=D.series[k].filter(r=>r.m<=state.month).slice(-12);spark('spark-'+k,rs,SERIES[k].color)});
 document.querySelectorAll('[data-kpi]').forEach(el=>{const run=()=>{state.sector=el.dataset.kpi;activateView('markets')};el.onclick=run;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run()}}});
 }
 function renderInsights(){
 const z=M.selected('zujian',state.month,state.mode),dc=M.selected('dianchi',state.month,state.mode);
 const step=state.mode==='month'?-1:-12,label=state.mode==='month'?'环比':'同比';
 const qty=M.change('zujian',state.month,state.mode,'vol',step),price=M.change('zujian',state.month,state.mode,'price',step);
 let status='量价可比数据不足';if(qty!=null&&price!=null)status=qty>0?(price>0?'量价同升':'量增价降或持平'):(price>0?'量减价升或量持平':'量价回落或持平');
 const countries=M.countries('zujian',state.month,state.mode),top=countries[0];
 const third=top?esc(top.name)+'居已覆盖市场首位，占组件总量<strong>'+fmt(top.share*100,1)+'%</strong>。':'当前区间无完整的分市场数据。';
 $('insights').innerHTML='<div class="insight-item"><span class="tag">组件量价</span><strong>'+status+'</strong>。数量'+label+'<strong>'+pct(qty)+'</strong>，均价'+label+'<strong>'+pct(price)+'</strong>。</div><div class="insight-item"><span class="tag">环节对照</span>组件出口<strong>'+fmt(z.vol==null?null:z.vol/1000)+'GW</strong>；电池出口<strong>'+fmt(dc.vol==null?null:dc.vol/1000)+'GW</strong>，同比<strong>'+pct(M.change('dianchi',state.month,state.mode,'vol',-12))+'</strong>。</div><div class="insight-item"><span class="tag">市场结构</span>'+third+'</div>';
 }
 function renderOverview(){
 renderKpis();renderInsights();
 const ms=monthsFor(D.series.zujian),lineFor=(k,field,scale=1)=>ms.map(m=>{const r=D.series[k].find(r=>r.m===m);return r?.[field]==null?null:r[field]*scale});
 chart('volumeChart',{...base,xAxis:{...base.xAxis,data:ms.map(ml)},yAxis:{...base.yAxis,name:'GW'},series:['zujian','dianchi','guipian'].map(k=>seriesLine(SERIES[k].name,lineFor(k,'vol',1/1000),SERIES[k].color))});
 chart('priceChart',{...base,xAxis:{...base.xAxis,data:ms.map(ml)},yAxis:{...base.yAxis,name:'美元/W'},series:[seriesLine('组件',lineFor('zujian','price'),'#1b5ea8'),seriesLine('电池',lineFor('dianchi','price'),'#bb9a4d')]});
 const regionRows=[...D.regions,...(D.region_gaps||[]).map(r=>({...r,name:'未分配差额'}))];
 const rms=monthsFor(D.regions),names=['欧洲','亚洲','非洲','南美洲','北美洲','大洋洲',...((D.region_gaps||[]).length?['未分配差额']:[])],colors=['#1b5ea8','#4b88c4','#90b6dd','#173858','#7f95ad','#c3d4e6','#dbe2ea'];
 if(!rms.length){emptyChart('regionChart','该时段暂无区域历史数据');$('regionSummary').innerHTML='<h4>区域数据始于2025年1月</h4>';return}
 chart('regionChart',{...base,xAxis:{...base.xAxis,data:rms.map(ml)},yAxis:{...base.yAxis,name:state.region==='share'?'%':'GW',max:state.region==='share'?100:null},series:names.map((name,i)=>({name,type:'bar',stack:'region',barMaxWidth:24,itemStyle:{color:colors[i]},data:rms.map(m=>{const v=regionRows.find(r=>r.name===name&&r.m===m)?.vol??(name==='未分配差额'?0:null),total=D.series.zujian.find(r=>r.m===m)?.vol;return v==null?null:state.region==='share'?v/total*100:v/1000})}))});
 const total=M.selected('zujian',state.month,state.mode).vol;
 $('regionSummary').innerHTML='<h4>'+period()+'区域分布</h4>'+names.map((name,i)=>{const rs=name==='未分配差额'?D.series.zujian.map(r=>({m:r.m,vol:(D.region_gaps||[]).find(g=>g.m===r.m)?.vol||0})):D.regions.filter(r=>r.name===name),v=state.mode==='month'?rs.find(r=>r.m===state.month)?.vol:exactSum(rs,ytdMonths(state.month),'vol');return '<div class="region-row"><span class="region-dot" style="background:'+colors[i]+'"></span>'+name+'<strong>'+fmt(v==null?null:v/1000,2)+'</strong><small>'+fmt(v==null||!total?null:v/total*100,1)+'%</small></div>'}).join('')+'<div class="muted-line">规模单位：GW</div>';
 }
 function renderMarkets(){
 const k=state.sector,s=SERIES[k],v=M.selected(k,state.month,state.mode);
 document.querySelectorAll('[data-sector]').forEach(b=>b.classList.toggle('active',b.dataset.sector===k));
 const metric=(label,val,unit,cl='')=>'<div class="mini-stat"><span>'+label+'</span><strong class="'+cl+'">'+val+'<small>'+unit+'</small></strong></div>';
 $('sectorStats').innerHTML=metric(s.label+'规模',fmt(v.vol==null?null:v.vol*s.scale,k==='guiliao'||k==='boli'?0:2),s.unit)+metric('同比变化',pct(M.change(k,state.month,state.mode,'vol',-12)),'',cls(M.change(k,state.month,state.mode,'vol',-12)))+metric('贸易金额',fmt(v.amt,1),'百万美元')+metric(s.priceUnit?'均价':state.mode==='month'?'数量环比':'累计同比',s.priceUnit?fmt(v.price,k==='guiliao'?2:3):pct(M.change(k,state.month,state.mode,'vol',state.mode==='month'?-1:-12)),s.priceUnit||'');
 const ms=monthsFor(D.series[k]),rows=ms.map(m=>D.series[k].find(r=>r.m===m));
 $('sectorTrendTitle').textContent=s.label+'月度走势';
 $('sectorTrendDesc').textContent='柱：'+s.unit+'；折线：'+(s.priceUnit?s.priceUnit:'百万美元')+'。趋势图始终使用月度值。';
 chart('sectorChart',{...base,xAxis:{...base.xAxis,data:ms.map(ml)},grid:{...base.grid,right:58},yAxis:[{...base.yAxis,name:s.unit},{...base.yAxis,name:s.priceUnit||'百万美元',splitLine:{show:false}}],series:[{name:'数量',type:'bar',data:rows.map(r=>r.vol==null?null:r.vol*s.scale),barMaxWidth:20,itemStyle:{color:s.color,opacity:.85}},seriesLine(s.priceUnit?'均价':'金额',rows.map(r=>s.priceUnit?r.price:r.amt),'#bb9a4d',{yAxisIndex:1})]});
 if(k==='guiliao'){renderSuppliers();return}
 $('rankSource').dataset.source='countries';$('countryTrendPanel').hidden=false;$('countrySearch').parentElement.hidden=false;
 tableRows=M.countries(k,state.month,state.mode);
 $('rankTitle').textContent=s.name+'主要出口市场';
 $('rankDesc').textContent=period()+' · TOP10 · '+s.unit;
 renderRank(tableRows.slice(0,10).map(r=>({name:r.name,value:r.vol*s.scale})),s.unit,s.color);
 renderCountryTable();
 const topNames=tableRows.slice(0,6).map(r=>r.name),cms=monthsFor(D.countries[k]);
 if(!topNames.length||!cms.length){emptyChart('countryTrendChart','当前区间无完整的分市场数据');return}
 chart('countryTrendChart',{...base,legend:{...base.legend,type:'scroll'},xAxis:{...base.xAxis,data:cms.map(ml)},yAxis:{...base.yAxis,name:s.unit},series:topNames.map((n,i)=>seriesLine(n,cms.map(m=>{const r=D.countries[k].find(r=>r.name===n&&r.m===m);return r?.vol==null?null:r.vol*s.scale}),['#1b5ea8','#2e7dd1','#91b6dc','#173858','#bb9a4d','#809daf'][i]))});
 }
 function renderRank(rows,unit,color){
 if(!rows.length){emptyChart('rankChart','当前区间无完整的分市场数据');return}
 const r=[...rows].reverse();
 chart('rankChart',{...base,legend:{show:false},grid:{top:13,left:87,right:56,bottom:28},tooltip:{trigger:'axis',axisPointer:{type:'shadow'},valueFormatter:v=>fmt(v,2)+' '+unit},xAxis:{type:'value',...{axisLabel:base.xAxis.axisLabel,splitLine:base.yAxis.splitLine}},yAxis:{type:'category',data:r.map(x=>x.name),axisLine:{show:false},axisTick:{show:false},axisLabel:{fontSize:10,color:'#60738a'}},series:[{type:'bar',data:r.map(x=>x.value),barMaxWidth:15,itemStyle:{color,borderRadius:[0,2,2,0]},label:{show:true,position:'right',fontSize:10,color:'#6f829a',formatter:p=>fmt(p.value,1)}}]});
 }
 function renderCountryTable(){
 const s=SERIES[state.sector],rows=tableRows.filter(r=>r.name.toLowerCase().includes(state.search.toLowerCase()));
 $('tableDesc').textContent=period()+' · 占比以同期行业总量为分母 · CSV行号可定位原始记录';
 $('countryHead').innerHTML='<tr><th>排名</th><th>国家 / 地区</th><th>规模（'+s.unit+'）</th><th>占行业总量</th><th>同比</th>'+(state.mode==='month'?'<th>环比</th>':'')+'<th>数据位置</th></tr>';
 $('countryBody').innerHTML=rows.length?rows.map(r=>'<tr><td>'+String(tableRows.indexOf(r)+1).padStart(2,'0')+'</td><td><span class="country-name">'+esc(r.name)+'</span>'+(r.supplement?'<span class="data-tag">报告补充</span>':'')+'</td><td><b>'+fmt(r.vol*s.scale,2)+'</b></td><td>'+fmt(r.share==null?null:r.share*100,1)+'%</td><td class="'+cls(r.yoy)+'">'+pct(r.yoy)+'</td>'+(state.mode==='month'?'<td class="'+cls(r.mom)+'">'+pct(r.mom)+'</td>':'')+'<td class="source-row">'+(state.mode==='month'?'countries.csv 第'+r.row+'行':'countries.csv 同年各月')+'</td></tr>').join(''):'<tr><td colspan="7" class="empty">'+(tableRows.length?'没有匹配的国家或地区':'当前区间缺少完整的分市场数据；缺失值未按0填补。')+'</td></tr>';
 const sum=tableRows.reduce((a,r)=>a+r.vol,0),total=M.selected(state.sector,state.month,state.mode).vol;
 $('coverageNote').textContent=tableRows.length?'已覆盖'+tableRows.length+'个市场，占行业总量'+fmt(total?sum/total*100:null,1)+'%；当前显示'+rows.length+'个。':'国家数据未覆盖当前区间。';
 }
 function renderSuppliers(){
 const r=D.suppliers,first=r[0],total=r.reduce((a,x)=>a+(x.amt||0),0);
 $('countryTrendPanel').hidden=true;$('countrySearch').parentElement.hidden=true;$('rankSource').dataset.source='suppliers';
 $('rankTitle').textContent='硅料累计进口来源地';
 $('rankDesc').textContent=first?ml(first.start)+'至'+ml(first.end)+' · 固定报告区间 · 百万美元':'无来源地数据';
 renderRank(r.filter(x=>x.name!=='其他').sort((a,b)=>b.amt-a.amt).slice(0,10).map(x=>({name:x.name,value:x.amt})),'百万美元','#567791');
 $('tableDesc').textContent='固定报告累计区间，不随观察月份或当月/累计切换；无分国家月度序列。';
 $('countryHead').innerHTML='<tr><th>排名</th><th>来源地</th><th>金额（百万美元）</th><th>进口量（吨）</th><th>金额占比</th><th>均价（美元/kg）</th></tr>';
 $('countryBody').innerHTML=r.map((x,i)=>'<tr><td>'+String(i+1).padStart(2,'0')+'</td><td class="country-name">'+esc(x.name)+'</td><td>'+fmt(x.amt,2)+'</td><td>'+fmt(x.vol,2)+'</td><td>'+fmt(total?x.amt/total*100:null,1)+'%</td><td>'+fmt(x.price,2)+'</td></tr>').join('');
 $('coverageNote').textContent='来源：silicon_suppliers.csv；以文件period_start / period_end字段标注统计区间。';
 }
 function renderSources(){
 $('originalWorkbook').textContent=D.meta.original_workbook;$('sourceStatus').textContent=D.meta.source_status;
 $('buildDate').textContent='整理日期：'+D.meta.prepared_date;
 const gapNotes=(D.region_gaps||[]).length?['区域合计与组件总量有小额差异：'+D.region_gaps.map(r=>ml(r.m)+'少'+fmt(r.vol,4)+'MW').join('、')+'。图中另列“未分配差额”，未改写原始六区域数据。']:[];
 $('qualityNotes').innerHTML=[...gapNotes,...D.meta.notes.filter((_,i)=>i>=3)].map(n=>'<li>'+esc(n)+'</li>').join('');
 }
 function render(){
 if(!D)return;
 $('monthSelect').value=state.month;const months=D.series.zujian.map(r=>r.m);$('prevMonth').disabled=state.month===months[0];$('nextMonth').disabled=state.month===months.at(-1);
 $('periodCaption').textContent=period()+' · 红涨绿跌，仅表示数值变化';
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',b.dataset.mode===state.mode)});
 document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('selected',b.dataset.range===state.range));
 document.querySelectorAll('[data-region]').forEach(b=>b.classList.toggle('selected',b.dataset.region===state.region));
 if(state.view==='overview')renderOverview();else if(state.view==='markets')renderMarkets();else renderSources();
 }
 function setMonth(m){state.month=m;render()}
 const sourceInfo={
 monthly:{title:'月度规模与价格',file:'monthly.csv',fields:'series, month, volume, amount_usd_mn, price',text:'以系列与年月定位记录。数量保留原始单位；页面统一折算GW、吨、万㎡。同比/环比实时计算。原Excel名称来自HTML页脚；玻璃sheet明确标注为“玻璃出口数据”，其他sheet名尚未独立核验。'},
 countries:{title:'分市场数据',file:'countries.csv',fields:'series, month, country, volume, record_type',text:'history表示有历史序列的市场，report_supplement表示报告当月补充。表格给出CSV行号。组件数据对应原HTML注明的“组件国家历史”；其余准确sheet名待核验。'},
 regions:{title:'组件区域结构',file:'regions.csv',fields:'month, region, volume_mw',text:'原HTML说明对应Excel“组件国家历史”的区域汇总行。构建时检查六区域合计与组件月度总量。小额差异单列为未分配差额，保留原始数据；超过1%或明显超额则阻止发布。'},
 suppliers:{title:'硅料累计进口来源地',file:'silicon_suppliers.csv',fields:'period_start, period_end, country, amount_usd_mn, volume_tonnes',text:'仅有报告累计来源地数据，固定显示文件标注区间。该图不跟随观察月份切换，避免将年度累计误当成单月。'}
 };
 function showSource(key){const x=sourceInfo[key]||sourceInfo.monthly;
 $('dialogTitle').textContent=x.title;
 let location='';if(key==='monthly'){const r=D.series[state.sector].find(r=>r.m===state.month);location=r?'<p>当前环节 / 月份：'+SERIES[state.sector].name+' / '+ml(state.month)+'，CSV第'+r.source_row+'行。</p>':''}
 $('dialogContent').innerHTML='<p><b>原报告：</b>'+esc(D.meta.original_workbook)+'</p><p><b>页面读取：</b><code>data/dashboard.json</code></p><p><b>仓库源文件：</b><code>'+x.file+'</code></p><p><b>字段：</b><code>'+x.fields+'</code></p>'+location+'<p>'+x.text+'</p>'+(repoUrl()?'<p><a href="'+repoUrl()+'/blob/main/'+x.file+'" target="_blank" rel="noopener">在GitHub查看 / 更新此文件 ↗</a></p>':'')+'<a href="./data/'+x.file+'" download>下载对应数据 ↓</a><button class="outline-button" id="showAllSources">查看全部口径</button>';
 $('showAllSources').onclick=()=>{$('sourceDialog').close();activateView('sources')};$('sourceDialog').showModal();
 }
 function download(name,text,type='text/csv;charset=utf-8'){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
 const csvText=rows=>'\ufeff'+rows.map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 function sourceCsv(file){
 if(file==='monthly.csv')return csvText([['series','month','volume','amount_usd_mn','price','unit','million_pieces','weight_kg'],...Object.entries(D.series).flatMap(([k,rs])=>rs.map(r=>[k,r.m,r.vol,r.amt,r.price,SERIES[k].raw,r.pcs,r.kg]))]);
 if(file==='countries.csv')return csvText([['series','month','country','volume','unit','record_type'],...Object.entries(D.countries).flatMap(([k,rs])=>rs.map(r=>[k,r.m,r.name,r.vol,SERIES[k].raw,r.type]))]);
 if(file==='regions.csv')return csvText([['month','region','volume_mw'],...D.regions.map(r=>[r.m,r.name,r.vol])]);
 if(file==='silicon_suppliers.csv')return csvText([['period_start','period_end','country','amount_usd_mn','volume_tonnes','price_usd_kg'],...D.suppliers.map(r=>[r.start,r.end,r.name,r.amt,r.vol,r.price])]);
 return JSON.stringify(D.meta,null,2);
 }
 function exportCurrent(){
 const rows=[['统计区间','环节','数量','单位','金额_百万美元','均价','均价单位','同比','环比']];
 Object.keys(SERIES).forEach(k=>{const s=SERIES[k],r=M.selected(k,state.month,state.mode);rows.push([period(),s.label,r.vol,s.raw,r.amt,r.price,s.priceUnit||'',M.change(k,state.month,state.mode,'vol',-12),state.mode==='month'?M.change(k,state.month,state.mode,'vol',-1):''])});
 if(state.view==='markets'&&state.sector!=='guiliao'){rows.push([],['国家地区','数量','单位','占行业总量','同比','环比']);M.countries(state.sector,state.month,state.mode).forEach(r=>rows.push([r.name,r.vol,SERIES[state.sector].raw,r.share,r.yoy,r.mom]))}
 download('光伏出口_'+state.month+'_'+(state.mode==='month'?'当月':'累计')+'.csv',csvText(rows));
 }
 function repoUrl(){const config=D.meta.repository||'';if(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(config))return config.replace(/\/$/,'');const host=location.hostname;if(host.endsWith('.github.io')){const owner=host.slice(0,-10),part=location.pathname.split('/').filter(Boolean)[0];return 'https://github.com/'+owner+'/'+(part||host)}return null}
 async function boot(){
 try{
 if(typeof echarts==='undefined')throw new Error('图表资源没有加载，请确认assets文件夹完整。');
 const inline=$('inline-data');D=inline?JSON.parse(inline.textContent):await fetch('./data/dashboard.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('数据读取失败（HTTP '+r.status+'）');return r.json()});
 if(!D.series?.zujian?.length||!D.meta)throw new Error('数据结构不完整，请运行构建脚本。');
 M=createModel(D);state.month=D.meta.report_month;
 $('monthSelect').innerHTML=D.series.zujian.map(r=>'<option value="'+r.m+'">'+full(r.m)+'</option>').join('');
 $('reportMonth').textContent=ml(D.meta.report_month);$('sidePeriod').textContent=full(D.meta.report_month);
 $('dataStatus').textContent=inline?'离线数据快照':'仓库数据已载入';$('loading').hidden=true;$('content').hidden=false;
 $('monthSelect').onchange=e=>setMonth(e.target.value);
 $('prevMonth').onclick=()=>setMonth(shiftMonth(state.month,-1));$('nextMonth').onclick=()=>setMonth(shiftMonth(state.month,1));$('latestBtn').onclick=()=>setMonth(D.meta.report_month);
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;render()});
 document.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{state.range=b.dataset.range;render()});
 document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{state.region=b.dataset.region;render()});
 document.querySelectorAll('[data-sector]').forEach(b=>b.onclick=()=>{state.sector=b.dataset.sector;render()});
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>activateView(b.dataset.view));
 document.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>showSource(b.dataset.source));
 $('countrySearch').oninput=e=>{state.search=e.target.value;renderCountryTable()};
 $('closeDialog').onclick=()=>$('sourceDialog').close();
 $('exportBtn').onclick=exportCurrent;
 $('repoBtn').onclick=()=>{const url=repoUrl();if(url)window.open(url,'_blank','noopener');else{activateView('sources');$('sourceStatus').textContent=D.meta.source_status+' 当前尚未绑定GitHub仓库；部署工作流会自动填入仓库地址。'}};
 document.addEventListener('click',e=>{const a=e.target.closest('a[download]');if(a&&a.getAttribute('href')?.startsWith('./data/')){e.preventDefault();const file=a.getAttribute('href').split('/').at(-1);download(file,sourceCsv(file),file.endsWith('.json')?'application/json':'text/csv;charset=utf-8')}});
 window.addEventListener('resize',()=>charts.forEach(c=>c.resize()));
 render();
 }catch(e){$('loading').hidden=true;$('errorBox').hidden=false;$('errorBox').textContent=e.message+' 请使用完整GitHub部署包，或打开单文件离线版。';$('dataStatus').textContent='读取失败'}
 }
 boot();
}

