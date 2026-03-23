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
async function getMalId(anilistId) {
  try {
    const r = await alFetch("query($id:Int){Media(id:$id,type:ANIME){idMal}}", { id: anilistId });
    return r?.Media?.idMal || null;
  } catch { return null; }
}

// FIX: Use malId when available (required by most embed providers), fallback to anilistId
function buildEmbedUrls(anilistId, malId, epNum, isDub) {
  const id  = malId || anilistId;  // prefer MAL ID — most providers need it
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

// FIX: Use wsrv.nl proxy correctly — it works in browser without Next/Image component
function imgUrl(url, w=300) {
  if (!url) return "";
  // wsrv.nl is a reliable image proxy that handles CORS for browser <img> tags
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
          :<img
              src={imgUrl(anime.cover, 300)}
              alt={anime.title}
              loading="lazy"
              style={{width:"100%",height:"100%",objectFit:"cover"}}
              onError={()=>setErr(true)}
            />
        }
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
    // FIX: fetch MAL ID fresh each time so embed URLs are always correct
    const malId = a.malId || await getMalId(a.id);
    const urls=buildEmbedUrls(a.id, malId, ep, dub);
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

  // Hero banner for home page (first trending item)
  const hero = liveData.trending?.[0];

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

          {/* ── VIDEO PLAYER ── */}
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

              {/* FIX: Direct iframe src instead of srcdoc — srcdoc blocks many embed providers */}
              <div style={{position:"relative",paddingTop:"56.25%"}}>
                {embedLoading?(
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#000"}}>
                    <div style={{width:36,height:36,border:"3px solid #2a2a35",borderTopColor:"#e5172c",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                  </div>
                ):(
                  <iframe
                    key={`${embedIdx}-${anime.id}-${playEp}`}
                    src={embedUrls[embedIdx] || ""}
                    style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none",background:"#000"}}
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    referrerPolicy="no-referrer-when-downgrade"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation"
                  />
                )}
              </div>

              {/* Sub/dub toggle */}
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
                anime.status==="RELEASING"&&{t:"● AIRING",bg:"rgba(229,23,44,.12)",c:"#e5172c",b:"rgba(229,23,44,.25)"},
              ].filter(Boolean).map((b,i)=>(
                <span key={i} style={{fontSize:12,fontWeight:700,padding:"4px 10px",borderRadius:6,background:b.bg,color:b.c,border:`1px solid $