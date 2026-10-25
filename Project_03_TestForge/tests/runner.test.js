import test from 'node:test';import assert from 'node:assert/strict';import {validateCase,runCase} from '../runner.js';
test('rejects external hosts',()=>assert.throws(()=>validateCase({name:'x',type:'api',url:'https://example.com',method:'GET',expectedStatus:200}),/localhost/));
test('accepts local API case',()=>assert.doesNotThrow(()=>validateCase({name:'x',type:'api',url:'http://localhost:4003/demo/health',method:'GET',expectedStatus:200})));
test('rejects invalid method',()=>assert.throws(()=>validateCase({name:'x',type:'api',url:'http://localhost:4003',method:'TRACE',expectedStatus:200}),/method/));
test('runner returns failure instead of throwing',async()=>{let r=await runCase({id:'1',name:'broken',type:'api',url:'https://example.com',method:'GET',expectedStatus:200});assert.equal(r.ok,false)});
