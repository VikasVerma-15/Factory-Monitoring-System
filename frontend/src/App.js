import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import { seedDatabase } from './services/api';

// Use relative URL in production (Docker), absolute in development
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if database is seeded, if not, seed it
    const initializeData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/metrics/factory`);
        if (!response.ok) {
          // Database might be empty, seed it
          await seedDatabase();
        }
        setLoading(false);
      } catch (err) {
        // If error, try to seed
        try {
          await seedDatabase();
          setLoading(false);
        } catch (seedErr) {
          setError('Failed to initialize database. Please check if backend is running.');
          setLoading(false);
        }
      }
    };

    initializeData();
  }, []);

  if (loading) {
    return (
      <div className="App">
        <div className="loading-container">
          <h2>Loading Factory Dashboard...</h2>
          <p>Initializing database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Dashboard />
    </div>
  );
}

export default App;










