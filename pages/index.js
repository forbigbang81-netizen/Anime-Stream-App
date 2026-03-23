import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://api.jikan.moe/v4";

export default function App() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [searchRes, setSearchRes] = useState([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState('home'); 
  const [showFilter, setShowFilter] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => { 
    // Jikan Top Anime for "Top Airing" and "Most Popular"
    fetch(`${API}/top/anime?filter=airing&limit=10`).then(r => r.json()).then(d => setTrending(d.data || []));
    fetch(`${API}/top/anime?filter=favorite&limit=15`).then(r => r.json()).then(d => setPopular(d.data || []));
  }, []);

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.trim().length > 0) {
      setView('search');
      const r = await fetch(`${API}/anime?q=${val}&limit=20`);
      const d = await r.json();
      setSearchRes(d.data || []);
    } else {
      setView('home');
    }
  };

  const NavItem = ({ icon, label, active }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: active ? '#ff1e30' : '#666', cursor: 'pointer' }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ fontSize: '10px', marginTop: '4px' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0b0c0e', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '80px' }}>
      <Head><title>AniStream</title></Head>

      {/* Header with 1:1 Search bar from Screenshot 1000002399.png */}
      <div style={{ padding: '20px', position: 'sticky', top: 0, background: '#0b0c0e', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ color: '#ff1e30', margin: 0, fontSize: '22px', fontWeight: '900' }} onClick={() => setView('home')}>AniStream</h2>
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              type="text" placeholder="Search anime..." value={query}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: '100%', background: '#1c1d21', border: 'none', borderRadius: '8px', padding: '10px 15px', color: 'white', fontSize: '14px' }}
            />
          </div>
          <span style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowFilter(true)}>🔍</span>
          <span style={{ fontSize: '20px' }}>❤️</span>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {view === 'home' && (
          <>
            {/* Top Airing Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0 15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Top Airing</h3>
              <span style={{ color: '#ff1e30', fontSize: '13px' }}>See all</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '20px', scrollbarWidth: 'none' }}>
              {trending.map(a => (
                <div key={a.mal_id} style={{ flex: '0 0 auto', width: '140px', position: 'relative' }}>
                  <img src={a.images.jpg.large_image_url} style={{ width: '100%', aspectRatio: '2/3', borderRadius: '12px', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'white', color: 'black', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{a.rating?.split(' ')[0] || 'PG-13'}</div>
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#ff1e30', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>HD</div>
                </div>
              ))}
            </div>

            {/* Most Favorite Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0 15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Most Favorite</h3>
              <span style={{ color: '#ff1e30', fontSize: '13px' }}>See all</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {popular.map(a => (
                <div key={a.mal_id}>
                  <img src={a.images.jpg.large_image_url} style={{ width: '100%', aspectRatio: '2/3', borderRadius: '12px', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* 1:1 Search Result List */}
        {view === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
            {searchRes.length > 0 ? searchRes.map(a => (
              <div key={a.mal_id} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ position: 'relative', width: '100px', flexShrink: 0 }}>
                    <img src={a.images.jpg.large_image_url} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '12px', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'black', fontSize: '14px' }}>▶</span>
                    </div>
                </div>
                <h4 style={{ fontSize: '15px', margin: 0, fontWeight: 'bold', flex: 1 }}>{a.title_english || a.title}</h4>
              </div>
            )) : (
              /* 1:1 Not Found State */
              <div style={{ textAlign: 'center', marginTop: '100px' }}>
                <div style={{ width: '120px', height: '120px', border: '8px solid #ff1e30', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '40px', fontWeight: 'bold' }}>404</span>
                </div>
                <h2 style={{ color: '#ff1e30' }}>Not found</h2>
                <p style={{ color: '#666', padding: '0 40px' }}>Sorry, the keyword you entered could not be found. Try to check again or search with other keywords.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1:1 Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, width: '100%', background: '#131418', display: 'flex', justifyContent: 'space-around', padding: '12px 0', borderTop: '1px solid #222' }}>
        <NavItem icon="🏠" label="Home" active={view === 'home'} />
        <NavItem icon="📅" label="Schedule" />
        <NavItem icon="🔖" label="My List" />
        <NavItem icon="👤" label="Profile" />
      </div>

      {/* Filter Drawer */}
      {showFilter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100 }}>
          <div style={{ position: 'absolute', bottom: 0, width: '100%', background: '#1c1d21', borderTopLeftRadius: '25px', borderTopRightRadius: '25px', padding: '25px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <span onClick={() => setShowFilter(false)} style={{ fontSize: '24px', marginRight: '15px' }}>←</span>
              <h2 style={{ margin: 0 }}>Sort & Filter</h2>
            </div>
            <p style={{ fontWeight: 'bold' }}>Sort</p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
               <button style={{ background: '#ff1e30', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px' }}>Popular</button>
               <button style={{ background: 'transparent', color: 'white', border: '1px solid #444', padding: '8px 20px', borderRadius: '20px' }}>Title</button>
            </div>
            <p style={{ fontWeight: 'bold' }}>Status</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
               <button style={{ background: '#ff1e30', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px' }}>All</button>
               <button style={{ background: 'transparent', color: 'white', border: '1px solid #444', padding: '8px 20px', borderRadius: '20px' }}>Finished Airing</button>
            </div>
            <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
              <button style={{ flex: 1, padding: '15px', borderRadius: '30px', background: '#2c2d31', color: 'white', border: 'none' }}>Reset</button>
              <button onClick={() => setShowFilter(false)} style={{ flex: 1, padding: '15px', borderRadius: '30px', background: '#ff1e30', color: 'white', border: 'none' }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
