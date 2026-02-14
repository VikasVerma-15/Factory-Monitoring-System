// Use relative URL in production (Docker), absolute in development
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

export const fetchFactoryMetrics = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  const response = await fetch(`${API_BASE_URL}/metrics/factory?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch factory metrics');
  return response.json();
};

export const fetchWorkersMetrics = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  const response = await fetch(`${API_BASE_URL}/metrics/workers?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch workers metrics');
  return response.json();
};

export const fetchWorkstationsMetrics = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  const response = await fetch(`${API_BASE_URL}/metrics/workstations?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch workstations metrics');
  return response.json();
};

export const fetchWorkerMetrics = async (workerId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  const response = await fetch(`${API_BASE_URL}/metrics/worker/${workerId}?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch worker metrics');
  return response.json();
};

export const fetchWorkstationMetrics = async (stationId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  const response = await fetch(`${API_BASE_URL}/metrics/workstation/${stationId}?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch workstation metrics');
  return response.json();
};

export const ingestEvent = async (event) => {
  const response = await fetch(`${API_BASE_URL}/events/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error('Failed to ingest event');
  return response.json();
};

export const seedDatabase = async () => {
  const response = await fetch(`${API_BASE_URL}/seed/init`, {
    method: 'POST',
  });
  if (!response.ok) {
    let errorMessage = 'Failed to seed database';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = `Failed to seed database: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

export const addEvents = async (hours = 2) => {
  const response = await fetch(`${API_BASE_URL}/seed/add-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hours }),
  });
  if (!response.ok) {
    let errorMessage = 'Failed to add events';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = `Failed to add events: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};








