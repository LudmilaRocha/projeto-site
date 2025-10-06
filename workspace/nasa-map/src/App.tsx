import './App.css'
import { NasaMap } from './components/NasaMap'

function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>NASA EONET - Visualização em Mapa</h1>
        <p className="subtitle">Eventos naturais em tempo quase real</p>
      </header>
      <main className="app-main">
        <NasaMap />
      </main>
      <footer className="app-footer">
        <span>
          Dados: <a href="https://eonet.gsfc.nasa.gov/" target="_blank" rel="noreferrer">NASA EONET</a>
        </span>
        <span>
          Mapa: <a href="https://maplibre.org/" target="_blank" rel="noreferrer">MapLibre GL</a>
        </span>
      </footer>
    </div>
  )
}

export default App
