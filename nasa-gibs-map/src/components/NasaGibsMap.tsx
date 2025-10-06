import { useMemo, useState } from 'react'
import { Box, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Stack, Typography, IconButton, Tooltip } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { MapContainer, TileLayer, LayersControl, ScaleControl, ZoomControl } from 'react-leaflet'

const { BaseLayer, Overlay } = LayersControl

// NASA GIBS endpoint and common settings
const GIBS_ENDPOINT = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi'
const TILE_SIZE = 256

// Available layers with pretty labels
const GIBS_LAYERS = [
  { id: 'BlueMarble_ShadedRelief_Bathymetry', name: 'Blue Marble (Bathymetry)' },
  { id: 'MODIS_Terra_CorrectedReflectance_TrueColor', name: 'MODIS Terra True Color' },
  { id: 'MODIS_Aqua_CorrectedReflectance_TrueColor', name: 'MODIS Aqua True Color' },
  { id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor', name: 'VIIRS SNPP True Color' },
  { id: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', name: 'VIIRS NOAA-20 True Color' },
  { id: 'MODIS_Terra_Aerosol', name: 'Aerosol (Terra)' },
  { id: 'MODIS_Terra_Cloud_Top_Temperature_Day', name: 'Cloud Top Temp (Day)' },
  { id: 'MODIS_Terra_Chlorophyll_A', name: 'Chlorophyll (Terra)' },
]

function formatDateForGibs(date: Date): string {
  // GIBS expects yyyy-mm-dd
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getYesterdayUtcDateString(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - 1)
  return formatDateForGibs(d)
}

function buildTileUrl(layer: string, date: string) {
  // WMTS URL following GIBS spec for WebMercator (EPSG:3857)
  // ZXY tile scheme
  return `${GIBS_ENDPOINT}?service=WMTS&request=GetTile&version=1.0.0&layer=${layer}&style=default&tilematrixset=GoogleMapsCompatible_Level&format=image%2Fjpeg&time=${date}&tilematrix={z}&tilerow={y}&tilecol={x}`
}

export default function NasaGibsMap() {
  const [selectedLayer, setSelectedLayer] = useState<string>('VIIRS_SNPP_CorrectedReflectance_TrueColor')
  const [selectedDate, setSelectedDate] = useState<string>(() => getYesterdayUtcDateString())

  const tileUrl = useMemo(() => buildTileUrl(selectedLayer, selectedDate), [selectedLayer, selectedDate])

  const handleLayerChange = (event: SelectChangeEvent<string>) => {
    setSelectedLayer(event.target.value as string)
  }

  const resetToday = () => setSelectedDate(formatDateForGibs(new Date()))

  return (
    <Card elevation={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2, pb: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              NASA GIBS Visualização
            </Typography>
            <Tooltip title="Atualizar para hoje">
              <IconButton color="primary" onClick={resetToday}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="layer-select-label">Camada</InputLabel>
              <Select labelId="layer-select-label" value={selectedLayer} label="Camada" onChange={handleLayerChange}>
                {GIBS_LAYERS.map((l) => (
                  <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box component="input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.currentTarget.value)}
              max={formatDateForGibs(new Date())}
              sx={{
                height: 40,
                px: 1.5,
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.12)',
                bgcolor: 'background.paper',
                color: 'text.primary'
              }}
            />
          </Stack>
        </Stack>
      </CardContent>

      <Box sx={{ flex: 1, position: 'relative', borderRadius: 2, overflow: 'hidden', m: 2, mt: 0 }}>
        <MapContainer
          center={[0, 0]}
          zoom={2}
          zoomControl={false}
          worldCopyJump
          style={{ height: '70vh', width: '100%' }}
          attributionControl
        >
          <ZoomControl position="bottomright" />
          <ScaleControl position="bottomleft" />
          <LayersControl position="topright">
            <BaseLayer checked name="Imagem selecionada">
              <TileLayer
                key={`${selectedLayer}-${selectedDate}`}
                url={tileUrl}
                tileSize={TILE_SIZE}
                attribution='Imagery courtesy NASA GIBS, Blue Marble, MODIS/VIIRS'
                updateWhenZooming
                updateWhenIdle={false}
              />
            </BaseLayer>

            <Overlay name="Borders & Coastlines (Natural Earth)">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
                opacity={0.25}
              />
            </Overlay>
          </LayersControl>
        </MapContainer>
      </Box>
    </Card>
  )
}
