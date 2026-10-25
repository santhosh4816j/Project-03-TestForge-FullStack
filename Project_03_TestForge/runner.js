
const localUrl=input=>{
 const u=new URL(input);
 if(!['http:','https:'].includes(u.protocol)||!['localhost','127.0.0.1'].includes(u.hostname))throw Error('Only localhost URLs are permitted');
 return u.toString();
};
export function validateCase(c){
 if(!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>100)throw Error('Name is required (max 100 characters)');
 if(!['api','browser'].includes(c.type))throw Error('Invalid test type');
 localUrl(c.url);
 if(c.type==='api'&&!['GET','POST','PUT','PATCH','DELETE'].includes(c.method))throw Error('Invalid HTTP method');
 if(c.type==='api'&&(!Number.isInteger(Number(c.expectedStatus))||Number(c.expectedStatus)<100||Number(c.expectedStatus)>599))throw Error('Expected status must be 100–599');
 if(c.headers){let v=typeof c.headers==='string'?JSON.parse(c.headers):c.headers;if(!v||Array.isArray(v)||typeof v!=='object')throw Error('Headers must be an object')}
 if(c.body&&typeof c.body==='string')JSON.parse(c.body);
}
const valueAt=(obj,p)=>String(p).split('.').reduce((v,k)=>v?.[k],obj);
export async function runCase(c){
 const start=Date.now();try{
 validateCase(c);
 if(c.type==='api'){
  const headers=c.headers?(typeof c.headers==='string'?JSON.parse(c.headers):c.headers):{};
  const options={method:c.method,headers,signal:AbortSignal.timeout(12000)};
  if(!['GET','DELETE'].includes(c.method)&&c.body){options.body=typeof c.body==='string'?c.body:JSON.stringify(c.body);options.headers={'content-type':'application/json',...headers}}
  const response=await fetch(localUrl(c.url),options);
  const raw=(await response.text()).slice(0,6000);
  let parsed;try{parsed=JSON.parse(raw)}catch{}
  if(response.status!==Number(c.expectedStatus))throw Error(`Expected HTTP ${c.expectedStatus}, received ${response.status}. ${raw.slice(0,150)}`);
  if(c.assertPath){const actual=valueAt(parsed,c.assertPath);if(String(actual)!==String(c.assertValue??''))throw Error(`Assertion ${c.assertPath}: expected "${c.assertValue}", got "${actual}"`)}
  return {id:c.id,name:c.name,type:c.type,ok:true,durationMs:Date.now()-start,message:`HTTP ${response.status} · All assertions passed`,preview:raw.slice(0,500)};
 }
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(localUrl(c.url),{waitUntil:'domcontentloaded',timeout:12000});
  if(c.expectedTitle&&!(await page.title()).includes(c.expectedTitle))throw Error(`Page title did not include "${c.expectedTitle}"`);
  if(c.selector)await page.locator(c.selector).first().waitFor({state:'visible',timeout:5000});
  return {id:c.id,name:c.name,type:c.type,ok:true,durationMs:Date.now()-start,message:'Navigation and UI assertions passed',preview:await page.title()};
 }finally{await browser.close()}
 }catch(e){return{id:c.id,name:c.name,type:c.type,ok:false,durationMs:Date.now()-start,message:String(e.message).slice(0,500),preview:''}}
}
