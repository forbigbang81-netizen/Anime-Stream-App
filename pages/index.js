import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://consumet-api-fawn.vercel.app/meta/anilist";
const GENRES = ["Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Mystery", "Drama", "Ecchi", "Fantasy", "Game", "Historical", "Horror", "Kids", "Magic", "Martial Arts", "Mecha", "Music", "Parody", "Samurai", "Romance", "School", "Sci-Fi", "Shoujo", "Shounen", "Space", "Sports", "Super Power", "Vampire", "Yaoi", "Yuri", "Harem", "Slice of Life", "Supernatural", "Military", "Police"];

export default function App() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [searchRes, setSearchRes] = useState([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState('home'); 
  const [showFilter, setShowFilter] = useState(false);
  const [selected, setSelected] = useState(null);
  const [info, setInfo] = useState({});
  const [activeEp, setActiveEp] = useState(null);

  useEffect(() => { 
    fetch(`${API}/trending`).then(r => r.json()).then(d => setTrending(d.results || []));
    fetch(`${API}/popular`).then(r => r.json()).then(d => setPopular(d.results || []));
  }, []);

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.trim().length > 0) {
      setView('search');
      const r = await fetch(`${API}/${val}`);
      const d = await r.json();
      setSearchRes(d.results || []);
    } else {
      setView('home');
    }
  };

  const selectAnime = async (anime) => {
    setSelected(anime);
    setView('details');
    const r = await fetch(`${API}/info/${anime.id}`);
    const d = await r.json();
    setInfo(d);
    if (d.episodes?.[0]) setActiveEp(d.episodes[0]);
  };

  const Pill = ({ text, active }) => (
    <div style={{ 
      padding: '8px 18px', borderRadius: '20px', fontSize: '12px', border: active ? 'none' : '1px solid #333',
      background: active ? '#ff1e30' : 'transparent', color: 'white', whiteSpace: 'nowrap', cursor: 'pointer' 
    }}>{text}</div>
  );

  return (
    <div style={{ backgroundColor: '#0b0c0e', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>AniStream</title></Head>

      {/* Header with 1:1 Search Bar and Filter Icon */}
      <div style={{ padding: '20px', position: 'sticky', top: 0, background: '#0b0c0e', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }} onClick={() => setView('home')}>←</span>
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              type="text" placeholder="Search" value={query}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: '100%', background: '#1c1d21', border: 'none', borderRadius: '8px', padding: '12px 40px', color: 'white' }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '12px', color: '#666' }}>🔍</span>
          </div>
          <div onClick={() => setShowFilter(true)} style={{ background: '#1c1d21', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: '#ff1e30' }}>⊚</div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {view === 'home' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0 15px' }}>
              <h3 style={{ margin: 0 }}>Top Airing</h3>
              <span style={{ color: '#ff1e30', fontSize: '13px' }}>See all</span>
            </div>
            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '20px' }}>
              {trending.map(a => (
                <div key={a.id} onClick={() => selectAnime(a)} style={{ flex: '0 0 auto', width: '140px' }}>
                  <img src={a.image} style={{ width: '100%', aspectRatio: '2/3', borderRadius: '12px', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {searchRes.length > 0 ? searchRes.map(a => (
              <div key={a.id} onClick={() => selectAnime(a)} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ position: 'relative', width: '80px', height: '110px' }}>
                    <img src={a.image} style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '40%', left: '30%', background: 'white', borderRadius: '50%', width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontSize: '10px' }}>▶</div>
                </div>
                <h4 style={{ fontSize: '14px', margin: 0 }}>{a.title?.english || a.title?.romaji}</h4>
              </div>
            )) : (
              <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <div style={{ fontSize: '60px', color: '#ff1e30' }}>🛑</div>
                <h3>Not found</h3>
                <p style={{ color: '#666' }}>Try searching for a different keyword</p>
              </div>
            )}
          </div>
        )}

        {view === 'details' && (
            <div style={{ paddingBottom: '40px' }}>
                <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '15px', overflow: 'hidden' }}>
                    <iframe src={`https://vidsrc.to/embed/anime/${selected.id}/${activeEp?.number || 1}`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                </div>
                <h2>{selected.title?.english || selected.title?.romaji}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: '10px' }}>
                    {info.episodes?.map(e => (
                        <button key={e.id} onClick={() => setActiveEp(e)} style={{ padding: '12px', background: activeEp?.id === e.id ? '#ff1e30' : '#1c1d21', border: 'none', color: 'white', borderRadius: '8px' }}>{e.number}</button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* 1:1 Sort & Filter Drawer */}
      {showFilter && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1c1d21', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', zIndex: 100, padding: '25px', height: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px' }}>
            <span onClick={() => setShowFilter(false)} style={{ marginRight: '15px' }}>←</span>
            <h2 style={{ margin: 0 }}>Sort & Filter</h2>
          </div>
          
          <h4 style={{ margin: '20px 0 10px' }}>Sort</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Pill text="Popular" active /> <Pill text="Title" /> <Pill text="Recently updated" />
          </div>

          <h4 style={{ margin: '20px 0 10px' }}>Genre</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {GENRES.map(g => <Pill key={g} text={g} />)}
          </div>

          <div style={{ position: 'sticky', bottom: 0, background: '#1c1d21', padding: '20px 0', display: 'flex', gap: '15px' }}>
            <button style={{ flex: 1, padding: '15px', borderRadius: '30px', border: 'none', background: '#2c2d31', color: 'white' }}>Reset</button>
            <button onClick={() => setShowFilter(false)} style={{ flex: 1, padding: '15px', borderRadius: '30px', border: 'none', background: '#ff1e30', color: 'white' }}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}
