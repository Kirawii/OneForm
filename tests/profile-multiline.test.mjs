import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('科研和自定义长文本渲染保留换行并转义 HTML',async()=>{
  const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  let markup='';
  const table={querySelector:()=>({set innerHTML(value){markup=value}}),querySelectorAll:()=>[]};
  const context=vm.createContext({document:{getElementById:()=>table}});
  vm.runInContext(source.slice(0,source.indexOf("document.addEventListener('click',event=>")),context);
  context.sample='第一行\n第二行 <script> & 内容';
  for(const [id,key] of [['researchTable','Detail'],['customTable','Value']]){
    context.tableId=id;context.valueKey=key;
    vm.runInContext('renderDynamicTable(tableId,[{[valueKey]:sample}])',context);
    assert.match(markup,/<textarea[^>]*>第一行\n第二行 &lt;script&gt; &amp; 内容<\/textarea>/);
    assert.doesNotMatch(markup,/<script>/);
  }
});
