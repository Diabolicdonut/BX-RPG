import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const full=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!(full===root||full.startsWith(root+sep))||!['.html','.js','.css','.svg'].includes(extname(full)))throw Error('Not found');
    const bytes=await readFile(full);res.writeHead(200,{'content-type':mime[extname(full)],'x-content-type-options':'nosniff'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log(`B/X shell at http://127.0.0.1:${port}/`));
