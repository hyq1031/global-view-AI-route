// Fallback/demo routes shown on the globe when live OpenSky data isn't
// available (or when the user manually selects Trial mode).
export const DEFAULT_ROUTES = [
  { id: 'default-1', from: { name: 'Rotterdam', lat: 51.92, lng: 4.48 }, to: { name: 'New York', lat: 40.71, lng: -74.01 } },
  { id: 'default-2', from: { name: 'Dubai', lat: 25.2, lng: 55.27 }, to: { name: 'London', lat: 51.51, lng: -0.13 } },
  { id: 'default-3', from: { name: 'Lagos', lat: 6.52, lng: 3.38 }, to: { name: 'Madrid', lat: 40.42, lng: -3.7 } },
  { id: 'default-4', from: { name: 'Mumbai', lat: 19.08, lng: 72.88 }, to: { name: 'Rotterdam', lat: 51.92, lng: 4.48 } },
  { id: 'default-5', from: { name: 'Shanghai', lat: 31.23, lng: 121.47 }, to: { name: 'Singapore', lat: 1.35, lng: 103.82 } },
  { id: 'default-6', from: { name: 'New York', lat: 40.71, lng: -74.01 }, to: { name: 'São Paulo', lat: -23.55, lng: -46.63 } },
]

export const ACTIVITIES = [
  { id: 'SHP-2481', route: 'Shanghai → Los Angeles', status: 'In Transit', eta: 'Jul 8', progress: 62 },
  { id: 'SHP-2477', route: 'Rotterdam → New York', status: 'Delayed', eta: 'Jul 5', progress: 78 },
  { id: 'SHP-2469', route: 'Dubai → London', status: 'In Transit', eta: 'Jul 4', progress: 45 },
  { id: 'SHP-2463', route: 'Singapore → Mumbai', status: 'Delivered', eta: 'Jul 1', progress: 100 },
  { id: 'SHP-2458', route: 'Lagos → Madrid', status: 'Customs Hold', eta: 'Jul 9', progress: 30 },
]

export const RISKS = [
  { label: 'Port congestion — Los Angeles', severity: 'High' },
  { label: 'Weather delay — North Atlantic', severity: 'Medium' },
  { label: 'Customs hold — Madrid', severity: 'Medium' },
]
