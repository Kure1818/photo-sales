function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <header style={{
        backgroundColor: '#3b82f6',
        color: 'white',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
          PIC'store
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          イベント写真販売プラットフォーム
        </p>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
            写真を探す
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            イベントの思い出を高品質な写真でお楽しみください
          </p>
        </section>

        <section>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
            サービス概要
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem'
            }}>
              <h4 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.5rem', color: '#1f2937' }}>
                高品質な写真
              </h4>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                プロが撮影したイベント写真を高解像度でダウンロード
              </p>
            </div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem'
            }}>
              <h4 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.5rem', color: '#1f2937' }}>
                簡単購入
              </h4>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                気に入った写真をクリックして簡単に購入・ダウンロード
              </p>
            </div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem'
            }}>
              <h4 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.5rem', color: '#1f2937' }}>
                安全な決済
              </h4>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                Stripeによる安全な決済システムでご購入いただけます
              </p>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                プラットフォーム構築完了
              </p>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
                管理者ログインから組織・イベント・写真の管理が可能です
              </p>
              <button style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem'
              }}>
                管理画面へ
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer style={{
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '2rem',
        marginTop: '4rem',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0 }}>
          &copy; 2024 PIC'store. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default App;
