import './App.css'
import { AppBar, Box, Container, Toolbar, Typography, Link as MuiLink } from '@mui/material'
import NasaGibsMap from './components/NasaGibsMap'

function App() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="transparent" sx={{ backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            NASA Earth Data Viewer
          </Typography>
          <MuiLink href="https://earthdata.nasa.gov/gibs" target="_blank" underline="hover" color="inherit">
            GIBS
          </MuiLink>
        </Toolbar>
      </AppBar>

      <Container sx={{ flex: 1, py: 3 }}>
        <NasaGibsMap />
      </Container>

      <Box component="footer" sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">
          Imagens: NASA GIBS • Base OSM • Feito com React + Leaflet
        </Typography>
      </Box>
    </Box>
  )
}

export default App
