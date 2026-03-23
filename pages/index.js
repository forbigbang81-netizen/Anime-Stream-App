import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://consumet-api-fawn.vercel.app/anime/gogoanime";
const SERVERS = [
  { id: 1, name: "Vidsrc (Ads-Free)", url: "https://vidsrc.to/embed/anime/" },
  { id: 2, name: "Gogo Server", url: "https://play.embtaku.pro/streaming.php?id=" },
  { id: 3, name: "Vidlink", url: "https://vidlink.pro/anime/" }
];

export default function App() {
  const [sections, setSections] = useState({ trending: [], airing: [] });
  const [bookmarks, setBookmarks] = useState([]);
  const [view, setView] = useState('home'); 
  const [selected, setSelected] = useState(null);
  const [info, setInfo] = useState({});
  const [activeEp, setActiveEp] = useState(null);
  const [activeSrv, setActiveSrv] = useState(SERVERS[0]);

  // Load Home Data & Bookmarks
  useEffect(() => { 
    const saved = JSON.parse(localStorage.getItem('aniBookmarks') || '[]');
    setBookmarks(saved);

    Promise.all([
      fetch(`${API}/top-airing`).then(r => r.json()),
      fetch(`${API}/recent-episodes`).then(r => r.json())
    ]).then(([top, recent]) => {
      setSections({ trending: top.results || [], airing: recent.results || [] });
    });
  }, []);

  const toggleBookmark = (anime) => {
    let updated;
    if (bookmarks.find(b => b.id === anime.id)) {
      updated = bookmarks.filter(b => b.id !== anime.id);
    } else {
      updated = [...bookmarks, anime];
    }
    setBookmarks(updated);
    localStorage.setItem('aniBookmarks', JSON.stringify(updated));
  };

  const selectAnime = async (anime) => {
    setSelected(anime);
    setView('details');
    // Important: Fetching full info ensures correct episode list for THAT specific anime
    const r = await fetch(`${API}/info/${anime.id}`);
    const d = await r.json();
    setInfo(d);
    if (d.episodes?.[0]) setActiveEp(d.episodes[0]);
  };

  const getNextEpTime = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const now = new Date();
    return `Next Episode: ${days[(now.getDay() + 1) % 7]} at 9:00 PM`;
  };

  const Card = ({ a }) => (
    <div style={{ flex: '0 0 auto', width: '150px', cursor: 'pointer', position: 'relative' }}>
      <div onClick={() => selectAnime(a)}>
        <img src={`https://wsrv.nl/?url=${encodeURIComponent(a.image)}&w=300`} style={{ width: '100%', borderRadius: '15px', aspectRatio: '2/3', objectFit: 'cover' }} />
        <p style={{ fontSize: '13px', marginTop: '8px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</p>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); toggleBookmark(a); }} 
        style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', border: 'none', color: bookmarks.find(b => b.id === a.id) ? '#ff1e30' : 'white', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}
      >
        ❤
      </button>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0b0c0e', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '50px' }}>
      <Head><title>AniStream — Anime Central</title></Head>

      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#ff1e30', margin: 0, fontWeight: '900', cursor: 'pointer' }} onClick={() => setView('home')}>AniStream</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
            <span style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => setView('bookmarks')}>❤</span>
            <span style={{ fontSize: '20px' }}>🔍</span>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {view === 'home' && (
          <>
            <h3 style={{ marginBottom: '15px' }}>🔥 Trending Now</h3>
            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', marginBottom: '35px', paddingBottom: '10px' }}>
              {sections.trending.map(a => <Card key={a.id} a={a} />)}
            </div>

            <h3 style={{ marginBottom: '15px' }}>📺 Just Released</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
              {sections.airing.map(a => <Card key={a.id} a={a} />)}
            </div>
          </>
        )}

        {view === 'bookmarks' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', marginRight: '10px' }}>←</button>
                <h3 style={{ margin: 0 }}>My Watchlist</h3>
            </div>
            {bookmarks.length === 0 ? <p style={{ color: '#666' }}>No bookmarks yet.</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                    {bookmarks.map(a => <Card key={a.id} a={a} />)}
                </div>
            )}
          </>
        )}

        {view === 'details' && selected && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <button onClick={() => setView('home')} style={{ background: '#1c1d21', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', marginBottom: '20px' }}>← Back</button>
            
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '20px', overflow: 'hidden', border: '1px solid #333' }}>
              <iframe 
                src={activeSrv.id === 2 ? `${activeSrv.url}${activeEp?.id}` : `${activeSrv.url}${selected.id}/${activeEp?.number}`} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                allowFullScreen 
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto' }}>
              {SERVERS.map(s => (
                <button key={s.id} onClick={() => setActiveSrv(s)} style={{ background: activeSrv.id === s.id ? '#ff1e30' : '#1c1d21', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{s.name}</button>
              ))}
              <button onClick={() => window.open(`https://gogohd.net/download?id=${activeEp?.id}`)} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>📥 Download (SPlayer)</button>
            </div>

            {info.status === "Releasing" && (
              <div style={{ background: 'rgba(255, 30, 48, 0.1)', border: '1px solid #ff1e30', color: '#ff1e30', padding: '12px', borderRadius: '12px', marginTop: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                ⏰ {getNextEpTime()}
              </div>
            )}

            <h2 style={{ marginTop: '20px', marginBottom: '10px' }}>{selected.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '10px', marginTop: '20px' }}>
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
