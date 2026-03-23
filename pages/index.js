import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://consumet-api-fawn.vercel.app/anime/gogoanime";
const SERVERS = [
  { id: 1, name: "Gogo", url: "https://play.embtaku.pro/streaming.php?id=" },
  { id: 2, name: "Alpha", url: "https://play.taku.pro/streaming.php?id=" },
  { id: 3, name: "Beta", url: "https://play.embtaku.pro/streaming.php?id=" },
  { id: 4, name: "Stream", url: "https://www.gogovideo.cc/streaming.php?id=" }
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

  useEffect(() => { fetch(`${API}/top-airing`).then(r => r.json()).then(d => setHomeData(d.results || [])); }, []);

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
      <img src={a.image} style={{ width: '100%', borderRadius: '8px', aspectRatio: '2/3', objectFit: 'cover', backgroundColor: '#222' }} />
      <p style={{ fontSize: '12px', marginTop: '5px', height: '3em', overflow: 'hidden' }}>{a.title}</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0b0b0b', color: 'white', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <Head><title>AniStream</title></Head>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <h2 style={{ color: '#e51e2a', margin: 0 }}>AniStream</h2>
        <input placeholder="Search..." onChange={(e) => search(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '5px', border: 'none', background: '#222', color: 'white' }} />
      </div>

      {view === 'details' && selected && (
        <div>
          <button onClick={() => setView('home')} style={{ background: '#333', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', marginBottom: '15px' }}>← Back</button>
          <div style={{ background: '#000', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', position: 'relative', paddingTop: '56.25%' }}>
            <iframe 
              src={`${activeSrv.url}${activeEp?.id}`} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
            />
          </div>
          <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '15px' }}>
            {SERVERS.map(s => (
              <button key={s.id} onClick={() => setActiveSrv(s)} style={{ background: activeSrv.id === s.id ? '#e51e2a' : '#222', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '12px' }}>{s.name}</button>
            ))}
          </div>
          <h3 style={{ margin: '10px 0' }}>{selected.title}</h3>
          <p style={{ fontSize: '14px', color: '#aaa' }}>Episodes (Yellow = Filler):</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: '8px' }}>
            {episodes.map(e => (
              <button 
                key={e.id} 
                onClick={() => setActiveEp(e)}
                style={{ 
                  padding: '10px', 
                  borderRadius: '5px', 
                  border: 'none', 
                  background: activeEp?.id === e.id ? '#e51e2a' : (e.isFiller ? '#f1c40f' : '#222'),
                  color: (e.isFiller && activeEp?.id !== e.id) ? '#000' : 'white',
                  fontWeight: 'bold'
                }}
              >
                {e.number}
              </button>
            ))}
          </div>
        </div>
      )}

      {(view === 'home' || view === 'search') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '15px' }}>
          {(view === 'search' ? results : homeData).map(a => <Card key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}
