module.exports=[406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},4747,(e,t,a)=>{t.exports=e.x("path",()=>require("path"))},2734,(e,t,a)=>{t.exports=e.x("fs",()=>require("fs"))},5148,(e,t,a)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},9372,e=>{"use strict";var t=e.i(6747),a=e.i(9245),r=e.i(4898),i=e.i(2950),s=e.i(4799),n=e.i(4747),l=e.i(2734),o=e.i(5148);let d=n.default.join(process.cwd(),"data"),u=n.default.join(d,"db.sqlite");l.default.existsSync(d)||l.default.mkdirSync(d,{recursive:!0});let E=new o.default(u);if(E.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    max_quantity INTEGER DEFAULT 1,
    available INTEGER DEFAULT 1,
    image_url TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    phone TEXT,
    date TEXT NOT NULL,
    dates TEXT DEFAULT '[]',
    event_type TEXT,
    nb_persons INTEGER,
    materials TEXT DEFAULT '[]',
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS blocked_dates (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS blocked_hours (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    hour TEXT NOT NULL,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT
  );
`),0===E.prepare("SELECT COUNT(*) as count FROM categories").get().count){let e=E.prepare("INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)"),t=[{id:"c1",name:"MOBILIER"},{id:"c2",name:"LINGE DE TABLE"},{id:"c3",name:"DÉCORATION"},{id:"c4",name:"ÉCLAIRAGE"}],a=new Date().toISOString();E.transaction(()=>{for(let r of t)e.run(r.id,r.name,a)})()}if(0===E.prepare("SELECT COUNT(*) as count FROM materials").get().count){let e=E.prepare(`
    INSERT INTO materials (id, name, description, category, max_quantity, available, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, 1, NULL, ?)
  `),t=[{id:"1",name:"Chaises Chiavari",description:"Chaises élégantes dorées ou blanches",category:"MOBILIER",max_quantity:50},{id:"2",name:"Tables rondes (Ø150cm)",description:"Tables pour 8-10 personnes",category:"MOBILIER",max_quantity:10},{id:"3",name:"Tables rectangulaires",description:"Tables banquet 180×75 cm",category:"MOBILIER",max_quantity:8},{id:"4",name:"Nappes blanches",description:"Nappes satin blanc",category:"LINGE DE TABLE",max_quantity:30},{id:"5",name:"Nappes rose gold",description:"Nappes satin rose gold",category:"LINGE DE TABLE",max_quantity:20},{id:"6",name:"Chemin de table",description:"Chemin de table organza",category:"LINGE DE TABLE",max_quantity:25},{id:"7",name:"Arche florale",description:"Arche décorée de fleurs",category:"DÉCORATION",max_quantity:20},{id:"8",name:"Photobooth",description:"Structure photobooth avec fond",category:"DÉCORATION",max_quantity:1},{id:"9",name:"Vases cylindriques",description:"Vases en verre transparent",category:"DÉCORATION",max_quantity:30},{id:"10",name:"Bougies LED",description:"Bougies à flamme réaliste",category:"ÉCLAIRAGE",max_quantity:60},{id:"11",name:"Guirlandes lumineuses",description:"Guirlandes 10 m, blanc chaud",category:"ÉCLAIRAGE",max_quantity:10},{id:"12",name:"Projecteurs LED",description:"Projecteurs RGB sur pied",category:"ÉCLAIRAGE",max_quantity:6}],a=new Date().toISOString();E.transaction(()=>{for(let r of t)e.run(r.id,r.name,r.description,r.category,r.max_quantity,a)})()}function T(e,t){if(!t)return null;let a={...t};if("materials"===e&&(a.available=1===a.available||!0===a.available),"reservations"===e){try{a.dates="string"==typeof a.dates?JSON.parse(a.dates):a.dates||[]}catch(e){a.dates=[]}try{a.materials="string"==typeof a.materials?JSON.parse(a.materials):a.materials||[]}catch(e){a.materials=[]}}return"contacts"===e&&(a.read=1===a.read||!0===a.read),a}function p(e,t){let a={...t};return"materials"===e&&void 0!==a.available&&(a.available=+!!a.available),"reservations"===e&&(void 0!==a.dates&&(a.dates=JSON.stringify(a.dates)),void 0!==a.materials&&(a.materials=JSON.stringify(a.materials))),"contacts"===e&&void 0!==a.read&&(a.read=+!!a.read),a}let c=["materials","reservations","blocked_dates","blocked_hours","contacts","categories"],f=e=>/^[a-zA-Z0-9_]+$/.test(e);e.s(["default",0,function(e,t){let{table:a,select:r,filters:i,order:n,limit:l,action:o}=e.query;if(!a)return t.status(400).json({message:"Missing table parameter"});if(!c.includes(a))return t.status(400).json({message:"Invalid table"});let d=e.method,u={materials:["POST","PUT","DELETE"],categories:["POST","PUT","DELETE"],blocked_dates:["POST","PUT","DELETE"],blocked_hours:["POST","PUT","DELETE"],reservations:["GET","PUT","DELETE"],contacts:["GET","PUT","DELETE"]}[a]||[];if((u.includes(d)||"GET"===d&&u.includes("GET"))&&!function(e){try{let t=e.headers.authorization;if(!t||!t.startsWith("Bearer "))return!1;let[a,r]=t.split(" ")[1].split("."),i=process.env.JWT_SECRET||"super_secret_local_key_for_jwt_tokens_12345",n=s.default.createHmac("sha256",i).update(a).digest("base64");if(r!==n)return!1;let l=JSON.parse(Buffer.from(a,"base64").toString("utf8"));if(Date.now()>l.exp)return!1;return"authenticated"===l.role}catch(e){return!1}}(e))return t.status(401).json({message:"Unauthorized access"});try{let r=i?JSON.parse(i):[];if("GET"===d){let e=`SELECT * FROM ${a}`,i=[],s=[];if(r.length>0){for(let e of r)if(f(e.field))if("eq"===e.type){i.push(`${e.field} = ?`);let t=e.value;"true"===t||!0===t?t=1:("false"===t||!1===t)&&(t=0),s.push(t)}else if("in"===e.type){if(!Array.isArray(e.values)||0===e.values.length)continue;let t=e.values.map(()=>"?").join(",");i.push(`${e.field} IN (${t})`),s.push(...e.values)}else"lte"===e.type&&(i.push(`${e.field} <= ?`),s.push(e.value))}if(i.length>0&&(e+=` WHERE ${i.join(" AND ")}`),n)try{let t=JSON.parse(n);if(f(t.field)){let a=t.ascending?"ASC":"DESC";e+=` ORDER BY ${t.field} ${a}`}}catch(e){}if(l){let t=parseInt(l,10);isNaN(t)||(e+=" LIMIT ?",s.push(t))}let o=E.prepare(e).all(...s).map(e=>T(a,e));return t.status(200).json({data:o})}if("POST"===d){let r=e.body;if(!r)return t.status(400).json({message:"Missing body payload"});let i=Array.isArray(r),n=i?r:[r],l=[];return E.transaction(()=>{for(let e of n){let t=!0===e.__upsert;t&&delete e.__upsert;let r=e.id||s.default.randomUUID(),i=e.created_at||new Date().toISOString(),n=p(a,{...e,id:r,created_at:i}),o=Object.keys(n).filter(f),d=o.join(", "),u=o.map(()=>"?").join(", "),c=`INSERT INTO ${a} (${d}) VALUES (${u})`;(t||"blocked_dates"===a)&&(c=`INSERT OR REPLACE INTO ${a} (${d}) VALUES (${u})`);let m=o.map(e=>n[e]);E.prepare(c).run(...m),l.push(T(a,n))}})(),t.status(200).json({data:i?l:l[0]})}if("PUT"===d){let i=e.body;if(!i)return t.status(400).json({message:"Missing body payload"});let s=i.payload?i.payload:i,n=i.filters?i.filters:r,l=p(a,s),o=Object.keys(l).filter(f);if(0===o.length)return t.status(400).json({message:"No fields to update"});let d=o.map(e=>`${e} = ?`).join(", "),u=o.map(e=>l[e]),c=`UPDATE ${a} SET ${d}`,m=[];if(n&&n.length>0){for(let e of n)if(f(e.field)){if("eq"===e.type){m.push(`${e.field} = ?`);let t=e.value;"true"===t||!0===t?t=1:("false"===t||!1===t)&&(t=0),u.push(t)}else if("in"===e.type){if(!Array.isArray(e.values)||0===e.values.length)continue;let t=e.values.map(()=>"?").join(",");m.push(`${e.field} IN (${t})`),u.push(...e.values)}}}m.length>0&&(c+=` WHERE ${m.join(" AND ")}`),E.prepare(c).run(...u);let h=`SELECT * FROM ${a}`,g=[];if(m.length>0&&(h+=` WHERE ${m.join(" AND ")}`,n&&n.length>0)){for(let e of n)if(f(e.field))if("eq"===e.type){let t=e.value;"true"===t||!0===t?t=1:("false"===t||!1===t)&&(t=0),g.push(t)}else"in"===e.type&&g.push(...e.values)}let y=E.prepare(h).all(...g).map(e=>T(a,e));return t.status(200).json({data:y})}if("DELETE"===d){let i=e.body,s=i&&i.filters?i.filters:r,n=`DELETE FROM ${a}`,l=[],o=[];if(s&&s.length>0){for(let e of s)if(f(e.field)){if("eq"===e.type){l.push(`${e.field} = ?`);let t=e.value;"true"===t||!0===t?t=1:("false"===t||!1===t)&&(t=0),o.push(t)}else if("in"===e.type){if(!Array.isArray(e.values)||0===e.values.length)continue;let t=e.values.map(()=>"?").join(",");l.push(`${e.field} IN (${t})`),o.push(...e.values)}}}l.length>0&&(n+=` WHERE ${l.join(" AND ")}`);let d=E.prepare(n).run(...o);return t.status(200).json({data:{deleted:d.changes}})}return t.status(405).json({message:"Method Not Allowed"})}catch(e){return console.error(`[API DB Error for ${a}]`,e),t.status(500).json({message:"Internal Server Error"})}}],3257);var m=e.i(3257),h=e.i(7031),g=e.i(1927),y=e.i(6432);let N=(0,i.hoist)(m,"default"),A=(0,i.hoist)(m,"config"),v=new r.PagesAPIRouteModule({definition:{kind:a.RouteKind.PAGES_API,page:"/api/db",pathname:"/api/db",bundlePath:"",filename:""},userland:m,distDir:".next",relativeProjectDir:""});async function I(e,a,r){r.requestMeta&&(0,y.setRequestMeta)(e,r.requestMeta),v.isDev&&(0,y.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let i="/api/db";i=i.replace(/\/index$/,"")||"/";let s=await v.prepare(e,a,{srcPage:i});if(!s){a.statusCode=400,a.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve());return}let{query:n,params:l,prerenderManifest:o,routerServerContext:d}=s;try{let t,r=e.method||"GET",s=(0,h.getTracer)(),u=s.getActiveScopeSpan(),E=!!(null==d?void 0:d.isWrappedByNextServer),T=v.instrumentationOnRequestError.bind(v),p=async u=>v.render(e,a,{query:{...n,...l},params:l,allowedRevalidateHeaderKeys:[],multiZoneDraftMode:!1,trustHostHeader:!1,previewProps:o.preview,propagateError:!1,dev:v.isDev,page:"/api/db",internalRevalidate:null==d?void 0:d.revalidate,onError:(...t)=>T(e,...t)}).finally(()=>{if(!u)return;u.setAttributes({"http.status_code":a.statusCode,"next.rsc":!1});let e=s.getRootSpanAttributes();if(!e)return;if(e.get("next.span_type")!==g.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${e.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=e.get("next.route");if(n){let e=`${r} ${n}`;u.setAttributes({"next.route":n,"http.route":n,"next.span_name":e}),u.updateName(e),t&&t!==u&&(t.setAttribute("http.route",n),t.updateName(e))}else u.updateName(`${r} ${i}`)});E&&u?await p(u):(t=s.getActiveScopeSpan(),await s.withPropagatedContext(e.headers,()=>s.trace(g.BaseServerSpan.handleRequest,{spanName:`${r} ${i}`,kind:h.SpanKind.SERVER,attributes:{"http.method":r,"http.target":e.url}},p),void 0,!E))}catch(e){if(v.isDev)throw e;(0,t.sendError)(a,500,"Internal Server Error")}finally{null==r.waitUntil||r.waitUntil.call(r,Promise.resolve())}}e.s(["config",0,A,"default",0,N,"handler",0,I],9372)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__20xx6en._.js.map