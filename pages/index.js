import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://consumet-api-fawn.vercel.app/anime/gogoanime";
const SERVERS = [
  { id: 1, name: "Server: Vidsrc", url: "https://vidsrc.to/embed/anime/" },
  { id: 2, name: "Server: Gogo", url: "https://play.embtaku.pro/streaming.php?id=" },
  { id: 3, name: "Server: Vidlink", url: "https://vidlink.pro/anime/" }
];

export default function App() {
  const [sections, setSections] = useState({ trending: [], airing: [] });
  const [view, setView] = useState('home'); 
  const [selected, setSelected] = useState(null);
  const [info, setInfo] = useState({});
  const [activeEp, setActiveEp] = useState(null);
  const [activeSrv, setActiveSrv] = useState(SERVERS[0]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { 
    Promise.all([
      fetch(`${API}/top-airing`).then(r => r.json()),
      fetch(`${API}/recent-episodes`).then(r => r.json())
    ]).then(([top, recent]) => {
      setSections({ trending: top.results || [], airing: recent.results || [] });
    });
  }, []);

  const selectAnime = async (anime) => {
    setSelected(anime);
    setView('details');
    const r = await fetch(`${API}/info/${anime.id}`);
    const d = await r.json();
    setInfo(d);
    if (d.episodes?.[0]) setActiveEp(d.episodes[0]);
  };

  const getNextEpTime = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const now = new Date();
    const nextDate = new Date();
    nextDate.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7)); 
    return `Next Episode: ${days[nextDate.getDay()]} at 10:00 PM`;
  };

  return (
    <div style={{ backgroundColor: '#0b0c0e', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>AniStream — Watch Anime</title></Head>

      {/* Navigation */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', sticky: 'top', background: '#0b0c0e', zIndex: 10 }}>
        <h2 style={{ color: '#ff1e30', margin: 0, fontWeight: '900', cursor: 'pointer' }} onClick={() => setView('home')}>AniStream</h2>
        <div style={{ background: '#1c1d21', padding: '10px 15px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer' }} onClick={() => setShowFilters(true)}>🔍 Search</div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {view === 'home' && (
          <>
            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', overflowX: 'auto', paddingBottom: '10px' }}>
              {["🔥 Trending", "⭐ Top Rated", "📺 Airing", "💥 Popular"].map((t, i) => (
                <button key={t} style={{ background: i === 0 ? '#ff1e30' : '#1c1d21', color: 'white', border: 'none', padding: '12px 22px', borderRadius: '25px', fontWeight: '600', whiteSpace: 'nowrap' }}>{t}</button>
              ))}
            </div>

            {/* Trending Section */}
            <h3 style={{ marginBottom: '15px', fontSize: '20px' }}>🔥 Trending Now</h3>
            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', marginBottom: '35px', paddingBottom: '10px' }}>
              {sections.trending.map(a => (
                <div key={a.id} onClick={() => selectAnime(a)} style={{ flex: '0 0 auto', width: '150px', cursor: 'pointer' }}>
                  <img src={`https://wsrv.nl/?url=${encodeURIComponent(a.image)}&w=300`} style={{ width: '100%', borderRadius: '15px', aspectRatio: '2/3', objectFit: 'cover' }} />
                  <p style={{ fontSize: '13px', marginTop: '8px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                </div>
              ))}
            </div>

            {/* Recent Section */}
            <h3 style={{ marginBottom: '15px', fontSize: '20px' }}>📺 Recently Released</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
              {sections.airing.map(a => (
                <div key={a.id} onClick={() => selectAnime(a)} style={{ cursor: 'pointer' }}>
                  <img src={`https://wsrv.nl/?url=${encodeURIComponent(a.image)}&w=300`} style={{ width: '100%', borderRadius: '15px', aspectRatio: '2/3', objectFit: 'cover' }} />
                  <p style={{ fontSize: '13px', fontWeight: '600', marginTop: '10px' }}>{a.title}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'details' && selected && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <button onClick={() => setView('home')} style={{ background: '#1c1d21', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', marginBottom: '20px' }}>← Back</button>
            
            {/* Video Player */}
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '20px', overflow: 'hidden', border: '1px solid #333' }}>
              <iframe 
                src={activeSrv.id === 2 ? `${activeSrv.url}${activeEp?.id}` : `${activeSrv.url}${selected.id}/${activeEp?.number}`} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                allowFullScreen 
              />
            </div>

            {/* Server Selector */}
            <div style={{ display: 'flex', gap: '8px', margin: '15px 0', overflowX: 'auto', paddingBottom: '5px' }}>
              {SERVERS.map(s => (
                <button key={s.id} onClick={() => setActiveSrv(s)} style={{ background: activeSrv.id === s.id ? '#ff1e30' : '#1c1d21', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{s.name}</button>
              ))}
            </div>

            {/* Countdown Alert */}
            {info.status === "Releasing" && (
              <div style={{ background: 'rgba(255, 30, 48, 0.1)', border: '1px solid #ff1e30', color: '#ff1e30', padding: '12px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                ⏰ {getNextEpTime()}
              </div>
            )}

            <h2 style={{ marginTop: '20px' }}>{selected.title}</h2>
            
            {/* Episodes Grid */}
            <p style={{ color: '#888', fontSize: '14px', margin: '20px 0 10px' }}>Episodes (Yellow = Filler):</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '10px' }}>
              {info.episodes?.map(e => (
                <button 
                  key={e.id} 
                  onClick={() => setActiveEp(e)}
                  style={{ 
                    padding: '15px 5px', borderRadius: '10px', border: 'none',
                    background: activeEp?.id === e.id ? '#ff1e30' : (e.isFiller ? '#f1c40f' : '#1c1d21'),
                    color: e.isFiller && activeEp?.id !== e.id ? '#000' : 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {e.number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
