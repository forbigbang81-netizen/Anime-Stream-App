import React, { useState, useEffect } from 'react';
import Head from 'next/head';

const API = "https://api.jikan.moe/v4";
const imgProxy = (url) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=500&output=webp`;

export default function App() {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchRes, setSearchRes] = useState([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState('home'); 
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => { 
    // Fetching data for all 1:1 sections
    fetch(`${API}/top/anime?filter=airing&limit=10`).then(r => r.json()).then(d => setTrending(d.data || []));
    fetch(`${API}/top/anime?filter=bypopularity&limit=12`).then(r => r.json()).then(d => setPopular(d.data || []));
    fetch(`${API}/top/anime?filter=favorite&limit=12`).then(r => r.json()).then(d => setFavorites(d.data || []));
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

  return (
    <div style={{ backgroundColor: '#0b0c0e', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '100px' }}>
      <Head><title>AniStream</title></Head>

      {/* Hero Section with Backdrop */}
      {view === 'home' && trending[0] && (
        <div style={{ position: 'relative', height: '450px', width: '100%' }}>
          <img 
            src={imgProxy(trending[0].images.jpg.large_image_url)} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} 
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0b0c0e, transparent)' }} />
          <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <img src="https://i.ibb.co/hR0V6vL/logo.png" style={{ height: '35px' }} /> {/* Logo Placeholder */}
             <div style={{ display: 'flex', gap: '20px' }}>
                <span onClick={() => setShowFilter(true)} style={{ fontSize: '24px' }}>🔍</span>
                <span style={{ fontSize: '24px' }}>🔔</span>
             </div>
          </div>
          <div style={{ position: 'absolute', bottom: '30px', left: '20px' }}>
            <h1 style={{ margin: '0 0 5px', fontSize: '32px' }}>{trending[0].title}</h1>
            <p style={{ margin: '0 0 20px', color: '#ccc', fontSize: '14px' }}>Action, Adventure, Fantasy</p>
            <div style={{ display: 'flex', gap: '15px' }}>
               <button style={{ background: '#ff1e30', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span style={{ fontSize: '18px' }}>▶</span> Play
               </button>
               <button style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid white', padding: '12px 25px', borderRadius: '25px', fontWeight: 'bold' }}>
                 + My List
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Search for Search View */}
      {view === 'search' && (
        <div style={{ padding: '20px', position: 'sticky', top: 0, background: '#0b0c0e', zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span onClick={() => setView('home')} style={{ fontSize: '24px' }}>←</span>
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              type="text" placeholder="Search" value={query} autoFocus
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: '100%', background: '#1c1d21', border: 'none', borderRadius: '10px', padding: '12px 45px', color: 'white' }}
            />
            <span style={{ position: 'absolute', left: '15px', top: '12px' }}>🔍</span>
          </div>
          <div style={{ background: '#1c1d21', padding: '10px', borderRadius: '10px', color: '#ff1e30' }}>⊚</div>
        </div>
      )}

      <div style={{ padding: '0 20px' }}>
        {view === 'home' && (
          <>
            <Section title="Top Airing" data={trending} horizontal />
            <Section title="Most Favorite" data={favorites} />
            <Section title="Most Popular" data={popular} />
          </>
        )}

        {view === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
            {searchRes.length > 0 ? searchRes.map(a => (
              <div key={a.mal_id} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ position: 'relative', width: '120px', flexShrink: 0 }}>
                    <img src={imgProxy(a.images.jpg.large_image_url)} style={{ width: '100%', aspectRatio: '4/3', borderRadius: '15px', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'black', fontSize: '16px' }}>▶</span>
                    </div>
                </div>
                <h4 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{a.title}</h4>
              </div>
            )) : (
              <div style={{ textAlign: 'center', marginTop: '100px' }}>
                 <div style={{ width: '140px', height: '140px', border: '12px solid #ff1e30', borderRadius: '35%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '40px', fontWeight: '900' }}>404</span>
                 </div>
                 <h2 style={{ color: '#ff1e30' }}>Not found</h2>
                 <p style={{ color: '#666', padding: '0 40px' }}>Sorry, the keyword you entered could not be found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, width: '100%', background: '#131418', display: 'flex', justifyContent: 'space-around', padding: '15px 0', borderTop: '1px solid #222' }}>
        <NavItem icon="🏠" label="Home" active={view === 'home'} />
        <NavItem icon="📅" label="Schedule" />
        <NavItem icon="🔖" label="My List" />
   
      </div>
    </div>
  );
}

const Section = ({ title, data, horizontal }) => (
  <div style={{ marginTop: '25px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
      <h3 style={{ margin: 0, fontSize: '20px' }}>{title}</h3>
      <span style={{ color: '#ff1e30' }}>See all</span>
    </div>
    <div style={{ display: horizontal ? 'flex' : 'grid', gridTemplateColumns: horizontal ? 'none' : 'repeat(3, 1fr)', gap: '15px', overflowX: horizontal ? 'auto' : 'visible', scrollbarWidth: 'none' }}>
      {data.map(a => (
        <div key={a.mal_id} style={{ flex: '0 0 auto', width: horizontal ? '160px' : 'auto', position: 'relative' }}>
          <img src={imgProxy(a.images.jpg.large_image_url)} style={{ width: '100%', aspectRatio: '2/3', borderRadius: '15px', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'white', color: 'black', fontSize: '10px', padding: '2px 6px', borderRadius: '5px', fontWeight: 'bold' }}>PG-13</div>
          <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#ff1e30', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '5px', fontWeight: 'bold' }}>HD</div>
        </div>
      ))}
    </div>
  </div>
);

const NavItem = ({ icon, label, active }) => (
  <div style={{ textAlign: 'center', color: active ? '#ff1e30' : '#888' }}>
    <div style={{ fontSize: '22px' }}>{icon}</div>
    <div style={{ fontSize: '11px', marginTop: '4px' }}>{label}</div>
  </div>
);
