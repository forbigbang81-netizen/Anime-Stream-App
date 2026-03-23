import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

// ─── AniList GraphQL ──────────────────────────────────────────────────────────
async function alFetch(query, variables = {}) {
  const body    = JSON.stringify({ query, variables });
  const headers = { "Content-Type":"application/json","Accept":"application/json" };
  try {
    const r = await fetch("https://graphql.anilist.co", { method:"POST", headers, body });
    if (r.ok) { const j = await r.json(); if (!j.errors) return j.data; }
  } catch {}
  try {
    const r = await fetch("https://corsproxy.io/?"+encodeURIComponent("https://graphql.anilist.co"),
      { method:"POST", headers, body });
    if (r.ok) { const j = await r.json(); if (!j.errors) return j.data; }
  } catch {}
  return null;
}

// ─── Video embed system ───────────────────────────────────────────────────────
const BACKEND_URL = ""; // Set to your Railway URL for HLS streams

async function getMalId(anilistId) {
  try {
    const r = await alFetch("query($id:Int){Media(id:$id,type:ANIME){idMal}}", { id: anilistId });
    return r?.Media?.idMal || null;
  } catch { return null; }
}

function buildEmbedUrls(anilistId, malId, epNum, isDub) {
  const id  = malId || anilistId;
  const sub = isDub ? "dub" : "sub";
  return [
    `https://vidsrc.cc/v2/embed/anime/${id}/${epNum}?translation=${sub}`,
    `https://embed.su/embed/anime/${id}/${epNum}`,
    `https://vidlink.pro/anime/${id}/${epNum}?primaryColor=e5172c`,
    `https://vidsrc.net/embed/anime?id=${id}&e=${epNum}`,
    `https://vidsrc.pro/embed/anime/${id}/${epNum}`,
    `https://2embed.skin/embed/anime/stream?id=${id}&e=${epNum}&s=${sub}`,
  ];
}

function buildSrcdoc(embedUrl, title, epNum) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
iframe{position:fixed;inset:0;width:100%;height:100%;border:0}
</style>
<script>
try{
  Object.defineProperty(navigator,'userAgent',{get:()=>'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'});
  Object.defineProperty(navigator,'vendor',{get:()=>'Google Inc.'});
  Object.defineProperty(navigator,'webdriver',{get:()=>undefined});
}catch(e){}
</script>
</head>
<body>
<iframe src="${embedUrl}"
  allowfullscreen
  allow="autoplay;fullscreen;encrypted-media;picture-in-picture"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>
</body>
</html>`;
}

// ─── AniList queries ──────────────────────────────────────────────────────────
const AL_FIELDS = `id title{romaji english native} coverImage{extraLarge large color}
  bannerImage description(asHtml:false) genres averageScore popularity episodes
  status seasonYear format studios(isMain:true){nodes{name}} idMal
  nextAiringEpisode{episode timeUntilAiring}`;

const AL_FULL = AL_FIELDS + ` characters(sort:ROLE,perPage:8){edges{role node{id name{full}image{large}}}}
  recommendations(perPage:6){nodes{mediaRecommendation{id title{romaji english}coverImage{large}averageScore}}}`;

const Q_HOME = `query{
  trending:Page(perPage:20){media(sort:TRENDING_DESC,type:ANIME,isAdult:false){${AL_FIELDS}}}
  top:Page(perPage:20){media(sort:SCORE_DESC,type:ANIME,isAdult:false){${AL_FIELDS}}}
  popular:Page(perPage:20){media(sort:POPULARITY_DESC,type:ANIME,isAdult:false){${AL_FIELDS}}}
  airing:Page(perPage:20){media(status:RELEASING,sort:TRENDING_DESC,type:ANIME,isAdult:false){${AL_FIELDS}}}
}`;
const Q_SEARCH = `query($q:String){Page(perPage:30){media(search:$q,type:ANIME,isAdult:false){${AL_FIELDS}}}}`;
const Q_INFO   = `query($id:Int){Media(id:$id,type:ANIME){${AL_FULL}}}`;

function normAL(m) {
  if (!m) return null;
  return {
    id:m.id, malId:m.idMal,
    title:m.title?.english||m.title?.romaji||"Unknown",
    titleNative:m.title?.native||"",
    cover:m.coverImage?.extraLarge||m.coverImage?.large||"",
    banner:m.bannerImage||m.coverImage?.extraLarge||"",
    color:m.coverImage?.color||"#e5172c",
    desc:(m.description||"").replace(/<[^>]*>/g,"").slice(0,400),
    genres:m.genres||[],
    score:m.averageScore?(m.averageScore/10).toFixed(1):"?",
    episodes:m.episodes||"?",
    status:m.status||"UNKNOWN",
    year:m.seasonYear||"",
    format:m.format||"TV",
    studio:m.studios?.nodes?.[0]?.name||"",
    chars:m.characters?.edges||[],
    recs:(m.recommendations?.nodes||[]).filter(n=>n?.mediaRecommendation),
  };
}

function imgUrl(url, w=300) {
  if (!url) return "";
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&output=webp&q=85`;
}

