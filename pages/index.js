import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://consumet-api-fawn.vercel.app/anime/gogoanime";
const SERVERS = [
  { id: 1, name: "Vidsrc", url: "https://vidsrc.to/embed/anime/" },
  { id: 2, name: "Gogo", url: "https://play.embtaku.pro/streaming.php?id=" },
  { id: 3, name: "Vidlink", url: "https://vidlink.pro/anime/" }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [homeData, setHomeData] = useState([]);
  const [view, setView] = useState('home'); 
  const [selected, setSelected] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [activeEp, setActiveEp] = useState(null);
  const [activeSrv, setActiveSrv] = useState(SERVERS[0]);

  useEffect(() => { 
    fetch(`${API}/top-airing`).then(r => r.json()).then(d => setHomeData(d.results || [])); 
  }, []);

  const search = async (q) => {
    setQuery(q);
    if (q.length > 2) {
      const r = await fetch(`${API}/${q}`);
      const d = await r.json();
      setResults(d.results || []);
      setView('search');
    }
  };

  const selectAnime = async (anime) => {
    setSelected(anime);
    setView('details');
    const r = await fetch(`${API}/info/${anime.id}`);
    const d = await r.json();
    setEpisodes(d.episodes || []);
    if (d.episodes?.[0]) setActiveEp(d.episodes[0]);
  };

  const Card = ({ a }) => (
    <div onClick={() => selectAnime(a)} style={{ cursor: 'pointer', textAlign: 'center' }}>
      <img 
        src={`https://wsrv.nl/?url=${encodeURIComponent(a.image)}&w=250&output=webp`} 
        style={{ width: '100%', borderRadius: '12px', aspectRatio: '2/3', objectFit: 'cover', background: '#1a1a1a', border: '1px solid #222' }} 
      />
      <p style={{ fontSize: '13px', marginTop: '8px', fontWeight: '600', height: '2.5em', overflow: 'hidden', color: '#eee' }}>{a.title}</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <Head><title>AniStream</title></Head>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', alignItems: 'center', maxWidth: '1200px', margin: '0 auto 30px' }}>
        <h2 style={{ color: '#ff1e30', margin: 0, cursor: 'pointer', fontSize: '24px', fontWeight: '800' }} onClick={() => setView('home')}>AniStream</h2>
        <input placeholder="Search anime..." onChange={(e) => search(e.target.value)} style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', border: '1px solid #333', background: '#121212', color: 'white', outline: 'none' }} />
      </div>

      {view === 'details' && selected && (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <button onClick={() => setView('home')} style={{ background: '#222', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '10px', marginBottom: '20px', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
          
          <div style={{ background: '#000', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px', position: 'relative', paddingTop: '56.25%', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <iframe 
              src={activeSrv.id === 2 ? `${activeSrv.url}${activeEp?.id}` : `${activeSrv.url}${selected.id}/${activeEp?.number}`} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '10px' }}>
            {SERVERS.map(s => (
              <button key={s.id} onClick={() => setActiveSrv(s)} style={{ background: activeSrv.id === s.id ? '#ff1e30' : '#222', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{s.name}</button>
            ))}
          </div>

          <h1 style={{ fontSize: '26px', marginBottom: '25px', color: '#fff' }}>{selected.title}</h1>
          <p style={{ color: '#888', marginBottom: '15px', fontSize: '14px' }}>Episodes (Yellow = Filler):</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))', gap: '12px' }}>
            {episodes.map(e => (
              <button 
                key={e.id} 
                onClick={() => setActiveEp(e)}
                style={{ 
                  padding: '15px 5px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: activeEp?.id === e.id ? '#ff1e30' : (e.isFiller ? '#fbc02d' : '#1a1a1a'),
                  color: (e.isFiller && activeEp?.id !== e.id) ? '#000' : 'white',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                {e.number}
              </button>
            ))}
          </div>
        </div>
      )}

      {(view === 'home' || view === 'search') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '25px', maxWidth: '1200px', margin: '0 auto' }}>
          {(view === 'search' ? results : homeData).map(a => <Card key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}
