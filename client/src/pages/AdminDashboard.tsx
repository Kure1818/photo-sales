import { useAuth } from '../hooks/useAuth'

export default function AdminDashboard() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  if (!user) {
    window.location.href = '/admin/login'
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: 0
          }}>
            PIC'store 管理画面
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Dashboard Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem'
          }}>
            <h3 style={{ color: '#1f2937', margin: '0 0 1rem 0' }}>組織管理</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
              組織の作成・編集・削除を行います
            </p>
            <button style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}>
              組織を管理
            </button>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem'
          }}>
            <h3 style={{ color: '#1f2937', margin: '0 0 1rem 0' }}>イベント管理</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
              イベントの作成・編集・削除を行います
            </p>
            <button style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}>
              イベントを管理
            </button>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem'
          }}>
            <h3 style={{ color: '#1f2937', margin: '0 0 1rem 0' }}>写真アップロード</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
              写真のアップロードと管理を行います
            </p>
            <button style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}>
              写真をアップロード
            </button>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem'
          }}>
            <h3 style={{ color: '#1f2937', margin: '0 0 1rem 0' }}>注文管理</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
              注文の確認と管理を行います
            </p>
            <button style={{
              backgroundColor: '#f59e0b',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}>
              注文を確認
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem'
        }}>
          <h3 style={{ color: '#1f2937', margin: '0 0 1rem 0' }}>概要</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>0</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>組織</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>0</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>イベント</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>0</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>写真</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>0</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>注文</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