function buildEpSet(ranges) {
  const s=new Set();
  for(const r of ranges){if(typeof r==="number"){s.add(r);continue;}for(let i=r[0];i<=r[1];i++)s.add(i);}
  return s;
}
const FILLER={
  21:  {filler:buildEpSet([[54,60],[98,99],102,[131,143],[196,206],[220,225],[279,283],[291,292],303,[317,319],[326,336],[382,384],[406,407],[426,429],[457,458],492,542,[575,578],590]),mixed:buildEpSet([[45,47],61,[68,69],101])},
  20:  {filler:buildEpSet([26,[97,106],[136,219]]),mixed:buildEpSet([[7,7],[14,16]])},
  1735:{filler:buildEpSet([[28,56],[71,74],[87,88],[93,111],[150,151],[170,171],[176,196],[225,242],[257,260],[279,281],[284,289],[303,320],[352,361],[394,401],[419,421],[426,431],[434,450],[464,469],[480,483]]),mixed:buildEpSet([27,62,75,91])},
  269: {filler:buildEpSet([[33,50],[64,109],[128,137],[147,149],[168,189],[204,205],[227,266],[287,299],[311,341]]),mixed:buildEpSet([8,27,32])},
  457: {filler:buildEpSet([9,17,22,28,[83,107],[115,118],[185,191],[220,226],[255,277]]),mixed:buildEpSet([8,[10,11]])},
};
function epType(id,n){const db=FILLER[id];if(!db)return"canon";if(db.filler?.has(n))return"filler";if(db.mixed?.has(n))return"mixed";return"canon";}

const EP_PAGE=24;

