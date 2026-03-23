import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

// --- Helpers ---
function imgUrl(url) {
  if (!url) return "https://placehold.co/400x600/16161c/666?text=No+Image";
  // Uses a proxy to bypass hotlink protection from AniList/external sites
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&output=webp`;
}

async function alFetch(query, variables = {}) {
  const body = JSON.stringify({ query, variables });
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };
  try {
    const r = await fetch("https://graphql.anilist.co", { method: "POST", headers, body });
    const j = await r.json();
    return j.data;
  } catch (e) {
    console.error("AniList Error", e);
    return null;
  }
}

// --- Video embed system ---
function buildEmbedUrls(id, malId, epNum, isDub) {
  const sub = isDub ? "dub" : "sub";
  const searchId = malId || id;
  // Ordered by reliability
  return [
    `https://vidlink.pro/anime/${searchId}/${epNum}?primaryColor=e5172c`,
    `https://vidsrc.cc/v2/embed/anime/${searchId}/${epNum}?translation=${sub}`,
    `https://embed.su/embed/anime/${searchId}/${epNum}`,
    `https://vidsrc.me/embed/anime?id=${searchId}&e=${epNum}`,
    `https://2embed.skin/embed/anime/stream?id=${searchId}&e=${epNum}&s=${sub}`,
  ];
}

// --- Queries ---
const AL_FIELDS = `id idMal title{romaji english native} coverImage{extraLarge large color} bannerImage description averageScore episodes status seasonYear format studios(isMain:true){nodes{name}}`;
const Q_HOME = `query{trending:Page(perPage:12){media(sort:TRENDING_DESC,type:ANIME,isAdult:false){${AL_FIELDS}}}popular:Page(perPage:12){media(sort:POPULARITY_DESC,type:ANIME,isAdult:false){${AL_FIELDS}}}}`;
const Q_SEARCH = `query($q:String){Page(perPage:20){media(search:$q,type:ANIME,isAdult:false){${AL_FIELDS}}}}`;

export default function Home() {
  const [data, setData] = useState({ trending: [], popular: [] });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [playEp, setPlayEp] = useState(1);
  const [isDub, setIsDub] = useState(false);
  const [srvIdx, setSrvIdx] = useState(0);

  useEffect(() => {
    alFetch(Q_HOME).then(d => d && setData({ trending: d.trending.media, popular: d.popular.media }));
  }, []);

  const search = async (val) => {
    setQuery(val);
    if (val.length > 2) {
      const d = await alFetch(Q_SEARCH, { q: val });
      if (d) setResults(d.Page.media);
    } else {
      setResults([]);
    }
  };

  const currentUrls = selected ? buildEmbedUrls(selected.id, selected.idMal, playEp, isDub) : [];

  return (
    <div style={{ backgroundColor: '#0b0b0e', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>AniStream</title></Head>
      
      {/* Header */}
      <nav style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <h1 style={{ color: '#e5172c', margin: 0, cursor: 'pointer' }} onClick={() => {setSelected(null); setQuery("");}}>AniStream</h1>
        <input 
          style={{ background: '#16161c', border: '1px solid #333', color: '#fff', padding: '10px', borderRadius: '8px', flex: 1 }}
          placeholder="Search for anime..."
          value={query}
          onChange={(e) => search(e.target.value)}
        />
      </nav>

      <main style={{ padding: '20px' }}>
        {!selected ? (
          <div>
            <h2>{query ? "Search Results" : "Trending Now"}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
              {(query ? results : data.trending).map(anime => (
                <div key={anime.id} onClick={() => setSelected(anime)} style={{ cursor: 'pointer' }}>
                  <img src={imgUrl(anime.coverImage.extraLarge)} style={{ width: '100%', borderRadius: '8px', aspectRatio: '2/3', objectFit: 'cover' }} />
                  <p style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '8px' }}>{anime.title.english || anime.title.romaji}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setSelected(null)} style={{ background: '#222', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', marginBottom: '20px', cursor: 'pointer' }}>← Back</button>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
              <div style={{ flex: '1 1 600px' }}>
                <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                  <iframe 
                    src={currentUrls[srvIdx]} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allowFullScreen
                    referrerPolicy="no-referrer"
                    sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
                  />
                </div>
                
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  {currentUrls.map((_, i) => (
                    <button key={i} onClick={() => setSrvIdx(i)} style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: srvIdx === i ? '#e5172c' : '#222', color: '#fff' }}>
                      Server {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: '1 1 300px' }}>
                <h2 style={{ margin: '0 0 10px 0' }}>{selected.title.english || selected.title.romaji}</h2>
                <p style={{ color: '#aaa', fontSize: '14px' }}>Episode {playEp}</p>
                
                <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
                   <button onClick={() => setIsDub(false)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: 'none', background: !isDub ? '#e5172c' : '#222', color: '#fff' }}>SUB</button>
                   <button onClick={() => setIsDub(true)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: 'none', background: isDub ? '#e5172c' : '#222', color: '#fff' }}>DUB</button>
                </div>

                <div style={{ height: '300px', overflowY: 'auto', background: '#16161c', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {[...Array(selected.episodes || 12)].map((_, i) => (
                      <button key={i} onClick={() => setPlayEp(i + 1)} style={{ padding: '10px', border: 'none', borderRadius: '4px', background: playEp === i + 1 ? '#e5172c' : '#333', color: '#fff', cursor: 'pointer' }}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
