import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://consumet-api-fawn.vercel.app/anime/gogoanime";
const SERVERS = [
  { id: 1, name: "Vidsrc", url: "https://vidsrc.to/embed/anime/" },
  { id: 2, name: "Gogo", url: "https://play.embtaku.pro/streaming.php?id=" },
  { id: 3, name: "Vidlink", url: "https://vidlink.pro/anime/" }
];

export default function App() {
  const [sections, setSections] = useState({ trending: [], airing: [] });
  const [searchRes, setSearchRes] = useState([]);
  const [query, setQuery] = useState("");
  const [bookmarks, setBookmarks] = useState([]);
  const [view, setView] = useState('home'); 
  const [selected, setSelected] = useState(null);
  const [info, setInfo] = useState({});
  const [activeEp, setActiveEp] = useState(null);
  const [activeSrv, setActiveSrv] = useState(SERVERS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    const saved = JSON.parse(localStorage.getItem('aniBookmarks') || '[]');
    setBookmarks(saved);
    fetchHome();
  }, []);

  const fetchHome = async () => {
    try {
      const [top, recent] = await Promise.all([
        fetch(`${API}/top-airing`).then(r => r.json()),
        fetch(`${API}/recent-episodes`).then(r => r.json())
      ]);
      setSections({ trending: top.results || [], airing: recent.results || [] });
    } catch (e) { console.error("Home fetch failed", e); }
  };

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.length > 2) {
      setLoading(true);
      const r = await fetch(`${API}/${val}`);
      const d = await r.json();
      setSearchRes(d.results || []);
      setLoading(false);
    } else {
      setSearchRes([]);
    }
  };

  const selectAnime = async (anime) => {
    setSelected(anime);
    setView('details');
    setInfo({}); // Clear old info
    const r = await fetch(`${API}/info/${anime.id}`);
    const d = await r.json();
    setInfo(d);
    if (d.episodes?.[0]) setActiveEp(d.episodes[0]);
  };

  const toggleBookmark = (a) => {
    const updated = bookmarks.find(b => b.id === a.id) 
      ? bookmarks.filter(b => b.id !== a.id) 
      : [...bookmarks, a];
    setBookmarks(updated);
    localStorage.setItem('aniBookmarks', JSON.stringify(updated));
  };

  const getNextEpTime = () => "Next Episode: Sunday at 10:00 PM";

  const Card = ({ a }) => (
    <div style={{ flex: '0 0 auto', width: '150px', cursor: 'pointer', position: 'relative' }}>
      <div onClick={() => selectAnime(a)}>
        <img src={`https://wsrv.nl/?url=${encodeURIComponent(a.image)}&w=300`} style={{ width: '100%', borderRadius: '15px', aspectRatio: '2/3', objectFit: 'cover' }} />
        <p style={{ fontSize: '13px', marginTop: '8px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
      </div>
      <button onClick={() => toggleBookmark(a)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', color: bookmarks.find(b => b.id === a.id) ? '#ff1e30' : 'white', borderRadius: '50%', width: '28px', height: '28px' }}>❤</button>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0b0c0e', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>AniStream</title></Head>

      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#ff1e30', margin: 0, cursor: 'pointer' }} onClick={() => {setView('home'); setQuery("");}}>AniStream</h2>
          <input 
            type="text" 
            placeholder="Search anime..." 
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ flex: 1, background: '#1c1d21', border: 'none', padding: '12px', borderRadius: '10px', color: 'white' }}
          />
          <span onClick={() => setView('bookmarks')} style={{ cursor: 'pointer', fontSize: '20px' }}>❤</span>
        </div>

        {query.length > 2 ? (
          <div>
            <h3>Search Results</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
              {searchRes.map(a => <Card key={a.id} a={a} />)}
            </div>
          </div>
        ) : view === 'home' ? (
          <>
            <h3 style={{ marginBottom: '15px' }}>🔥 Trending Now</h3>
            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', marginBottom: '30px', paddingBottom: '10px' }}>
              {sections.trending.map(a => <Card key={a.id} a={a} />)}
            </div>
            <h3 style={{ marginBottom: '15px' }}>📺 Just Released</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
              {sections.airing.map(a => <Card key={a.id} a={a} />)}
            </div>
          </>
        ) : view === 'bookmarks' ? (
          <div>
            <h3>My Watchlist</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
              {bookmarks.map(a => <Card key={a.id} a={a} />)}
            </div>
          </div>
        ) : view === 'details' && selected && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button onClick={() => setView('home')} style={{ background: '#1c1d21', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', marginBottom: '15px' }}>← Back</button>
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '15px', overflow: 'hidden' }}>
              <iframe 
                src={activeSrv.id === 2 ? `${activeSrv.url}${activeEp?.id}` : `${activeSrv.url}${selected.id}/${activeEp?.number}`} 
                style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen 
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', margin: '15px 0', overflowX: 'auto' }}>
              {SERVERS.map(s => (
                <button key={s.id} onClick={() => setActiveSrv(s)} style={{ background: activeSrv.id === s.id ? '#ff1e30' : '#1c1d21', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', fontSize: '11px' }}>{s.name}</button>
              ))}
            </div>
            {info.status === "Releasing" && <div style={{ color: '#ff1e30', fontWeight: 'bold', marginBottom: '15px' }}>⏰ {getNextEpTime()}</div>}
            <h2>{selected.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: '8px', marginTop: '20px' }}>
              {info.episodes?.map(e => (
                <button key={e.id} onClick={() => setActiveEp(e)} style={{ padding: '10px', borderRadius: '8px', border: 'none', background: activeEp?.id === e.id ? '#ff1e30' : '#1c1d21', color: 'white', fontWeight: 'bold' }}>{e.number}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