// ─── Anime Card ───────────────────────────────────────────────────────────────
function AnimeCard({anime,onClick}){
  const[err,setErr]=useState(false);
  return(
    <div onClick={onClick} style={{cursor:"pointer",transition:"transform .18s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
      <div style={{position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"2/3",background:"#16161c"}}>
        {err
          ?<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:8,textAlign:"center",fontSize:11,color:"#7070a0"}}>{anime.title}</div>
          :<img src={imgUrl(anime.cover,300)} alt={anime.title} loading="lazy"
            style={{width:"100%",height:"100%",objectFit:"cover"}}
            onError={()=>setErr(true)}/>}
        <div style={{position:"absolute",top:7,left:7,display:"flex",flexDirection:"column",gap:4}}>
          <span style={{fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:4,background:"rgba(0,0,0,.7)",color:"rgba(255,255,255,.8)"}}>{anime.format}</span>
          {anime.status==="RELEASING"&&<span style={{fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:4,background:"#e5172c",color:"white"}}>LIVE</span>}
        </div>
        <div style={{position:"absolute",bottom:7,right:7,background:"rgba(0,0,0,.75)",borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:800,color:"#fbbf24"}}>⭐{anime.score}</div>
      </div>
      <div style={{fontSize:12,fontWeight:600,marginTop:7,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{anime.title}</div>
      <div style={{fontSize:10,color:"#7070a0",marginTop:3}}>{anime.year}{anime.year&&anime.studio?" · ":""}{anime.studio}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const[tab,setTab]=useState("trending");
  const[liveData,setLiveData]=useState({});
  const[homeLoading,setHomeLoading]=useState(true);
  const[query,setQuery]=useState("");
  const[searchRes,setSearchRes]=useState([]);
  const[searching,setSearching]=useState(false);
  const[anime,setAnime]=useState(null);
  const[animeLoading,setAnimeLoading]=useState(false);
  const[detTab,setDetTab]=useState("episodes");
  const[epPage,setEpPage]=useState(0);
  const[isDub,setIsDub]=useState(false);
  const[playEp,setPlayEp]=useState(null);
  const[embedUrls,setEmbedUrls]=useState([]);
  const[embedIdx,setEmbedIdx]=useState(0);
  const[embedLoading,setEmbedLoading]=useState(false);
  const timer=useRef(null);

  useEffect(()=>{
    (async()=>{
      setHomeLoading(true);
      const d=await alFetch(Q_HOME);
      if(d)setLiveData({
        trending:d.trending.media.map(normAL).filter(Boolean),
        top:d.top.media.map(normAL).filter(Boolean),
        popular:d.popular.media.map(normAL).filter(Boolean),
        airing:d.airing.media.map(normAL).filter(Boolean),
      });
      setHomeLoading(false);
    })();
  },[]);

  useEffect(()=>{
    if(!query.trim()){setSearchRes([]);return;}
    clearTimeout(timer.current);
    timer.current=setTimeout(async()=>{
      setSearching(true);
      const d=await alFetch(Q_SEARCH,{q:query});
      setSearchRes(d?.Page?.media?.map(normAL).filter(Boolean)||[]);
      setSearching(false);
    },450);
    return()=>clearTimeout(timer.current);
  },[query]);

  const openAnime=useCallback(async(a)=>{
    setAnime(a);setAnimeLoading(true);setPlayEp(null);setEpPage(0);setDetTab("episodes");
    setEmbedUrls([]);setEmbedIdx(0);
    window.scrollTo(0,0);
    const d=await alFetch(Q_INFO,{id:a.id});
    if(d?.Media)setAnime(normAL(d.Media));
    setAnimeLoading(false);
  },[]);

  const playEpisode=useCallback(async(a,ep,dub)=>{
    setPlayEp(ep);
    setEmbedLoading(true);
    setEmbedUrls([]);
    setEmbedIdx(0);
    const malId=await getMalId(a.id);
    const urls=buildEmbedUrls(a.id,malId,ep,dub);
    setEmbedUrls(urls);
    setEmbedLoading(false);
  },[]);

  const tabs=[
    {key:"trending",label:"🔥 Trending"},
    {key:"top",label:"⭐ Top Rated"},
    {key:"airing",label:"📺 Airing"},
    {key:"popular",label:"💥 Popular"},
  ];

  const totalEps=typeof anime?.episodes==="number"?anime.episodes:0;
  const epStart=epPage*EP_PAGE+1;
  const epEnd=Math.min(epStart+EP_PAGE-1,totalEps||epStart+EP_PAGE-1);
  const epPages=totalEps>EP_PAGE?Math.ceil(totalEps/EP_PAGE):1;

  return(
    <>
      <Head>
        <title>AniStream — Watch Anime</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0;}
          body{background:#0b0b0e;color:#f0f0f5;font-family:'Inter',sans-serif;min-height:100vh;}
          a{color:inherit;text-decoration:none;}
          @keyframes spin{to{transform:rotate(360deg);}}
          ::-webkit-scrollbar{width:5px;height:5px;}
          ::-webkit-scrollbar-track{background:#0b0b0e;}
          ::-webkit-scrollbar-thumb{background:#2a2a35;border-radius:3px;}
          @media(max-width:768px){
            .hide-mobile{display:none!important;}
            .mob-pad{padding:0 16px!important;}
            .grid-auto{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))!important;}
            .banner-height{height:220px!important;}
            .banner-info{left:16px!important;bottom:20px!important;max-width:260px!important;}
            .banner-title{font-size:18px!important;}
            .detail-pad{padding:48px 16px 24px!important;}
            .mob-tabs{display:flex!important;overflow-x:auto;gap:6px;padding:10px 16px;border-bottom:1px solid #2a2a35;}
            .mob-tabs::-webkit-scrollbar{height:0;}
          }
          @media(min-width:769px){.mob-tabs{display:none!important;}}
        `}</style>
      </Head>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(11,11,14,.96)",backdropFilter:"blur(16px)",borderBottom:"1px solid #2a2a35",display:"flex",alignItems:"center",gap:16,padding:"0 24px",height:60}}>
        <div style={{fontSize:20,fontWeight:900,cursor:"pointer",color:"white",flexShrink:0}}
          onClick={()=>{setAnime(null);setQuery("");setPlayEp(null);}}>
          Ani<span style={{color:"#e5172c"}}>Stream</span>
        </div>
        <div style={{flex:1,maxWidth:400,position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#7070a0",pointerEvents:"none"}}>🔍</span>
          <input style={{width:"100%",background:"#16161c",border:"1px solid #2a2a35",borderRadius:10,padding:"9px 16px 9px 38px",color:"white",fontSize:14,outline:"none",fontFamily:"inherit"}}
            placeholder="Search anime..."
            value={query}
            onChange={e=>setQuery(e.target.value)}
            onFocus={e=>e.target.style.borderColor="#e5172c"}
            onBlur={e=>e.target.style.borderColor="#2a2a35"}/>
        </div>
        <div style={{display:"flex",gap:4,marginLeft:"auto"}} className="hide-mobile">
          {tabs.map(t=>(
            <button key={t.key}
              style={{padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .15s",
                background:tab===t.key&&!anime&&!query?"#e5172c":"transparent",
                color:tab===t.key&&!anime&&!query?"white":"#7070a0"}}
              onClick={()=>{setTab(t.key);setAnime(null);setQuery("");}}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* MOBILE TABS */}
      <div className="mob-tabs" style={{display:"none"}}>
        {tabs.map(t=>(
          <button key={t.key}
            style={{flexShrink:0,padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"inherit",
              background:tab===t.key&&!anime&&!query?"#e5172c":"#16161c",
              color:tab===t.key&&!anime&&!query?"white":"#7070a0"}}
            onClick={()=>{setTab(t.key);setAnime(null);setQuery("");}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ DETAIL + PLAYER PAGE ══ */}
      {anime?(
        <div>
          <button onClick={()=>{setAnime(null);setPlayEp(null);}}
            style={{display:"inline-flex",alignItems:"center",gap:8,margin:"16px 0 0 24px",padding:"8px 16px",borderRadius:8,background:"#16161c",border:"1px solid #2a2a35",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            ← Back
          </button>

          {/* ── VIDEO PLAYER (shows when episode selected) ── */}
          {playEp&&(
            <div style={{margin:"16px 24px 0",borderRadius:14,overflow:"hidden",background:"#000",border:"1px solid #2a2a35"}}>
              {/* Server tabs */}
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"8px 12px",background:"#16161c",borderBottom:"1px solid #2a2a35",overflowX:"auto"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#7070a0",marginRight:4,flexShrink:0}}>SERVER</span>
                {embedUrls.map((_,i)=>(
                  <button key={i}
                    onClick={()=>setEmbedIdx(i)}
                    style={{flexShrink:0,padding:"5px 13px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:800,fontSize:11,border:"none",transition:"all .15s",
                      background:i===embedIdx?"#e5172c":"rgba(255,255,255,.08)",
                      color:i===embedIdx?"white":"rgba(255,255,255,.45)"}}>
                    S{i+1}
                  </button>
                ))}
                {embedIdx<embedUrls.length-1&&(
                  <button onClick={()=>setEmbedIdx(i=>i+1)}
                    style={{marginLeft:"auto",flexShrink:0,padding:"5px 10px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",color:"rgba(255,255,255,.4)"}}>
                    Black? → Next
                  </button>
                )}
                <span style={{fontSize:10,color:"#7070a0",marginLeft:8,flexShrink:0}}>
                  {anime.title} · Ep {playEp} · {isDub?"DUB":"SUB"}
                </span>
              </div>

              {/* Video iframe */}
              <div style={{position:"relative",paddingTop:"56.25%"}}>
                {embedLoading?(
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#000"}}>
                    <div style={{width:36,height:36,border:"3px solid #2a2a35",borderTopColor:"#e5172c",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                  </div>
                ):(
                  <iframe
                    key={`${embedIdx}-${anime.id}-${playEp}`}
                    srcDoc={embedUrls[embedIdx]?buildSrcdoc(embedUrls[embedIdx],anime.title,playEp):""}
                    style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}}
                    allowFullScreen
                    allow="autoplay;fullscreen;encrypted-media;picture-in-picture"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation"
                  />
                )}
              </div>

              {/* Sub/dub toggle under player */}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#16161c",borderTop:"1px solid #2a2a35",flexWrap:"wrap"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#7070a0"}}>Audio:</span>
                {[{k:false,l:"🇯🇵 Japanese Sub"},{k:true,l:"🇺🇸 English Dub"}].map(o=>(
                  <button key={String(o.k)}
                    onClick={()=>{setIsDub(o.k);playEpisode(anime,playEp,o.k);}}
                    style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"none",transition:"all .15s",
                      background:isDub===o.k?"#e5172c":"rgba(255,255,255,.08)",
                      color:isDub===o.k?"white":"rgba(255,255,255,.5)"}}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Banner */}
          <div style={{position:"relative",height:260,overflow:"hidden",marginTop:16}} className="banner-height">
            <img src={imgUrl(anime.banner||anime.cover,1200)} alt={anime.title}
              style={{width:"100%",height:"100%",objectFit:"cover"}}
              onError={e=>{e.target.style.opacity=0;}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,#0b0b0e 0%,transparent 60%)"}}/>
            <div style={{position:"absolute",bottom:-38,left:28,width:100,height:140,borderRadius:10,overflow:"hidden",border:"3px solid #2a2a35",boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>
              <img src={imgUrl(anime.cover,300)} alt={anime.title} style={{width:"100%",height:"100%",objectFit:"cover"}}
                onError={e=>{e.target.src=`https://placehold.co/300x420/16161c/666?text=?`;}}/>
            </div>
          </div>

          <div style={{padding:"50px 28px 28px"}} className="detail-pad">
            <div style={{fontSize:26,fontWeight:900,lineHeight:1.2,marginBottom:8}}>{anime.title}</div>
            {anime.titleNative&&<div style={{fontSize:13,color:"#7070a0",marginBottom:10}}>{anime.titleNative}</div>}

            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {[
                {t:`⭐ ${anime.score}`,bg:"rgba(251,191,36,.12)",c:"#fbbf24",b:"rgba(251,191,36,.25)"},
                {t:anime.format,bg:"#16161c",c:"#7070a0",b:"#2a2a35"},
                anime.year&&{t:String(anime.year),bg:"#16161c",c:"#7070a0",b:"#2a2a35"},
                anime.episodes!=="?"&&{t:`${anime.episodes} eps`,bg:"#16161c",c:"#7070a0",b:"#2a2a35"},
                anime.studio&&{t:anime.studio,bg:"#16161c",c:"#7070a0",b:"#2a2a35"},
                anime.status==="RELEASING"&&{t:"● AIRING",bg:"rgba(229,23,44,.1)",c:"#e5172c",b:"rgba(229,23,44,.25)"},
              ].filter(Boolean).map((p,i)=>(
                <span key={i} style={{display:"inline-flex",alignItems:"center",padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:p.bg,color:p.c,border:`1px solid ${p.b}`}}>{p.t}</span>
              ))}
            </div>

            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
              {anime.genres?.map(g=><span key={g} style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:600,background:"#16161c",border:"1px solid #2a2a35",color:"#7070a0"}}>{g}</span>)}
            </div>

            {anime.desc&&<p style={{fontSize:14,color:"rgba(255,255,255,.62)",lineHeight:1.72,marginBottom:22}}>{anime.desc}</p>}

            <div style={{display:"flex",gap:10,marginBottom:28,flexWrap:"wrap"}}>
              <button onClick={()=>playEpisode(anime,1,isDub)}
                style={{background:"#e5172c",color:"white",borderRadius:10,padding:"11px 24px",fontSize:14,fontWeight:700,cursor:"pointer",border:"none",display:"flex",alignItems:"center",gap:8,fontFamily:"inherit"}}>
                ▶ Play Episode 1
              </button>
              <button onClick={()=>setIsDub(d=>!d)}
                style={{background:"rgba(255,255,255,.1)",color:"white",borderRadius:10,padding:"11px 20px",fontSize:14,fontWeight:700,cursor:"pointer",border:"1px solid rgba(255,255,255,.15)",fontFamily:"inherit"}}>
                {isDub?"🇺🇸 DUB":"🇯🇵 SUB"}
              </button>
            </div>

            {animeLoading&&<div style={{width:28,height:28,border:"3px solid #2a2a35",borderTopColor:"#e5172c",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"20px 0"}}/>}

            {/* TABS */}
            <div style={{display:"flex",gap:4,borderBottom:"1px solid #2a2a35",marginBottom:22}}>
              {["episodes","characters","related"].map(t=>(
                <div key={t} onClick={()=>setDetTab(t)}
                  style={{padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer",
                    color:detTab===t?"#f0f0f5":"#7070a0",
                    borderBottom:`2px solid ${detTab===t?"#e5172c":"transparent"}`,transition:"all .15s"}}>
                  {t==="episodes"?"Episodes":t==="characters"?"Characters":"Related"}
                </div>
              ))}
            </div>

            {/* EPISODES */}
            {detTab==="episodes"&&(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                  <div style={{display:"flex",gap:4}}>
                    {[{k:false,l:"🇯🇵 SUB"},{k:true,l:"🇺🇸 DUB"}].map(o=>(
                      <button key={String(o.k)} onClick={()=>setIsDub(o.k)}
                        style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"none",
                          background:isDub===o.k?"#e5172c":"#16161c",color:isDub===o.k?"white":"#7070a0"}}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                  {totalEps>0&&<span style={{fontSize:12,color:"#7070a0"}}>{totalEps.toLocaleString()} episodes</span>}
                </div>

                {epPages>1&&(
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                    {Array.from({length:epPages},(_,i)=>i).map(i=>(
                      <button key={i} onClick={()=>setEpPage(i)}
                        style={{padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"none",
                          background:epPage===i?"#e5172c":"#16161c",color:epPage===i?"white":"#7070a0"}}>
                        {i*EP_PAGE+1}–{Math.min((i+1)*EP_PAGE,totalEps)}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}} className="grid-auto">
                  {Array.from({length:epEnd-epStart+1},(_,i)=>epStart+i).map(n=>{
                    const type=epType(anime.id,n);
                    const isPlaying=playEp===n;
                    return(
                      <div key={n} onClick={()=>playEpisode(anime,n,isDub)}
                        style={{borderRadius:10,overflow:"hidden",cursor:"pointer",border:`2px solid ${isPlaying?"#e5172c":"transparent"}`,transition:"all .15s",background:"#16161c"}}>
                        <div style={{position:"relative",aspectRatio:"16/9"}}>
                          <img src={imgUrl(anime.cover,300)} alt={`Ep ${n}`}
                            style={{width:"100%",height:"100%",objectFit:"cover"}}
                            onError={e=>{e.target.style.opacity=0;}}/>
                          <div style={{position:"absolute",inset:0,background:isPlaying?"rgba(229,23,44,.3)":"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(229,23,44,.9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white"}}>▶</div>
                          </div>
                          <div style={{position:"absolute",bottom:5,left:7,fontSize:9,fontWeight:800,color:"white",textShadow:"0 1px 4px rgba(0,0,0,.9)"}}>Ep {n}</div>
                          {type==="filler"&&<div style={{position:"absolute",top:4,right:4,padding:"2px 5px",borderRadius:4,fontSize:8,fontWeight:800,background:"rgba(239,68,68,.9)",color:"white"}}>FILLER</div>}
                          {type==="mixed"&&<div style={{position:"absolute",top:4,right:4,padding:"2px 5px",borderRadius:4,fontSize:8,fontWeight:800,background:"rgba(251,191,36,.9)",color:"#111"}}>MIXED</div>}
                        </div>
                        <div style={{padding:"6px 8px",fontSize:10,fontWeight:600,
                          color:isPlaying?"#e5172c":type==="filler"?"#ef4444":type==="mixed"?"#fbbf24":"#7070a0"}}>
                          {isPlaying?"▶ Now Playing":type==="filler"?"⚠ Filler":type==="mixed"?"◑ Mixed":`Episode ${n}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CHARACTERS */}
            {detTab==="characters"&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:12}}>
                {(anime.chars||[]).length===0
                  ?<div style={{textAlign:"center",padding:"40px 20px",color:"#7070a0",gridColumn:"1/-1"}}>No data yet</div>
                  :(anime.chars||[]).map(e=>(
                    <div key={e.node?.id} style={{textAlign:"center"}}>
                      <img src={imgUrl(e.node?.image?.large,150)} alt={e.node?.name?.full}
                        style={{width:64,height:64,borderRadius:"50%",objectFit:"cover",margin:"0 auto 6px",border:"2px solid #2a2a35",display:"block"}}
                        onError={ev=>{ev.target.src=`https://placehold.co/64/16161c/666?text=?`;}}/>
                      <div style={{fontSize:11,fontWeight:600,lineHeight:1.3}}>{e.node?.name?.full}</div>
                      <div style={{fontSize:10,color:"#7070a0"}}>{e.role}</div>
                    </div>
                  ))}
              </div>
            )}

            {/* RELATED */}
            {detTab==="related"&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:12}}>
                {(anime.recs||[]).length===0
                  ?<div style={{textAlign:"center",padding:"40px 20px",color:"#7070a0",gridColumn:"1/-1"}}>No recommendations</div>
                  :(anime.recs||[]).map(r=>{
                    const m=r.mediaRecommendation;
                    return(
                      <div key={m.id} style={{cursor:"pointer"}}
                        onClick={()=>openAnime({id:m.id,title:m.title?.english||m.title?.romaji||"",cover:m.coverImage?.large||"",score:(m.averageScore/10).toFixed(1),format:"TV",status:"UNKNOWN",genres:[],episodes:"?"})}>
                        <div style={{position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"2/3",background:"#16161c"}}>
                          <img src={imgUrl(m.coverImage?.large,200)} alt={m.title?.romaji}
                            style={{width:"100%",height:"100%",objectFit:"cover"}}
                            onError={e=>{e.target.style.opacity=0;}}/>
                          <div style={{position:"absolute",bottom:7,right:7,background:"rgba(0,0,0,.75)",borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:800,color:"#fbbf24"}}>⭐{m.averageScore?(m.averageScore/10).toFixed(1):"?"}</div>
                        </div>
                        <div style={{fontSize:11,fontWeight:600,marginTop:6,lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{m.title?.english||m.title?.romaji}</div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

      ):(
        /* ══ HOME ══ */
        <div>
          {/* Hero Banner */}
          {!query&&liveData.trending?.[0]&&(()=>{
            const h=liveData.trending[0];
            return(
              <div style={{position:"relative",height:400,overflow:"hidden"}} className="banner-height">
                <img src={imgUrl(h.banner||h.cover,1400)} alt={h.title}
                  style={{width:"100%",height:"100%",objectFit:"cover"}}
                  onError={e=>{e.target.style.opacity=0;}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to right,rgba(11,11,14,.95) 35%,transparent 70%),linear-gradient(to top,rgba(11,11,14,1) 0%,transparent 50%)"}}/>
                <div style={{position:"absolute",bottom:36,left:36,maxWidth:460}} className="banner-info">
                  <div style={{fontSize:30,fontWeight:900,lineHeight:1.15,marginBottom:10}} className="banner-title">{h.title}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                    <span style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"rgba(251,191,36,.12)",color:"#fbbf24",border:"1px solid rgba(251,191,36,.25)"}}>⭐ {h.score}</span>
                    <span style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"#16161c",color:"#7070a0",border:"1px solid #2a2a35"}}>{h.format}</span>
                    {h.status==="RELEASING"&&<span style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"rgba(229,23,44,.12)",color:"#e5172c",border:"1px solid rgba(229,23,44,.25)"}}>● AIRING</span>}
                  </div>
                  <p style={{fontSize:13,color:"rgba(255,255,255,.62)",lineHeight:1.6,marginBottom:18,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{h.desc}</p>
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>openAnime(h)}
                      style={{background:"#e5172c",color:"white",borderRadius:10,padding:"11px 24px",fontSize:14,fontWeight:700,cursor:"pointer",border:"none",fontFamily:"inherit"}}>
                      ▶ Play Now
                    </button>
                    <button onClick={()=>openAnime(h)}
                      style={{background:"rgba(255,255,255,.1)",color:"white",borderRadius:10,padding:"11px 20px",fontSize:14,fontWeight:700,cursor:"pointer",border:"1px solid rgba(255,255,255,.15)",fontFamily:"inherit"}}>
                      ℹ More Info
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Search results */}
          {query.trim()&&(
            <div style={{padding:"28px 24px 40px"}} className="mob-pad">
              <div style={{fontSize:18,fontWeight:800,marginBottom:16}}>
                {searching?"Searching…":`"${query}" — ${searchRes.length} results`}
              </div>
              {searching&&<div style={{width:28,height:28,border:"3px solid #2a2a35",borderTopColor:"#e5172c",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"40px auto"}}/>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:14}} className="grid-auto">
                {searchRes.map(a=><AnimeCard key={a.id} anime={a} onClick={()=>openAnime(a)}/>)}
              </div>
            </div>
          )}

          {/* Home sections */}
          {!query.trim()&&tabs.map(t=>{
            const items=liveData[t.key]||[];
            if(!items.length&&!homeLoading)return null;
            return(
              <div key={t.key} style={{padding:"28px 24px 32px"}} className="mob-pad">
                <div style={{fontSize:18,fontWeight:800,marginBottom:16}}>{t.label}</div>
                {homeLoading&&!items.length&&<div style={{width:28,height:28,border:"3px solid #2a2a35",borderTopColor:"#e5172c",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"40px auto"}}/>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:14}} className="grid-auto">
                  {items.map(a=><AnimeCard key={a.id} anime={a} onClick={()=>openAnime(a)}/>)}
                </div>
              </div>
            );
          })}
          <div style={{height:60}}/>
        </div>
      )}
    </>
  );
}
