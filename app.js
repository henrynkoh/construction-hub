
const D=window.DATA,S=D.steps,TAG=D.tag;
const $=(s,r=document)=>r.querySelector(s),money=n=>'$'+n.toLocaleString(undefined,{maximumFractionDigits:0}),m2=n=>'$'+n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const pad=n=>String(n).padStart(2,'0'),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const link=a=>'https://www.amazon.com/dp/'+a+'?tag='+TAG;
const stepHours=s=>s.mats.reduce((a,m)=>a+m.mh,0),stepCost=s=>s.mats.reduce((a,m)=>a+m.qty*m.price,0);
function rows(list){let n=0,out=[];for(const s of list)for(const r of s.rows){n++;out.push({n,step:s.step,...r})}return out}
function allRows(kind){return rows(S.map(s=>({step:s,rows:kind==='tool'?s.tools:s.mats})))}
function tr(r){const tot=r.qty*r.price;return '<tr><td>'+pad(r.n)+'</td><td>'+esc(r.sec)+'</td><td>'+esc(r.sub)+'</td><td><a href="step-'+pad(r.step.id)+'.html">S'+pad(r.step.id)+' '+esc(r.step.name)+'</a></td><td class="wrap">'+esc(r.item)+'</td><td class="r">'+r.qty.toLocaleString()+' '+esc(r.unit)+'</td><td class="r">'+m2(r.price)+'</td><td class="r">'+r.mh+'</td><td class="r">'+m2(tot)+'</td><td><span class="sup s-'+r.sup.replace(/\W/g,'')+'">'+esc(r.sup)+'</span></td></tr>'}
const HEAD='<thead><tr><th>#</th><th>Section</th><th>Subsection</th><th>ID / Step</th><th>Item / Material</th><th class="r">Quantity</th><th class="r">Unit price</th><th class="r">Man-hr</th><th class="r">Total price</th><th>Supplier</th></tr></thead>';
function table(el,data){const t=data.reduce((a,r)=>a+r.qty*r.price,0),h=data.reduce((a,r)=>a+r.mh,0);el.innerHTML=HEAD+'<tbody>'+data.map(tr).join('')+'</tbody><tfoot><tr><td colspan="7">'+data.length+' items</td><td class="r">'+h+' h</td><td class="r">'+m2(t)+'</td><td>+ labor @ $55/h = '+money(h*55)+'</td></tr></tfoot>'}
function picksHtml(p){return '<div class="card"><h4><span class="badge '+(p.kind==='Tool'?'t':'m')+'">'+p.kind+'</span>'+esc(p.name)+'<em>Top 3 on Amazon</em></h4>'+p.top.map((x,i)=>'<div class="pk"><img loading="lazy" src="'+x.img+'" alt=""><div><b>#'+(i+1)+'</b> <a href="'+link(x.asin)+'" target="_blank" rel="sponsored noopener">'+esc(x.title)+'</a><br>'+x.price+' | '+x.rating+'&#9733; | '+(x.reviews||0).toLocaleString()+' ratings'+(x.bought?' | '+x.bought+' bought/mo':'')+'</div></div>').join('')+'</div>'}
function nav(){return '<header class="top"><b>Build Hub</b><nav><a href="index.html">Home</a><a href="index.html#workflow">Workflow</a><a href="index.html#materials">Materials</a><a href="index.html#tools">Tools</a><a href="affiliate.html">Affiliate</a><a href="shorts.html">Shorts Studio</a></nav></header>'}
const page=document.body.dataset.page;
document.body.insertAdjacentHTML('afterbegin',nav());
const main=$('main');
if(page==='home'){
 const mat=allRows('mat'),tl=allRows('tool');
 const totC=S.reduce((a,s)=>a+stepCost(s),0),totH=S.reduce((a,s)=>a+stepHours(s),0);
 const hs=S.map(stepHours).sort((a,b)=>a-b),q=(p)=>hs[Math.floor(p*(hs.length-1))];
 const size=s=>{const h=stepHours(s);return h>=q(.8)?'w':h>=q(.45)?'m':'s'};
 main.innerHTML='<h1>Construction Project Hub</h1><p class="sub">From site prep to handover: every step, material, tool, price, man-hour and supplier in one place. Prices are planning estimates (WA, 2026); Amazon picks are live-scraped.</p>'
 +'<div class="kpi"><div><b>'+S.length+'</b>workflow steps</div><div><b>'+mat.length+'</b>material lines</div><div><b>'+money(totC)+'</b>materials est.</div><div><b>'+totH+' h</b>total man-hours</div><div><b>'+S.length*4*3+'</b>affiliate picks</div></div>'
 +'<section class="block" id="workflow"><h2>Construction Workflow<small>click any step or button to open its page</small></h2><div class="upper"><ol class="flow">'+S.map(s=>'<li><i>'+s.id+'</i><a href="step-'+pad(s.id)+'.html"><b>'+esc(s.name)+'</b><span>'+esc(s.desc)+' ('+stepHours(s)+' h)</span></a></li>').join('')+'</ol>'
 +'<div class="navgrid"><a class="nb l hot" href="affiliate.html"><b>Affiliate Campaign</b><small>60 items &times; top 3 Amazon picks</small></a><a class="nb l cta" href="shorts.html"><b>Shorts Studio</b><small>60 video shorts: render and upload</small></a><a class="nb m" href="#materials"><b>Materials master list</b><small>'+mat.length+' lines</small></a><a class="nb m" href="#tools"><b>Tools &amp; machines</b><small>per workflow step</small></a>'
 +S.map(s=>'<a class="nb '+size(s)+'" href="step-'+pad(s.id)+'.html"><span class="n">'+pad(s.id)+'</span><b>'+esc(s.name)+'</b><small>'+stepHours(s)+' h | '+money(stepCost(s))+'</small></a>').join('')+'</div></div></section>'
 +'<section class="block" id="materials"><h2>Materials List<small>all steps</small></h2><div class="ctrl"><input id="q" placeholder="Search items..."><select id="fs"><option value="">All steps</option>'+S.map(s=>'<option value="'+s.id+'">'+pad(s.id)+' '+esc(s.name)+'</option>').join('')+'</select><select id="fp"><option value="">All suppliers</option><option>Home Depot</option><option>Lowe\'s</option><option>Builders FirstSource</option><option>Amazon</option></select></div><div class="tw"><table id="mt"></table></div><p class="note">Rows for steps 4-9 are based on your Grok roofing/window and floor-framing tables; other steps are planning estimates. Labor costed at $55/h.</p></section>'
 +'<section class="block" id="tools"><h2>Tools &amp; Machines by Workflow Step<small>top 2 tools + top 2 materials, each with the top 3 Amazon sellers</small></h2>'+S.map(s=>'<div class="tl"><div><h3><span>'+pad(s.id)+'</span><a href="step-'+pad(s.id)+'.html">'+esc(s.name)+'</a></h3><div class="note">'+esc(s.desc)+'</div></div><div class="tools">'+s.picks.filter(p=>p.kind==='Tool').map(picksHtml).join('')+'</div></div>').join('')
 +'<h2 style="margin-top:20px">Tools table</h2><div class="tw"><table id="tt"></table></div></section>';
 const draw=()=>{const qq=$('#q').value.toLowerCase(),fs=$('#fs').value,fp=$('#fp').value;table($('#mt'),mat.filter(r=>(!fs||r.step.id==fs)&&(!fp||r.sup===fp)&&(!qq||(r.item+r.sub+r.sec).toLowerCase().includes(qq))))};
 ['q','fs','fp'].forEach(i=>$('#'+i).addEventListener('input',draw));draw();table($('#tt'),tl);
}
if(page==='step'){
 const id=+document.body.dataset.id,s=S[id-1];
 const mt=rows([{step:s,rows:s.mats}]),tt=rows([{step:s,rows:s.tools}]);
 main.innerHTML='<p><a href="index.html">&larr; Hub</a></p><h1>Step '+pad(s.id)+': '+esc(s.name)+'</h1><p class="sub">'+esc(s.desc)+'</p><div class="kpi"><div><b>'+s.mats.length+'</b>material lines</div><div><b>'+money(stepCost(s))+'</b>materials</div><div><b>'+stepHours(s)+' h</b>man-hours</div><div><b>'+money(stepHours(s)*55)+'</b>labor @ $55/h</div></div>'
 +'<section class="block"><h2>Materials</h2><div class="tw"><table id="a"></table></div></section><section class="block"><h2>Tools / Machines</h2><div class="tw"><table id="b"></table></div></section>'
 +'<section class="block"><h2>Affiliate picks<small>top 2 materials + top 2 tools, top 3 Amazon each</small></h2><div class="disc">As an Amazon Associate we earn from qualifying purchases.</div><div class="tools">'+s.picks.map(picksHtml).join('')+'</div></section>'
 +'<div class="pn">'+(id>1?'<a href="step-'+pad(id-1)+'.html">&larr; '+esc(S[id-2].name)+'</a>':'<span></span>')+(id<S.length?'<a href="step-'+pad(id+1)+'.html">'+esc(S[id].name)+' &rarr;</a>':'')+'</div>';
 table($('#a'),mt);table($('#b'),tt);
}
if(page==='affiliate'){
 main.innerHTML='<h1>Affiliate Marketing Campaign</h1><p class="sub">Per workflow step: 2 materials/consumables + 2 tools/machines, each with the top 3 Amazon products (default Amazon ranking, ordered by monthly units bought, then rating count).</p><div class="disc">Affiliate links use Amazon Associates tracking ID <b>buildsmartpic-20</b>. As an Amazon Associate I earn from qualifying purchases. Prices change; check Amazon for current price.</div><div class="ctrl"><button id="csv">Download campaign CSV</button><a href="shorts.html"><button>Go to Shorts Studio</button></a></div>'+S.map(s=>'<section class="block"><h2>'+pad(s.id)+' '+esc(s.name)+'</h2><div class="tools">'+s.picks.map(picksHtml).join('')+'</div></section>').join('');
 $('#csv').onclick=()=>{const L=[['step','step_name','kind','item','rank','asin','title','price','rating','ratings','bought_month','affiliate_link']];S.forEach(s=>s.picks.forEach(p=>p.top.forEach((x,i)=>L.push([s.id,s.name,p.kind,p.name,i+1,x.asin,x.title,x.price,x.rating,x.reviews,x.bought,link(x.asin)]))));const b=new Blob([L.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n')]);const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='campaign.csv';a.click()}
}
