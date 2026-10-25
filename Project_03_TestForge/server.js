
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { runCase, validateCase } from './runner.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const storeFile=path.join(here,'data','store.json');
fs.mkdirSync(path.dirname(storeFile),{recursive:true});
const seed=[
 {id:randomUUID(),name:'Health endpoint',type:'api',method:'GET',url:'http://localhost:4003/demo/health',expectedStatus:200,assertPath:'status',assertValue:'ok'},
 {id:randomUUID(),name:'Demo user record',type:'api',method:'GET',url:'http://localhost:4003/demo/user',expectedStatus:200,assertPath:'profile.role',assertValue:'developer'},
 {id:randomUUID(),name:'Demo landing page',type:'browser',url:'http://localhost:4003/demo/page',expectedTitle:'TestForge Demo',selector:'#ready'}
];
let db;
try{db=JSON.parse(fs.readFileSync(storeFile,'utf8'))}catch{db={cases:seed,runs:[]}}
const save=()=>fs.writeFileSync(storeFile,JSON.stringify(db,null,2));
save();
const send=(res,status,data,contentType='application/json')=>{res.writeHead(status,{'content-type':contentType,'cache-control':'no-store'});res.end(contentType==='application/json'?JSON.stringify(data):data)};
const body=async req=>{let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>1024*1024)throw Error('Request too large');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString()||'{}')};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const report=run=>`<!doctype html><html><head><meta charset="utf-8"><title>TestForge Report</title><style>body{font:16px system-ui;max-width:900px;margin:50px auto;color:#172235}table{border-collapse:collapse;width:100%}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}.pass{color:green}.fail{color:crimson}</style></head><body><h1>TestForge Test Report</h1><p>Run ${escapeHtml(run.id)} · ${escapeHtml(run.startedAt)}</p><h2>${run.passed} passed · ${run.failed} failed · ${run.durationMs}ms</h2><table><tr><th>Case</th><th>Status</th><th>Duration</th><th>Details</th></tr>${run.results.map(r=>`<tr><td>${escapeHtml(r.name)}</td><td class="${r.ok?'pass':'fail'}">${r.ok?'PASS':'FAIL'}</td><td>${r.durationMs}ms</td><td>${escapeHtml(r.message)}</td></tr>`).join('')}</table></body></html>`;
async function executeSuite(ids){
 const selected=db.cases.filter(c=>!ids||ids.includes(c.id));
 if(!selected.length)throw Error('No test cases selected');
 const started=Date.now(),results=new Array(selected.length);let next=0;
 await Promise.all(Array.from({length:Math.min(3,selected.length)},async()=>{while(next<selected.length){let i=next++;results[i]=await runCase(selected[i])}}));
 const run={id:randomUUID(),startedAt:new Date(started).toISOString(),durationMs:Date.now()-started,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results};
 db.runs.unshift(run);db.runs=db.runs.slice(0,100);save();return run;
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
 const u=new URL(req.url,'http://localhost:4003'),p=u.pathname;
 if(p==='/demo/health')return send(res,200,{status:'ok',service:'TestForge'});
 if(p==='/demo/user')return send(res,200,{profile:{name:'Alex',role:'developer'}});
 if(p==='/demo/page')return send(res,200,'<!doctype html><title>TestForge Demo</title><div id="ready">Ready for automation</div>','text/html');
 if(p==='/api/summary'&&req.method==='GET')return send(res,200,{cases:db.cases.length,runs:db.runs.length,latest:db.runs[0]||null});
 if(p==='/api/cases'&&req.method==='GET')return send(res,200,db.cases);
 if(p==='/api/cases'&&req.method==='POST'){
  const c=await body(req);validateCase(c);const item={...c,id:randomUUID()};db.cases.push(item);save();return send(res,201,item);
 }
 if(p.startsWith('/api/cases/')&&req.method==='DELETE'){const id=p.split('/').at(-1);db.cases=db.cases.filter(c=>c.id!==id);save();return send(res,200,{ok:true})}
 if(p==='/api/run'&&req.method==='POST'){const b=await body(req);return send(res,200,await executeSuite(Array.isArray(b.ids)?b.ids:null))}
 if(p==='/api/runs'&&req.method==='GET')return send(res,200,db.runs);
 const m=p.match(/^\/api\/runs\/([a-f0-9-]+)(\/report)?$/);
 if(m&&req.method==='GET'){const r=db.runs.find(x=>x.id===m[1]);if(!r)return send(res,404,{error:'Run not found'});return m[2]?send(res,200,report(r),'text/html; charset=utf-8'):send(res,200,r)}
 if(p.startsWith('/api/'))return send(res,404,{error:'Unknown API endpoint'});
 const file=path.resolve(here,'public',p==='/'?'index.html':'.'+p);
 if(!file.startsWith(path.join(here,'public')+path.sep)&&file!==path.join(here,'public','index.html'))return send(res,403,{error:'Forbidden'});
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,'Not found','text/plain');
 return send(res,200,fs.readFileSync(file).toString(),types[path.extname(file)]||'text/plain');
 }catch(e){send(res,400,{error:e.message||'Unexpected error'})}
});
server.listen(4003,'127.0.0.1',()=>console.log('TestForge: http://localhost:4003'));
