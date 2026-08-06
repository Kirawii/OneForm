import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.argv[2] || process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

createServer(async (request,response)=>{
  try{
    const url=new URL(request.url,"http://127.0.0.1");
    let pathname=decodeURIComponent(url.pathname);
    if(pathname==="/")pathname="/docs/";
    if(pathname.endsWith("/"))pathname+="index.html";
    const file=resolve(root,"."+pathname);
    if(file!==root&&!file.startsWith(root+sep))throw new Error("Invalid path");
    const info=await stat(file);
    if(!info.isFile())throw new Error("Not a file");
    response.writeHead(200,{"Content-Type":types[extname(file)]||"application/octet-stream"});
    createReadStream(file).pipe(response)
  }catch{
    response.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});
    response.end("Not found")
  }
}).listen(port,"127.0.0.1",()=>{
  console.log(`Preview: http://127.0.0.1:${port}/docs/`)
});
