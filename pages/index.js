import React, { useState, useEffect } from 'react';
import Head from 'next/head';

// Switching to the advanced Anilist provider for better images and data
const API = "https://consumet-api-fawn.vercel.app/meta/anilist";

export default function App() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [searchRes, setSearchRes] = useState([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState('home'); 
  const [selected, setSelected] = useState(null);
  const [info, setInfo] = useState({});
  const [activeEp, setActiveEp] = useState(null);

  useEffect(() => { 
    // Fetching high-quality data
    fetch(`${API}/trending`).then(r => r.json()).then(d => setTrending(d.results || []));
    fetch(`${API}/popular`).then(r => r.json()).then(d => setPopular(d.results || []));
  }, []);

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.trim().length > 2) {
      const r = await fetch(`${API}/${val}`);
      const d = await r.json();
      setSearchRes(d.results || []);
    } else {
      setSearchRes([]);
    }
  };

  const selectAnime = async (anime) => {
    setSelected(anime);
    setView('details');
    setInfo({}); 
    // Fetch full info including episodes
    const r = await fetch(`${API}/info/${anime.id}`);
    const d = await r.json();
    setInfo(d);
    if (d.episodes?.[0]) setActiveEp(d.episodes[0]);
  };

  const AnimeCard = ({ a }) => (
    <div onClick={() => selectAnime(a)} style={{ flex: '0 0 auto', width: '150px', cursor: 'pointer' }}>
      <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: '18px', overflow: 'hidden', background: '#1c1d21', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
        <img 
          src={a.image} 
          alt={a.title?.english || a.title?.romaji}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>
      <p style={{ fontSize: '13px', marginTop: '10px', fontWeight: '600', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {a.title?.english || a.title?.romaji}
      </p>
      <span style={{ fontSize: '10px', color: '#ff1e30', fontWeight: 'bold' }}>{a.type || 'TV'} • {a.releaseDate || 'N/A'}</span>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0b0c0e', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
      <Head><title>AniStream — Next Gen</title></Head>

      <div style={{ padding: '20px' }}>
        {/* Modern Header & Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 onClick={() => {setView('home'); setQuery("");}} style={{ color: '#ff1e30', margin: 0, fontWeight: '900', letterSpacing: '-1px' }}>AniStream</h2>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <span style={{ fontSize: '22px' }}>🔔</span>
                    <span style={{ fontSize: '22px' }}>👤</span>
                </div>
            </div>
            <input 
                type="text" 
                placeholder="Search anime, movies..." 
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: '100%', background: '#1c1d21', border: 'none', borderRadius: '12px', padding: '14px', color: 'white', outline: 'none' }}
            />
        </div>

        {query.length > 2 ? (
            <div>
                <h3 style={{ marginBottom: '15px' }}>Search Results</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                    {searchRes.map(a => <AnimeCard key={a.id} a={a} />)}
                </div>
            </div>
        ) : view === 'home' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>🔥 Trending</h3>
                <span style={{ color: '#ff1e30', fontSize: '12px' }}>See all</span>
            </div>
            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '25px', scrollbarWidth: 'none' }}>
              {trending.map(a => <AnimeCard key={a.id} a={a} />)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>✨ Most Popular</h3>
                <span style={{ color: '#ff1e30', fontSize: '12px' }}>See all</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
              {popular.map(a => <AnimeCard key={a.id} a={a} />)}
            </div>
          </>
        ) : (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <button onClick={() => setView('home')} style={{ background: '#1c1d21', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', marginBottom: '20px' }}>← Back</button>
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '20px', overflow: 'hidden', border: '1px solid #333' }}>
              <iframe 
                src={`https://vidsrc.to/embed/anime/${selected?.id}/${activeEp?.number || 1}`} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                allowFullScreen 
              />
            </div>
            <h2 style={{ marginTop: '20px' }}>{selected?.title?.english || selected?.title?.romaji}</h2>
            <p style={{ color: '#999', fontSize: '14px' }}>{info.description?.replace(/<[^>]*>?/gm, '').substring(0, 150)}...</p>
            
            <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Episodes</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '10px' }}>
              {info.episodes?.map(e => (
                <button key={e.id} onClick={() => setActiveEp(e)} style={{ padding: '15px 5px', background: activeEp?.id === e.id ? '#ff1e30' : '#1c1d21', border: 'none', color: 'white', borderRadius: '10px', fontWeight: 'bold' }}>{e.number}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
